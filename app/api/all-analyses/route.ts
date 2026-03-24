import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('[API] /api/all-analyses GET called')
    const user = await getCurrentUser()
    console.log('[API] /api/all-analyses user:', user ? `found (${user.email})` : 'not found')
    
    if (!user || !user.email) {
      console.log('[API] /api/all-analyses unauthorized')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find founder profile
    console.log('[API] /api/all-analyses fetching founder profile...')
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
      console.log('[API] /api/all-analyses founder not found')
      return NextResponse.json({
        analyses: [],
      })
    }

    console.log('[API] /api/all-analyses founder found, fetching analyses...')
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
          } catch (e) {
            console.warn('Could not parse resume analysis result')
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
          } catch (e) {
            console.warn('Could not parse video pitch analysis result')
          }
        }

        return {
          id: pitch.id,
          type: 'video-pitch',
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
          } catch (e) {
            console.warn('Could not parse pitch deck analysis result')
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
          } catch (e) {
            console.warn('Could not parse pitch idea analysis result')
          }
        }
        let smartMatchResults = null
        if (analysis.smartMatchResults) {
          try {
            smartMatchResults = JSON.parse(analysis.smartMatchResults)
          } catch (e) {
            console.warn('Could not parse pitch idea match results')
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

    console.log(`[API] /api/all-analyses success: ${allAnalyses.length} analyses found`)
    return NextResponse.json({
      analyses: allAnalyses,
    })
  } catch (error: any) {
    console.error('[API] /api/all-analyses error:', error?.message || error)
    console.error('[API] /api/all-analyses error stack:', error?.stack || 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    )
  }
}

