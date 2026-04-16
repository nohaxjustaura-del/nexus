import type { Prisma } from '@prisma/client'

/** Whitespace-separated terms for discover / typeahead (case-insensitive matching is applied by callers / Prisma). */
export function discoverSearchTokens(raw: string): string[] {
  return raw
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

const MAX_SUGGEST_TOKENS = 6

/**
 * AND across tokens; each token matches if it appears in any of several investor text fields.
 * Used by the discover typeahead API (Postgres + Prisma insensitive contains).
 */
export function discoverSuggestWhereClause(rawQuery: string): Prisma.InvestorWhereInput | null {
  const tokens = discoverSearchTokens(rawQuery).slice(0, MAX_SUGGEST_TOKENS)
  if (tokens.length === 0) return null
  return {
    isPublic: true,
    AND: tokens.map((token) => ({
      OR: [
        { firmName: { contains: token, mode: 'insensitive' } },
        { name: { contains: token, mode: 'insensitive' } },
        { thesis: { contains: token, mode: 'insensitive' } },
        { sectors: { contains: token, mode: 'insensitive' } },
        { stages: { contains: token, mode: 'insensitive' } },
        { notableInvestments: { contains: token, mode: 'insensitive' } },
        { valueAddTags: { contains: token, mode: 'insensitive' } },
      ],
    })),
  }
}

type SuggestScoreRow = {
  firmName: string | null
  name: string | null
  verified?: boolean | null
  discoverable?: boolean | null
}

/** Higher = better match for ordering typeahead rows. */
export function discoverSuggestScore(row: SuggestScoreRow, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase()
  const tokens = discoverSearchTokens(rawQuery)
  const firm = (row.firmName || '').toLowerCase()
  const partner = (row.name || '').toLowerCase()
  let score = 0
  if (q.length >= 2) {
    if (firm.startsWith(q)) score += 220
    else if (partner.startsWith(q)) score += 160
    else if (firm.includes(q)) score += 120
    else if (partner.includes(q)) score += 90
  }
  const head = tokens[0] || ''
  if (head && firm.startsWith(head)) score += 80
  if (head && partner.startsWith(head)) score += 50
  for (const t of tokens) {
    if (!t) continue
    if (firm.includes(t)) score += 24
    if (partner.includes(t)) score += 18
  }
  if (row.verified) score += 15
  if (row.discoverable) score += 5
  return score
}

/** Order investors after text filter so the strongest matches surface first (YC tie-break kept separately in page). */
export function compareInvestorsByDiscoverSearch(a: SuggestScoreRow, b: SuggestScoreRow, rawQuery: string): number {
  const d = discoverSuggestScore(b, rawQuery) - discoverSuggestScore(a, rawQuery)
  if (d !== 0) return d
  const fa = (a.firmName || '').localeCompare(b.firmName || '', undefined, { sensitivity: 'base' })
  return fa
}
