import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please sign in to continue. Your session may have expired.',
        },
        { status: 401 }
      )
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: 'Email not verified',
          message: 'Please verify your email address before submitting your profile.',
        },
        { status: 403 }
      )
    }

    const data = await req.json()

    const profileData = {
      founderName: data.founderName || '',
      founderBackground: data.founderBackground || '',
      founderExperience: data.founderExperience || '',
      coFounders: data.coFounders || null,
      startupName: data.startupName || '',
      industry: data.industry || '',
      stage: data.stage || '',
      location: data.location || '',
      businessModel: data.businessModel || '',
      problemStatement: data.problemStatement || '',
      solution: data.solution || '',
      uniqueValue: data.uniqueValue || '',
      currentTraction: data.currentTraction || '',
      revenue: data.revenue || null,
      users: data.users || null,
      growth: data.growth || null,
      fundraisingStage: data.fundraisingStage || '',
      targetAmount: data.targetAmount || '',
      previousFunding: data.previousFunding || null,
      pitchDeck: data.pitchDeck || null,
      competitors: data.competitors || null,
      futureVision: data.futureVision || '',
    }

    const requiredFields: (keyof typeof profileData)[] = [
      'founderName',
      'founderBackground',
      'founderExperience',
      'startupName',
      'industry',
      'stage',
      'location',
      'businessModel',
      'problemStatement',
      'solution',
      'uniqueValue',
      'currentTraction',
      'fundraisingStage',
      'targetAmount',
      'futureVision',
    ]

    const missingFields: string[] = []
    for (const field of requiredFields) {
      const value = profileData[field]
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field)
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: `Missing required fields: ${missingFields.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const founderProfile = await db.founderProfile.create({
      data: profileData,
    })

    return NextResponse.json({
      success: true,
      profile: founderProfile,
    })
  } catch (error) {
    console.error('[API /onboarding/founder]', error)
    return NextResponse.json(
      {
        error: 'Failed to save profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
