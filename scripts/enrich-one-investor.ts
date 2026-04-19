#!/usr/bin/env tsx
/**
 * Run full investor enrichment (Exa + LLM) for one Investor and print results.
 *
 * Commands (from repo root):
 *   npm run enrich:one -- --firm "Sequoia Capital"
 *   npm run enrich:one -- --id "clxxxxxxxx"
 *   npm run enrich:one -- --firm "Acme VC" --verbose
 *
 * Env: DATABASE_URL, EXA_API_KEYS (or EXA_API_KEY), OPENROUTER or Ollama for VC LLM.
 * Optional: INVESTOR_ENRICH_EXA_DELAY_MS (default 600 ms between Exa queries).
 * Debug rawSources file: set INVESTOR_ENRICH_DUMP_RAW=1 (or true) in .env.local, OR for one session:
 *   CMD:  set INVESTOR_ENRICH_DUMP_RAW=1&& npm run enrich:one -- --firm "Name"
 *   PowerShell: $env:INVESTOR_ENRICH_DUMP_RAW='1'; npm run enrich:one -- --firm "Name"
 *   (PowerShell `set X=1` does NOT set process env for child processes — use $env: or .env.local.)
 * Optional INVESTOR_ENRICH_DUMP_RAW_PATH=absolute-or-relative-path.txt (default: debug-raw-sources.txt in cwd).
 * INVESTOR_ENRICH_DEBUG_FIRM=1 — logs rawSources length + preview before firm-field extraction (or use --verbose).
 *
 * Database: run `npx prisma migrate deploy` (or `db:migrate:deploy`) so Investor enrichment columns exist.
 */

import '@/lib/load-env'
import { db } from '@/lib/db'
import { getExaApiKeys } from '@/lib/exa-keys'
import {
  enrichInvestorById,
  findInvestorIdsByFirmNameLoose,
} from '@/lib/investor-enrichment'

function parseArgs() {
  const argv = process.argv.slice(2)
  let firm: string | null = null
  let id: string | null = null
  let verbose = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--firm' && argv[i + 1]) {
      firm = argv[++i]!.trim()
    } else if (argv[i] === '--id' && argv[i + 1]) {
      id = argv[++i]!.trim()
    } else if (argv[i] === '--verbose') {
      verbose = true
    }
  }
  return { firm, id, verbose }
}

function printEnrichmentReport(
  firmName: string,
  investorId: string,
  result: Awaited<ReturnType<typeof enrichInvestorById>>,
) {
  const { firm, deals, meta, skippedPersist, sectorsUpdated } = result
  const inv = result.investor
  const withAmount = deals.filter((d) => d.amount != null).length
  const leadRounds = deals.filter((d) => d.isLead === true).length
  const years = deals.map((d) => d.investmentYear).filter((y): y is number => y != null)
  const yearSpan =
    years.length > 0 ? `${Math.min(...years)}–${Math.max(...years)}` : 'n/a'

  let dbSectors = '—'
  try {
    const arr = JSON.parse(inv.sectors || '[]') as unknown
    if (Array.isArray(arr)) dbSectors = arr.map(String).join(', ')
  } catch {
    dbSectors = inv.sectors || '—'
  }

  console.log('')
  console.log('████████████████████████████████████████████████████████████████████████')
  console.log('██  ENRICHMENT RESULT (copy this block)                                ██')
  console.log('████████████████████████████████████████████████████████████████████████')
  console.log('')
  console.log(`Investor id:        ${investorId}`)
  console.log(`Firm:               ${firmName}`)
  console.log(
    `Founded:            ${inv.foundedYear ?? '—'} (confidence: ${firm.confidence.foundedYear}/10)`,
  )
  console.log(`Partners found:     ${firm.partnerNames.length}`)
  if (firm.partnerNames.length) console.log(`  names:            ${firm.partnerNames.join(', ')}`)
  console.log(
    `Sectors (model):    ${firm.sectors.length ? firm.sectors.join(', ') : '—'} (confidence: ${firm.confidence.sectors}/10)`,
  )
  console.log(`Sectors (DB):       ${dbSectors} (written this run: ${sectorsUpdated})`)
  console.log(
    `Actively investing: ${inv.activelyInvesting} (model: ${firm.activelyInvesting === null ? 'null' : String(firm.activelyInvesting)}, conf: ${firm.confidence.activelyInvesting}/10)`,
  )
  console.log(`Portfolio deals:    ${deals.length} (${yearSpan})`)
  console.log(`  - with amount:     ${withAmount}`)
  console.log(`  - lead rounds:     ${leadRounds}`)
  console.log(`Exa hits / query:    ${meta.hitsPerQuery.join(', ')}`)
  console.log(
    `Exa key / query (1-based): ${meta.exaKeyIndexByQuery.map((k) => (k == null ? '—' : String(k))).join(', ')}`,
  )
  console.log(`Exa query name used: ${meta.exaQueryNameUsed}`)
  console.log(
    `rawSources chars:    ${meta.rawSourcesCharCount} (dump: .env.local INVESTOR_ENRICH_DUMP_RAW=1 or PowerShell $env:INVESTOR_ENRICH_DUMP_RAW='1')`,
  )
  console.log(`Persist:            ${skippedPersist ? 'skipped (no net change)' : 'saved'}`)
  if (meta.warnings.length) console.log(`Warnings:           ${meta.warnings.join('; ')}`)
  console.log('')
  console.log('--- Firm fields (extracted JSON) ---')
  console.log(JSON.stringify(firm, null, 2))
  console.log('')
  console.log(`--- Portfolio deals (${deals.length}) ---`)
  for (const d of deals) {
    const urlShort = d.sourceUrl.length > 90 ? `${d.sourceUrl.slice(0, 90)}…` : d.sourceUrl
    console.log(
      `  • ${d.companyName} | y=${d.investmentYear ?? '—'} | $${d.amount ?? '—'}M | lead=${d.isLead} | conf=${d.confidence} | ${urlShort}`,
    )
  }
  console.log('')
  console.log('--- Investor row after run (JSON) ---')
  console.log(JSON.stringify(result.investor, null, 2))
  console.log('')
  console.log('████████████████████████████████████████████████████████████████████████')
  console.log('██  END ENRICHMENT RESULT                                               ██')
  console.log('████████████████████████████████████████████████████████████████████████')
  console.log('')
}

async function main() {
  const { firm, id, verbose } = parseArgs()
  if ((firm && id) || (!firm && !id)) {
    console.error(
      'Usage: npm run enrich:one -- --firm "Firm Name"  |  --id <investorId>  [--verbose]',
    )
    process.exit(1)
  }

  let investorId = id
  let displayName = firm || ''

  if (firm && !id) {
    const matches = await findInvestorIdsByFirmNameLoose(firm)
    if (matches.length === 0) {
      console.error(`[ENRICH] No investor found matching firm: "${firm}"`)
      process.exit(1)
    }
    if (matches.length > 1) {
      console.error(`[ENRICH] Ambiguous firm "${firm}" — ${matches.length} matches:`)
      for (const m of matches) console.error(`   ${m.id}  ${m.firmName}`)
      console.error('Pass --id <one of the above> to disambiguate.')
      process.exit(1)
    }
    investorId = matches[0]!.id
    displayName = matches[0]!.firmName
  }

  if (!investorId) {
    console.error('[ENRICH] Missing investor id')
    process.exit(1)
  }

  const row = await db.investor.findUnique({
    where: { id: investorId },
    select: { firmName: true },
  })
  if (!row) {
    console.error(`[ENRICH] Investor not found: ${investorId}`)
    process.exit(1)
  }
  displayName = row.firmName

  const exaKeyCount = getExaApiKeys().length
  if (!verbose) {
    console.log(
      `[ENRICH] Running (quiet): ${displayName} (${investorId}) — full result prints below when done.`,
    )
    console.log(`[ENRICH] Exa API keys loaded: ${exaKeyCount} (failover + round-robin via lib/exa-key-failover.ts)`)
  } else {
    console.log(`[ENRICH] Running (verbose): ${displayName} (${investorId})`)
    console.log(`[ENRICH] Exa API keys loaded: ${exaKeyCount}`)
  }

  const result = await enrichInvestorById(investorId, { verbose })

  printEnrichmentReport(displayName, investorId, result)
}

main()
  .catch((e) => {
    console.error('[ENRICH] Fatal:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
