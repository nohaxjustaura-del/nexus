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

    // Get all analysis types
    const [resumeAnalyses, videoPitches, pitchDeckAnalyses, pitchIdeaAnalyses] = await Promise.all([
      // Resume analyses
      db.resumeAnalysis.findMany({
        where: { founderId: founder.id },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      // Video pitch analyses
      db.videoPitch.findMany({
        where: { 
          founderId: founder.id,
          analysisResult: { not: null },
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      // Pitch deck analyses
      db.pitchDeckAnalysis.findMany({
        where: { 
          founderId: founder.id,
          analysisResult: { not: null },
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      // Pitch idea analyses
      (db as any).pitchIdeaAnalysis.findMany({
        where: { 
          founderId: founder.id,
          analysisResult: { not: null },
        },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
    ])

    // Format all analyses with equal importance
    const allAnalyses = [
      // Resume analyses
      ...resumeAnalyses.map(analysis => {
        let analysisResult = null
        if (analysis.fullResult) {
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
      ...videoPitches.map(pitch => {
        let analysisResult = null
        if (pitch.analysisResult) {
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
        if (analysis.analysisResult) {
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
        }
      }),
      // Pitch idea analyses
      ...pitchIdeaAnalyses.map((analysis: any) => {
        let analysisResult = null
        if (analysis.analysisResult) {
          try {
            analysisResult = JSON.parse(analysis.analysisResult)
          } catch {
            /* invalid JSON */
          }
        }
        let smartMatchResults = null
        if (analysis.smartMatchResults) {
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
          compatibilityScore: analysisResult?.founderFit || analysisResult?.ycFitScore || 0,
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
      analyses: allAnalyses,
    })
  } catch (error: unknown) {
    console.error('[API] /api/all-analyses', error)
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    )
  }
}

