#!/usr/bin/env tsx
/**
 * Overwrite firm_name in faiss-data/vcs_embedding_inputs_trimmed.json from Investor.firmName (by id).
 * Keeps JSONL in sync after vc:fix-headline-names without re-embedding.
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { db } from '../lib/db'

async function main() {
  const jsonlPath = join(process.cwd(), 'faiss-data', 'vcs_embedding_inputs_trimmed.json')
  const lines = readFileSync(jsonlPath, 'utf8').trim().split(/\n/)
  const investors = await db.investor.findMany({
    select: { id: true, firmName: true },
  })
  const byId = new Map(investors.map((i) => [i.id, i.firmName]))

  let changed = 0
  const out = lines.map((line) => {
    if (!line.trim()) return line
    const row = JSON.parse(line) as { id: string; firm_name: string }
    const name = byId.get(row.id)
    if (name != null && name !== row.firm_name) {
      changed++
      return JSON.stringify({ ...row, firm_name: name })
    }
    return line
  })

  writeFileSync(jsonlPath, out.join('\n') + '\n', 'utf8')
  console.log(`Updated ${changed} firm_name fields in ${jsonlPath}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
