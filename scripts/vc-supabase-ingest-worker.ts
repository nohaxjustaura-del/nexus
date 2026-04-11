#!/usr/bin/env tsx
/**
 * VC Supabase ingest worker (separate from lib/background-worker.ts).
 *
 * 1. Researches firms via web search + AI (same pipeline as auto-research-vcs).
 * 2. Creates or updates Prisma Investor rows.
 * 3. Upserts a denormalized copy into Supabase table `vc_directory` (PostgREST).
 *
 * Prereq: run supabase/vc_directory.sql in the Supabase SQL editor once.
 *
 * Usage:
 *   npx tsx scripts/vc-supabase-ingest-worker.ts research "Firm Name"
 *   npx tsx scripts/vc-supabase-ingest-worker.ts --file scripts/data/vc-ingest-firms.json
 *   npx tsx scripts/vc-supabase-ingest-worker.ts --file firms.txt
 *   npx tsx scripts/vc-supabase-ingest-worker.ts --sync-prisma --limit 50
 *   npx tsx scripts/vc-supabase-ingest-worker.ts --sync-prisma --cursor <investorId>
 *   npx tsx scripts/vc-supabase-ingest-worker.ts --loop --interval-ms 3600000 --file scripts/data/vc-ingest-firms.json
 *   npx tsx scripts/vc-supabase-ingest-worker.ts --discover --max-new 15 --discover-rounds 5
 *   npx tsx scripts/vc-supabase-ingest-worker.ts --discover --once   (single pass, then exit)
 *   Discover runs on a loop by default; --interval-ms sets pause between passes (default 1h).
 *
 * --discover now uses a 3-phase pipeline:
 *   Phase A: Discover — systematic Exa queries (coverage-tracker guided) + multi-strategy
 *            → stage candidates in VCDiscoveryCandidate table
 *   Phase B: Validate — web presence check on pending candidates
 *   Phase C: Research — full Exa+LLM research on validated candidates → Investor + Supabase
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required for Supabase sync)
 *   SUPABASE_VC_TABLE (optional, default vc_directory)
 *   DATABASE_URL (Prisma)
 *   LLM: OPENROUTER_API_KEY and/or Ollama (OLLAMA_BASE_URL + OLLAMA_MODEL / OLLAMA_VC_MODEL); VC_LLM_PROVIDER=ollama to force local
 *   VC_RESEARCH_CONTEXT_CHARS, VC_RESEARCH_EXA_NUM_RESULTS
 *   --discover requires Exa keys (EXA_API_KEYS or EXA_API_KEY)
 *   Discover uses VC_DISCOVERY_CONTENT_SINCE (default 2026-01-01) for Exa startPublishedDate.
 *   DISCOVERY_BATCH_SIZE — candidates per research batch (default 10)
 *   DISCOVERY_ROUNDS_PER_PASS — Exa query rounds per discovery pass (default 6)
 *   DISCOVERY_AUTO_REJECT_NO_WEB — auto-reject candidates without web presence (default true)
 *   DISCOVERY_QUALITY_GATE — enforce quality audit on new entries (default true)
 */

import * as fs from 'fs'
import * as path from 'path'
import { db } from '../lib/db'
import {
  discoverNewFirmNamesNotInDatabase,
  loadExistingFirmKeysFromDb,
  normalizeFirmKey,
  hasDiscoveryWebPresence,
  checkDiscoveryWebPresence,
  runDiscoveryRound,
  type DiscoveryQueryStrategy,
} from '../lib/vc-discovery-from-web'
import { getLeastCoveredCombinations, recordSearch } from '../lib/discovery-coverage-tracker'
import { ingestFirmToPrisma } from '../lib/vc-prisma-ingest'
import { ExaResearchQuotaBlockedError } from '../lib/vc-research-retrieval'
import { upsertInvestorToVcDirectory } from '../lib/vc-supabase-sync'
import { auditInvestorLocal, type InvestorLocalAuditInput } from '../lib/investor-quality-audit'
import { researchVC, updateVCInDatabase } from './auto-research-vcs'
import { normalizeResearchForDb } from '../lib/vc-research-normalize'
import { syncInvestorEmbeddingById } from '../lib/vc-embedding-sync'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function parseFirmListFile(filePath: string): string[] {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  const raw = fs.readFileSync(abs, 'utf8').trim()
  if (!raw) return []
  if (raw.startsWith('[')) {
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) throw new Error('JSON file must be an array of strings')
    return arr.map((x) => String(x).trim()).filter(Boolean)
  }
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
}

async function syncPrismaSlice(limit: number, cursor?: string) {
  const rows = await db.investor.findMany({
    take: limit,
    ...(cursor
      ? {
          skip: 1,
          cursor: { id: cursor },
        }
      : {}),
    orderBy: { id: 'asc' },
  })

  let ok = 0
  let fail = 0
  for (const inv of rows) {
    const r = await upsertInvestorToVcDirectory(inv)
    if (r.ok) ok++
    else {
      fail++
      console.error(`   Supabase sync failed (${inv.firmName}): ${r.error}`)
    }
    await sleep(100)
  }
  console.log(`\n📤 Prisma → Supabase: ${ok} ok, ${fail} failed (batch size ${rows.length})`)
  const last = rows[rows.length - 1]
  if (last) {
    console.log(`   Next cursor: ${last.id}`)
  }
}

async function ingestOneFirm(
  name: string,
  delayAfterMs: number,
): Promise<{ ok: boolean; isNew: boolean; resolvedKey: string | null }> {
  console.log(`\n➡️  Ingest: ${name}`)
  const { investor, research, isNew } = await ingestFirmToPrisma(name)
  if (!investor) {
    console.log('   ⚠️  No investor row (research failed or empty results)')
    return { ok: false, isNew: false, resolvedKey: null }
  }
  const resolvedKey = normalizeFirmKey(investor.firmName)
  const sources = research?.sources ?? null
  const tag = isNew ? 'new' : 'updated'
  const sync = await upsertInvestorToVcDirectory(investor, { researchSources: sources })
  if (!sync.ok) {
    console.error(`   ❌ Supabase sync failed: ${sync.error}`)
  }
  console.log(`   ✅ Saved (${tag}): ${investor.firmName} (${investor.id})`)
  if (delayAfterMs > 0) await sleep(delayAfterMs)
  return { ok: true, isNew, resolvedKey: resolvedKey || null }
}

// ---------------------------------------------------------------------------
// 3-phase discover pipeline
// ---------------------------------------------------------------------------

const DISCOVERY_STRATEGIES: DiscoveryQueryStrategy[] = ['blueprint', 'portfolio_backtrack', 'directory']

function envInt(key: string, fallback: number): number {
  const v = parseInt(process.env[key] || '', 10)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key]?.trim().toLowerCase()
  if (v === '1' || v === 'true') return true
  if (v === '0' || v === 'false') return false
  return fallback
}

/**
 * Phase A: Discover — use coverage-tracker-guided queries across multiple
 * strategies, stage candidates into VCDiscoveryCandidate table.
 */
async function phaseDiscover(opts: {
  rounds: number
  perQuery: number
  queryDelayMs: number
  maxCandidates: number
}): Promise<number> {
  console.log('\n═══════════════════════════════════════════')
  console.log('  PHASE A: DISCOVER (name collection)')
  console.log('═══════════════════════════════════════════')

  const existingKeys = await loadExistingFirmKeysFromDb()
  const existingCandidateKeys = new Set<string>()
  const existing = await db.vCDiscoveryCandidate.findMany({ select: { normalizedKey: true } })
  for (const c of existing) existingCandidateKeys.add(c.normalizedKey)

  const combosPerStrategy = Math.max(1, Math.ceil(opts.rounds / DISCOVERY_STRATEGIES.length))
  let totalStaged = 0

  for (const strategy of DISCOVERY_STRATEGIES) {
    const combos = getLeastCoveredCombinations(combosPerStrategy)
    console.log(`\n[PHASE-A] Strategy: ${strategy} | ${combos.length} coverage-gap combos`)

    const result = await runDiscoveryRound(strategy, combos, existingKeys, {
      resultsPerQuery: opts.perQuery,
      delayBetweenQueriesMs: opts.queryDelayMs,
      maxNames: opts.maxCandidates,
    })

    console.log(`[PHASE-A:${strategy}] ${result.candidates.length} new name(s), ${result.queriesRun} queries`)

    for (const combo of combos) {
      const matchingCandidates = result.candidates.length
      recordSearch(combo.sector, combo.region, combo.stage, matchingCandidates)
    }

    let staged = 0
    for (const name of result.candidates) {
      const key = normalizeFirmKey(name)
      if (!key || key.length < 3) continue
      if (existingKeys.has(key) || existingCandidateKeys.has(key)) continue

      try {
        await db.vCDiscoveryCandidate.create({
          data: {
            firmName: name,
            normalizedKey: key,
            source: `exa_${strategy}`,
            sourceQuery: strategy,
            status: 'pending',
          },
        })
        existingCandidateKeys.add(key)
        staged++
      } catch (e: any) {
        if (e?.code === 'P2002') continue // unique constraint (already staged)
        console.warn(`[PHASE-A] Failed to stage "${name}": ${e.message}`)
      }
    }

    totalStaged += staged
    console.log(`[PHASE-A:${strategy}] Staged ${staged} new candidate(s)`)

    if (totalStaged >= opts.maxCandidates) {
      console.log(`[PHASE-A] Hit maxCandidates (${opts.maxCandidates}), stopping discovery.`)
      break
    }
  }

  console.log(`\n[PHASE-A] Total new candidates staged: ${totalStaged}`)
  return totalStaged
}

/**
 * Phase B: Validate — check web presence for pending candidates.
 */
async function phaseValidate(batchSize: number): Promise<{ validated: number; rejected: number }> {
  console.log('\n═══════════════════════════════════════════')
  console.log('  PHASE B: VALIDATE (web presence check)')
  console.log('═══════════════════════════════════════════')

  const pending = await db.vCDiscoveryCandidate.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  })

  if (pending.length === 0) {
    console.log('[PHASE-B] No pending candidates to validate.')
    return { validated: 0, rejected: 0 }
  }

  console.log(`[PHASE-B] Validating ${pending.length} candidate(s)…`)
  const autoReject = envBool('DISCOVERY_AUTO_REJECT_NO_WEB', true)
  let validated = 0
  let rejected = 0
  let inconclusive = 0

  for (const c of pending) {
    const result = await checkDiscoveryWebPresence(c.firmName)

    if (result === 'confirmed') {
      await db.vCDiscoveryCandidate.update({
        where: { id: c.id },
        data: { status: 'validated', webPresenceOk: true },
      })
      validated++
      console.log(`   ✓ ${c.firmName}`)
    } else if (result === 'inconclusive') {
      // Exa is degraded (quota/cooldown) — keep pending for next pass
      inconclusive++
      console.log(`   ⏸ ${c.firmName} (Exa degraded, will retry next pass)`)
    } else if (autoReject) {
      await db.vCDiscoveryCandidate.update({
        where: { id: c.id },
        data: { status: 'rejected', webPresenceOk: false, rejectReason: 'no_web_presence', processedAt: new Date() },
      })
      rejected++
      console.log(`   ✗ ${c.firmName} (no web presence)`)
    } else {
      await db.vCDiscoveryCandidate.update({
        where: { id: c.id },
        data: { webPresenceOk: false },
      })
      console.log(`   ? ${c.firmName} (no web presence, kept pending)`)
    }

    // If we hit multiple inconclusives in a row, Exa is toast — stop wasting calls
    if (inconclusive >= 3) {
      console.log(`[PHASE-B] Exa appears degraded (${inconclusive} inconclusive in a row), deferring remaining candidates.`)
      break
    }

    await sleep(500)
  }

  console.log(`\n[PHASE-B] Validated: ${validated}, Rejected: ${rejected}, Deferred: ${inconclusive}`)
  return { validated, rejected }
}

/**
 * Phase C: Research — full Exa+LLM research on validated candidates,
 * create Investor rows, run quality audit.
 */
async function phaseResearch(opts: {
  batchSize: number
  delayMs: number
  maxNew: number
}): Promise<{ ingested: number; rejected: number; errors: number }> {
  console.log('\n═══════════════════════════════════════════')
  console.log('  PHASE C: RESEARCH (full ingest pipeline)')
  console.log('═══════════════════════════════════════════')

  const validated = await db.vCDiscoveryCandidate.findMany({
    where: { status: 'validated' },
    orderBy: { createdAt: 'asc' },
    take: opts.batchSize,
  })

  if (validated.length === 0) {
    console.log('[PHASE-C] No validated candidates to research.')
    return { ingested: 0, rejected: 0, errors: 0 }
  }

  console.log(`[PHASE-C] Researching ${validated.length} candidate(s)…`)
  const qualityGate = envBool('DISCOVERY_QUALITY_GATE', true)
  let ingested = 0
  let rejected = 0
  let errors = 0

  for (const c of validated) {
    if (ingested >= opts.maxNew) {
      console.log(`[PHASE-C] Hit maxNew (${opts.maxNew}), stopping research.`)
      break
    }

    await db.vCDiscoveryCandidate.update({
      where: { id: c.id },
      data: { status: 'researching' },
    })

    try {
      const { ok, isNew, resolvedKey } = await ingestOneFirm(c.firmName, opts.delayMs)

      if (!ok) {
        await db.vCDiscoveryCandidate.update({
          where: { id: c.id },
          data: { status: 'rejected', rejectReason: 'research_failed', processedAt: new Date() },
        })
        rejected++
        continue
      }

      // Post-ingest quality checks for new entries
      if (isNew) {
        const inv = await db.investor.findFirst({
          where: { firmName: { equals: c.firmName, mode: 'insensitive' } },
        })
        if (inv) {
          // Check 1: Meaningful data gate — catch non-VCs that passed entity gate
          // (e.g. "Capital Outlook" = report title that got minimal scaffold data)
          const thesis = (inv.thesis || '').trim()
          let portfolio: unknown[] = []
          try { portfolio = JSON.parse(inv.portfolio || '[]') } catch {}
          const hasNoRealData =
            thesis.length < 20 &&
            inv.checkSizeMin === 0 && inv.checkSizeMax === 0 &&
            portfolio.length === 0 &&
            (!inv.websiteUrl || inv.websiteUrl.trim().length === 0)

          if (hasNoRealData) {
            console.warn(`   🚫 Scaffold-only data for ${c.firmName} — likely not a real VC. Removing.`)
            await db.investor.update({
              where: { id: inv.id },
              data: { isPublic: false, discoverable: false },
            })
            await db.vCDiscoveryCandidate.update({
              where: { id: c.id },
              data: { status: 'rejected', rejectReason: 'scaffold_only_data', processedAt: new Date() },
            })
            rejected++
            continue
          }

          // Check 2: Re-research if key fields are missing (fills gaps + auto-hides bogus)
          const hasMissingFields =
            inv.checkSizeMin === 0 && inv.checkSizeMax === 0 ||
            !inv.thesis || inv.thesis.trim().length < 40 ||
            inv.stages === '[]' ||
            inv.sectors === '[]'
          if (hasMissingFields) {
            console.log(`   🔄 Re-researching ${c.firmName} to fill missing fields…`)
            try {
              const reResearch = await researchVC(c.firmName, 'full', { investorId: inv.id })
              if (reResearch) {
                await updateVCInDatabase(normalizeResearchForDb(reResearch), inv.id)
                await syncInvestorEmbeddingById(inv.id)
                const updated = await db.investor.findUnique({ where: { id: inv.id } })
                if (updated) {
                  const filled: string[] = []
                  if (updated.checkSizeMin > 0 || updated.checkSizeMax > 0) filled.push('check size')
                  if (updated.thesis && updated.thesis.trim().length >= 40) filled.push('thesis')
                  if (updated.stages !== '[]') filled.push('stages')
                  if (updated.sectors !== '[]') filled.push('sectors')
                  console.log(`   ✅ Re-research filled: ${filled.length > 0 ? filled.join(', ') : 'no new data'}`)
                  // Use updated row for quality audit below
                  Object.assign(inv, updated)
                }
              }
            } catch (reErr) {
              console.warn(`   ⚠️  Re-research failed for ${c.firmName}: ${(reErr as Error).message}`)
            }
          }

          // Check 3: Standard quality audit
          if (qualityGate) {
            const auditInput: InvestorLocalAuditInput = {
              id: inv.id,
              firmName: inv.firmName,
              email: inv.email,
              thesis: inv.thesis,
              bio: inv.bio,
              checkSizeMin: inv.checkSizeMin,
              checkSizeMax: inv.checkSizeMax,
              stages: inv.stages,
              sectors: inv.sectors,
              geography: inv.geography,
              geoFocus: inv.geoFocus,
              fundType: inv.fundType,
              portfolio: inv.portfolio,
              websiteUrl: inv.websiteUrl,
              embedding: inv.embedding,
              isPublic: inv.isPublic,
              discoverable: inv.discoverable,
            }
            const audit = auditInvestorLocal(auditInput)

            if (audit.errorCount > 0) {
              console.warn(`   ⚠️  Quality gate: ${audit.errorCount} error(s) for ${c.firmName}`)
              for (const issue of audit.issues.filter((i) => i.level === 'error')) {
                console.warn(`      [${issue.code}] ${issue.message}`)
              }
              await db.investor.update({
                where: { id: inv.id },
                data: { discoverable: false },
              })
              console.log(`   🔒 Set discoverable=false for ${c.firmName} (quality gate)`)
            }
          }
        }
      }

      await db.vCDiscoveryCandidate.update({
        where: { id: c.id },
        data: { status: 'ingested', processedAt: new Date() },
      })
      ingested++
    } catch (e) {
      if (e instanceof ExaResearchQuotaBlockedError) {
        console.error('\n🛑 Exa quota/cooldown — pausing research phase.')
        await db.vCDiscoveryCandidate.update({
          where: { id: c.id },
          data: { status: 'validated' },
        })
        break
      }
      console.error(`   ❌ Error researching ${c.firmName}: ${(e as Error).message}`)
      await db.vCDiscoveryCandidate.update({
        where: { id: c.id },
        data: { status: 'rejected', rejectReason: `error: ${(e as Error).message}`.slice(0, 500), processedAt: new Date() },
      })
      errors++
    }
  }

  console.log(`\n[PHASE-C] Ingested: ${ingested}, Rejected: ${rejected}, Errors: ${errors}`)

  // Re-research: retry investors that were auto-hidden due to missing thesis or stages
  if (qualityGate && ingested > 0) {
    const hidden = await db.investor.findMany({
      where: {
        discoverable: false,
        isPublic: true,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { id: true, firmName: true, thesis: true, stages: true },
    })

    const needsRetry = hidden.filter((inv) => {
      const thesis = (inv.thesis || '').trim()
      let stages: unknown[] = []
      try { stages = JSON.parse(inv.stages || '[]') } catch {}
      return thesis.length < 20 || stages.length === 0
    })

    if (needsRetry.length > 0) {
      console.log(`\n[PHASE-C:RETRY] ${needsRetry.length} recently hidden investor(s) need re-research (missing thesis/stages)`)
      for (const inv of needsRetry.slice(0, 3)) {
        console.log(`   🔄 Re-researching: ${inv.firmName}`)
        try {
          const { ok } = await ingestOneFirm(inv.firmName, opts.delayMs)
          if (ok) {
            const updated = await db.investor.findUnique({ where: { id: inv.id } })
            if (updated) {
              const auditInput: InvestorLocalAuditInput = {
                id: updated.id, firmName: updated.firmName, email: updated.email,
                thesis: updated.thesis, bio: updated.bio,
                checkSizeMin: updated.checkSizeMin, checkSizeMax: updated.checkSizeMax,
                stages: updated.stages, sectors: updated.sectors, geography: updated.geography,
                geoFocus: updated.geoFocus, fundType: updated.fundType, portfolio: updated.portfolio,
                websiteUrl: updated.websiteUrl, embedding: updated.embedding,
                isPublic: updated.isPublic, discoverable: updated.discoverable,
              }
              const reAudit = auditInvestorLocal(auditInput)
              if (reAudit.errorCount === 0) {
                await db.investor.update({ where: { id: inv.id }, data: { discoverable: true } })
                console.log(`   ✅ ${inv.firmName} re-enabled after re-research`)
              } else {
                console.log(`   ⚠️  ${inv.firmName} still has ${reAudit.errorCount} error(s) after retry`)
              }
            }
          }
        } catch (e) {
          if (e instanceof ExaResearchQuotaBlockedError) break
          console.warn(`   ❌ Re-research failed for ${inv.firmName}: ${(e as Error).message}`)
        }
      }
    }
  }

  return { ingested, rejected, errors }
}

// ---------------------------------------------------------------------------
// CLI + main
// ---------------------------------------------------------------------------

function parseCli() {
  const argv = process.argv.slice(2)
  const out = {
    delayMs: 1500,
    loop: false,
    intervalMs: envInt('DISCOVERY_PASS_INTERVAL_MS', 60 * 60 * 1000),
    filePath: null as string | null,
    syncPrisma: false,
    limit: 25,
    cursor: undefined as string | undefined,
    researchName: null as string | null,
    discover: false,
    discoverRounds: envInt('DISCOVERY_ROUNDS_PER_PASS', 6),
    discoverPerQuery: 8,
    discoverQueryDelayMs: 1200,
    maxNew: 12,
    maxCandidates: 40,
    researchBatchSize: envInt('DISCOVERY_BATCH_SIZE', 10),
    once: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--delay-ms' && argv[i + 1]) {
      out.delayMs = Math.max(0, parseInt(argv[++i], 10) || 0)
    } else if (a === '--once') {
      out.once = true
    } else if (a === '--loop') {
      out.loop = true
    } else if (a === '--interval-ms' && argv[i + 1]) {
      out.intervalMs = Math.max(10_000, parseInt(argv[++i], 10) || out.intervalMs)
    } else if (a === '--file' && argv[i + 1]) {
      out.filePath = argv[++i]
    } else if (a === '--sync-prisma') {
      out.syncPrisma = true
    } else if (a === '--limit' && argv[i + 1]) {
      out.limit = Math.max(1, parseInt(argv[++i], 10) || out.limit)
    } else if (a === '--cursor' && argv[i + 1]) {
      out.cursor = argv[++i]
    } else if (a === '--discover') {
      out.discover = true
    } else if (a === '--discover-rounds' && argv[i + 1]) {
      out.discoverRounds = Math.max(1, parseInt(argv[++i], 10) || out.discoverRounds)
    } else if (a === '--discover-per-query' && argv[i + 1]) {
      out.discoverPerQuery = Math.max(3, parseInt(argv[++i], 10) || out.discoverPerQuery)
    } else if (a === '--discover-query-delay-ms' && argv[i + 1]) {
      out.discoverQueryDelayMs = Math.max(0, parseInt(argv[++i], 10) || 0)
    } else if (a === '--max-new' && argv[i + 1]) {
      out.maxNew = Math.max(1, parseInt(argv[++i], 10) || out.maxNew)
    } else if (a === '--max-candidates' && argv[i + 1]) {
      out.maxCandidates = Math.max(5, parseInt(argv[++i], 10) || out.maxCandidates)
    } else if (a === '--research-batch-size' && argv[i + 1]) {
      out.researchBatchSize = Math.max(1, parseInt(argv[++i], 10) || out.researchBatchSize)
    } else if (a === 'research') {
      out.researchName = argv.slice(i + 1).join(' ').trim() || null
      break
    }
  }

  return out
}

async function main() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!envUrl || !envKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Supabase sync will fail.')
  }

  const {
    delayMs,
    loop,
    intervalMs,
    filePath,
    syncPrisma,
    limit,
    cursor,
    researchName,
    discover,
    discoverRounds,
    discoverPerQuery,
    discoverQueryDelayMs,
    maxNew,
    maxCandidates,
    researchBatchSize,
    once,
  } = parseCli()

  const runContinuously = once ? false : loop || discover

  if (discover && runContinuously) {
    const s = (intervalMs / 1000).toFixed(intervalMs % 1000 === 0 ? 0 : 1)
    console.log(
      `🔁 Discover: 3-phase pipeline, continuous loop. Pause between passes: ${intervalMs}ms (~${s}s). Use --once for a single pass.`,
    )
  }

  const runOnce = async () => {
    if (syncPrisma) {
      await syncPrismaSlice(limit, cursor)
      return
    }
    if (discover) {
      const ts = new Date().toISOString()
      console.log(`\n${'='.repeat(60)}`)
      console.log(`  DISCOVERY PASS — ${ts}`)
      console.log(`${'='.repeat(60)}`)

      // Phase A: Discover names and stage candidates
      await phaseDiscover({
        rounds: discoverRounds,
        perQuery: discoverPerQuery,
        queryDelayMs: discoverQueryDelayMs,
        maxCandidates,
      })

      // Phase B: Validate pending candidates
      await phaseValidate(maxCandidates)

      // Phase C: Research validated candidates
      const result = await phaseResearch({
        batchSize: researchBatchSize,
        delayMs,
        maxNew,
      })

      // Summary
      const pendingCount = await db.vCDiscoveryCandidate.count({ where: { status: 'pending' } })
      const validatedCount = await db.vCDiscoveryCandidate.count({ where: { status: 'validated' } })
      const totalIngested = await db.vCDiscoveryCandidate.count({ where: { status: 'ingested' } })
      console.log(`\n${'─'.repeat(60)}`)
      console.log(`  PASS COMPLETE`)
      console.log(`  Ingested this pass: ${result.ingested}`)
      console.log(`  Pipeline backlog: ${pendingCount} pending, ${validatedCount} validated`)
      console.log(`  Total ingested (all time): ${totalIngested}`)
      console.log(`${'─'.repeat(60)}\n`)
      return
    }
    if (filePath) {
      const firms = parseFirmListFile(filePath)
      console.log(`\n📋 ${firms.length} firms from ${filePath}`)
      for (const firm of firms) {
        await ingestOneFirm(firm, delayMs)
      }
      return
    }
    if (researchName) {
      await ingestOneFirm(researchName, 0)
      return
    }
    console.log(`
VC Supabase ingest worker

  npx tsx scripts/vc-supabase-ingest-worker.ts research "Sequoia Capital"
  npx tsx scripts/vc-supabase-ingest-worker.ts --file scripts/data/vc-ingest-firms.example.json
  npx tsx scripts/vc-supabase-ingest-worker.ts --file firms.txt
  npx tsx scripts/vc-supabase-ingest-worker.ts --sync-prisma --limit 100
  npx tsx scripts/vc-supabase-ingest-worker.ts --sync-prisma --limit 50 --cursor <investorId>
  npx tsx scripts/vc-supabase-ingest-worker.ts --loop --interval-ms 3600000 --file firms.txt
  npx tsx scripts/vc-supabase-ingest-worker.ts --discover --max-new 15 --discover-rounds 5
  npx tsx scripts/vc-supabase-ingest-worker.ts --discover --once

Discover flags: --discover-rounds, --discover-per-query, --discover-query-delay-ms, --max-new,
  --max-candidates, --research-batch-size, --once (single pass; default is continuous loop)

Env overrides: DISCOVERY_BATCH_SIZE, DISCOVERY_ROUNDS_PER_PASS, DISCOVERY_PASS_INTERVAL_MS,
  DISCOVERY_AUTO_REJECT_NO_WEB, DISCOVERY_QUALITY_GATE

JSON file: ["Firm A","Firm B"]  |  .txt: one firm name per line (# comments ok)

Run supabase/vc_directory.sql in Supabase before first sync.
`)
  }

  await runOnce()
  while (runContinuously) {
    console.log(`\n⏳ Loop: sleeping ${intervalMs}ms…`)
    await sleep(intervalMs)
    await runOnce()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
