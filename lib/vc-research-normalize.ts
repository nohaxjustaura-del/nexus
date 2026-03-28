import type { VCResearchResult } from '../scripts/auto-research-vcs'
import { sanitizeInvestmentThesis } from './thesis-sanitize'

/** Prisma `Int` is PG int4; Investor check fields store **thousands USD** (500 = $500K). */
const PG_INT4_MAX = 2_147_483_647

/**
 * LLMs often return check sizes in raw dollars or fund AUM. Shrink until the value fits int4.
 */
export function sanitizeCheckSizeThousandsForInt4(n: unknown): number | undefined {
  if (n == null) return undefined
  const num = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(num) || num < 0) return undefined
  let v = Math.round(num)
  while (v > PG_INT4_MAX) {
    v = Math.round(v / 1000)
    if (v === 0) return undefined
  }
  return v
}

/**
 * LLMs sometimes return bio as [{ name, role }] and URLs as string[].
 * Prisma Investor expects bio: string and single URL strings — coerce here.
 */
function coerceUrl(val: unknown): string | undefined {
  if (val == null || val === '') return undefined
  if (typeof val === 'string') {
    const s = val.trim()
    return s.length ? s : undefined
  }
  if (Array.isArray(val)) {
    const first = val.find((x) => typeof x === 'string' && x.trim())
    return first ? String(first).trim() : undefined
  }
  return undefined
}

function coerceBio(val: unknown, firmName: string, fundType: string): string {
  const fallback = `${firmName} (${fundType || 'Venture Capital'})`
  if (val == null || val === '') return fallback
  if (typeof val === 'string') {
    const s = val.trim()
    return s.length ? s.slice(0, 8000) : fallback
  }
  if (Array.isArray(val)) {
    const lines = val.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && item !== null) {
        const o = item as Record<string, unknown>
        if (typeof o.name === 'string' && typeof o.role === 'string') {
          return `${o.name} — ${o.role}`
        }
        if (typeof o.name === 'string') return o.name
      }
      return JSON.stringify(item)
    })
    const t = lines.join('\n').trim()
    return t.length ? t.slice(0, 8000) : fallback
  }
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 8000)
  return String(val).slice(0, 8000)
}

function coerceStringArray(val: unknown): string[] | undefined {
  if (val == null) return undefined
  if (!Array.isArray(val)) return undefined
  const out: string[] = []
  for (const x of val) {
    if (typeof x === 'string' && x.trim()) out.push(x.trim())
    else if (x && typeof x === 'object') out.push(JSON.stringify(x))
    else if (x != null) out.push(String(x))
  }
  return out.length ? out : undefined
}

export function normalizeResearchForDb(
  r: Partial<VCResearchResult> & { firmName: string },
): VCResearchResult {
  const fundType =
    typeof r.fundType === 'string' && r.fundType.trim() ? r.fundType : 'Venture Capital'
  const stages = coerceStringArray(r.stages as unknown) ?? r.stages
  const sectors = coerceStringArray(r.sectors as unknown) ?? r.sectors
  const geography = coerceStringArray(r.geography as unknown) ?? r.geography
  const portfolio = coerceStringArray(r.portfolio as unknown) ?? r.portfolio
  const valueAddTags = coerceStringArray(r.valueAddTags as unknown) ?? r.valueAddTags

  const fundSize =
    typeof r.fundSize === 'string' && r.fundSize.trim() ? r.fundSize.trim().slice(0, 500) : undefined
  const decisionSpeed =
    typeof r.decisionSpeed === 'string' && r.decisionSpeed.trim()
      ? r.decisionSpeed.trim().slice(0, 500)
      : undefined

  return {
    firmName: r.firmName,
    verified: r.verified ?? true,
    researchDate: r.researchDate ?? new Date(),
    sources: r.sources ?? [],
    checkSizeMin: sanitizeCheckSizeThousandsForInt4(r.checkSizeMin),
    checkSizeMax: sanitizeCheckSizeThousandsForInt4(r.checkSizeMax),
    stages,
    thesis: sanitizeInvestmentThesis(
      typeof r.thesis === 'string'
        ? r.thesis
        : r.thesis != null && r.thesis !== ''
          ? String(r.thesis)
          : undefined,
      r.firmName,
    ),
    bio: coerceBio(r.bio as unknown, r.firmName, fundType),
    sectors,
    geography,
    fundType,
    leadFollow: r.leadFollow,
    portfolio,
    valueAddTags,
    fundSize,
    decisionSpeed,
    websiteUrl: coerceUrl(r.websiteUrl as unknown),
    linkedinUrl: coerceUrl(r.linkedinUrl as unknown),
    applicationUrl: coerceUrl(r.applicationUrl as unknown),
  }
}
