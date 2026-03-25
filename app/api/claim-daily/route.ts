import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// Claim cooldown: 12 hours in milliseconds
const CLAIM_COOLDOWN_MS = 12 * 60 * 60 * 1000

export async function POST() {
  try {
    const user = await getCurrentUser()
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get or create user credits
    let userCredits = await db.userCredits.findUnique({
      where: { userId: user.id },
    })

    if (!userCredits) {
      // Create credits record with first claim (give 1 credit)
      const created = await db.userCredits.create({
        data: {
          userId: user.id,
          credits: 1,
          isPremium: false,
          lastDailyClaim: new Date(),
        },
      })

      logger.info('DAILY_CLAIM', `User ${user.id} claimed first credit`)

      return NextResponse.json({
        success: true,
        credits: created.credits,
        message: 'Claimed 1 free credit!',
        canClaimAgainAt: getNextClaimTime(new Date()),
      })
    }

    // Check if user can claim (12 hours must have passed)
    const now = new Date()
    const lastClaim = userCredits.lastDailyClaim
    
    if (lastClaim && !canClaimNow(lastClaim, now)) {
      const nextClaimTime = getNextClaimTime(lastClaim)
      return NextResponse.json({
        success: false,
        message: 'You can claim again in a few hours',
        canClaimAgainAt: nextClaimTime,
        credits: userCredits.credits || 0,
      })
    }

    // Award 1 credit
    const updated = await db.userCredits.update({
      where: { userId: user.id },
      data: {
        credits: { increment: 1 },
        lastDailyClaim: now,
      },
    })

    logger.info('DAILY_CLAIM', `User ${user.id} claimed credit. Balance: ${userCredits.credits || 0} -> ${updated.credits}`)

    return NextResponse.json({
      success: true,
      credits: updated.credits,
      message: 'Claimed 1 free credit!',
      canClaimAgainAt: getNextClaimTime(now),
    })
  } catch (error) {
    logger.error('DAILY_CLAIM', 'Error claiming credit:', error)
    return NextResponse.json(
      { error: 'Failed to claim credit' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let userCredits = await db.userCredits.findUnique({
      where: { userId: user.id },
    })

    // Create credits record if it doesn't exist
    if (!userCredits) {
      userCredits = await db.userCredits.create({
        data: {
          userId: user.id,
          credits: 0,
          isPremium: false,
        },
      })
    }

    const now = new Date()
    const lastClaim = userCredits.lastDailyClaim
    const canClaim = !lastClaim || canClaimNow(lastClaim, now)

    return NextResponse.json({
      canClaim,
      credits: userCredits.credits || 0,
      lastClaim: lastClaim?.toISOString(),
      canClaimAgainAt: lastClaim ? getNextClaimTime(lastClaim) : null,
    })
  } catch (error) {
    logger.error('DAILY_CLAIM', 'Error checking claim status:', error)
    return NextResponse.json(
      { error: 'Failed to check claim status' },
      { status: 500 }
    )
  }
}

// Helper: Check if user can claim now (12 hours must have passed)
function canClaimNow(lastClaim: Date, now: Date): boolean {
  const timeSinceLastClaim = now.getTime() - lastClaim.getTime()
  return timeSinceLastClaim >= CLAIM_COOLDOWN_MS
}

// Helper: Get next claim time (12 hours after last claim)
function getNextClaimTime(lastClaim: Date): string {
  const nextClaim = new Date(lastClaim.getTime() + CLAIM_COOLDOWN_MS)
  return nextClaim.toISOString()
}

