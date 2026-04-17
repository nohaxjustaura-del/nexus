import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 24
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

    const founder = await db.founder.findUnique({
      where: { email: user.email },
      select: {
        id: true,
        pitchDeck: true,
        updatedAt: true,
        createdAt: true,
      },
    }).catch((err) => {
      console.error('Error fetching founder:', err)
      return null
    })

    if (!founder) {
      return NextResponse.json({
        analyses: [],
      })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(toPositiveInt(searchParams.get('limit'), DEFAULT_LIMIT), MAX_LIMIT)
    const includeResult = searchParams.get('includeResult') === '1'

    // Pull only the most recent slice from each analysis type.
    // This avoids fetching/parsing an unbounded amount of historical JSON.
    const [resumeAnalyses, videoPitches, pitchDeckAnalyses, pitchIdeaAnalyses] = await Promise.all([
      db.resumeAnalysis.findMany({
        where: { founderId: founder.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          createdAt: true,
          compatibilityScore: true,
          resumeFileName: true,
          fullResult: includeResult,
        },
      }).catch(() => []),
      db.videoPitch.findMany({
        where: {
          founderId: founder.id,
          analysisResult: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          createdAt: true,
          fileName: true,
          analysisResult: includeResult,
        },
      }).catch(() => []),
      db.pitchDeckAnalysis.findMany({
        where: {
          founderId: founder.id,
          analysisResult: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          createdAt: true,
          fileName: true,
          fileUrl: true,
          overallScore: true,
          analysisResult: includeResult,
        },
      }).catch(() => []),
      (db as any).pitchIdeaAnalysis.findMany({
        where: {
          founderId: founder.id,
          analysisResult: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          createdAt: true,
          ideaText: true,
          analysisResult: includeResult,
          smartMatchResults: includeResult,
        },
      }).catch(() => []),
    ])

    // Format all analyses with equal importance
    const allAnalyses = [
      // Resume analyses
      ...resumeAnalyses.map((analysis) => {
        let analysisResult = null
        if (includeResult && analysis.fullResult) {
          try {
            analysisResult = JSON.parse(analysis.fullResult)
          } catch {
            /* invalid JSON */
          }
        }

        return {
          id: analysis.id,
          type: 'resume',
          createdAt: analysis.createdAt,
          compatibilityScore: analysis.compatibilityScore,
          confidence: 85,
          result: analysisResult,
          fileName: analysis.resumeFileName,
        }
      }),
      // Video pitch analyses
      ...videoPitches.map((pitch) => {
        let analysisResult = null
        if (includeResult && pitch.analysisResult) {
          try {
            analysisResult = JSON.parse(pitch.analysisResult)
          } catch {
            /* invalid JSON */
          }
        }

        const isUnified = analysisResult?.pitchType === 'UNIFIED'
        return {
          id: pitch.id,
          type: isUnified ? 'unified-pitch' : 'video-pitch',
          createdAt: pitch.createdAt,
          compatibilityScore: analysisResult?.overallScore || 0,
          confidence: analysisResult?.confidence || 85,
          result: analysisResult,
          fileName: pitch.fileName,
        }
      }),
      // 🆕 Pitch deck analyses (now stored in database)
      ...pitchDeckAnalyses.map((analysis: any) => {
        let analysisResult = null
        if (includeResult && analysis.analysisResult) {
          try {
            analysisResult = JSON.parse(analysis.analysisResult)
          } catch {
            /* invalid JSON */
          }
        }

        return {
          id: analysis.id,
          type: 'pitch-deck',
          createdAt: analysis.createdAt,
          compatibilityScore: analysis.overallScore || analysisResult?.overallScore || 0,
          confidence: 85,
          result: analysisResult,
          fileName: analysis.fileName,
          url: analysis.fileUrl || undefined,
        }
      }),
      // Pitch idea analyses
      ...pitchIdeaAnalyses.map((analysis: any) => {
        let analysisResult = null
        if (includeResult && analysis.analysisResult) {
          try {
            analysisResult = JSON.parse(analysis.analysisResult)
          } catch {
            /* invalid JSON */
          }
        }
        let smartMatchResults = null
        if (includeResult && analysis.smartMatchResults) {
          try {
            smartMatchResults = JSON.parse(analysis.smartMatchResults)
          } catch {
            /* invalid JSON */
          }
        }

        return {
          id: analysis.id,
          type: 'pitch-idea',
          createdAt: analysis.createdAt,
          compatibilityScore:
            analysisResult?.overallScore ||
            analysisResult?.finalScore ||
            analysisResult?.founderFit ||
            analysisResult?.ycFitScore ||
            0,
          confidence: 85,
          result: {
            ...analysisResult,
            matchedVCs: smartMatchResults || [],
            matchCount: smartMatchResults?.length || 0,
          },
          fileName: analysis.ideaText?.substring(0, 60) + (analysis.ideaText?.length > 60 ? '...' : ''),
        }
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      analyses: allAnalyses.slice(0, limit),
    })
  } catch (error: unknown) {
    console.error('[API] /api/all-analyses', error)
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    )
  }
}

