import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserIncludingDevBypass } from '@/lib/auth'
import { grantsUnlimitedCreditsDisplay } from '@/lib/dev-ai-analysis-bypass'
import { logger } from '@/lib/logger'
import {
  computeFounderProfileCompletenessPercentUi,
  type FounderLikeForCompleteness,
} from '@/lib/founder-profile-completeness'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function jsonArrayLen(s: string | null | undefined): number {
  if (s == null || s === '') return 0
  try {
    const v = JSON.parse(s) as unknown
    return Array.isArray(v) ? v.length : 0
  } catch {
    return 0
  }
}

function matchCountFromAnalysisResultJson(s: string | null | undefined): number {
  if (!s) return 0
  try {
    const o = JSON.parse(s) as Record<string, unknown>
    const mc = o.matchCount
    if (typeof mc === 'number') return mc
    const matches = o.matches
    if (Array.isArray(matches)) return matches.length
    const matchedVCs = o.matchedVCs
    if (Array.isArray(matchedVCs)) return matchedVCs.length
    return 0
  } catch {
    return 0
  }
}

type RecentAnalysis = {
  id: string
  type: 'video-pitch' | 'unified-pitch' | 'pitch-deck' | 'pitch-idea'
  createdAt: string
  compatibilityScore: number
}

function mapVideoRow(row: {
  id: string
  createdAt: Date
  fileName: string
  analysisResult: string | null
}): RecentAnalysis {
  let analysisResult: Record<string, unknown> | null = null
  if (row.analysisResult) {
    try {
      analysisResult = JSON.parse(row.analysisResult) as Record<string, unknown>
    } catch {
      analysisResult = null
    }
  }
  const isUnified = analysisResult?.pitchType === 'UNIFIED'
  const overall = analysisResult?.overallScore
  return {
    id: row.id,
    type: isUnified ? 'unified-pitch' : 'video-pitch',
    createdAt: row.createdAt.toISOString(),
    compatibilityScore: typeof overall === 'number' ? overall : 0,
  }
}

function mapDeckRow(row: {
  id: string
  createdAt: Date
  fileName: string
  overallScore: number | null
  analysisResult: string | null
}): RecentAnalysis {
  let ar: Record<string, unknown> | null = null
  if (row.analysisResult) {
    try {
      ar = JSON.parse(row.analysisResult) as Record<string, unknown>
    } catch {
      ar = null
    }
  }
  const fromAr = ar?.overallScore
  const score = row.overallScore ?? (typeof fromAr === 'number' ? fromAr : 0) ?? 0
  return {
    id: row.id,
    type: 'pitch-deck',
    createdAt: row.createdAt.toISOString(),
    compatibilityScore: typeof score === 'number' ? score : 0,
  }
}

function mapIdeaRow(row: { id: string; createdAt: Date; analysisResult: string | null }): RecentAnalysis {
  let ar: Record<string, unknown> | null = null
  if (row.analysisResult) {
    try {
      ar = JSON.parse(row.analysisResult) as Record<string, unknown>
    } catch {
      ar = null
    }
  }
  const score =
    (typeof ar?.overallScore === 'number' ? ar.overallScore : null) ??
    (typeof ar?.finalScore === 'number' ? ar.finalScore : null) ??
    (typeof ar?.founderFit === 'number' ? ar.founderFit : null) ??
    (typeof ar?.ycFitScore === 'number' ? ar.ycFitScore : null) ??
    0
  return {
    id: row.id,
    type: 'pitch-idea',
    createdAt: row.createdAt.toISOString(),
    compatibilityScore: typeof score === 'number' ? score : 0,
  }
}

const smartMatchWhere = (founderId: string) => ({
  founderId,
  analysisResult: { not: null } as const,
  smartMatchResults: { not: null } as const,
})

const legacyMatchWhere = (founderId: string) => ({
  founderId,
  analysisResult: { not: null } as const,
  OR: [{ smartMatchResults: null }, { smartMatchResults: '' }],
})

async function sumTableMatchCounts(founderId: string, kind: 'video' | 'deck' | 'idea'): Promise<number> {
  const sw = smartMatchWhere(founderId)
  const lw = legacyMatchWhere(founderId)

  if (kind === 'video') {
    const [withSmart, legacy] = await Promise.all([
      db.videoPitch.findMany({ where: sw, select: { smartMatchResults: true } }),
      db.videoPitch.findMany({ where: lw, select: { analysisResult: true } }),
    ])
    let sum = 0
    for (const r of withSmart) sum += jsonArrayLen(r.smartMatchResults)
    for (const r of legacy) sum += matchCountFromAnalysisResultJson(r.analysisResult)
    return sum
  }

  if (kind === 'deck') {
    const [withSmart, legacy] = await Promise.all([
      db.pitchDeckAnalysis.findMany({ where: sw, select: { smartMatchResults: true } }),
      db.pitchDeckAnalysis.findMany({ where: lw, select: { analysisResult: true } }),
    ])
    let sum = 0
    for (const r of withSmart) sum += jsonArrayLen(r.smartMatchResults)
    for (const r of legacy) sum += matchCountFromAnalysisResultJson(r.analysisResult)
    return sum
  }

  const [withSmart, legacy] = await Promise.all([
    db.pitchIdeaAnalysis.findMany({ where: sw, select: { smartMatchResults: true } }),
    db.pitchIdeaAnalysis.findMany({ where: lw, select: { analysisResult: true } }),
  ])
  let sum = 0
  for (const r of withSmart) sum += jsonArrayLen(r.smartMatchResults)
  for (const r of legacy) sum += matchCountFromAnalysisResultJson(r.analysisResult)
  return sum
}

async function loadCredits(userId: string, email: string) {
  if (grantsUnlimitedCreditsDisplay(email)) {
    return {
      credits: Number.MAX_SAFE_INTEGER,
      isPremium: true,
      unlimitedCredits: true,
    }
  }
  let credits = await db.userCredits.findUnique({ where: { userId } })
  if (!credits) {
    credits = await db.userCredits.create({
      data: { userId, credits: 0, isPremium: false },
    })
  }
  return {
    credits: credits.credits ?? 0,
    isPremium: Boolean(credits.isPremium),
    unlimitedCredits: false,
  }
}

export async function GET() {
  try {
    const user = await getCurrentUserIncludingDevBypass()
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = user.email.toLowerCase().trim()
    const creditsPayload = await loadCredits(user.id, user.email)

    const founder = await db.founder.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        startupName: true,
        bio: true,
        stage: true,
        sectors: true,
        location: true,
        countryCode: true,
        regionCode: true,
        fundingNeed: true,
        pitchDeck: true,
        videoPitchUrl: true,
        linkedinUrl: true,
      },
    })

    if (!founder) {
      return NextResponse.json({
        founderExists: false,
        credits: { credits: creditsPayload.credits, isPremium: creditsPayload.isPremium },
        bookmarksCount: 0,
        analysesCount: 0,
        matchesCount: 0,
        profileCompleteness: 0,
        verificationStatus: null as string | null,
        recentAnalyses: [] as RecentAnalysis[],
      })
    }

    const founderId = founder.id

    const [
      verification,
      contact,
      bookmarkCount,
      videoCount,
      deckCount,
      ideaCount,
      matchVideo,
      matchDeck,
      matchIdea,
      recentVideos,
      recentDecks,
      recentIdeas,
    ] = await Promise.all([
      db.founderVerification.findUnique({ where: { email } }).catch(() => null),
      db.founderContact.findUnique({ where: { email }, select: { linkedin: true } }).catch(() => null),
      db.bookmark.count({ where: { founderId } }),
      db.videoPitch.count({ where: { founderId, analysisResult: { not: null } } }),
      db.pitchDeckAnalysis.count({ where: { founderId, analysisResult: { not: null } } }),
      db.pitchIdeaAnalysis.count({ where: { founderId, analysisResult: { not: null } } }),
      sumTableMatchCounts(founderId, 'video'),
      sumTableMatchCounts(founderId, 'deck'),
      sumTableMatchCounts(founderId, 'idea'),
      db.videoPitch.findMany({
        where: { founderId, analysisResult: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, createdAt: true, fileName: true, analysisResult: true },
      }),
      db.pitchDeckAnalysis.findMany({
        where: { founderId, analysisResult: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, createdAt: true, fileName: true, overallScore: true, analysisResult: true },
      }),
      db.pitchIdeaAnalysis.findMany({
        where: { founderId, analysisResult: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, createdAt: true, analysisResult: true },
      }),
    ])

    const founderLike: FounderLikeForCompleteness = {
      name: founder.name,
      startupName: founder.startupName,
      bio: founder.bio,
      stage: founder.stage,
      sectors: founder.sectors,
      location: founder.location,
      countryCode: founder.countryCode,
      regionCode: founder.regionCode,
      fundingNeed: founder.fundingNeed,
      pitchDeck: founder.pitchDeck,
      videoPitchUrl: founder.videoPitchUrl,
      linkedinUrl: founder.linkedinUrl,
      linkedin: contact?.linkedin ?? null,
    }
    const verificationStatus = verification?.status ?? null
    const profileCompleteness = computeFounderProfileCompletenessPercentUi(founderLike, verificationStatus)

    const mergedRecent = [
      ...recentVideos.map(mapVideoRow),
      ...recentDecks.map(mapDeckRow),
      ...recentIdeas.map(mapIdeaRow),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    return NextResponse.json({
      founderExists: true,
      credits: { credits: creditsPayload.credits, isPremium: creditsPayload.isPremium },
      bookmarksCount: bookmarkCount,
      analysesCount: videoCount + deckCount + ideaCount,
      matchesCount: matchVideo + matchDeck + matchIdea,
      profileCompleteness,
      verificationStatus,
      recentAnalyses: mergedRecent,
    })
  } catch (e: unknown) {
    logger.error('[HUB-SUMMARY]', e)
    return NextResponse.json({ error: 'Failed to load hub summary' }, { status: 500 })
  }
}
