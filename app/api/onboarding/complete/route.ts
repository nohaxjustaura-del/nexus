import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Map the demographics label array from the questions onboarding flow
 * into structured FounderPrefs booleans so the matching pipeline can use them.
 */
function demographicsToPrefs(demographics: string[] | undefined) {
  const d = new Set((demographics ?? []).map((s) => s.toLowerCase().trim()))
  return {
    isWoman: d.has('woman founder'),
    isBipoc: d.has('bipoc founder'),
    isLgbtq: d.has('lgbtq+ founder'),
    isImmigrant: d.has('immigrant founder') || d.has('international student'),
    isUnderrepresented: d.has('bipoc founder') || d.has('first-gen'),
    isStudent: d.has('international student'),
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in first.' }, { status: 401 })
    }

    const data = await request.json()

    const prefs = demographicsToPrefs(data.demographics)

    // Save to founder profile + write structured FounderPrefs for the matching pipeline
    await Promise.all([
      db.user.update({
        where: { id: user.id },
        data: {
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
      }),

      db.founderPrefs.upsert({
        where: { email: user.email },
        create: {
          email: user.email,
          ...prefs,
        },
        update: {
          ...prefs,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to save onboarding data' },
      { status: 500 }
    )
  }
}

