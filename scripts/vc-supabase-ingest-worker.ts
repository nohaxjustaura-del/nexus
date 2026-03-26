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
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required for Supabase sync)
 *   SUPABASE_VC_TABLE (optional, default vc_directory)
 *   DATABASE_URL (Prisma)
 *   OPENROUTER_API_KEY for per-firm research after discovery (auto-research-vcs); optional if you only list names
 *   --discover requires BOTH TAVILY_API_KEY and EXA_API_KEY: Exa scrapes, Tavily answers + extracts (no OpenRouter in discovery)
 *   Discover uses VC_DISCOVERY_CONTENT_SINCE (default 2026-01-01) for Exa + Tavily search.
 */

import * as fs from 'fs'
import * as path from 'path'
import { db } from '../lib/db'
import {
  discoverNewFirmNamesNotInDatabase,
  loadExistingFirmKeysFromDb,
  normalizeFirmKey,
} from '../lib/vc-discovery-from-web'
import { ingestFirmToPrisma } from '../lib/vc-prisma-ingest'
import { upsertInvestorToVcDirectory } from '../lib/vc-supabase-sync'

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
  const sync = await upsertInvestorToVcDirectory(investor, { researchSources: sources })
  if (!sync.ok) {
    console.error(`   ❌ Supabase: ${sync.error}`)
  } else {
    const tag = isNew ? 'new' : 'updated'
    console.log(`   ✅ Prisma + Supabase (${tag}): ${investor.firmName} (${investor.id})`)
  }
  if (delayAfterMs > 0) await sleep(delayAfterMs)
  return { ok: true, isNew, resolvedKey: resolvedKey || null }
}

function parseCli() {
  const argv = process.argv.slice(2)
  const out = {
    delayMs: 2500,
    loop: false,
    intervalMs: 60 * 60 * 1000,
    filePath: null as string | null,
    syncPrisma: false,
    limit: 25,
    cursor: undefined as string | undefined,
    researchName: null as string | null,
    discover: false,
    discoverRounds: 4,
    discoverPerQuery: 8,
    discoverQueryDelayMs: 1200,
    maxNew: 12,
    maxCandidates: 40,
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
    once,
  } = parseCli()

  /** Discover mode loops forever by default so the worker keeps finding new firms; use --once to stop after one pass. */
  const runContinuously = once ? false : loop || discover

  if (discover && runContinuously) {
    console.log(
      `🔁 Discover worker will repeat every ${intervalMs}ms (use --once for a single pass, --interval-ms to change).`,
    )
  }

  const runOnce = async () => {
    if (syncPrisma) {
      await syncPrismaSlice(limit, cursor)
      return
    }
    if (discover) {
      console.log('\n🔎 Discover mode: randomized web search → new firms only\n')
      const candidates = await discoverNewFirmNamesNotInDatabase({
        searchRounds: discoverRounds,
        resultsPerQuery: discoverPerQuery,
        maxNames: maxCandidates,
        delayBetweenQueriesMs: discoverQueryDelayMs,
      })
      console.log(`\n📋 ${candidates.length} candidate(s) not in DB (by name); ingesting until ${maxNew} new row(s)…`)
      const keys = await loadExistingFirmKeysFromDb()
      let newCount = 0
      for (const name of candidates) {
        if (newCount >= maxNew) break
        const key = normalizeFirmKey(name)
        if (key && keys.has(key)) continue
        const { ok, isNew, resolvedKey } = await ingestOneFirm(name, delayMs)
        if (!ok) continue
        if (resolvedKey) keys.add(resolvedKey)
        if (isNew) newCount++
      }
      console.log(`\n✅ Discover pass finished: ${newCount} new investor(s) (cap ${maxNew}).`)
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

Discover flags: --discover-rounds, --discover-per-query, --discover-query-delay-ms, --max-new, --max-candidates, --once (single pass; default is repeat with --interval-ms)

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
