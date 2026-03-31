import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { bypassesAiCredits } from '@/lib/dev-ai-analysis-bypass'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PACK_MODULE_IDS = [
  'application-deconstruction',
  'pitch-deck-autopsy',
  'interview-simulator',
  'metrics-timeline',
  'distribution-diary',
  'demo-teardown',
] as const

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, cost } = body

    if (!itemId || typeof cost !== 'number' || cost <= 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    let userCredits = await db.userCredits.findUnique({
      where: { userId: user.id },
      select: { credits: true, purchases: true, isPremium: true },
    })

    if (!userCredits) {
      userCredits = await db.userCredits.create({
        data: {
          userId: user.id,
          credits: 0,
          isPremium: false,
          purchases: '[]',
        },
        select: { credits: true, purchases: true, isPremium: true },
      })
    }

    let currentPurchases: string[] = []
    try {
      currentPurchases = userCredits.purchases ? JSON.parse(userCredits.purchases as string) : []
    } catch {
      currentPurchases = []
    }

    const noCharge = bypassesAiCredits(user.email)
    const isPremium = Boolean(userCredits.isPremium) || noCharge

    const idsToAdd =
      itemId === 'complete-pack' ? [...PACK_MODULE_IDS, 'complete-pack'] : [itemId]

    if (itemId === 'complete-pack') {
      if (currentPurchases.includes('complete-pack')) {
        return NextResponse.json({ error: 'Bundle already purchased' }, { status: 400 })
      }
    } else if (currentPurchases.includes(itemId)) {
      return NextResponse.json({ error: 'Item already purchased' }, { status: 400 })
    }

    const mergePurchases = () => [...new Set([...currentPurchases, ...idsToAdd])]

    if (isPremium) {
      await db.userCredits.update({
        where: { userId: user.id },
        data: { purchases: JSON.stringify(mergePurchases()) },
      })

      return NextResponse.json({
        success: true,
        remainingCredits: noCharge ? Number.MAX_SAFE_INTEGER : userCredits.credits ?? 0,
        itemId,
      })
    }

    const currentCredits = userCredits.credits ?? 0
    if (currentCredits < cost) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 })
    }

    const newCredits = currentCredits - cost
    await db.userCredits.update({
      where: { userId: user.id },
      data: {
        credits: newCredits,
        purchases: JSON.stringify(mergePurchases()),
      },
    })

    return NextResponse.json({
      success: true,
      remainingCredits: newCredits,
      itemId,
    })
  } catch (error) {
    logger.error('[YC-INSIDER-PURCHASE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
