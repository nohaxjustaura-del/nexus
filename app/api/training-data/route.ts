import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/training-data
 *
 * Admin-only endpoint that exports all stored user submissions as structured
 * JSON suitable for training data consumption by external projects.
 *
 * Query params:
 *   ?since=2026-01-01   – only return records created after this date
 *   ?type=video|deck|idea – filter by submission type
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { searchParams } = new URL(request.url)
    const sinceParam = searchParams.get('since')
    const typeParam = searchParams.get('type') // "video" | "deck" | "idea" | "voice"

    // Build a date filter if provided
    const sinceDate = sinceParam ? new Date(sinceParam) : undefined
    const dateFilter = sinceDate && !isNaN(sinceDate.getTime())
      ? { createdAt: { gte: sinceDate } }
      : {}

    // ---- Fetch data in parallel ----
    const [videoPitches, pitchDecks, pitchIdeas, voiceRecordings] = await Promise.all([
      // Video pitches
      (!typeParam || typeParam === 'video')
        ? db.videoPitch.findMany({
            where: { ...dateFilter },
            select: {
              id: true,
              founderId: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
              fileSize: true,
              transcript: true,
              transcriptText: true,
              analysisResult: true,
              founderSnapshot: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),

      // Pitch decks
      (!typeParam || typeParam === 'deck')
        ? db.pitchDeckAnalysis.findMany({
            where: { ...dateFilter },
            select: {
              id: true,
              founderId: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
              fileSize: true,
              extractedText: true,
              overallScore: true,
              analysisResult: true,
              founderSnapshot: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),

      // Pitch ideas
      (!typeParam || typeParam === 'idea')
        ? (db as any).pitchIdeaAnalysis.findMany({
            where: { ...dateFilter },
            select: {
              id: true,
              founderId: true,
              ideaText: true,
              analysisResult: true,
              founderSnapshot: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),

      // Voice recordings
      (!typeParam || typeParam === 'voice')
        ? (db as any).voiceRecording.findMany({
            where: { ...dateFilter },
            select: {
              id: true,
              founderId: true,
              fileName: true,
              fileUrl: true,
              fileType: true,
              fileSize: true,
              durationSeconds: true,
              transcript: true,
              language: true,
              founderSnapshot: true,
              pitchIdeaAnalysisId: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ])

    // ---- Helper to safely parse JSON fields ----
    const safeParse = (val: string | null | undefined) => {
      if (!val) return null
      try { return JSON.parse(val) } catch { return val }
    }

    // ---- Transform into clean export format ----
    const exportData = {
      exportedAt: new Date().toISOString(),
      filters: {
        since: sinceParam || null,
        type: typeParam || 'all',
      },
      counts: {
        videoPitches: videoPitches.length,
        pitchDecks: pitchDecks.length,
        pitchIdeas: pitchIdeas.length,
        voiceRecordings: voiceRecordings.length,
        total: videoPitches.length + pitchDecks.length + pitchIdeas.length + voiceRecordings.length,
      },
      videoPitches: videoPitches.map((vp: any) => ({
        id: vp.id,
        founderId: vp.founderId,
        founderSnapshot: safeParse(vp.founderSnapshot),
        fileName: vp.fileName,
        filePath: vp.fileUrl || null,
        fileType: vp.fileType,
        fileSize: vp.fileSize,
        transcript: safeParse(vp.transcript),
        transcriptText: vp.transcriptText,
        analysisResult: safeParse(vp.analysisResult),
        createdAt: vp.createdAt,
      })),
      pitchDecks: pitchDecks.map((pd: any) => ({
        id: pd.id,
        founderId: pd.founderId,
        founderSnapshot: safeParse(pd.founderSnapshot),
        fileName: pd.fileName,
        filePath: pd.fileUrl || null,
        fileType: pd.fileType,
        fileSize: pd.fileSize,
        extractedText: pd.extractedText,
        overallScore: pd.overallScore,
        analysisResult: safeParse(pd.analysisResult),
        createdAt: pd.createdAt,
      })),
      pitchIdeas: pitchIdeas.map((pi: any) => ({
        id: pi.id,
        founderId: pi.founderId,
        founderSnapshot: safeParse(pi.founderSnapshot),
        ideaText: pi.ideaText,
        analysisResult: safeParse(pi.analysisResult),
        createdAt: pi.createdAt,
      })),
      voiceRecordings: voiceRecordings.map((vr: any) => ({
        id: vr.id,
        founderId: vr.founderId,
        founderSnapshot: safeParse(vr.founderSnapshot),
        fileName: vr.fileName,
        filePath: vr.fileUrl || null,
        fileType: vr.fileType,
        fileSize: vr.fileSize,
        durationSeconds: vr.durationSeconds,
        transcript: vr.transcript,
        language: vr.language,
        pitchIdeaAnalysisId: vr.pitchIdeaAnalysisId,
        createdAt: vr.createdAt,
      })),
    }

    logger.log(`[TRAINING-DATA] Exported ${exportData.counts.total} records for admin ${user.email}`)

    return NextResponse.json(exportData, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    logger.error('[TRAINING-DATA] Export error:', error?.message || error)
    return NextResponse.json(
      { error: 'Failed to export training data', message: error?.message },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

