#!/usr/bin/env tsx
/**
 * Temporarily remove non-discoverable investors from the public directory:
 * sets isPublic=false where discoverable=false and isPublic=true.
 *
 * Reversible: --apply writes a backup JSON; --restore sets isPublic=true again from that backup.
 * After restore, the backup is renamed (archived), not deleted, so you keep an audit trail.
 *
 * Usage:
 *   npx tsx scripts/vc-hide-nondiscoverable-from-public.ts              # dry-run
 *   npx tsx scripts/vc-hide-nondiscoverable-from-public.ts --apply    # hide + write backup
 *   npx tsx scripts/vc-hide-nondiscoverable-from-public.ts --restore    # undo from default backup path
 *   npx tsx scripts/vc-hide-nondiscoverable-from-public.ts --restore --backup ./my-backup.json
 *   npx tsx scripts/vc-hide-nondiscoverable-from-public.ts --restore --dry-run  # preview only
 */

import * as fs from 'fs'
import * as path from 'path'
import 'dotenv/config'
import { db } from '../lib/db'
import { clearInvestorCache } from '../lib/investor-cache'

const BACKUP_DEFAULT = path.join(process.cwd(), 'scripts', 'data', 'vc-nondiscoverable-hidden-backup.json')

const BATCH = 200

type BackupV2 = {
  version: 2
  action: 'hide-nondiscoverable-public'
  appliedAt: string
  rows: { id: string; firmName: string }[]
}

function parseBackupIds(raw: string): { ids: string[]; rows?: { id: string; firmName: string }[] } {
  const j = JSON.parse(raw) as unknown
  if (Array.isArray(j)) {
    const ids = j.filter((x): x is string => typeof x === 'string')
    return { ids }
  }
  if (j && typeof j === 'object' && 'rows' in j && Array.isArray((j as BackupV2).rows)) {
    const b = j as BackupV2
    const ids = b.rows.map((r) => r.id).filter(Boolean)
    return { ids, rows: b.rows }
  }
  throw new Error('Invalid backup: expected string[] or { version, rows }')
}

function writeBackup(rows: { id: string; firmName: string }[]): string {
  fs.mkdirSync(path.dirname(BACKUP_DEFAULT), { recursive: true })
  const appliedAt = new Date().toISOString()
  const payload: BackupV2 = {
    version: 2,
    action: 'hide-nondiscoverable-public',
    appliedAt,
    rows,
  }
  const json = JSON.stringify(payload, null, 2)
  fs.writeFileSync(BACKUP_DEFAULT, json, 'utf8')
  const snapshotPath = path.join(
    path.dirname(BACKUP_DEFAULT),
    `vc-nondiscoverable-hidden-backup-${appliedAt.replace(/[:.]/g, '-')}.json`,
  )
  fs.writeFileSync(snapshotPath, json, 'utf8')
  return snapshotPath
}

async function setPublicForIds(ids: string[], value: boolean): Promise<number> {
  let n = 0
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    const r = await db.investor.updateMany({
      where: { id: { in: batch } },
      data: { isPublic: value },
    })
    n += r.count
  }
  return n
}

function argvValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  if (i === -1 || i + 1 >= process.argv.length) return undefined
  return process.argv[i + 1]
}

async function main() {
  const apply = process.argv.includes('--apply')
  const restore = process.argv.includes('--restore')
  const dryRestore = process.argv.includes('--dry-run') && restore
  const backupPath = argvValue('--backup') ?? BACKUP_DEFAULT

  if (restore) {
    if (!fs.existsSync(backupPath)) {
      console.error(`No backup at ${backupPath}. Pass --backup <path> if the file was moved.\n`)
      process.exit(1)
    }
    const raw = fs.readFileSync(backupPath, 'utf8')
    let ids: string[]
    let rows: { id: string; firmName: string }[] | undefined
    try {
      const p = parseBackupIds(raw)
      ids = p.ids
      rows = p.rows
    } catch (e) {
      console.error(String(e))
      process.exit(1)
    }
    if (ids.length === 0) {
      console.error('Backup has no ids.\n')
      process.exit(1)
    }

    console.log(`\n[restore] ${ids.length} id(s) in backup ${backupPath}`)
    if (rows?.length) {
      const prev = rows.slice(0, 25)
      for (const r of prev) console.log(`  • ${r.firmName}`)
      if (rows.length > prev.length) console.log(`  … and ${rows.length - prev.length} more`)
    }

    if (dryRestore) {
      console.log('\nDry run only (no DB writes). Omit --dry-run to apply.\n')
      return
    }

    const updated = await setPublicForIds(ids, true)
    clearInvestorCache()

    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const archived = backupPath.replace(/\.json$/i, `.restored-${stamp}.json`)
    try {
      fs.renameSync(backupPath, archived)
      console.log(`\n✅ Restored isPublic=true for ${updated} row(s).`)
      console.log(`   Backup archived to: ${archived}`)
    } catch {
      console.log(`\n✅ Restored isPublic=true for ${updated} row(s).`)
      console.log(`   (Could not rename backup file; you may delete ${backupPath} manually.)`)
    }
    console.log('')
    return
  }

  const rows = await db.investor.findMany({
    where: {
      discoverable: false,
      isPublic: true,
    },
    select: { id: true, firmName: true },
    orderBy: { firmName: 'asc' },
  })

  console.log(
    `\n[vc-hide-nondiscoverable] Rows with discoverable=false and isPublic=true: ${rows.length}.`,
  )
  const preview = rows.slice(0, 60)
  for (const r of preview) {
    console.log(`  • ${r.firmName}`)
  }
  if (rows.length > preview.length) {
    console.log(`  … and ${rows.length - preview.length} more`)
  }

  if (!apply) {
    console.log(
      '\nDry run only. Re-run with --apply to set isPublic=false and write a reversible backup.',
    )
    console.log('Undo later: npm run worker:restore-nondiscoverable-public\n')
    return
  }

  if (rows.length === 0) {
    console.log('\nNothing to hide (no rows with discoverable=false and isPublic=true). Skipping.\n')
    return
  }

  const snapshotPath = writeBackup(rows)

  const result = await db.investor.updateMany({
    where: {
      discoverable: false,
      isPublic: true,
    },
    data: { isPublic: false },
  })

  clearInvestorCache()
  console.log(`\n✅ Set isPublic=false for ${result.count} row(s).`)
  console.log(`   Active backup (for --restore): ${BACKUP_DEFAULT}`)
  console.log(`   Snapshot copy: ${snapshotPath}`)
  console.log('   Undo: npm run worker:restore-nondiscoverable-public\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
