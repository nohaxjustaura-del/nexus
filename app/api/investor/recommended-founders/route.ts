import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'
import { formatFounderLocationLine } from '@/lib/geo/format-founder-location'
import { rankFoundersForInvestor, type FounderCandidate, type InvestorProfile } from '@/lib/investor-founder-recommendations'
import type { Founder, FounderAnalysisSummary, FounderPrefs, Investor } from '@prisma/client'

/** Neutral mandate so admins can preview rankings without an investor listing row. */
function adminPreviewInvestorProfile(): InvestorProfile {
  return {
    stages: '[]',
    sectors: '[]',
    checkMin: 0,
    checkMax: 0,
    checkSizeMin: 0,
    checkSizeMax: 0,
    geoFocus: '[]',
    geography: '[]',
    thesis: null,
    founderFocus: '',
    valueAddTags: '[]',
    ethicsTags: '[]',
    personalityType: null,
    investmentApproach: null,
  }
}

function investorRowToProfile(investor: Investor): InvestorProfile {
  return {
    stages: investor.stages,
    sectors: investor.sectors,
    checkMin: investor.checkMin,
    checkMax: investor.checkMax,
    checkSizeMin: investor.checkSizeMin,
    checkSizeMax: investor.checkSizeMax,
    geoFocus: investor.geoFocus,
    geography: investor.geography,
    thesis: investor.thesis,
    founderFocus: investor.founderFocus,
    valueAddTags: investor.valueAddTags,
    ethicsTags: investor.ethicsTags,
    personalityType: investor.personalityType,
    investmentApproach: investor.investmentApproach,
  }
}

export const dynamic = 'force-dynamic'
const MAX_MATCH_SCORE = 100
const MAX_REFRESH_RESULTS = 10
const RECENT_ACTIVITY_WINDOW_DAYS = 21

function parseBoolParam(v: string | null): boolean {
  return v === '1' || v === 'true'
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

function normalizeKeyword(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function tokenizeKeywordText(s: string): string[] {
  const normalized = normalizeKeyword(s)
  if (!normalized) return []
  return normalized
    .split(' ')
    .map((p) => p.trim())
    .filter((p) => p.length >= 4)
}

function buildInvestorBoostTerms(investor: Investor): Set<string> {
  const terms = new Set<string>()
  const addTerms = (input: string) => {
    for (const t of tokenizeKeywordText(input)) terms.add(t)
  }
  addTerms(investor.firmName || '')
  addTerms(investor.thesis || '')
  for (const x of parseJsonArray(investor.portfolio)) addTerms(x)
  for (const x of parseJsonArray(investor.notableInvestments)) addTerms(x)
  for (const x of parseJsonArray(investor.sectors)) addTerms(x)
  for (const x of parseJsonArray(investor.valueAddTags)) addTerms(x)
  if (investor.investmentApproach) addTerms(investor.investmentApproach)
  if (investor.personalityType) addTerms(investor.personalityType)
  return terms
}

function candidateTextForBoost(candidate: FounderCandidate): string {
  const parts = [
    candidate.startupName || '',
    candidate.bio || '',
    candidate.businessModel || '',
    candidate.stage || '',
    candidate.analysisSummary?.executiveSummary || '',
    candidate.analysisSummary?.marketAnalysis || '',
  ]
  return normalizeKeyword(parts.join(' '))
}

function investorSpecificityBoost(candidate: FounderCandidate, investor: Investor): number {
  const terms = buildInvestorBoostTerms(investor)
  if (terms.size === 0) return 0
  const hay = candidateTextForBoost(candidate)
  if (!hay) return 0
  let hits = 0
  for (const t of terms) {
    if (hay.includes(t)) hits++
    if (hits >= 4) break
  }
  if (hits === 0) return 0
  return Math.min(8, hits * 2)
}

function mapSummaryToAnalysisBlock(s: FounderAnalysisSummary) {
  return {
    overallScore: s.overallScore,
    tier: s.tier,
    conviction: s.conviction,
    marketScore: s.marketScore,
    teamScore: s.teamScore,
    tractionScore: s.tractionScore,
    productScore: s.productScore,
    strengths: s.strengths,
    weaknesses: s.weaknesses,
    executiveSummary: s.executiveSummary,
    sectorFit: s.sectorFit,
    tractionMetrics: s.tractionMetrics,
    marketAnalysis: s.marketAnalysis,
    teamAnalysis: s.teamAnalysis,
    redFlags: s.redFlags,
    bullCase: s.bullCase,
    bearCase: s.bearCase,
    analysisType: s.analysisType,
    analysisCount: s.analysisCount,
    updatedAt: s.updatedAt,
  }
}

function buildCandidate(
  f: Founder,
  summary: FounderAnalysisSummary | null,
  prefs: FounderPrefs | undefined,
): FounderCandidate {
  const ventureLabel = (summary?.summaryStartupName ?? '').trim()
  // Never substitute live `Founder.startupName` for a stored summary row — that made renames look like one "moving" venture.
  const displayStartup =
    summary == null
      ? f.startupName ?? null
      : ventureLabel.length > 0
        ? ventureLabel
        : 'Unnamed venture'

  return {
    id: summary?.id ?? f.id,
    founderId: f.id,
    name: f.name ?? '',
    email: f.email,
    startupName: displayStartup,
    stage: f.stage ?? '',
    sectors: f.sectors,
    businessModel: f.businessModel,
    location: f.location ?? '',
    countryCode: f.countryCode,
    regionCode: f.regionCode,
    fundingNeed: f.fundingNeed,
    revenue: f.revenue,
    users: f.users,
    growthRate: f.growthRate,
    teamSize: f.teamSize,
    ethicsTags: f.ethicsTags,
    personalityTags: f.personalityTags,
    valueAddNeeds: f.valueAddNeeds,
    profileComplete: f.profileComplete,
    isStealth: f.isStealth,
    bio: f.bio,
    linkedinUrl: f.linkedinUrl,
    websiteUrl: f.websiteUrl,
    analysisSummary: summary ? mapSummaryToAnalysisBlock(summary) : null,
    prefs: prefs
      ? {
          isImmigrant: prefs.isImmigrant,
          isUnderrepresented: prefs.isUnderrepresented,
          isStudent: prefs.isStudent,
          isVeteran: prefs.isVeteran,
          isWoman: prefs.isWoman,
          isLgbtq: prefs.isLgbtq,
          isBipoc: prefs.isBipoc,
        }
      : null,
  }
}

type RankedRecommendation = ReturnType<typeof rankFoundersForInvestor>[number] & {
  confidence: number
  freshness: number
  strictFilterPass: boolean
  actionHint: string
}

function toStrictPass(
  rec: ReturnType<typeof rankFoundersForInvestor>[number],
  strictStage: boolean,
  strictCheck: boolean,
  strictGeo: boolean,
): boolean {
  const dims = rec.dimensionBreakdown
  const stagePass = dims.stageCheckFit >= 8
  const geoPass = dims.geographyFit >= 6
  const checkPass = dims.stageCheckFit >= 6
  return (!strictStage || stagePass) && (!strictGeo || geoPass) && (!strictCheck || checkPass)
}

function toRecommendationPayload(r: RankedRecommendation) {
  return {
    id: r.founder.id,
    founderId: r.founder.founderId,
    name: r.founder.name ?? '',
    startupName: r.founder.startupName,
    stage: r.founder.stage ?? '',
    sectors: (() => {
      try {
        const raw = r.founder.sectors
        if (raw == null || raw === '') return []
        const v = typeof raw === 'string' ? JSON.parse(raw) : raw
        return Array.isArray(v) ? v.map(String) : []
      } catch {
        return []
      }
    })(),
    location: formatFounderLocationLine({
      city: r.founder.location,
      countryCode: r.founder.countryCode,
      regionCode: r.founder.regionCode,
    }),
    fundingNeed: r.founder.fundingNeed,
    bio: r.founder.bio,
    linkedinUrl: r.founder.linkedinUrl,
    websiteUrl: r.founder.websiteUrl,
    revenue: r.founder.revenue,
    users: r.founder.users,
    growthRate: r.founder.growthRate,
    teamSize: r.founder.teamSize,
    matchScore: r.matchScore,
    matchReasons: r.matchReasons,
    dimensionBreakdown: r.dimensionBreakdown,
    confidence: r.confidence,
    freshness: r.freshness,
    strictFilterPass: r.strictFilterPass,
    actionHint: r.actionHint,
    analysisSummary: r.founder.analysisSummary
      ? {
          overallScore: r.founder.analysisSummary.overallScore,
          tier: r.founder.analysisSummary.tier,
          strengths: (() => {
            try {
              return JSON.parse(r.founder.analysisSummary.strengths || '[]')
            } catch {
              return []
            }
          })(),
          weaknesses: (() => {
            try {
              return JSON.parse(r.founder.analysisSummary.weaknesses || '[]')
            } catch {
              return []
            }
          })(),
          executiveSummary: r.founder.analysisSummary.executiveSummary,
          marketScore: r.founder.analysisSummary.marketScore,
          teamScore: r.founder.analysisSummary.teamScore,
          tractionScore: r.founder.analysisSummary.tractionScore,
          productScore: r.founder.analysisSummary.productScore,
          marketAnalysis: r.founder.analysisSummary.marketAnalysis,
          teamAnalysis: r.founder.analysisSummary.teamAnalysis,
          redFlags: (() => {
            try {
              return JSON.parse(r.founder.analysisSummary.redFlags || '[]')
            } catch {
              return []
            }
          })(),
          bullCase: r.founder.analysisSummary.bullCase,
          bearCase: r.founder.analysisSummary.bearCase,
          analysisCount: r.founder.analysisSummary.analysisCount,
          updatedAt: r.founder.analysisSummary.updatedAt,
        }
      : null,
  }
}

function parseSavedPayload(payload: string): any | null {
  try {
    const parsed = JSON.parse(payload)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function applyResponseFilters(
  results: any[],
  analyzedOnly: boolean,
  strictStage: boolean,
  strictCheck: boolean,
  strictGeo: boolean,
) {
  return results
    .map((r) => {
      const dims = r.dimensionBreakdown || {}
      const stagePass = (dims.stageCheckFit ?? 0) >= 8
      const geoPass = (dims.geographyFit ?? 0) >= 6
      const checkPass = (dims.stageCheckFit ?? 0) >= 6
      const strictFilterPass = (!strictStage || stagePass) && (!strictGeo || geoPass) && (!strictCheck || checkPass)
      return { ...r, strictFilterPass }
    })
    .filter((r) => (!analyzedOnly || r.analysisSummary != null) && r.strictFilterPass)
}

async function buildRankedRecommendations(params: {
  investorProfile: InvestorProfile
  investor: Investor
  candidates: FounderCandidate[]
  bookmarkedFounderIds: Set<string>
  strictStage: boolean
  strictCheck: boolean
  strictGeo: boolean
}) {
  const ranked = rankFoundersForInvestor(params.candidates, params.investorProfile, 40)
  const boosted = ranked
    .map((rec) => {
      const summary = rec.founder.analysisSummary
      const summaryCount = summary?.analysisCount ?? 0
      const completenessBoost =
        (rec.founder.bio ? 6 : 0) +
        (rec.founder.websiteUrl ? 5 : 0) +
        (rec.founder.linkedinUrl ? 5 : 0) +
        (rec.founder.revenue ? 4 : 0) +
        (rec.founder.users ? 4 : 0)
      const confidence = Math.min(
        100,
        Math.round(35 + summaryCount * 8 + (summary ? 20 : 0) + (rec.founder.profileComplete ? 12 : 0) + completenessBoost),
      )

      const updatedAtRaw = summary?.updatedAt ? new Date(summary.updatedAt) : null
      const freshnessDays = updatedAtRaw ? Math.max(0, Math.floor((Date.now() - updatedAtRaw.getTime()) / 86400000)) : null
      const freshness =
        freshnessDays == null ? 40 : freshnessDays <= 7 ? 100 : freshnessDays <= 30 ? 75 : freshnessDays <= 90 ? 55 : 35

      const recencyBoost = freshnessDays == null ? 0 : freshnessDays <= 7 ? 6 : freshnessDays <= 30 ? 3 : 0
      const behaviorBoost = params.bookmarkedFounderIds.has(rec.founder.founderId) ? 5 : 0
      const specificityBoost = investorSpecificityBoost(rec.founder, params.investor)
      const upgradedMatchScore = Math.min(MAX_MATCH_SCORE, rec.matchScore + recencyBoost + behaviorBoost + specificityBoost)
      const strictFilterPass = toStrictPass(rec, params.strictStage, params.strictCheck, params.strictGeo)

      const actionHint =
        upgradedMatchScore >= 80
          ? 'High priority: review and reach out'
          : upgradedMatchScore >= 60
            ? 'Strong fit: save and review details'
            : 'Watchlist: monitor for new traction'

      return {
        ...rec,
        matchScore: upgradedMatchScore,
        confidence,
        freshness,
        strictFilterPass,
        actionHint,
      } satisfies RankedRecommendation
    })
    .sort((a, b) => b.matchScore - a.matchScore)

  return boosted
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = isAdminEmail(user.email)
    const investor = await db.investor.findUnique({ where: { email: user.email } })
    const canUseListing =
      Boolean(investor?.onboardingCompleted)

    let investorProfile: InvestorProfile
    if (canUseListing && investor) {
      investorProfile = investorRowToProfile(investor)
    } else if (admin) {
      investorProfile = adminPreviewInvestorProfile()
    } else {
      if (!investor) return NextResponse.json({ error: 'Investor profile not found' }, { status: 404 })
      return NextResponse.json({ error: 'Complete onboarding first' }, { status: 403 })
    }

    const url = new URL(request.url)
    const strictStage = parseBoolParam(url.searchParams.get('strictStage'))
    const strictCheck = parseBoolParam(url.searchParams.get('strictCheck'))
    const strictGeo = parseBoolParam(url.searchParams.get('strictGeo'))
    const analyzedOnly = parseBoolParam(url.searchParams.get('analyzedOnly'))
    const snapshotDelegate = (db as any).investorRecommendationSnapshot
    const latestSnapshot =
      canUseListing && investor && snapshotDelegate?.findFirst
        ? await snapshotDelegate.findFirst({
            where: { investorId: investor.id },
            orderBy: { refreshedAt: 'desc' },
            include: {
              items: {
                orderBy: { rank: 'asc' },
              },
            },
          })
        : null

    const savedRows = (latestSnapshot?.items || [])
      .map((item: any) => parseSavedPayload(item.payload))
      .filter(Boolean)
    const filtered = applyResponseFilters(savedRows, analyzedOnly, strictStage, strictCheck, strictGeo)

    return NextResponse.json({
      recommendations: filtered,
      total: filtered.length,
      source: 'saved',
      refreshedAt: latestSnapshot?.refreshedAt ?? null,
    })
  } catch (err: unknown) {
    console.error('[RECOMMENDED-FOUNDERS] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const investor = await db.investor.findUnique({ where: { email: user.email } })
    if (!investor) return NextResponse.json({ error: 'Investor profile not found' }, { status: 404 })
    if (!investor.onboardingCompleted) return NextResponse.json({ error: 'Complete onboarding first' }, { status: 403 })

    const url = new URL(request.url)
    const strictStage = parseBoolParam(url.searchParams.get('strictStage'))
    const strictCheck = parseBoolParam(url.searchParams.get('strictCheck'))
    const strictGeo = parseBoolParam(url.searchParams.get('strictGeo'))
    const analyzedOnly = parseBoolParam(url.searchParams.get('analyzedOnly'))

    const investorProfile = investorRowToProfile(investor)
    const recentSince = new Date(Date.now() - RECENT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const snapshotDelegate = (db as any).investorRecommendationSnapshot
    const snapshotItemDelegate = (db as any).investorRecommendationSnapshotItem
    const canPersistSnapshots = Boolean(snapshotDelegate?.findFirst && snapshotDelegate?.create && snapshotItemDelegate?.create)
    const latestSnapshot = canPersistSnapshots
      ? await snapshotDelegate.findFirst({
          where: { investorId: investor.id },
          orderBy: { refreshedAt: 'desc' },
          include: { items: true },
        })
      : null
    const previousFounderIds = new Set<string>((latestSnapshot?.items || []).map((i: any) => i.founderId))

    const summaryRows = await db.founderAnalysisSummary.findMany({
      select: { founderId: true },
      distinct: ['founderId'],
    })
    const founderIdsWithAnySummary = summaryRows.map((r) => r.founderId)

    const recentAnalysisRows = await db.founderAnalysisSummary.findMany({
      where: { updatedAt: { gte: recentSince } },
      select: { founderId: true },
      distinct: ['founderId'],
    })
    const recentAnalysisFounderIds = new Set(recentAnalysisRows.map((r) => r.founderId))

    const founders = await db.founder.findMany({
      where: {
        isStealth: false,
        OR: [
          { profileComplete: true },
          ...(founderIdsWithAnySummary.length > 0 ? [{ id: { in: founderIdsWithAnySummary } }] : []),
        ],
      },
      include: {
        analysisSummaries: { orderBy: { updatedAt: 'desc' } },
      },
    })

    const founderEmails = founders.map((f) => f.email)
    const allPrefs = await db.founderPrefs.findMany({ where: { email: { in: founderEmails } } })
    const prefsMap = new Map(allPrefs.map((p) => [p.email, p]))
    const allCandidates: FounderCandidate[] = []
    const recentCandidates: FounderCandidate[] = []
    const isFounderRecentlyActive = (f: Founder) =>
      f.updatedAt >= recentSince || recentAnalysisFounderIds.has(f.id)

    for (const f of founders) {
      const prefs = prefsMap.get(f.email)
      const summaries = f.analysisSummaries ?? []
      const isRecent = isFounderRecentlyActive(f)
      const isNewComparedToPrevious = !previousFounderIds.has(f.id)
      if (summaries.length > 0) {
        for (const summary of summaries) {
          const candidate = buildCandidate(f, summary, prefs)
          allCandidates.push(candidate)
          if (isRecent && isNewComparedToPrevious) recentCandidates.push(candidate)
        }
      } else if (f.profileComplete) {
        const candidate = buildCandidate(f, null, prefs)
        allCandidates.push(candidate)
        if (isRecent && isNewComparedToPrevious) recentCandidates.push(candidate)
      }
    }

    const bookmarks = await (db as any).investorFounderBookmark.findMany({
      where: { investorId: investor.id },
      select: { founderId: true },
    })
    const bookmarkedFounderIds = new Set((bookmarks as Array<{ founderId: string }>).map((b) => b.founderId))

    const recentRanked = await buildRankedRecommendations({
      investorProfile,
      investor,
      candidates: recentCandidates,
      bookmarkedFounderIds,
      strictStage,
      strictCheck,
      strictGeo,
    })
    const fallbackRanked =
      recentRanked.length >= MAX_REFRESH_RESULTS
        ? []
        : await buildRankedRecommendations({
            investorProfile,
            investor,
            candidates: allCandidates,
            bookmarkedFounderIds,
            strictStage,
            strictCheck,
            strictGeo,
          })
    const byFounderId = new Set<string>()
    const merged = [...recentRanked, ...fallbackRanked].filter((r) => {
      if (byFounderId.has(r.founder.founderId)) return false
      byFounderId.add(r.founder.founderId)
      return true
    })
    const top = merged.slice(0, MAX_REFRESH_RESULTS)
    const payloadRows = top.map((r) => toRecommendationPayload(r))

    const snapshot = canPersistSnapshots
      ? await db.$transaction(async (tx) => {
          const created = await (tx as any).investorRecommendationSnapshot.create({
            data: {
              investorId: investor.id,
              source: 'manual_refresh',
              contextVersion: 1,
              refreshedAt: new Date(),
            },
          })
          for (let i = 0; i < payloadRows.length; i++) {
            const row = payloadRows[i]
            await (tx as any).investorRecommendationSnapshotItem.create({
              data: {
                snapshotId: created.id,
                founderId: row.founderId,
                rank: i + 1,
                recommendationRowId: row.id,
                matchScore: row.matchScore,
                confidence: row.confidence ?? 0,
                freshness: row.freshness ?? 0,
                strictFilterPass: row.strictFilterPass ?? true,
                actionHint: row.actionHint ?? 'Review',
                matchReasons: JSON.stringify(row.matchReasons || []),
                dimensionBreakdown: JSON.stringify(row.dimensionBreakdown || {}),
                payload: JSON.stringify(row),
              },
            })
          }
          return created
        })
      : null

    const filtered = applyResponseFilters(payloadRows, analyzedOnly, strictStage, strictCheck, strictGeo)
    return NextResponse.json({
      recommendations: filtered,
      total: filtered.length,
      source: canPersistSnapshots ? 'refresh' : 'live',
      refreshedAt: snapshot?.refreshedAt ?? new Date(),
    })
  } catch (err: unknown) {
    console.error('[RECOMMENDED-FOUNDERS][POST] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
