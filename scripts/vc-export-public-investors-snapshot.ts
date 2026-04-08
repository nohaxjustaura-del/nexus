#!/usr/bin/env tsx
/**
 * Export all isPublic=true investors to a JSON snapshot (ids + firm names + flags).
 * Use as a checkpoint before bulk operations; compare or restore manually if needed.
 *
 * Usage:
 *   npx tsx scripts/vc-export-public-investors-snapshot.ts
 *   npx tsx scripts/vc-export-public-investors-snapshot.ts --out ./my-snapshot.json
 */

import * as fs from 'fs'
import * as path from 'path'
import 'dotenv/config'
import { db } from '../lib/db'

const DEFAULT_OUT = path.join(
  process.cwd(),
  'scripts',
  'data',
  'vc-public-investors-snapshot.json',
)

function argvOut(): string | undefined {
  const i = process.argv.indexOf('--out')
  if (i >= 0 && process.argv[i + 1]) return path.resolve(process.argv[i + 1]!)
  return undefined
}

async function main() {
  const outPath = argvOut() ?? DEFAULT_OUT

  const rows = await db.investor.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      firmName: true,
      discoverable: true,
      verified: true,
      email: true,
      updatedAt: true,
    },
    orderBy: { firmName: 'asc' },
  })

  const payload = {
    version: 1 as const,
    description: 'Investors with isPublic=true at export time',
    exportedAt: new Date().toISOString(),
    count: rows.length,
    investors: rows,
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8')

  console.log(`\n✅ Wrote ${rows.length} public investor(s) to:\n   ${outPath}\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
