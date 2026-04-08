#!/usr/bin/env tsx
/**
 * Restore isPublic=true for hidden rows that do NOT canonically duplicate an existing
 * public investor (see lib/investor-canonical-key.ts). Skips variants like a second
 * "Andreessen Horowitz" when "Andreessen Horowitz (a16z)" is already public.
 *
 * Usage:
 *   npx tsx scripts/vc-restore-if-not-canonical-dup.ts                    # dry-run
 *   npx tsx scripts/vc-restore-if-not-canonical-dup.ts --apply
 *   npx tsx scripts/vc-restore-if-not-canonical-dup.ts --all-hidden        # all isPublic=false (no backup)
 *   npx tsx scripts/vc-restore-if-not-canonical-dup.ts --backup <path>
 *   npx tsx scripts/vc-restore-if-not-canonical-dup.ts --report ./out.json   # custom report path
 */

import * as fs from 'fs'
import * as path from 'path'
import 'dotenv/config'
import { db } from '../lib/db'
import { clearInvestorCache } from '../lib/investor-cache'
import { canonicalInvestorKey } from '../lib/investor-canonical-key'

const BACKUP_DEFAULT = path.join(process.cwd(), 'scripts', 'data', 'vc-nondiscoverable-hidden-backup.json')
const REPORT_DEFAULT = path.join(process.cwd(), 'scripts', 'data', 'vc-restore-non-canonical-report.json')

const BATCH = 150

function parseBackupIds(raw: string): { id: string; firmName: string }[] {
  const j = JSON.parse(raw) as unknown
  if (Array.isArray(j)) {
    return j.filter((x): x is string => typeof x === 'string').map((id) => ({ id, firmName: '' }))
  }
  if (j && typeof j === 'object' && 'rows' in j && Array.isArray((j as { rows: unknown }).rows)) {
    return (j as { rows: { id: string; firmName: string }[] }).rows
  }
  throw new Error('Invalid backup JSON')
}

async function main() {
  const apply = process.argv.includes('--apply')
  const sourceAllHidden =
    process.argv.includes('--all-hidden') ||
    (process.argv.includes('--source') && process.argv.includes('all-hidden'))
  const backupArg = (() => {
    const i = process.argv.indexOf('--backup')
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : undefined
  })()
  const reportArg = (() => {
    const i = process.argv.indexOf('--report')
    return i >= 0 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]!) : undefined
  })()

  const publicRows = await db.investor.findMany({
    where: { isPublic: true },
    select: { id: true, firmName: true },
  })
  const publicCanonicalKeys = new Set<string>()
  for (const r of publicRows) {
    publicCanonicalKeys.add(canonicalInvestorKey(r.firmName))
  }
  console.log(`\nPublic investors: ${publicRows.length} → ${publicCanonicalKeys.size} canonical key(s).\n`)

  let candidates: { id: string; firmName: string }[] = []

  if (sourceAllHidden) {
    const hidden = await db.investor.findMany({
      where: { isPublic: false },
      select: { id: true, firmName: true },
      orderBy: { firmName: 'asc' },
    })
    candidates = hidden.map((r) => ({ id: r.id, firmName: r.firmName }))
    console.log(`Source: all isPublic=false (${candidates.length} rows).`)
  } else {
    const p = backupArg ?? BACKUP_DEFAULT
    if (!fs.existsSync(p)) {
      console.error(
        `No backup at ${p}. Use --source all-hidden or restore from vc-hide-nondiscoverable backup.\n`,
      )
      process.exit(1)
    }
    const parsed = parseBackupIds(fs.readFileSync(p, 'utf8'))
    const ids = parsed.map((x) => x.id)
    const rows = await db.investor.findMany({
      where: { id: { in: ids } },
      select: { id: true, firmName: true },
    })
    const byId = new Map(rows.map((r) => [r.id, r]))
    candidates = ids
      .map((id) => {
        const r = byId.get(id)
        return r ? { id: r.id, firmName: r.firmName } : null
      })
      .filter((x): x is { id: string; firmName: string } => x != null)
    console.log(`Source: backup (${candidates.length} rows found in DB).`)
  }

  candidates.sort(
    (a, b) =>
      a.firmName.length - b.firmName.length || a.firmName.localeCompare(b.firmName),
  )

  const wouldRestore: typeof candidates = []
  const skipCanon: {
    id: string
    firmName: string
    canonicalKey: string
    reason: 'canonical_key_already_public' | 'canonical_key_taken_by_earlier_candidate'
  }[] = []

  const seenRestoreKeys = new Set<string>(publicCanonicalKeys)

  for (const c of candidates) {
    const k = canonicalInvestorKey(c.firmName)
    if (seenRestoreKeys.has(k)) {
      const reason = publicCanonicalKeys.has(k)
        ? 'canonical_key_already_public'
        : 'canonical_key_taken_by_earlier_candidate'
      skipCanon.push({ id: c.id, firmName: c.firmName, canonicalKey: k, reason })
      continue
    }
    seenRestoreKeys.add(k)
    wouldRestore.push(c)
  }

  console.log(`Would restore isPublic=true: ${wouldRestore.length}`)
  console.log(`Skip (canonical already taken): ${skipCanon.length}`)

  const reportPath = reportArg ?? REPORT_DEFAULT
  const reportPayload = {
    version: 1 as const,
    generatedAt: new Date().toISOString(),
    dryRun: !apply,
    applied: apply,
    source: sourceAllHidden ? 'all-hidden' : 'backup',
    backupPath: sourceAllHidden ? null : path.resolve(backupArg ?? BACKUP_DEFAULT),
    publicInvestorCount: publicRows.length,
    publicCanonicalKeyCount: publicCanonicalKeys.size,
    candidateCount: candidates.length,
    wouldRestoreCount: wouldRestore.length,
    skippedCount: skipCanon.length,
    wouldRestore: wouldRestore.map((r) => ({
      id: r.id,
      firmName: r.firmName,
      canonicalKey: canonicalInvestorKey(r.firmName),
    })),
    skipped: skipCanon,
  }
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), 'utf8')
  console.log(`\nFull report written to:\n  ${reportPath}`)

  const preview = 35
  if (wouldRestore.length) {
    console.log(`\n--- First ${Math.min(preview, wouldRestore.length)} to restore ---`)
    for (const r of wouldRestore.slice(0, preview)) {
      console.log(`  • ${r.firmName}  [${canonicalInvestorKey(r.firmName)}]`)
    }
    if (wouldRestore.length > preview) console.log(`  … +${wouldRestore.length - preview} more (see report file)`)
  }

  if (skipCanon.length) {
    console.log(`\n--- First ${Math.min(20, skipCanon.length)} skipped (canonical dup) ---`)
    for (const s of skipCanon.slice(0, 20)) {
      console.log(`  • ${s.firmName}  [${s.canonicalKey}]  (${s.reason})`)
    }
    if (skipCanon.length > 20) {
      console.log(`  … +${skipCanon.length - 20} more (see report file)`)
    }
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to update DB.\n')
    return
  }

  let n = 0
  for (let i = 0; i < wouldRestore.length; i += BATCH) {
    const batch = wouldRestore.slice(i, i + BATCH).map((r) => r.id)
    const res = await db.investor.updateMany({
      where: { id: { in: batch } },
      data: { isPublic: true },
    })
    n += res.count
  }

  clearInvestorCache()
  console.log(`\n✅ Set isPublic=true for ${n} row(s).\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
