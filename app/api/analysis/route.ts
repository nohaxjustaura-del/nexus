import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AIFundCoach } from '@/lib/ai-coach'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function getProfileForUser() {
  const user = await getCurrentUser(false)
  if (!user) return { user: null, profile: null }

  // FounderProfile lacks a userId column — scope by the most recent
  // profile created while the user is authenticated so unauthenticated
  // callers can never reach any profile data.
  const profile = await db.founderProfile.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  return { user, profile }
}

export async function GET() {
  const { user, profile } = await getProfileForUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    if (!profile) {
      return NextResponse.json(
        { error: 'No profile found. Please complete onboarding first.' },
        { status: 404 }
      )
    }

    const existingAnalysis = await db.analysis.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })

    if (existingAnalysis) {
      const dayAgo = new Date()
      dayAgo.setDate(dayAgo.getDate() - 1)
      if (existingAnalysis.createdAt > dayAgo) {
        return NextResponse.json(existingAnalysis.data)
      }
    }

    const startupProfile = buildStartupProfile(profile)
    const analysis = await AIFundCoach.analyzeStartup(startupProfile)

    await db.analysis.create({
      data: { profileId: profile.id, data: analysis as any },
    })

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error generating analysis:', error)
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
  }
}

export async function POST() {
  const { user, profile } = await getProfileForUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    if (!profile) {
      return NextResponse.json({ error: 'No profile found' }, { status: 404 })
    }

    const startupProfile = buildStartupProfile(profile)
    const analysis = await AIFundCoach.analyzeStartup(startupProfile)

    await db.analysis.deleteMany({ where: { profileId: profile.id } })
    await db.analysis.create({
      data: { profileId: profile.id, data: analysis as any },
    })

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error regenerating analysis:', error)
    return NextResponse.json({ error: 'Failed to regenerate analysis' }, { status: 500 })
  }
}

function buildStartupProfile(profile: {
  founderName: string
  founderBackground: string
  founderExperience: string
  coFounders?: string | null
  startupName: string
  industry: string
  stage: string
  location: string
  businessModel: string
  problemStatement: string
  solution: string
  uniqueValue: string
  currentTraction: string
  revenue?: string | null
  users?: string | null
  growth?: string | null
  fundraisingStage: string
  targetAmount: string
  previousFunding?: string | null
  pitchDeck?: string | null
  competitors?: string | null
  futureVision: string
}) {
  return {
    founderName: profile.founderName,
    founderBackground: profile.founderBackground,
    founderExperience: profile.founderExperience,
    coFounders: profile.coFounders ?? undefined,
    startupName: profile.startupName,
    industry: profile.industry,
    stage: profile.stage,
    location: profile.location,
    businessModel: profile.businessModel,
    problemStatement: profile.problemStatement,
    solution: profile.solution,
    uniqueValue: profile.uniqueValue,
    currentTraction: profile.currentTraction,
    revenue: profile.revenue ?? undefined,
    users: profile.users ?? undefined,
    growth: profile.growth ?? undefined,
    fundraisingStage: profile.fundraisingStage,
    targetAmount: profile.targetAmount,
    previousFunding: profile.previousFunding ?? undefined,
    pitchDeck: profile.pitchDeck ?? undefined,
    competitors: profile.competitors ?? undefined,
    futureVision: profile.futureVision,
  }
}
