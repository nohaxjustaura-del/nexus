import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { analyzeInvestorLinks } from '@/lib/vc-link-quality'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const investors = await db.investor.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        firmName: true,
        verified: true,
        stages: true,
        sectors: true,
        checkMin: true,
        checkMax: true,
        geoFocus: true,
        applicationUrl: true,
        linkedinUrl: true,
        websiteUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const enriched = investors.map((inv) => {
      const linkQuality = analyzeInvestorLinks({
        websiteUrl: inv.websiteUrl,
        linkedinUrl: inv.linkedinUrl,
        applicationUrl: inv.applicationUrl,
      })
      return {
        ...inv,
        linkQuality: {
          safeWebsite: linkQuality.safeWebsite,
          safeLinkedin: linkQuality.safeLinkedin,
          safeApplication: linkQuality.safeApplication,
          issues: linkQuality.issues,
          linkClean: linkQuality.linkClean,
        },
      }
    })

    return NextResponse.json({ investors: enriched })
  } catch (error) {
    console.error('Error fetching investors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch investors' },
      { status: 500 }
    )
  }
}














