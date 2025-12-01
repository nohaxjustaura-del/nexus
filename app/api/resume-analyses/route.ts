import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find founder profile
    const founder = await db.founder.findUnique({
      where: { email: user.email },
    })

    if (!founder) {
      return NextResponse.json({
        analyses: [],
      })
    }

    // Get all analyses for this founder (ordered by most recent)
    const analyses = await db.resumeAnalysis.findMany({
      where: { founderId: founder.id },
      orderBy: { createdAt: 'desc' },
    })

    if (analyses.length === 0) {
      return NextResponse.json({
        analyses: [],
      })
    }

    // Parse and format each analysis
    const formattedAnalyses = analyses.map(analysis => {
      let analysisResult = null
      if (analysis.fullResult) {
        try {
          analysisResult = JSON.parse(analysis.fullResult)
        } catch (e) {
          console.warn('Could not parse stored analysis result')
        }
      }

      return {
        id: analysis.id,
        createdAt: analysis.createdAt,
        compatibilityScore: analysis.compatibilityScore,
        confidence: 85, // Default confidence
        result: analysisResult, // Full analysis result
      }
    })

    return NextResponse.json({
      analyses: formattedAnalyses,
    })
  } catch (error: any) {
    console.error('Error fetching resume analyses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    )
  }
}
