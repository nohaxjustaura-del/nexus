import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const includeResult = searchParams.get('includeResult') === '1'
    const limit = Math.min(toPositiveInt(searchParams.get('limit'), DEFAULT_LIMIT), MAX_LIMIT)

    // Get analyses for this founder (ordered by most recent)
    const analyses = await db.resumeAnalysis.findMany({
      where: { founderId: founder.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        compatibilityScore: true,
        fullResult: includeResult,
      },
    })

    if (analyses.length === 0) {
      return NextResponse.json({
        analyses: [],
      })
    }

    // Parse and format each analysis
    const formattedAnalyses = analyses.map(analysis => {
      let analysisResult = null
      if (includeResult && analysis.fullResult) {
        try {
          analysisResult = JSON.parse(analysis.fullResult)
        } catch {
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
