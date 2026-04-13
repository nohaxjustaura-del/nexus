import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { formatFounderLocationLine } from '@/lib/geo/format-founder-location'
import { rankFoundersForInvestor, type FounderCandidate, type InvestorProfile } from '@/lib/investor-founder-recommendations'
import type { Founder, FounderAnalysisSummary, FounderPrefs } from '@prisma/client'

export const dynamic = 'force-dynamic'

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

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const investor = await db.investor.findUnique({ where: { email: user.email } })
    if (!investor) return NextResponse.json({ error: 'Investor profile not found' }, { status: 404 })
    if (!investor.onboardingCompleted) {
      return NextResponse.json({ error: 'Complete onboarding first' }, { status: 403 })
    }

    // Resolve "has analysis" via explicit ids so we never depend on nested-relation filters
    // (avoids empty results if relation filters behave differently across DB/client states).
    const summaryRows = await db.founderAnalysisSummary.findMany({
      select: { founderId: true },
      distinct: ['founderId'],
    })
    const founderIdsWithAnySummary = summaryRows.map((r) => r.founderId)

    const founders = await db.founder.findMany({
      where: {
        isStealth: false,
        OR: [
          { profileComplete: true },
          ...(founderIdsWithAnySummary.length > 0
            ? [{ id: { in: founderIdsWithAnySummary } }]
            : []),
        ],
      },
      include: {
        analysisSummaries: {
          orderBy: { updatedAt: 'desc' },
        },
      },
    })

    const founderEmails = founders.map((f) => f.email)
    const allPrefs = await db.founderPrefs.findMany({
      where: { email: { in: founderEmails } },
    })
    const prefsMap = new Map(allPrefs.map((p) => [p.email, p]))

    const candidates: FounderCandidate[] = []
    for (const f of founders) {
      const prefs = prefsMap.get(f.email)
      const summaries = f.analysisSummaries ?? []
      if (summaries.length > 0) {
        for (const summary of summaries) {
          candidates.push(buildCandidate(f, summary, prefs))
        }
      } else if (f.profileComplete) {
        candidates.push(buildCandidate(f, null, prefs))
      }
    }

    const investorProfile: InvestorProfile = {
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

    const recommendations = rankFoundersForInvestor(candidates, investorProfile, 15)

    const results = recommendations.map((r) => ({
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
          }
        : null,
    }))

    return NextResponse.json({ recommendations: results, total: results.length })
  } catch (err: unknown) {
    console.error('[RECOMMENDED-FOUNDERS] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
