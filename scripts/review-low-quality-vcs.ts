#!/usr/bin/env tsx
import { db } from '../lib/db'
import { isLikelyRealFirmName } from '../lib/firm-name-quality'

type Cli = {
  confirmDelete: boolean
  limit: number
}

function parseCli(): Cli {
  const argv = process.argv.slice(2)
  const out: Cli = {
    confirmDelete: false,
    limit: 5000,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--confirm-delete') out.confirmDelete = true
    if (a === '--limit' && argv[i + 1]) {
      out.limit = Math.max(1, parseInt(argv[++i], 10) || out.limit)
    }
  }
  return out
}

async function ensureReviewTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS investor_quality_review (
      id BIGSERIAL PRIMARY KEY,
      investor_id TEXT NOT NULL UNIQUE,
      firm_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      snapshot JSONB NOT NULL,
      moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ NULL
    );
  `)
  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_investor_quality_review_deleted_at
    ON investor_quality_review (deleted_at);
  `)
}

async function main() {
  const { confirmDelete, limit } = parseCli()
  await ensureReviewTable()

  const investors = await db.investor.findMany({
    take: limit,
    orderBy: { createdAt: 'asc' },
  })

  const flagged = investors.filter((inv) => !isLikelyRealFirmName(inv.firmName))
  if (flagged.length === 0) {
    console.log('No low-quality firm names found.')
    return
  }

  console.log(`Found ${flagged.length} low-quality rows (from ${investors.length} scanned).`)

  let moved = 0
  for (const inv of flagged) {
    const snapshot = JSON.stringify(inv)
    await db.$executeRaw`
      INSERT INTO investor_quality_review (investor_id, firm_name, reason, snapshot)
      VALUES (${inv.id}, ${inv.firmName}, ${'failed_isLikelyRealFirmName'}, CAST(${snapshot} AS jsonb))
      ON CONFLICT (investor_id) DO UPDATE
      SET firm_name = EXCLUDED.firm_name,
          reason = EXCLUDED.reason,
          snapshot = EXCLUDED.snapshot,
          moved_at = NOW();
    `
    moved++
  }
  console.log(`Moved/updated ${moved} rows in investor_quality_review.`)

  if (!confirmDelete) {
    console.log('Dry-run delete mode: no Investor rows deleted.')
    console.log('Run with --confirm-delete to delete moved rows from Investor.')
    return
  }

  const ids = flagged.map((f) => f.id)
  const deleteResult = await db.investor.deleteMany({
    where: { id: { in: ids } },
  })

  await db.$executeRaw`
    UPDATE investor_quality_review
    SET deleted_at = NOW()
    WHERE investor_id = ANY(${ids}::text[]);
  `

  console.log(`Deleted ${deleteResult.count} Investor rows after confirmation.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

