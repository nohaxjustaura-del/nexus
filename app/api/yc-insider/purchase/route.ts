import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { bypassesAiCredits } from '@/lib/dev-ai-analysis-bypass'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


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

    // Get user's current credits
    let userCredits = await (db as any).userCredits.findUnique({
      where: { userId: user.id },
      select: { credits: true, purchases: true, isPremium: true }
    })

    // Create credits record if doesn't exist
    if (!userCredits) {
      userCredits = await (db as any).userCredits.create({
        data: {
          userId: user.id,
          credits: 0,
          isPremium: false,
          purchases: '[]'
        }
      })
    }

    const currentPurchases = userCredits.purchases ? JSON.parse(userCredits.purchases as string) : []

    // Check if already purchased
    if (currentPurchases.includes(itemId)) {
      return NextResponse.json({ error: 'Item already purchased' }, { status: 400 })
    }

    // Admin / unlimited-credits list / premium users get free access - just record the purchase without deducting credits
    const noCharge = bypassesAiCredits(user.email)
    const isPremium = userCredits.isPremium || noCharge

    if (isPremium) {
      // Just add to purchases without deducting credits
      const newPurchases = [...currentPurchases, itemId]
      await (db as any).userCredits.update({
        where: { userId: user.id },
        data: {
          purchases: JSON.stringify(newPurchases)
        }
      })

      return NextResponse.json({
        success: true,
        remainingCredits: noCharge ? Number.MAX_SAFE_INTEGER : userCredits.credits,
        itemId
      })
    }

    const currentCredits = userCredits.credits || 0

    // Check if user has enough credits
    if (currentCredits < cost) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 })
    }

    // Deduct credits and add to purchases
    const newCredits = currentCredits - cost
    const newPurchases = [...currentPurchases, itemId]

    await (db as any).userCredits.update({
      where: { userId: user.id },
      data: {
        credits: newCredits,
        purchases: JSON.stringify(newPurchases)
      }
    })

    return NextResponse.json({
      success: true,
      remainingCredits: newCredits,
      itemId
    })
  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

