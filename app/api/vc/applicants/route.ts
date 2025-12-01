import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { parseJSON } from '@/lib/utils'
import { logger } from '@/lib/logger'

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
    const investorStages = parseJSON<string[]>(investor.stages, [])
    const investorSectors = parseJSON<string[]>(investor.sectors, [])
    const investorGeoFocus = parseJSON<string[]>(investor.geoFocus, [])

    const matchedFounders = founders
      .filter(founder => {
        // Stage match
        const founderStage = founder.stage.toLowerCase()
        const stageMatch = investorStages.some(stage => 
          founderStage.includes(stage.toLowerCase()) || 
          stage.toLowerCase().includes(founderStage)
        )

        // Sector match
        const founderSectors = parseJSON<string[]>(founder.sectors, [])
        const sectorMatch = investorSectors.some(sector =>
          founderSectors.some(fs => 
            fs.toLowerCase().includes(sector.toLowerCase()) ||
            sector.toLowerCase().includes(fs.toLowerCase())
          )
        )

        // Check size match
        const checkSizeMatch = investor.checkMin && investor.checkMax &&
                              founder.fundingNeed >= (investor.checkMin || 0) && 
                              founder.fundingNeed <= (investor.checkMax || Infinity)

        // Geo match (if VC has geo restrictions)
        let geoMatch = true
        if (investorGeoFocus.length > 0 && !investorGeoFocus.some(g => g.toLowerCase().includes('global'))) {
          geoMatch = investorGeoFocus.some(geo =>
            founder.location?.toLowerCase().includes(geo.toLowerCase()) ||
            geo.toLowerCase().includes(founder.location?.toLowerCase() || '')
          )
        }

        return stageMatch && sectorMatch && checkSizeMatch && geoMatch
      })
      .map(founder => {
        // Calculate match score (simplified)
        const founderSectors = parseJSON<string[]>(founder.sectors, [])
        const sectorOverlap = founderSectors.filter(fs =>
          investorSectors.some(is =>
            fs.toLowerCase().includes(is.toLowerCase()) ||
            is.toLowerCase().includes(fs.toLowerCase())
          )
        ).length

        const sectorScore = investorSectors.length > 0 && founderSectors.length > 0
          ? (sectorOverlap / Math.max(investorSectors.length, founderSectors.length)) * 100
          : 0
        const checkSizeScore = investor.checkMin && investor.checkMax &&
                               founder.fundingNeed >= (investor.checkMin || 0) && 
                               founder.fundingNeed <= (investor.checkMax || Infinity) ? 100 : 50

        const matchScore = Math.round((sectorScore * 0.6 + checkSizeScore * 0.4))

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











