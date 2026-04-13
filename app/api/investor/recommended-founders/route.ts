import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { formatFounderLocationLine } from '@/lib/geo/format-founder-location'
import { rankFoundersForInvestor, type FounderCandidate, type InvestorProfile } from '@/lib/investor-founder-recommendations'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const investor = await db.investor.findUnique({ where: { email: user.email } })
    if (!investor) return NextResponse.json({ error: 'Investor profile not found' }, { status: 404 })
    if (!investor.onboardingCompleted) {
      return NextResponse.json({ error: 'Complete onboarding first' }, { status: 403 })
    }

    // Eligibility must match `founderIsEligibleForInvestorRanking` in lib/investor-founder-recommendations.ts
    const founders = await db.founder.findMany({
      where: {
        isStealth: false,
        OR: [
          { profileComplete: true },
          { analysisSummary: { isNot: null } },
        ],
      },
      include: {
        analysisSummary: true,
      },
    })

    const founderEmails = founders.map(f => f.email)
    const allPrefs = await db.founderPrefs.findMany({
      where: { email: { in: founderEmails } },
    })
    const prefsMap = new Map(allPrefs.map(p => [p.email, p]))

    const candidates: FounderCandidate[] = founders.map(f => ({
      id: f.id,
      name: f.name ?? '',
      email: f.email,
      startupName: f.startupName,
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
      analysisSummary: f.analysisSummary ? {
        overallScore: f.analysisSummary.overallScore,
        tier: f.analysisSummary.tier,
        conviction: f.analysisSummary.conviction,
        marketScore: f.analysisSummary.marketScore,
        teamScore: f.analysisSummary.teamScore,
        tractionScore: f.analysisSummary.tractionScore,
        productScore: f.analysisSummary.productScore,
        strengths: f.analysisSummary.strengths,
        weaknesses: f.analysisSummary.weaknesses,
        executiveSummary: f.analysisSummary.executiveSummary,
        sectorFit: f.analysisSummary.sectorFit,
        tractionMetrics: f.analysisSummary.tractionMetrics,
        marketAnalysis: f.analysisSummary.marketAnalysis,
        teamAnalysis: f.analysisSummary.teamAnalysis,
        redFlags: f.analysisSummary.redFlags,
        bullCase: f.analysisSummary.bullCase,
        bearCase: f.analysisSummary.bearCase,
        analysisType: f.analysisSummary.analysisType,
        analysisCount: f.analysisSummary.analysisCount,
      } : null,
      prefs: prefsMap.has(f.email) ? {
        isImmigrant: prefsMap.get(f.email)!.isImmigrant,
        isUnderrepresented: prefsMap.get(f.email)!.isUnderrepresented,
        isStudent: prefsMap.get(f.email)!.isStudent,
        isVeteran: prefsMap.get(f.email)!.isVeteran,
        isWoman: prefsMap.get(f.email)!.isWoman,
        isLgbtq: prefsMap.get(f.email)!.isLgbtq,
        isBipoc: prefsMap.get(f.email)!.isBipoc,
      } : null,
    }))

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

    const results = recommendations.map(r => ({
      id: r.founder.id,
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
      analysisSummary: r.founder.analysisSummary ? {
        overallScore: r.founder.analysisSummary.overallScore,
        tier: r.founder.analysisSummary.tier,
        strengths: (() => { try { return JSON.parse(r.founder.analysisSummary.strengths || '[]') } catch { return [] } })(),
        weaknesses: (() => { try { return JSON.parse(r.founder.analysisSummary.weaknesses || '[]') } catch { return [] } })(),
        executiveSummary: r.founder.analysisSummary.executiveSummary,
        marketScore: r.founder.analysisSummary.marketScore,
        teamScore: r.founder.analysisSummary.teamScore,
        tractionScore: r.founder.analysisSummary.tractionScore,
        productScore: r.founder.analysisSummary.productScore,
        marketAnalysis: r.founder.analysisSummary.marketAnalysis,
        teamAnalysis: r.founder.analysisSummary.teamAnalysis,
        redFlags: (() => { try { return JSON.parse(r.founder.analysisSummary.redFlags || '[]') } catch { return [] } })(),
        bullCase: r.founder.analysisSummary.bullCase,
        bearCase: r.founder.analysisSummary.bearCase,
        analysisCount: r.founder.analysisSummary.analysisCount,
      } : null,
    }))

    return NextResponse.json({ recommendations: results, total: results.length })
  } catch (err: any) {
    console.error('[RECOMMENDED-FOUNDERS] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
