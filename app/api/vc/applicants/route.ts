import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { parseJSON } from '@/lib/utils'
import { logger } from '@/lib/logger'
import {
  founderMatchesInvestorThesis,
  matchScoreForFounderInvestor,
} from '@/lib/vc-founder-thesis-match'

export const dynamic = 'force-dynamic'

// GET: Get founders who match this VC's investment thesis
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get VC profile
    const investor = await db.investor.findUnique({
      where: { email: user.email },
    })

    if (!investor) {
      return NextResponse.json(
        { error: 'VC profile not found' },
        { status: 404 }
      )
    }
    
    if (!investor.verified) {
      return NextResponse.json(
        { error: 'VC profile not verified. Please verify your account first.' },
        { status: 403 }
      )
    }

    // Get all founders
    const founders = await db.founder.findMany({
      include: {
        resumeAnalyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        applications: {
          where: { investorId: investor.id },
        },
      },
    })

    // Filter founders by VC's investment criteria
    const matchedFounders = founders
      .filter((founder) => founderMatchesInvestorThesis(founder, investor))
      .map(founder => {
        const matchScore = matchScoreForFounderInvestor(founder, investor)
        const founderSectors = parseJSON<string[]>(founder.sectors, [])

        return {
          id: founder.id,
          name: founder.name,
          email: founder.email,
          startupName: founder.startupName,
          stage: founder.stage,
          sectors: founderSectors,
          location: founder.location,
          fundingNeed: founder.fundingNeed,
          matchScore,
          hasResumeAnalysis: founder.resumeAnalyses.length > 0,
          hasPitchDeck: !!founder.pitchDeck,
          applicationStatus: founder.applications.length > 0 ? founder.applications[0].status : null,
          createdAt: founder.createdAt,
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 50) // Top 50 matches

    return NextResponse.json({
      applicants: matchedFounders,
      total: matchedFounders.length,
    })
  } catch (error: any) {
    logger.error('[VC-APPLICANTS] Error fetching applicants:', error)
    console.error('[VC-APPLICANTS] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applicants', message: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}











