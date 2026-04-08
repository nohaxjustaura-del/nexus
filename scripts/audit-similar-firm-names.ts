#!/usr/bin/env tsx
/**
 * Find duplicate / near-duplicate firm names (same org, different string).
 * Uses normalizeFirmKey + optional suffix stripping + known alias pairs.
 *
 * Usage: npx tsx scripts/audit-similar-firm-names.ts
 */

import 'dotenv/config'
import { db } from '../lib/db'
import { normalizeFirmKey } from '../lib/vc-discovery-from-web'

const SUFFIX_RE =
  /\s+(ventures|capital|partners|partner|fund|lp|llp|llc|inc|ltd|pte|plc|group|holdings|management|advisors?)$/i

/** Core key: strip common legal suffixes once, then normalizeFirmKey */
function coreKey(name: string): string {
  let t = name.trim()
  for (let i = 0; i < 3; i++) {
    const next = t.replace(SUFFIX_RE, '').trim()
    if (next === t) break
    t = next
  }
  return normalizeFirmKey(t)
}

/** Known display-name ↔ formal name (both directions checked after normalizing halves) */
const ALIAS_FRAGMENTS: [string, string][] = [
  ['a16z', 'andreessen horowitz'],
  ['a16z crypto', 'andreessen horowitz'],
  ['500 startups', '500 global'],
  ['yc', 'y combinator'],
  ['sequoia capital', 'sequoia'],
]

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + c)
    }
  }
  return dp[m]![n]!
}

async function main() {
  const rows = await db.investor.findMany({
    select: {
      id: true,
      firmName: true,
      isPublic: true,
      discoverable: true,
    },
    orderBy: { firmName: 'asc' },
  })

  const byExact = new Map<string, typeof rows>()
  const byCore = new Map<string, typeof rows>()

  for (const r of rows) {
    const fn = r.firmName || ''
    const ek = normalizeFirmKey(fn)
    if (!ek) continue
    if (!byExact.has(ek)) byExact.set(ek, [])
    byExact.get(ek)!.push(r)

    const ck = coreKey(fn)
    if (ck.length < 3) continue
    if (!byCore.has(ck)) byCore.set(ck, [])
    byCore.get(ck)!.push(r)
  }

  console.log(`\n=== Exact same normalized key (${byExact.size} unique keys from ${rows.length} rows) ===\n`)

  let dupExact = 0
  for (const [k, list] of [...byExact.entries()].sort((a, b) => b[1].length - a[1].length)) {
    if (list.length < 2) continue
    dupExact++
    console.log(`[${list.length}×] key="${k}"`)
    for (const r of list) {
      console.log(
        `    • ${r.firmName}  |  public=${r.isPublic} discoverable=${r.discoverable}  id=${r.id}`,
      )
    }
    console.log('')
  }
  console.log(`Clusters (exact key, 2+ rows): ${dupExact}\n`)

  console.log(`=== Same "core" key (suffix-stripped), 2+ rows ===\n`)
  let dupCore = 0
  for (const [k, list] of [...byCore.entries()].sort((a, b) => b[1].length - a[1].length)) {
    if (list.length < 2) continue
    const distinct = new Set(list.map((x) => normalizeFirmKey(x.firmName)))
    if (distinct.size < 2) continue
    dupCore++
    console.log(`[${list.length}×] core="${k}"`)
    for (const r of list) {
      console.log(
        `    • ${r.firmName}  |  public=${r.isPublic} discoverable=${r.discoverable}  id=${r.id}`,
      )
    }
    console.log('')
  }
  console.log(`Clusters (core key, 2+ distinct raw names): ${dupCore}\n`)

  console.log(`=== Known alias fragment pairs (any row containing both tokens) ===\n`)
  for (const [a, b] of ALIAS_FRAGMENTS) {
    const hit = rows.filter(
      (r) =>
        normalizeFirmKey(r.firmName).includes(a) || normalizeFirmKey(r.firmName).includes(b),
    )
    const both = rows.filter(
      (r) =>
        normalizeFirmKey(r.firmName).includes(a) && normalizeFirmKey(r.firmName).includes(b),
    )
    if (hit.length === 0) continue
    console.log(`Fragment pair "${a}" / "${b}": ${hit.length} row(s) mention either (same-row both: ${both.length})`)
    for (const r of hit.slice(0, 15)) {
      console.log(
        `    • ${r.firmName}  |  public=${r.isPublic} discoverable=${r.discoverable}`,
      )
    }
    if (hit.length > 15) console.log(`    … +${hit.length - 15} more`)
    console.log('')
  }

  console.log(`=== Near names (Levenshtein ≤2, length 6–40, same first 2 letters) — sample ===\n`)
  const names = rows.map((r) => ({ ...r, nk: normalizeFirmKey(r.firmName) }))
  let nearPairs = 0
  const seen = new Set<string>()
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]!.nk
      const b = names[j]!.nk
      if (a.length < 6 || b.length < 6 || a.length > 40 || b.length > 40) continue
      if (a[0] !== b[0] || a[1] !== b[1]) continue
      if (a === b) continue
      const d = levenshtein(a, b)
      if (d > 2) continue
      const key = [a, b].sort().join('||')
      if (seen.has(key)) continue
      seen.add(key)
      nearPairs++
      if (nearPairs <= 40) {
        console.log(`~${d} "${names[i]!.firmName}" vs "${names[j]!.firmName}"`)
        console.log(
          `   public ${names[i]!.isPublic}/${names[j]!.isPublic}  discoverable ${names[i]!.discoverable}/${names[j]!.discoverable}`,
        )
        console.log('')
      }
    }
  }
  console.log(`Total near pairs (≤2 edits, heuristic): ${nearPairs}\n`)

  console.log(`=== Rows matching "accel" + "india" (case-insensitive) ===\n`)
  const accelIndia = rows.filter((r) => {
    const t = normalizeFirmKey(r.firmName)
    return t.includes('accel') && t.includes('india')
  })
  for (const r of accelIndia) {
    console.log(
      `• ${r.firmName}  |  public=${r.isPublic} discoverable=${r.discoverable}  id=${r.id}`,
    )
  }
  console.log(`Count: ${accelIndia.length}\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
