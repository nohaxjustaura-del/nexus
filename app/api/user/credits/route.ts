import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserIncludingDevBypass } from '@/lib/auth'
import { getSubscriptionStatus } from '@/lib/subscription'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserIncludingDevBypass()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sub = await getSubscriptionStatus(user.id, user.email)

    return NextResponse.json({
      tier: sub.tier,
      isPro: sub.isPro,
      isTeam: sub.isTeam,
      isPremium: sub.isPro,
      credits: sub.isPro ? Number.MAX_SAFE_INTEGER : 0,
      unlimitedCredits: sub.isPro,
    })
  } catch (error: any) {
    logger.error('[USER-CREDITS] Error fetching subscription status:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription status' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserIncludingDevBypass()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()

    if (action === 'unlock_top_matches') {
      return NextResponse.json({ success: true, unlocked: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    logger.error('[USER-CREDITS] Error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
