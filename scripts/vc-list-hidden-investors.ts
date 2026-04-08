#!/usr/bin/env tsx
/**
 * List investors hidden from the directory (not both public and discoverable).
 *
 * Usage:
 *   npx tsx scripts/vc-list-hidden-investors.ts
 */

import 'dotenv/config'
import { db } from '../lib/db'

async function main() {
  const rows = await db.investor.findMany({
    where: {
      NOT: {
        AND: [{ isPublic: true }, { discoverable: true }],
      },
    },
    select: {
      id: true,
      firmName: true,
      isPublic: true,
      discoverable: true,
      updatedAt: true,
    },
    orderBy: { firmName: 'asc' },
  })

  console.log(`\nHidden / partially hidden investors: ${rows.length}\n`)
  for (const r of rows) {
    const flags = `public=${r.isPublic} discoverable=${r.discoverable}`
    console.log(`${r.firmName}`)
    console.log(`   id=${r.id}  ${flags}  updatedAt=${r.updatedAt.toISOString()}`)
  }
  console.log('')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
