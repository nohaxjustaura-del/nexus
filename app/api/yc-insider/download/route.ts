import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    // Check if user has purchased this item
    const userCredits = await (db as any).userCredits.findUnique({
      where: { userId: user.id },
      select: { purchases: true, isPremium: true }
    })

    if (!userCredits) {
      return NextResponse.json({ error: 'No credits record found' }, { status: 404 })
    }

    const purchases = userCredits.purchases ? JSON.parse(userCredits.purchases as string) : []
    
    // Premium users get access to everything
    if (!userCredits.isPremium && !purchases.includes(itemId)) {
      return NextResponse.json({ error: 'Item not purchased' }, { status: 403 })
    }

    // Return the material URL or content based on itemId
    const materials: Record<string, { url: string; type: string; filename: string }> = {
      'pitch-deck': {
        url: '/yc-insider-materials/luel-pitch-deck.pdf',
        type: 'application/pdf',
        filename: 'Luel-YC-W26-Pitch-Deck.pdf'
      },
      'application-video': {
        url: '/yc-insider-materials/luel-application-video.mp4',
        type: 'video/mp4',
        filename: 'Luel-YC-W26-Application-Video.mp4'
      },
      'interview-qa': {
        url: '/yc-insider-materials/luel-interview-qa.pdf',
        type: 'application/pdf',
        filename: 'Luel-YC-W26-Interview-QA.pdf'
      }
    }

    const material = materials[itemId]
    if (!material) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      url: material.url,
      filename: material.filename,
      type: material.type
    })
  } catch (error: any) {
    console.error('YC Insider download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


