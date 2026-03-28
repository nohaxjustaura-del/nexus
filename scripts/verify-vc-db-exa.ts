#!/usr/bin/env tsx
/**
 * Spot-check Investor rows: fresh Exa retrieval + configured LLM judges consistency with DB.
 *
 * Prereqs: DATABASE_URL, EXA_API_KEY, and OPENROUTER_API_KEY.
 *
 * Usage:
 *   npx tsx scripts/verify-vc-db-exa.ts --limit 5
 *   npx tsx scripts/verify-vc-db-exa.ts --limit 3 --firm "Sequoia Capital"
 */

import 'dotenv/config'
import { db } from '../lib/db'
import { verifyInvestorAgainstExa } from '../lib/vc-db-exa-quality-check'
import { isLikelyRealFirmName } from '../lib/firm-name-quality'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const argv = process.argv.slice(2)
  let limit = 5
  let firm: string | null = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit' && argv[i + 1]) limit = Math.max(1, parseInt(argv[++i], 10) || 5)
    if (argv[i] === '--firm' && argv[i + 1]) firm = argv[++i]
  }

  const select = {
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

  const rows = firm
    ? await db.investor.findMany({
        where: { firmName: { contains: firm, mode: 'insensitive' } },
        select,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      })
    : await db.investor.findMany({
        where: { isPublic: true, discoverable: true },
        select,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      })

  if (!rows.length) {
    console.log('No investors matched.')
    await db.$disconnect()
    return
  }

  const delayMs = Math.max(500, parseInt(process.env.WORKER_VALIDATION_EXA_DELAY_MS || '2500', 10) || 2500)

  console.log(
    `\nVerifying ${rows.length} row(s) with Exa + OpenRouter LLM\n`,
  )

  for (const row of rows) {
    if (!isLikelyRealFirmName(row.firmName)) {
      console.log(`⏭️  Skip (firm name quality): ${row.firmName}`)
      continue
    }
    const r = await verifyInvestorAgainstExa(row)
    if (!r) continue
    const icon = r.aligned ? '✅' : '⚠️'
    console.log(
      `${icon} ${r.firmName}  score=${r.score}/100  aligned=${r.aligned}  exaHits=${r.exaTotalResults} passes=${r.exaPassesWithHits}`,
    )
    if (r.summary) console.log(`   ${r.summary}`)
    if (r.issues.length) console.log(`   issues: ${r.issues.join('; ')}`)
    await sleep(delayMs)
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
