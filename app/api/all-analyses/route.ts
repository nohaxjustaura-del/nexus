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
    const [resumeAnalyses, videoPitches] = await Promise.all([
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
    ])
    
    // Pitch deck - just check if URL exists (no separate model)
    const pitchDeck = founder.pitchDeck ? [{
      id: 'pitch-deck-1',
      type: 'pitch-deck',
      createdAt: founder.updatedAt || founder.createdAt,
      url: founder.pitchDeck,
    }] : []

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
          compatibilityScore: analysisResult?.compatibilityScore || 0,
          confidence: analysisResult?.confidence || 85,
          result: analysisResult,
          fileName: pitch.fileName,
        }
      }),
      // Pitch deck
      ...(pitchDeck.length > 0 ? pitchDeck.map(deck => ({
        id: deck.id,
        type: 'pitch-deck',
        createdAt: deck.createdAt,
        compatibilityScore: 0,
        confidence: 0,
        result: null,
        url: deck.url,
      })) : []),
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

