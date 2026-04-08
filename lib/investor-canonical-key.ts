/**
 * Canonical identity for VC firm names: map slight variants (a16z vs Andreessen Horowitz,
 * 500 Startups vs 500 Global, Accel India vs Accel India Accelerator) to one key so we can
 * dedupe restores and ingest without a second row for the same org.
 *
 * Extend CANONICAL_BUCKETS as you find more collisions in `npm run worker:audit-firm-dupes`.
 */

import { normalizeFirmKey } from '@/lib/vc-discovery-from-web'

const SUFFIX_RE =
  /\s+(ventures|capital|partners|partner|fund|lp|llp|llc|inc|ltd|pte|plc|group|holdings|management|advisors?)$/i

/** Strip repeated legal suffixes, then normalize (shared with audit scripts). */
export function coreInvestorKey(name: string): string {
  let t = name.trim()
  for (let i = 0; i < 3; i++) {
    const next = t.replace(SUFFIX_RE, '').trim()
    if (next === t) break
    t = next
  }
  return normalizeFirmKey(t)
}

type Bucket = { id: string; test: (n: string) => boolean }

/**
 * Ordered: first matching bucket wins. Use narrow tests to avoid false positives
 * (e.g. do not match "yc" inside "Greycroft").
 */
const CANONICAL_BUCKETS: Bucket[] = [
  {
    id: 'andreessen_horowitz',
    test: (n) =>
      n.includes('andreessen') ||
      /\ba\s*1\s*6\s*z\b/.test(n) ||
      /\ba16z\b/.test(n),
  },
  {
    id: '500_global',
    test: (n) => n.includes('500 global') || n.includes('500 startups'),
  },
  {
    id: 'y_combinator',
    test: (n) =>
      /\by combinator\b/.test(n) ||
      /^yc continuity\b/.test(n) ||
      /^yc growth\b/.test(n) ||
      /^yc research\b/.test(n),
  },
  {
    id: 'accel_india',
    test: (n) => n.startsWith('accel india'),
  },
]

/**
 * Stable string: same org → same key. Unknown funds → `self:<coreInvestorKey>`.
 */
export function canonicalInvestorKey(firmName: string): string {
  const n = normalizeFirmKey(firmName || '')
  if (!n) return 'self:'
  for (const b of CANONICAL_BUCKETS) {
    if (b.test(n)) return `canon:${b.id}`
  }
  return `self:${coreInvestorKey(firmName)}`
}
