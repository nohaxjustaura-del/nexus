import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user credits
    let userCredits = await (db as any).userCredits.findUnique({
      where: { userId: user.id },
    })

    if (!userCredits) {
      userCredits = await (db as any).userCredits.create({
        data: {
          userId: user.id,
          credits: 0,
          isPremium: false,
        },
      })
    }

    return NextResponse.json({
      email: user.email,
      userId: user.id,
      isPremium: userCredits.isPremium || false,
      credits: userCredits.credits || 0,
      stripeCustomerId: userCredits.stripeCustomerId || null,
      stripeSubscriptionId: userCredits.stripeSubscriptionId || null,
      premiumExpiresAt: userCredits.premiumExpiresAt || null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check premium status' },
      { status: 500 }
    )
  }
}

// POST: Manually grant premium (for debugging/fixing)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { action } = await request.json()

    if (action === 'grant_premium') {
      let userCredits = await (db as any).userCredits.findUnique({
        where: { userId: user.id },
      })

      if (!userCredits) {
        userCredits = await (db as any).userCredits.create({
          data: {
            userId: user.id,
            credits: 0,
            isPremium: true,
          },
        })
      } else {
        await (db as any).userCredits.update({
          where: { userId: user.id },
          data: {
            isPremium: true,
          },
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Premium access granted',
        isPremium: true 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update premium status' },
      { status: 500 }
    )
  }
}



