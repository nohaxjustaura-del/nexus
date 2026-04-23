import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

type RouteParams = { id: string } | Promise<{ id: string }>

async function routeParamId(params: RouteParams): Promise<string> {
  const p = await Promise.resolve(params)
  return p.id
}

export async function GET(_request: NextRequest, { params }: { params: RouteParams }) {
  try {
    const id = await routeParamId(params)
    const investor = await db.investor.findUnique({
      where: { id, isPublic: true },
      select: {
        id: true,
        firmName: true,
        name: true,
        bio: true,
        verified: true,
        stages: true,
        sectors: true,
        geoFocus: true,
        geography: true,
        checkMin: true,
        checkMax: true,
        checkSizeMin: true,
        checkSizeMax: true,
        fundType: true,
        fundSize: true,
        leadFollow: true,
        thesis: true,
        portfolio: true,
        notableInvestments: true,
        proofPoints: true,
        valueAddTags: true,
        personalityType: true,
        decisionSpeed: true,
        ownershipTarget: true,
        websiteUrl: true,
        applicationUrl: true,
        twitterUrl: true,
        linkedinUrl: true,
        crunchbaseUrl: true,
        foundedYear: true,
        partnerNames: true,
        activelyInvesting: true,
        lastDealDate: true,
        enrichedAt: true,
        portfolioCompanies: {
          orderBy: { investmentYear: 'desc' },
          select: {
            id: true,
            companyName: true,
            companyWebsite: true,
            sector: true,
            stage: true,
            investmentYear: true,
            investmentDate: true,
            amount: true,
            isLead: true,
            coInvestors: true,
            confidence: true,
          },
        },
        enrichmentCache: { select: { snapshot: true, recentDeals: true } },
      },
    })

    if (!investor) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { enrichmentCache, ...inv } = investor
    const enrichment = enrichmentCache
      ? {
          snapshot: enrichmentCache.snapshot ?? null,
          recentDeals: enrichmentCache.recentDeals ?? '[]',
        }
      : null

    return NextResponse.json({
      investor: {
        ...inv,
        lastDealDate: investor.lastDealDate?.toISOString() ?? null,
        enrichedAt: investor.enrichedAt?.toISOString() ?? null,
        portfolioCompanies: investor.portfolioCompanies.map((p) => ({
          ...p,
          investmentDate: p.investmentDate?.toISOString() ?? null,
        })),
      },
      enrichment: enrichment
        ? {
            snapshot: enrichment.snapshot ?? null,
            recentDeals: enrichment.recentDeals ?? '[]',
          }
        : null,
    })
  } catch (error) {
    console.error('[INVESTOR-PROFILE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
