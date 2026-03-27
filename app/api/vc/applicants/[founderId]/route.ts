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

function safeStringArray(raw: string | null | undefined, fallback: string[] = []): string[] {
  if (!raw) return fallback
  const parsed = parseJSON<string[]>(raw, [])
  return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : fallback
}

function pickDeckSummary(parsed: Record<string, unknown> | null): {
  overallScore: number | null
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
} {
  if (!parsed || typeof parsed !== 'object') {
    return { overallScore: null, strengths: [], weaknesses: [], improvements: [] }
  }
  const overallScore =
    typeof parsed.overallScore === 'number' ? parsed.overallScore : null
  const strengths = Array.isArray(parsed.strengths)
    ? (parsed.strengths as unknown[]).filter((x): x is string => typeof x === 'string')
    : []
  const weaknesses = Array.isArray(parsed.weaknesses)
    ? (parsed.weaknesses as unknown[]).filter((x): x is string => typeof x === 'string')
    : []
  const improvements = Array.isArray(parsed.improvements)
    ? (parsed.improvements as unknown[]).filter((x): x is string => typeof x === 'string')
    : []
  return { overallScore, strengths, weaknesses, improvements }
}

export async function GET(
  _request: NextRequest,
  context: { params: { founderId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { founderId } = context.params
    if (!founderId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const investor = await db.investor.findUnique({
      where: { email: user.email },
    })

    if (!investor) {
      return NextResponse.json({ error: 'VC profile not found' }, { status: 404 })
    }

    if (!investor.verified) {
      return NextResponse.json(
        { error: 'VC profile not verified. Please verify your account first.' },
        { status: 403 }
      )
    }

    const founder = await db.founder.findUnique({
      where: { id: founderId },
      include: {
        resumeAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
        pitchDeckAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
        pitchIdeaAnalyses: { orderBy: { createdAt: 'desc' }, take: 1 },
        applications: {
          where: { investorId: investor.id },
          take: 1,
        },
      },
    })

    if (!founder) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!founderMatchesInvestorThesis(founder, investor)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const matchScore = matchScoreForFounderInvestor(founder, investor)
    const application = founder.applications[0] ?? null

    const resume = founder.resumeAnalyses[0]
    let resumeBlock: {
      compatibilityScore: number
      skills: string[]
      gaps: string[]
      suggestions: string[]
      keywords: string[]
    } | null = null

    if (resume) {
      let fromFull: { analysis?: { keywords?: string[] } } | null = null
      if (resume.fullResult) {
        try {
          fromFull = JSON.parse(resume.fullResult) as { analysis?: { keywords?: string[] } }
        } catch {
          fromFull = null
        }
      }
      const baseKeywords = safeStringArray(resume.keywords)
      const keywordsFromFull =
        fromFull?.analysis?.keywords && Array.isArray(fromFull.analysis.keywords)
          ? fromFull.analysis.keywords.filter((k): k is string => typeof k === 'string')
          : []
      const mergedKeywords = [
        ...baseKeywords,
        ...keywordsFromFull.filter((k) => !baseKeywords.includes(k)),
      ].slice(0, 20)
      resumeBlock = {
        compatibilityScore: resume.compatibilityScore,
        skills: safeStringArray(resume.skills),
        gaps: safeStringArray(resume.gaps),
        suggestions: safeStringArray(resume.suggestions),
        keywords: mergedKeywords,
      }
    }

    let deckBlock: ReturnType<typeof pickDeckSummary> | null = null
    const deck = founder.pitchDeckAnalyses[0]
    if (deck?.analysisResult) {
      try {
        const parsed = JSON.parse(deck.analysisResult) as Record<string, unknown>
        deckBlock = pickDeckSummary(parsed)
        if (deck.overallScore != null && deckBlock.overallScore == null) {
          deckBlock = { ...deckBlock, overallScore: deck.overallScore }
        }
      } catch {
        deckBlock = {
          overallScore: deck.overallScore ?? null,
          strengths: [],
          weaknesses: [],
          improvements: [],
        }
      }
    }

    let pitchIdea: { summary: string | null; strengths: string[] } | null = null
    const idea = founder.pitchIdeaAnalyses[0]
    if (idea?.analysisResult) {
      try {
        const parsed = JSON.parse(idea.analysisResult) as Record<string, unknown>
        const rawSummary = parsed.summary ?? parsed.executiveSummary ?? parsed.overview
        const summary =
          typeof rawSummary === 'string' && rawSummary.trim()
            ? rawSummary.trim().slice(0, 1200)
            : null
        const strengths = Array.isArray(parsed.strengths)
          ? (parsed.strengths as unknown[])
              .filter((x): x is string => typeof x === 'string')
              .slice(0, 8)
          : []
        if (summary || strengths.length > 0) {
          pitchIdea = { summary, strengths }
        }
      } catch {
        pitchIdea = null
      }
    }

    return NextResponse.json({
      founder: {
        id: founder.id,
        name: founder.name,
        email: founder.email,
        startupName: founder.startupName,
        bio: founder.bio,
        stage: founder.stage,
        sectors: parseJSON<string[]>(founder.sectors, []),
        location: founder.location,
        fundingNeed: founder.fundingNeed,
        businessModel: founder.businessModel,
        linkedinUrl: founder.linkedinUrl,
        twitterUrl: founder.twitterUrl,
        websiteUrl: founder.websiteUrl,
        demoUrl: founder.demoUrl,
        videoPitchUrl: founder.videoPitchUrl,
        pitchDeckUrl: founder.pitchDeck,
        teamSize: founder.teamSize,
        revenue: founder.revenue,
        users: founder.users,
        growthRate: founder.growthRate,
        profileComplete: founder.profileComplete,
      },
      matchScore,
      application: application
        ? {
            status: application.status,
            message: application.message,
            createdAt: application.createdAt,
          }
        : null,
      resumeAnalysis: resumeBlock,
      pitchDeckAnalysis: deckBlock,
      pitchIdea,
    })
  } catch (error: unknown) {
    logger.error('[VC-APPLICANT-DETAIL] Error:', error)
    return NextResponse.json(
      { error: 'Failed to load founder', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
