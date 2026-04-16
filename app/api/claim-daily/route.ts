import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { bypassesAiCredits } from '@/lib/dev-ai-analysis-bypass'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


// One free balance top-up per rolling 24-hour window from last claim
const CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  )
}

export async function POST() {
  try {
    const user = await getCurrentUser()
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const eligibility = await db.userCredits.findUnique({
      where: { userId: user.id },
      select: { isPremium: true },
    })
    if (bypassesAiCredits(user.email) || eligibility?.isPremium) {
      const row = await db.userCredits.findUnique({ where: { userId: user.id } })
      return NextResponse.json({
        success: false,
        message: 'Daily bonus is for free accounts',
        credits: row?.credits ?? 0,
        canClaimAgainAt: null,
      })
    }

    const now = new Date()
    const cooldownBefore = new Date(now.getTime() - CLAIM_COOLDOWN_MS)

    const tryAtomicClaim = () =>
      db.userCredits.updateMany({
        where: {
          userId: user.id,
          OR: [
            { lastDailyClaim: null },
            { lastDailyClaim: { lte: cooldownBefore } },
          ],
        },
        data: {
          credits: { increment: 1 },
          lastDailyClaim: now,
        },
      })

    // Single atomic update: only one concurrent request can pass the cooldown window
    let claimResult = await tryAtomicClaim()
    if (claimResult.count > 0) {
      const row = await db.userCredits.findUnique({
        where: { userId: user.id },
      })
      logger.info('DAILY_CLAIM', `User ${user.id} claimed credit. Balance: ${row?.credits}`)
      return NextResponse.json({
        success: true,
        credits: row?.credits ?? 0,
        message: 'Claimed your daily bonus!',
        canClaimAgainAt: getNextClaimTime(now),
      })
    }

    let existing = await db.userCredits.findUnique({
      where: { userId: user.id },
    })

    if (!existing) {
      try {
        const created = await db.userCredits.create({
          data: {
            userId: user.id,
            credits: 1,
            isPremium: false,
            lastDailyClaim: now,
          },
        })
        logger.info('DAILY_CLAIM', `User ${user.id} claimed first credit`)
        return NextResponse.json({
          success: true,
          credits: created.credits,
          message: 'Claimed your daily bonus!',
          canClaimAgainAt: getNextClaimTime(now),
        })
      } catch (error: unknown) {
        if (!isUniqueConstraintViolation(error)) throw error
        claimResult = await tryAtomicClaim()
        if (claimResult.count > 0) {
          const row = await db.userCredits.findUnique({
            where: { userId: user.id },
          })
          return NextResponse.json({
            success: true,
            credits: row?.credits ?? 0,
            message: 'Claimed your daily bonus!',
            canClaimAgainAt: getNextClaimTime(now),
          })
        }
        existing = await db.userCredits.findUnique({
          where: { userId: user.id },
        })
      }
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Failed to claim bonus' },
        { status: 500 }
      )
    }

    const lastClaim = existing.lastDailyClaim
    const nextClaimTime = lastClaim ? getNextClaimTime(lastClaim) : getNextClaimTime(now)
    return NextResponse.json({
      success: false,
      message: 'You can claim again after 24 hours',
      canClaimAgainAt: nextClaimTime,
      credits: existing.credits || 0,
    })
  } catch (error) {
    logger.error('DAILY_CLAIM', 'Error claiming credit:', error)
    return NextResponse.json(
      { error: 'Failed to claim bonus' },
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
    const eligibleForDaily =
      !bypassesAiCredits(user.email) && !userCredits.isPremium
    const canClaim =
      eligibleForDaily && (!lastClaim || canClaimNow(lastClaim, now))

    return NextResponse.json({
      canClaim,
      credits: userCredits.credits || 0,
      lastClaim: lastClaim?.toISOString(),
      canClaimAgainAt:
        eligibleForDaily && lastClaim ? getNextClaimTime(lastClaim) : null,
    })
  } catch (error) {
    logger.error('DAILY_CLAIM', 'Error checking claim status:', error)
    return NextResponse.json(
      { error: 'Failed to check claim status' },
      { status: 500 }
    )
  }
}

// Helper: Check if user can claim now (24 hours must have passed)
function canClaimNow(lastClaim: Date, now: Date): boolean {
  const timeSinceLastClaim = now.getTime() - lastClaim.getTime()
  return timeSinceLastClaim >= CLAIM_COOLDOWN_MS
}

// Helper: Get next claim time (24 hours after last claim)
function getNextClaimTime(lastClaim: Date): string {
  const nextClaim = new Date(lastClaim.getTime() + CLAIM_COOLDOWN_MS)
  return nextClaim.toISOString()
}

