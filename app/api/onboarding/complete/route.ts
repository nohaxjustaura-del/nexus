import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in first.' }, { status: 401 })
    }

    const data = await request.json()

    // Save to founder profile
    await db.user.update({
      where: { id: user.id },
      data: {
        // Store onboarding data in a JSON field or separate tables
        onboardingCompleted: true,
        founderProfile: JSON.stringify({
          background: data.background,
          technicalSkills: data.technicalSkills,
          previousCompanies: data.previousCompanies,
          demographics: data.demographics,
        }),
        startupProfile: JSON.stringify({
          startupName: data.startupName,
          oneLiner: data.oneLiner,
          longDescription: data.longDescription,
          problem: data.problem,
          solution: data.solution,
          targetCustomer: data.targetCustomer,
          sectors: data.sectors,
          stage: data.stage,
          businessModel: data.businessModel,
          traction: {
            mrr: data.mrr,
            users: data.users,
            growthRate: data.growthRate,
            other: data.otherTraction,
          },
          fundraising: {
            ask: data.fundingAsk,
            useOfFunds: data.useOfFunds,
            previousFunding: data.previousFunding,
          },
          pitch: {
            elevatorPitch: data.elevatorPitch,
            hasDeck: data.hasPitchDeck,
            deckUrl: data.pitchDeckUrl,
          },
        }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to save onboarding data' },
      { status: 500 }
    )
  }
}

