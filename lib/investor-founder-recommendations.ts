import { parseJSON } from '@/lib/utils'
import { buildFounderGeoMatchText } from '@/lib/geo/format-founder-location'
import {
  founderLocationLikelyCanada,
  founderLocationLikelyUnitedStates,
  investorGeoTargetsNorthAmerica,
  investorGeoTargetsUnitedStates,
} from '@/lib/investor-geo-match'

export interface FounderCandidate {
  /** Stable row id for this recommendation (venture summary id, or founder id if no summary). */
  id: string
  /** Underlying founder account (bookmarks, etc.). */
  founderId: string
  name: string
  email: string
  startupName: string | null
  stage: string
  sectors: string
  businessModel: string | null
  location: string
  countryCode?: string | null
  regionCode?: string | null
  fundingNeed: number
  revenue: number | null
  users: number | null
  growthRate: string | null
  teamSize: number | null
  ethicsTags: string
  personalityTags: string
  valueAddNeeds: string
  profileComplete: boolean
  isStealth: boolean
  bio: string | null
  linkedinUrl: string | null
  websiteUrl: string | null
  analysisSummary: {
    overallScore: number
    tier: string | null
    conviction: string | null
    marketScore: number | null
    teamScore: number | null
    tractionScore: number | null
    productScore: number | null
    strengths: string | null
    weaknesses: string | null
    executiveSummary: string | null
    sectorFit: string | null
    tractionMetrics: string | null
    marketAnalysis: string | null
    teamAnalysis: string | null
    redFlags: string | null
    bullCase: string | null
    bearCase: string | null
    analysisType: string
    analysisCount: number
    updatedAt?: string | Date | null
  } | null
  prefs: {
    isImmigrant: boolean
    isUnderrepresented: boolean
    isStudent: boolean
    isVeteran: boolean
    isWoman: boolean
    isLgbtq: boolean
    isBipoc: boolean
  } | null
}

export interface InvestorProfile {
  stages: string
  sectors: string
  checkMin: number
  checkMax: number
  checkSizeMin: number
  checkSizeMax: number
  geoFocus: string
  geography: string
  thesis: string | null
  founderFocus: string
  valueAddTags: string
  ethicsTags: string
  personalityType: string | null
  investmentApproach: string | null
}

export interface RecommendedFounder {
  founder: FounderCandidate
  matchScore: number
  matchReasons: string[]
  dimensionBreakdown: {
    investmentQuality: number
    sectorAlignment: number
    stageCheckFit: number
    geographyFit: number
    tractionEvidence: number
    founderFocusMatch: number
    valuesAlignment: number
  }
}

const STAGE_EXPANSION: Record<string, string[]> = {
  'idea': ['idea', 'pre-seed', 'preseed'],
  'mvp': ['mvp', 'pre-seed', 'preseed', 'seed'],
  'pre-seed': ['idea', 'mvp', 'pre-seed', 'preseed'],
  'preseed': ['idea', 'mvp', 'pre-seed', 'preseed'],
  'seed': ['mvp', 'seed', 'pre-seed', 'preseed'],
  'revenue': ['revenue', 'seed', 'series a', 'seriesa'],
  'series a': ['revenue', 'series a', 'seriesa', 'seed'],
  'seriesa': ['revenue', 'series a', 'seriesa', 'seed'],
  'series b': ['series a', 'seriesa', 'series b', 'seriesb'],
  'seriesb': ['series a', 'seriesa', 'series b', 'seriesb'],
}

const STAGE_ADJACENCY: Record<string, string[]> = {
  'idea': ['mvp'],
  'mvp': ['idea', 'pre-seed', 'seed'],
  'pre-seed': ['idea', 'mvp', 'seed'],
  'preseed': ['idea', 'mvp', 'seed'],
  'seed': ['mvp', 'pre-seed', 'revenue'],
  'revenue': ['seed', 'series a'],
  'series a': ['revenue', 'seed', 'series b'],
  'seriesa': ['revenue', 'seed', 'series b'],
  'series b': ['series a'],
  'seriesb': ['series a'],
}

function normalizeStage(s: string): string {
  return s.toLowerCase().trim().replace(/[-_\s]+/g, ' ')
}

/** Resolve config keyed by stage labels (hyphen/space variants map to the same normalized key). */
function resolveStageTableRow<T>(fsNorm: string, table: Record<string, T>): T | undefined {
  if (!fsNorm) return undefined
  for (const key of Object.keys(table)) {
    if (normalizeStage(key) === fsNorm) return table[key]
  }
  return undefined
}

/** Discrete tokens from investor stage JSON (no substring matching — avoids false "exact" hits). */
function investorStageTokens(investorStages: string[]): string[] {
  const out: string[] = []
  for (const raw of investorStages) {
    if (!raw?.trim()) continue
    const n = normalizeStage(raw)
    if (!n) continue
    const parts = n.split(/\s*(?:,|;|\/|\||\band\b|\&)\s*/i)
    for (const p of parts) {
      const t = normalizeStage(p)
      if (t) out.push(t)
    }
  }
  return out
}

function founderStageExpansionSet(fsNorm: string): Set<string> {
  if (!fsNorm) return new Set()
  const rawList = resolveStageTableRow(fsNorm, STAGE_EXPANSION)
  const list = rawList ?? [fsNorm]
  const set = new Set<string>()
  for (const x of list) {
    const nx = normalizeStage(String(x))
    if (nx) set.add(nx)
  }
  set.add(fsNorm)
  return set
}

function founderStageAdjacentSet(fsNorm: string): Set<string> {
  if (!fsNorm) return new Set()
  const rawList = resolveStageTableRow(fsNorm, STAGE_ADJACENCY)
  const set = new Set<string>()
  for (const x of rawList ?? []) {
    const nx = normalizeStage(String(x))
    if (nx) set.add(nx)
  }
  return set
}

function stageMatches(founderStage: string, investorStages: string[]): boolean {
  const fs = normalizeStage(founderStage)
  if (!fs) return false
  const fSet = founderStageExpansionSet(fs)
  const inv = investorStageTokens(investorStages)
  if (inv.length === 0) return false
  return inv.some(t => fSet.has(t))
}

function stageIsAdjacent(founderStage: string, investorStages: string[]): boolean {
  const fs = normalizeStage(founderStage)
  if (!fs) return false
  const adj = founderStageAdjacentSet(fs)
  if (adj.size === 0) return false
  const inv = investorStageTokens(investorStages)
  return inv.some(t => adj.has(t))
}

/** First investor token that matches founder expansion (for UI copy). */
function firstStageOverlapToken(founderStage: string, investorStages: string[]): string | null {
  const fs = normalizeStage(founderStage)
  if (!fs) return null
  const fSet = founderStageExpansionSet(fs)
  for (const t of investorStageTokens(investorStages)) {
    if (fSet.has(t)) return t
  }
  return null
}

function firstAdjacentOverlapToken(founderStage: string, investorStages: string[]): string | null {
  const fs = normalizeStage(founderStage)
  if (!fs) return null
  const adj = founderStageAdjacentSet(fs)
  for (const t of investorStageTokens(investorStages)) {
    if (adj.has(t)) return t
  }
  return null
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0
  const setA = new Set(a.map(s => s.toLowerCase().trim()))
  const setB = new Set(b.map(s => s.toLowerCase().trim()))
  let intersection = 0
  for (const item of setA) if (setB.has(item)) intersection++
  const union = new Set([...setA, ...setB]).size
  return union > 0 ? intersection / union : 0
}

function sectorOverlapCount(a: string[], b: string[]): { count: number; names: string[] } {
  const setB = new Set(b.map(s => s.toLowerCase().trim()))
  const matches: string[] = []
  for (const s of a) {
    const ls = s.toLowerCase().trim()
    if (setB.has(ls)) matches.push(s)
    else {
      for (const bs of setB) {
        if (ls.includes(bs) || bs.includes(ls)) { matches.push(s); break }
      }
    }
  }
  return { count: matches.length, names: matches }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function scoreD1InvestmentQuality(summary: FounderCandidate['analysisSummary']): { score: number; reason: string } {
  if (!summary) return { score: 5, reason: 'No AI analysis yet' }

  const base = (summary.overallScore / 100) * 30

  const tierBonus: Record<string, number> = {
    EXCEPTIONAL: 4, STRONG: 2, DEVELOPING: 0, EARLY: -1, PASS: -3,
  }
  const convictionMult: Record<string, number> = {
    HIGH: 1.0, MEDIUM: 0.92, LOW: 0.80, PASS: 0.70,
  }

  const bonus = tierBonus[summary.tier || 'DEVELOPING'] ?? 0
  const mult = convictionMult[summary.conviction || 'MEDIUM'] ?? 0.85
  const score = clamp(Math.round(base * mult + bonus), 0, 30)
  const reason = `AI score ${Math.round(summary.overallScore)}/100 (${summary.tier || 'N/A'} tier)`

  return { score, reason }
}

function scoreD2SectorAlignment(
  founderSectors: string[],
  investorSectors: string[],
  investorThesis: string | null,
  summary: FounderCandidate['analysisSummary'],
): { score: number; reason: string } {
  const jaccard = jaccardSimilarity(founderSectors, investorSectors)
  const { count, names } = sectorOverlapCount(founderSectors, investorSectors)

  let sectorFitBoost = 0
  if (summary?.sectorFit) {
    try {
      const fit = JSON.parse(summary.sectorFit) as Record<string, number>
      for (const is of investorSectors) {
        const key = Object.keys(fit).find(k => k.toLowerCase().includes(is.toLowerCase()) || is.toLowerCase().includes(k.toLowerCase()))
        if (key && fit[key] > 70) sectorFitBoost = Math.min(sectorFitBoost + 2, 6)
      }
    } catch { /* skip */ }
  }

  let thesisOverlap = 0
  if (investorThesis) {
    const thesisLower = investorThesis.toLowerCase()
    for (const s of founderSectors) {
      if (thesisLower.includes(s.toLowerCase())) thesisOverlap += 1
    }
    thesisOverlap = Math.min(thesisOverlap, 3)
  }

  const score = clamp(Math.round(jaccard * 16 + sectorFitBoost + thesisOverlap), 0, 25)
  const reason = count > 0 ? `${count} sector overlap: ${names.slice(0, 3).join(', ')}` : 'No sector overlap'
  return { score, reason }
}

function scoreD3StageCheckFit(
  founderStage: string,
  fundingNeed: number,
  investorStages: string[],
  checkMin: number,
  checkMax: number,
): { score: number; reason: string } {
  const exactMatch = stageMatches(founderStage, investorStages)
  const adjacent = !exactMatch && stageIsAdjacent(founderStage, investorStages)
  const stageScore = exactMatch ? 8 : adjacent ? 4 : 0
  const overlapTok = exactMatch
    ? firstStageOverlapToken(founderStage, investorStages)
    : adjacent
      ? firstAdjacentOverlapToken(founderStage, investorStages)
      : null

  let checkFit = 0
  if (checkMin > 0 && checkMax > 0 && fundingNeed > 0) {
    const midpoint = (checkMin + checkMax) / 2
    const halfRange = Math.max((checkMax - checkMin) / 2, 1)
    const distance = Math.abs(fundingNeed - midpoint) / halfRange
    checkFit = distance < 0.3 ? 7 : distance < 0.6 ? 5 : distance < 1.0 ? 3 : 1
  } else {
    checkFit = 4
  }

  const score = stageScore + checkFit
  const parts: string[] = []
  const fsDisp = (founderStage || '').trim() || 'unknown stage'
  if (exactMatch && overlapTok) {
    parts.push(`Exact stage match (${fsDisp} ↔ ${overlapTok})`)
  } else if (exactMatch) {
    parts.push(`Exact stage match (${fsDisp})`)
  } else if (adjacent && overlapTok) {
    parts.push(`Adjacent stage (${fsDisp} ↔ ${overlapTok})`)
  } else if (adjacent) {
    parts.push(`Adjacent stage (${fsDisp})`)
  }
  if (fundingNeed > 0) parts.push(`$${fundingNeed}K funding need`)
  const reason = parts.join(', ') || 'Stage/check fit assessed'

  return { score, reason }
}

function scoreD4GeographyFit(
  founder: Pick<FounderCandidate, 'location' | 'countryCode' | 'regionCode'>,
  investorGeo: string[],
): { score: number; reason: string } {
  if (investorGeo.length === 0) return { score: 8, reason: 'No geographic restriction' }

  const flRaw = founder.location.trim()
  const flComposite = buildFounderGeoMatchText({
    city: founder.location,
    countryCode: founder.countryCode,
    regionCode: founder.regionCode,
  })
  const fl = flComposite || flRaw.toLowerCase()
  const displayLoc = flRaw || founder.countryCode || 'Unknown'
  const hasGlobal = investorGeo.some(g => g.toLowerCase().includes('global'))
  if (hasGlobal) return { score: 8, reason: 'Global investment focus' }

  // Literal overlap between founder location text and investor geo tokens
  for (const g of investorGeo) {
    const gl = g.toLowerCase()
    if (fl.includes(gl) || gl.includes(fl)) {
      return { score: 10, reason: `Located in ${displayLoc}, matches ${g} focus` }
    }
  }

  const cc = founder.countryCode?.trim().toUpperCase() || ''
  const founderInUS = cc === 'US' || founderLocationLikelyUnitedStates(flRaw)
  const founderInCanada = cc === 'CA' || founderLocationLikelyCanada(flRaw)
  const founderInUK = cc === 'GB'
  const investorUS = investorGeoTargetsUnitedStates(investorGeo)
  const investorNA = investorGeoTargetsNorthAmerica(investorGeo)

  if (investorUS && founderInUS) {
    return {
      score: 10,
      reason: `US-based (${displayLoc}); matches your geography`,
    }
  }
  if (investorNA && (founderInUS || founderInCanada)) {
    return {
      score: 9,
      reason: `North America (${displayLoc}); matches your geography`,
    }
  }

  if (founderInUK) {
    for (const g of investorGeo) {
      const gl = g.toLowerCase()
      if (/(uk|united kingdom|london|europe|britain|\bgb\b|england|scotland|wales|northern ireland)/.test(gl)) {
        return { score: 6, reason: `${displayLoc} aligns with ${g} geography` }
      }
    }
  }

  const regions: Record<string, string[]> = {
    us: ['united states', 'usa', 'us', 'california', 'new york', 'texas', 'san francisco', 'nyc', 'bay area', 'boston', 'seattle', 'austin', 'los angeles', 'chicago'],
    europe: ['uk', 'united kingdom', 'london', 'germany', 'france', 'berlin', 'paris', 'amsterdam', 'europe'],
    asia: ['india', 'china', 'singapore', 'japan', 'korea', 'asia', 'mumbai', 'bangalore', 'delhi', 'tokyo'],
    latam: ['brazil', 'mexico', 'latam', 'latin america', 'argentina', 'colombia'],
  }

  for (const g of investorGeo) {
    const gl = g.toLowerCase()
    for (const [, cities] of Object.entries(regions)) {
      const geoInRegion = cities.some(c => gl.includes(c))
      const founderInRegion = cities.some(c => fl.includes(c))
      if (geoInRegion && founderInRegion) {
        return { score: 6, reason: `${displayLoc} in same region as ${g}` }
      }
    }
  }

  return { score: 0, reason: 'Geographic mismatch' }
}

function scoreD5TractionEvidence(
  founder: FounderCandidate,
): { score: number; reason: string } {
  const stage = normalizeStage(founder.stage)
  const thresholds: Record<string, { rev: number; users: number; team: number }> = {
    idea: { rev: 0, users: 0, team: 1 },
    mvp: { rev: 0, users: 100, team: 2 },
    'pre-seed': { rev: 0, users: 100, team: 2 },
    seed: { rev: 10000, users: 5000, team: 4 },
    revenue: { rev: 5000, users: 1000, team: 3 },
    'series a': { rev: 50000, users: 10000, team: 5 },
  }
  const t = thresholds[stage] || thresholds.mvp

  let pts = 0
  const parts: string[] = []

  if (founder.revenue && founder.revenue > 0) {
    pts += founder.revenue >= t.rev ? 3 : 1.5
    parts.push(`$${founder.revenue}/mo revenue`)
  }
  if (founder.users && founder.users > 0) {
    pts += founder.users >= t.users ? 2.5 : 1
    parts.push(`${founder.users} users`)
  }
  if (founder.growthRate) {
    pts += 2
    parts.push(`${founder.growthRate} growth`)
  }
  if (founder.teamSize && founder.teamSize > 1) {
    pts += founder.teamSize >= t.team ? 1.5 : 0.5
    parts.push(`Team of ${founder.teamSize}`)
  }

  if (founder.analysisSummary?.tractionScore && founder.analysisSummary.tractionScore > 70) {
    pts += 1
  }

  return { score: clamp(Math.round(pts), 0, 10), reason: parts.join(', ') || 'Limited traction data' }
}

function scoreD6FounderFocus(
  founderPrefs: FounderCandidate['prefs'],
  investorFocus: string[],
): { score: number; reason: string } {
  if (investorFocus.length === 0) return { score: 2, reason: 'No specific founder focus' }
  if (!founderPrefs) return { score: 1, reason: 'Founder preferences unknown' }

  const map: Record<string, boolean> = {
    women: founderPrefs.isWoman,
    immigrant: founderPrefs.isImmigrant,
    veteran: founderPrefs.isVeteran,
    lgbtq: founderPrefs.isLgbtq,
    underrepresented: founderPrefs.isUnderrepresented || founderPrefs.isBipoc,
    student: founderPrefs.isStudent,
  }

  const matched = investorFocus.filter(t => map[t.toLowerCase()])
  if (matched.length === 0) return { score: 0, reason: 'No founder focus match' }
  return {
    score: clamp(Math.round(2.5 + matched.length * 1.25), 0, 5),
    reason: `Matches focus: ${matched.join(', ')}`,
  }
}

function scoreD7ValuesAlignment(
  founderNeeds: string[],
  founderEthics: string[],
  investorOffers: string[],
  investorEthics: string[],
  investorPersonality: string | null,
): { score: number; reason: string } {
  const needsOverlap = sectorOverlapCount(founderNeeds, investorOffers)
  const valueAddScore = founderNeeds.length > 0
    ? (needsOverlap.count / Math.max(founderNeeds.length, 1)) * 2.5
    : 1.25

  const ethicsJaccard = jaccardSimilarity(founderEthics, investorEthics)
  const ethicsScore = ethicsJaccard * 1.5

  let personalityBonus = 0
  if (investorPersonality) {
    const pl = investorPersonality.toLowerCase()
    const mentorNeeded = founderNeeds.some(n => n.toLowerCase().includes('mentor'))
    const handsOnNeeded = founderNeeds.some(n => n.toLowerCase().includes('hands-on') || n.toLowerCase().includes('operational'))
    if ((pl.includes('hands-on') || pl.includes('mentor')) && (mentorNeeded || handsOnNeeded)) {
      personalityBonus = 1
    }
  }

  const score = clamp(Math.round(valueAddScore + ethicsScore + personalityBonus), 0, 5)
  const reason = needsOverlap.count > 0
    ? `Can provide: ${needsOverlap.names.slice(0, 3).join(', ')}`
    : 'Values alignment assessed'

  return { score, reason }
}

/**
 * Founder eligibility for investor ranking (keep in sync with
 * `app/api/investor/recommended-founders` eligibility (keep in sync):
 * - Never stealth.
 * - Must have either a completed profile OR at least one AI analysis summary row.
 */
function founderIsEligibleForInvestorRanking(founder: FounderCandidate): boolean {
  if (founder.isStealth) return false
  if (founder.analysisSummary != null) return true
  return founder.profileComplete
}

export function scoreFounderForInvestor(
  founder: FounderCandidate,
  investor: InvestorProfile,
): RecommendedFounder | null {
  const investorStages = parseJSON<string[]>(investor.stages, [])
  const investorSectors = parseJSON<string[]>(investor.sectors, [])
  const investorGeo = [
    ...parseJSON<string[]>(investor.geoFocus, []),
    ...parseJSON<string[]>(investor.geography, []),
  ].filter((g, i, a) => a.indexOf(g) === i)
  const investorFocus = parseJSON<string[]>(investor.founderFocus, [])
  const investorOffers = parseJSON<string[]>(investor.valueAddTags, [])
  const investorEthics = parseJSON<string[]>(investor.ethicsTags, [])

  const founderSectors = parseJSON<string[]>(founder.sectors, [])
  const founderNeeds = parseJSON<string[]>(founder.valueAddNeeds, [])
  const founderEthics = parseJSON<string[]>(founder.ethicsTags, [])

  if (!founderIsEligibleForInvestorRanking(founder)) return null

  const checkMin = investor.checkMin || investor.checkSizeMin || 0
  const checkMax = investor.checkMax || investor.checkSizeMax || 0

  // Profile-only founders: keep thesis alignment as a hard gate.
  // Founders with AI analysis always stay visible; stage/check fit still flows into scores (d3).
  const hasAnalysis = founder.analysisSummary != null
  if (investorStages.length > 0 && !hasAnalysis) {
    const stageTrimmed = (founder.stage || '').trim()
    const stageOk =
      stageTrimmed.length > 0 &&
      (stageMatches(founder.stage, investorStages) || stageIsAdjacent(founder.stage, investorStages))
    if (!stageOk) {
      return null
    }
  }

  if (!hasAnalysis && checkMin > 0 && checkMax > 0 && founder.fundingNeed > 0) {
    if (founder.fundingNeed < checkMin * 0.5 || founder.fundingNeed > checkMax * 2.0) {
      return null
    }
  }

  const d1 = scoreD1InvestmentQuality(founder.analysisSummary)
  const d2 = scoreD2SectorAlignment(founderSectors, investorSectors, investor.thesis, founder.analysisSummary)
  const d3 = scoreD3StageCheckFit(founder.stage, founder.fundingNeed, investorStages, checkMin, checkMax)
  const d4 = scoreD4GeographyFit(founder, investorGeo)
  const d5 = scoreD5TractionEvidence(founder)
  const d6 = scoreD6FounderFocus(founder.prefs, investorFocus)
  const d7 = scoreD7ValuesAlignment(founderNeeds, founderEthics, investorOffers, investorEthics, investor.personalityType)

  const totalScore = d1.score + d2.score + d3.score + d4.score + d5.score + d6.score + d7.score

  const reasons = [d1, d2, d3, d4, d5, d6, d7]
    .sort((a, b) => b.score - a.score)
    .filter(d => d.score > 0)
    .slice(0, 3)
    .map(d => d.reason)

  return {
    founder,
    matchScore: totalScore,
    matchReasons: reasons,
    dimensionBreakdown: {
      investmentQuality: d1.score,
      sectorAlignment: d2.score,
      stageCheckFit: d3.score,
      geographyFit: d4.score,
      tractionEvidence: d5.score,
      founderFocusMatch: d6.score,
      valuesAlignment: d7.score,
    },
  }
}

export function rankFoundersForInvestor(
  founders: FounderCandidate[],
  investor: InvestorProfile,
  limit: number = 15,
): RecommendedFounder[] {
  const scored: RecommendedFounder[] = []

  for (const f of founders) {
    const result = scoreFounderForInvestor(f, investor)
    if (result) scored.push(result)
  }

  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
    const aAI = a.founder.analysisSummary?.overallScore ?? 0
    const bAI = b.founder.analysisSummary?.overallScore ?? 0
    return bAI - aAI
  })

  return scored.slice(0, limit)
}
