import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PACK_MODULE_IDS = new Set([
  'application-deconstruction',
  'pitch-deck-autopsy',
  'interview-simulator',
  'metrics-timeline',
  'distribution-diary',
  'demo-teardown',
])

function hasModuleAccess(purchases: string[], itemId: string): boolean {
  if (purchases.includes('complete-pack')) return PACK_MODULE_IDS.has(itemId)
  return purchases.includes(itemId)
}

/** Placeholder assets under /public/yc-insider-materials — swap URLs when final files exist. */
const MATERIALS: Record<string, { url: string; type: string; filename: string }> = {
  'application-deconstruction': {
    url: '/yc-insider-materials/luel-interview-qa.pdf',
    type: 'application/pdf',
    filename: 'Luel-Application-Deconstruction.pdf',
  },
  'pitch-deck-autopsy': {
    url: '/yc-insider-materials/luel-pitch-deck.pdf',
    type: 'application/pdf',
    filename: 'Luel-Pitch-Deck-Autopsy.pdf',
  },
  'interview-simulator': {
    url: '/yc-insider-materials/luel-interview-qa.pdf',
    type: 'application/pdf',
    filename: 'Luel-Interview-Simulator.pdf',
  },
  'metrics-timeline': {
    url: '/yc-insider-materials/luel-pitch-deck.pdf',
    type: 'application/pdf',
    filename: 'Luel-Metrics-Timeline.pdf',
  },
  'distribution-diary': {
    url: '/yc-insider-materials/luel-pitch-deck.pdf',
    type: 'application/pdf',
    filename: 'Luel-Distribution-Diary.pdf',
  },
  'demo-teardown': {
    url: '/yc-insider-materials/luel-application-video.mp4',
    type: 'video/mp4',
    filename: 'Luel-Demo-Teardown.mp4',
  },
}

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

    const userCredits = await db.userCredits.findUnique({
      where: { userId: user.id },
      select: { purchases: true, isPremium: true },
    })

    if (!userCredits) {
      return NextResponse.json({ error: 'No credits record found' }, { status: 404 })
    }

    let purchases: string[] = []
    try {
      purchases = userCredits.purchases ? JSON.parse(userCredits.purchases as string) : []
    } catch {
      purchases = []
    }

    const allowed =
      Boolean(userCredits.isPremium) || hasModuleAccess(purchases, itemId)

    if (!allowed) {
      return NextResponse.json({ error: 'Item not purchased' }, { status: 403 })
    }

    const material = MATERIALS[itemId]
    if (!material) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      url: material.url,
      filename: material.filename,
      type: material.type,
    })
  } catch (error) {
    logger.error('[YC-INSIDER-DOWNLOAD]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
