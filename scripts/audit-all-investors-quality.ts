#!/usr/bin/env tsx
/**
 * Audit every Investor in the database for data quality (local checks, no network).
 * Optionally cross-check a subset with Exa + LLM (same stack as vc:verify-db-exa).
 *
 * Usage:
 *   npx tsx scripts/audit-all-investors-quality.ts
 *   npx tsx scripts/audit-all-investors-quality.ts --json reports/investor-quality.json
 *   npx tsx scripts/audit-all-investors-quality.ts --public-only
 *   npx tsx scripts/audit-all-investors-quality.ts --exa --exa-limit 30
 *   npx tsx scripts/audit-all-investors-quality.ts --exa --exa-scope problematic --exa-limit 100
 *   npx tsx scripts/audit-all-investors-quality.ts --exa --exa-scope all --exa-limit 500
 *
 * Env: DATABASE_URL, optional EXA_API_KEY + LLM for --exa
 */

import * as fs from 'fs'
import * as path from 'path'
import 'dotenv/config'
import { db } from '../lib/db'
import {
  auditInvestorLocal,
  auditSeverityScore,
  type LocalInvestorAudit,
  type InvestorLocalAuditInput,
} from '../lib/investor-quality-audit'
import { verifyInvestorAgainstExa } from '../lib/vc-db-exa-quality-check'
import { hasVcLlmConfigured } from '../lib/openrouter'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseArgs() {
  const argv = process.argv.slice(2)
  const out = {
    jsonPath: null as string | null,
    publicOnly: false,
    exa: false,
    exaLimit: 50,
    exaScope: 'problematic' as 'problematic' | 'all',
    exaDelayMs: Math.max(500, parseInt(process.env.WORKER_VALIDATION_EXA_DELAY_MS || '2500', 10) || 2500),
    printRows: 40,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json' && argv[i + 1]) out.jsonPath = argv[++i]
    if (a === '--public-only') out.publicOnly = true
    if (a === '--exa') out.exa = true
    if (a === '--exa-limit' && argv[i + 1]) out.exaLimit = Math.max(1, parseInt(argv[++i], 10) || 50)
    if (a === '--exa-scope' && argv[i + 1]) {
      const v = argv[++i]
      if (v === 'all' || v === 'problematic') out.exaScope = v
    }
    if (a === '--exa-delay-ms' && argv[i + 1]) out.exaDelayMs = Math.max(200, parseInt(argv[++i], 10) || 2500)
    if (a === '--print-rows' && argv[i + 1]) out.printRows = Math.max(0, parseInt(argv[++i], 10) || 40)
  }
  return out
}

async function main() {
  const { jsonPath, publicOnly, exa, exaLimit, exaScope, exaDelayMs, printRows } = parseArgs()

  const rows = await db.investor.findMany({
    where: publicOnly ? { isPublic: true, discoverable: true } : undefined,
    select: {
      id: true,
      firmName: true,
      email: true,
      thesis: true,
      bio: true,
      checkSizeMin: true,
      checkSizeMax: true,
      stages: true,
      sectors: true,
      geography: true,
      fundType: true,
      portfolio: true,
      websiteUrl: true,
      embedding: true,
      isPublic: true,
      discoverable: true,
    },
    orderBy: { firmName: 'asc' },
  })

  const audits: LocalInvestorAudit[] = rows.map((r) =>
    auditInvestorLocal(r as InvestorLocalAuditInput),
  )

  let withErrors = 0
  let withWarns = 0
  const codeCounts = new Map<string, number>()

  for (const a of audits) {
    if (a.errorCount) withErrors++
    if (a.warnCount) withWarns++
    for (const iss of a.issues) {
      codeCounts.set(iss.code, (codeCounts.get(iss.code) || 0) + 1)
    }
  }

  const sorted = [...audits].sort((x, y) => auditSeverityScore(y) - auditSeverityScore(x))

  console.log('\n========== INVESTOR QUALITY AUDIT (local) ==========')
  console.log(`Total rows: ${audits.length}${publicOnly ? ' (public + discoverable only)' : ''}`)
  console.log(`Rows with ≥1 error: ${withErrors}`)
  console.log(`Rows with ≥1 warn:   ${withWarns}`)
  console.log('\nIssue codes (how many rows hit each):')
  const codesSorted = [...codeCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [code, n] of codesSorted) {
    console.log(`  ${code}: ${n}`)
  }

  if (printRows > 0) {
    const show = sorted.filter((a) => a.issues.length > 0).slice(0, printRows)
    if (show.length) {
      console.log(`\n--- Top ${show.length} problematic rows (by severity) ---`)
      for (const a of show) {
        console.log(
          `\n• ${a.firmName} (${a.id})  errors=${a.errorCount} warns=${a.warnCount} infos=${a.infoCount}`,
        )
        for (const iss of a.issues) {
          console.log(`    [${iss.level}] ${iss.code}: ${iss.message}`)
        }
      }
    } else {
      console.log('\nNo issues found on any row.')
    }
  }

  type ExaRow = {
    firmName: string
    id: string
    score: number
    aligned: boolean
    exaTotalResults: number
    issues: string[]
    summary?: string
    skippedReason?: string
  }
  const exaResults: ExaRow[] = []

  if (exa) {
    if (!process.env.EXA_API_KEY?.trim()) {
      console.error('\n--exa requires EXA_API_KEY')
      process.exitCode = 1
    } else if (!hasVcLlmConfigured()) {
      console.error('\n--exa requires OLLAMA_BASE_URL+OLLAMA_MODEL or OPENROUTER_API_KEY')
      process.exitCode = 1
    } else {
      let candidates = sorted
      if (exaScope === 'problematic') {
        candidates = sorted.filter((a) => a.errorCount > 0 || a.warnCount > 0)
      }
      const pick = candidates.slice(0, exaLimit)
      console.log(
        `\n========== Exa + LLM cross-check (${exaScope}, max ${exaLimit} rows) ==========\n`,
      )
      const exaSelect = {
        firmName: true,
        thesis: true,
        bio: true,
        checkSizeMin: true,
        checkSizeMax: true,
        stages: true,
        sectors: true,
        geography: true,
        fundType: true,
        portfolio: true,
        websiteUrl: true,
      } as const

      for (let i = 0; i < pick.length; i++) {
        const a = pick[i]
        const row = await db.investor.findUnique({
          where: { id: a.id },
          select: exaSelect,
        })
        if (!row) continue
        process.stdout.write(`[${i + 1}/${pick.length}] ${row.firmName}… `)
        try {
          const r = await verifyInvestorAgainstExa(row)
          if (!r) {
            console.log('skip')
            continue
          }
          exaResults.push({
            firmName: r.firmName,
            id: a.id,
            score: r.score,
            aligned: r.aligned,
            exaTotalResults: r.exaTotalResults,
            issues: r.issues,
            summary: r.summary,
            skippedReason: r.skippedReason,
          })
          const mark = r.aligned ? 'OK' : 'REVIEW'
          console.log(`${mark} score=${r.score} exa=${r.exaTotalResults}`)
        } catch (e: any) {
          console.log(`ERR ${e?.message || e}`)
        }
        if (i + 1 < pick.length) await sleep(exaDelayMs)
      }

      const low = exaResults.filter((r) => !r.aligned || r.score < 70)
      if (low.length) {
        console.log(`\n--- Exa+LLM: ${low.length} row(s) with aligned=false or score<70 ---`)
        for (const r of low) {
          console.log(`  ${r.firmName}: score=${r.score} ${r.issues.join('; ') || r.summary || ''}`)
        }
      }
    }
  }

  if (jsonPath) {
    const abs = path.isAbsolute(jsonPath) ? jsonPath : path.join(process.cwd(), jsonPath)
    const dir = path.dirname(abs)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const payload = {
      generatedAt: new Date().toISOString(),
      total: audits.length,
      publicOnly,
      withErrors,
      withWarns,
      issueCodeCounts: Object.fromEntries(codeCounts),
      rows: audits.map((a) => ({
        id: a.id,
        firmName: a.firmName,
        errorCount: a.errorCount,
        warnCount: a.warnCount,
        infoCount: a.infoCount,
        issues: a.issues,
      })),
      exaCrossCheck: exa ? { scope: exaScope, limit: exaLimit, results: exaResults } : undefined,
    }
    fs.writeFileSync(abs, JSON.stringify(payload, null, 2), 'utf8')
    console.log(`\nWrote ${abs}`)
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
