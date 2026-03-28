#!/usr/bin/env tsx
/**
 * Align discoverable flags with the pristine quality bar (see lib/investor-pristine-gate.ts).
 *
 * Usage:
 *   npx tsx scripts/enforce-investor-pristine.ts           # dry-run counts
 *   npx tsx scripts/enforce-investor-pristine.ts --apply   # set discoverable=false on failures
 *   npx tsx scripts/enforce-investor-pristine.ts --apply --restore  # also re-enable rows that pass
 */

import 'dotenv/config'
import { Prisma } from '@prisma/client'
import { db } from '../lib/db'
import { evaluateInvestorPristine, type PristineInvestorInput } from '../lib/investor-pristine-gate'
import { clearInvestorCache } from '../lib/investor-cache'

const BATCH = 200

async function setDiscoverableForIds(ids: string[], discoverable: boolean) {
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    await db.$executeRaw`
      UPDATE "Investor"
      SET discoverable = ${discoverable}, "updatedAt" = NOW()
      WHERE id IN (${Prisma.join(batch)})
    `
  }
}

function parseArgs() {
  const argv = process.argv.slice(2)
  return {
    apply: argv.includes('--apply'),
    restore: argv.includes('--restore'),
    limit: (() => {
      const i = argv.indexOf('--limit')
      if (i >= 0 && argv[i + 1]) return Math.max(1, parseInt(argv[i + 1], 10) || 0)
      return 0
    })(),
  }
}

async function main() {
  const { apply, restore, limit } = parseArgs()

  const rows = await db.investor.findMany({
    ...(limit > 0 ? { take: limit } : {}),
    select: {
      id: true,
      firmName: true,
      email: true,
      thesis: true,
      bio: true,
      checkSizeMin: true,
      checkSizeMax: true,
      checkMin: true,
      checkMax: true,
      stages: true,
      sectors: true,
      geography: true,
      geoFocus: true,
      fundType: true,
      portfolio: true,
      websiteUrl: true,
      linkedinUrl: true,
      applicationUrl: true,
      embedding: true,
      isPublic: true,
      discoverable: true,
    },
    orderBy: { firmName: 'asc' },
  })

  const slice = limit > 0 ? rows.slice(0, limit) : rows
  let wouldHide = 0
  let wouldShow = 0
  const toHide: { id: string; firmName: string; reasons: string[] }[] = []
  const toShow: { id: string; firmName: string }[] = []

  for (const r of slice) {
    const input = r as unknown as PristineInvestorInput
    const { ok, reasons } = evaluateInvestorPristine(input)
    if (!ok && r.discoverable) {
      wouldHide++
      toHide.push({ id: r.id, firmName: r.firmName, reasons })
    }
    if (ok && !r.discoverable && r.isPublic) {
      wouldShow++
      toShow.push({ id: r.id, firmName: r.firmName })
    }
  }

  console.log('\n========== PRISTINE GATE (discoverable alignment) ==========')
  console.log(`Rows scanned: ${slice.length}`)
  console.log(`Discoverable today but fail pristine: ${wouldHide}`)
  if (restore) {
    console.log(`Hidden but pass pristine (restore candidates): ${wouldShow}`)
  }

  const preview = 25
  if (toHide.length) {
    console.log(`\n--- First ${Math.min(preview, toHide.length)} that would be hidden ---`)
    for (const x of toHide.slice(0, preview)) {
      console.log(`  • ${x.firmName}: ${x.reasons.join(', ')}`)
    }
  }

  if (!apply) {
    console.log('\nDry run only. Pass --apply to update discoverable=false for failing rows.')
    if (restore) {
      console.log('With --restore, rows that pass will get discoverable=true (still isPublic).')
    }
    await db.$disconnect()
    return
  }

  const hideIds = toHide.map((x) => x.id)
  await setDiscoverableForIds(hideIds, false)
  const hidden = hideIds.length

  let restored = 0
  if (restore) {
    const showIds = toShow.map((x) => x.id)
    await setDiscoverableForIds(showIds, true)
    restored = showIds.length
  }

  clearInvestorCache()
  console.log(`\nUpdated: discoverable=false for ${hidden} row(s).`)
  if (restore) {
    console.log(`Restored discoverable=true for ${restored} row(s).`)
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
