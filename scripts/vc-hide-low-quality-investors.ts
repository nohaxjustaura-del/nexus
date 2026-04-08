#!/usr/bin/env tsx
/**
 * Hide investors with bogus / generic / article-style firm names from the product
 * and from worker spend (isPublic=false, discoverable=false).
 *
 * Scans the same corpus as Discover: isPublic=true (see app/founder/discover/page.tsx).
 * discoverable is not required — many public rows are discoverable=false but still listed.
 *
 * Uses lib/investor-worker-eligibility.ts (same rules as thesis/profile/contact workers).
 *
 * Usage:
 *   npx tsx scripts/vc-hide-low-quality-investors.ts           # dry-run: print counts + sample
 *   npx tsx scripts/vc-hide-low-quality-investors.ts --apply  # apply updates
 */

import 'dotenv/config'
import { db } from '../lib/db'
import { clearInvestorCache } from '../lib/investor-cache'
import { shouldAutoHideInvestorByName } from '../lib/investor-worker-eligibility'

const BATCH = 150

async function main() {
  const apply = process.argv.includes('--apply')

  const rows = await db.investor.findMany({
    where: {
      isPublic: true,
    },
    select: { id: true, firmName: true },
  })

  const toHide = rows.filter((r) => shouldAutoHideInvestorByName(r.firmName))

  console.log(
    `\n[vc-hide-low-quality] Public rows (Discover corpus): ${rows.length}. Candidates to hide: ${toHide.length}.`,
  )
  const preview = toHide.slice(0, 80)
  for (const r of preview) {
    console.log(`  • ${r.firmName}`)
  }
  if (toHide.length > preview.length) {
    console.log(`  … and ${toHide.length - preview.length} more`)
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to set isPublic=false and discoverable=false.\n')
    return
  }

  const ids = toHide.map((r) => r.id)
  let n = 0
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH)
    const res = await db.investor.updateMany({
      where: { id: { in: chunk } },
      data: { isPublic: false, discoverable: false },
    })
    n += res.count
  }
  clearInvestorCache()
  console.log(`\n✅ Hid ${n} investor row(s).\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
