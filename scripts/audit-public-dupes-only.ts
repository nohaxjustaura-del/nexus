import 'dotenv/config'
import { db } from '../lib/db'
import { normalizeFirmKey } from '../lib/vc-discovery-from-web'

async function main() {
  const rows = await db.investor.findMany({
    where: { isPublic: true },
    select: { id: true, firmName: true },
  })
  const byKey = new Map<string, typeof rows>()
  for (const r of rows) {
    const k = normalizeFirmKey(r.firmName || '')
    if (!k) continue
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k)!.push(r)
  }
  let dupClusters = 0
  for (const list of byKey.values()) {
    if (list.length >= 2) dupClusters++
  }
  console.log('isPublic=true rows:', rows.length)
  console.log('Unique normalized keys:', byKey.size)
  console.log('Clusters with 2+ rows (exact same normalized name):', dupClusters)
  if (dupClusters) {
    const multi = [...byKey.entries()].filter(([, l]) => l.length >= 2)
    for (const [k, list] of multi.slice(0, 40)) {
      console.log(`  [${list.length}×] ${k}`)
      for (const r of list) console.log(`      ${r.firmName}  id=${r.id}`)
    }
    if (multi.length > 40) console.log(`  … and ${multi.length - 40} more clusters`)
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
