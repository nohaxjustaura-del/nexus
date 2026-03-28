#!/usr/bin/env tsx
/**
 * Fix Investor.firmName values that were saved as press headlines or SERP noise.
 *
 *   npx tsx scripts/fix-headline-firm-names.ts           # dry-run: print planned updates
 *   npx tsx scripts/fix-headline-firm-names.ts --apply  # write to DB
 */
import { db } from '../lib/db'
import {
  looksLikeFundraisingHeadline,
  normalizeHeadlineFirmName,
} from '../lib/firm-name-normalize'

async function main() {
  const apply = process.argv.includes('--apply')

  const investors = await db.investor.findMany({
    select: { id: true, firmName: true, thesis: true },
  })

  const rows: {
    id: string
    from: string
    to: string | null
    reason: string
  }[] = []

  for (const inv of investors) {
    if (!looksLikeFundraisingHeadline(inv.firmName)) continue
    const normalized = normalizeHeadlineFirmName(inv.firmName, inv.thesis)
    if (normalized === null) {
      rows.push({
        id: inv.id,
        from: inv.firmName,
        to: null,
        reason: 'article_or_unparsed',
      })
      continue
    }
    if (normalized === inv.firmName) continue
    rows.push({ id: inv.id, from: inv.firmName, to: normalized, reason: 'normalized' })
  }

  console.log(
    `Scanned ${investors.length} investors; ${rows.length} headline-like rows.\n`,
  )

  const toApply = rows.filter((r) => r.to !== null) as Array<{
    id: string
    from: string
    to: string
    reason: string
  }>
  const needsReview = rows.filter((r) => r.to === null)

  for (const r of toApply) {
    console.log(`[fix] ${r.from}\n      → ${r.to} (${r.id})\n`)
  }
  for (const r of needsReview) {
    console.log(`[review] ${r.from}\n         (${r.id})\n`)
  }

  if (!apply) {
    console.log('\nDry run. Pass --apply to update firmName in the database.')
    return
  }

  let updated = 0
  for (const r of toApply) {
    await db.investor.update({
      where: { id: r.id },
      data: { firmName: r.to },
    })
    updated++
  }
  console.log(`\nUpdated ${updated} investors.`)

  // ValleyNXT rows polluted with another fund's thesis (scraped SERP mix-up)
  const polluted = await db.investor.findMany({
    where: {
      firmName: 'ValleyNXT Ventures',
      thesis: { contains: 'Gradient' },
    },
    select: { id: true },
  })
  if (polluted.length > 0) {
    const donors = await db.investor.findMany({
      where: {
        firmName: 'ValleyNXT Ventures',
        NOT: { thesis: { contains: 'Gradient' } },
      },
      select: { thesis: true },
    })
    const donor = donors
      .filter((d) => (d.thesis?.length ?? 0) > 80)
      .sort((a, b) => (b.thesis?.length ?? 0) - (a.thesis?.length ?? 0))[0]
    const replacement = donor?.thesis?.trim()
    if (replacement && replacement.length > 80) {
      for (const p of polluted) {
        await db.investor.update({
          where: { id: p.id },
          data: { thesis: replacement },
        })
      }
      console.log(
        `\nReplaced polluted ValleyNXT thesis (Gradient) on ${polluted.length} row(s).`,
      )
    }
  }
  if (needsReview.length) {
    console.log(
      `${needsReview.length} rows need manual cleanup (article titles / ambiguous).`,
    )
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
