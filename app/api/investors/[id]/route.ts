import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const investor = await db.investor.findUnique({
      where: { id: params.id, isPublic: true },
      select: {
        id: true,
        firmName: true,
        name: true,
        bio: true,
        verified: true,
        stages: true,
        sectors: true,
        geoFocus: true,
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
      },
    })

    if (!investor) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let enrichment: { snapshot?: string; recentDeals?: string } | null = null
    try {
      enrichment = await (db as any).vCEnrichmentCache.findUnique({
        where: { investorId: params.id },
        select: { snapshot: true, recentDeals: true },
      })
    } catch {
      // enrichment cache may not exist for all investors
    }

    return NextResponse.json({
      investor,
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
