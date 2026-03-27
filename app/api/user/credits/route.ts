import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserOrAdmin } from '@/lib/auth'
import { ADMIN_EMAIL, CREDIT_COSTS } from '@/lib/constants'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET: Get user credits
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserOrAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let credits = await (db as any).userCredits.findUnique({
      where: { userId: user.id },
    })

    // Create credits record if it doesn't exist
    if (!credits) {
      credits = await (db as any).userCredits.create({
        data: {
          userId: user.id,
          credits: 0,
          isPremium: false,
        },
      })
    }

    // Grant admin unlimited credits and premium
    if (user.email === ADMIN_EMAIL) {
      // Parse purchases for admin too
      let purchases: string[] = []
      try {
        purchases = credits.purchases ? JSON.parse(credits.purchases) : []
      } catch (e) {
        purchases = []
      }

      return NextResponse.json({
        credits: Number.MAX_SAFE_INTEGER,
        isPremium: true,
        premiumExpiresAt: null,
        purchases,
      })
    }

    // Parse purchases from JSON string
    let purchases: string[] = []
    try {
      purchases = credits.purchases ? JSON.parse(credits.purchases) : []
    } catch (e) {
      purchases = []
    }

    // Return actual credits (no auto-grant for production)
    return NextResponse.json({
      credits: credits.credits || 0,
      isPremium: credits.isPremium || false,
      premiumExpiresAt: credits.premiumExpiresAt || null,
      purchases,
    })
  } catch (error: any) {
    logger.error('[USER-CREDITS] Error fetching credits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    )
  }
}

// POST: Use credits or unlock premium matches
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserOrAdmin()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action, amount } = await request.json()

    // Admin gets infinite/unlocked access
    if (user.email === ADMIN_EMAIL) {
      if (action === 'unlock_top_matches') {
        return NextResponse.json({ success: true, unlocked: true })
      }
      if (action === 'add_credits') {
        return NextResponse.json({ success: true })
      }
      // fall through to default "invalid action" for unknown actions
    }

    let credits = await (db as any).userCredits.findUnique({
      where: { userId: user.id },
    })

    if (!credits) {
      credits = await (db as any).userCredits.create({
        data: {
          userId: user.id,
          credits: 0,
          isPremium: false,
        },
      })
    }

    if (action === 'unlock_top_matches') {
      const CREDIT_COST = CREDIT_COSTS.UNLOCK_TOP_MATCHES
      // Check if user has credits or is premium
      if (credits.isPremium || credits.credits >= CREDIT_COST) {
        // Deduct credits if not premium
        if (!credits.isPremium && credits.credits >= CREDIT_COST) {
          await (db as any).userCredits.update({
            where: { userId: user.id },
            data: {
              credits: credits.credits - CREDIT_COST,
            },
          })
        }
        return NextResponse.json({ success: true, unlocked: true, creditsUsed: credits.isPremium ? 0 : CREDIT_COST })
      } else {
        return NextResponse.json(
          { error: `Insufficient credits. Need ${CREDIT_COST} credits to unlock top matches.`, requiresPayment: true, creditCost: CREDIT_COST },
          { status: 402 }
        )
      }
    }

    if (action === 'add_credits' && amount) {
      await (db as any).userCredits.update({
        where: { userId: user.id },
        data: {
          credits: credits.credits + amount,
        },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'grant_premium') {
      // Grant premium access (admin or self-grant)
      await (db as any).userCredits.update({
        where: { userId: user.id },
        data: {
          isPremium: true,
          premiumExpiresAt: null, // Lifetime premium
        },
      })
      return NextResponse.json({ success: true, isPremium: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    logger.error('[USER-CREDITS] Error updating credits:', error)
    return NextResponse.json(
      { error: 'Failed to update credits' },
      { status: 500 }
    )
  }
}



