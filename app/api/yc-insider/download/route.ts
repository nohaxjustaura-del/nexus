import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { canAccessFounderNetwork } from '@/lib/founder-network-access'

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
const DOWNLOAD_LOG_PREFIX = '__yc_download__:'
const PREMIUM_DAILY_DOWNLOAD_LIMIT = 3

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getDownloadLogEntry(itemId: string) {
  return `${DOWNLOAD_LOG_PREFIX}${getTodayKey()}:${itemId}`
}

function getTodayDownloadCount(purchases: string[]) {
  const todayPrefix = `${DOWNLOAD_LOG_PREFIX}${getTodayKey()}:`
  return purchases.reduce(
    (count, entry) => (entry.startsWith(todayPrefix) ? count + 1 : count),
    0
  )
}

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

    const [userCredits, approvalRow, investorRow] = await Promise.all([
      db.userCredits.findUnique({
        where: { userId: user.id },
        select: { purchases: true, isPremium: true },
      }),
      db.userApproval.findUnique({
        where: { email: user.email },
        select: { status: true },
      }),
      db.investor.findUnique({
        where: { email: user.email },
        select: { verified: true },
      }),
    ])

    if (!userCredits) {
      return NextResponse.json({ error: 'No billing record found' }, { status: 404 })
    }

    if (
      !canAccessFounderNetwork({
        isPremium: Boolean(userCredits.isPremium),
        purchasesJson: userCredits.purchases,
        email: user.email,
        userApprovalStatus: approvalRow?.status ?? null,
        investorVerified: Boolean(investorRow?.verified),
      })
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let purchases: string[] = []
    try {
      purchases = userCredits.purchases ? JSON.parse(userCredits.purchases as string) : []
    } catch {
      purchases = []
    }

    const isPremium = Boolean(userCredits.isPremium)
    if (!isPremium) {
      return NextResponse.json(
        { error: 'Get access to these resources with premium first.' },
        { status: 403 }
      )
    }

    const allowed = hasModuleAccess(purchases, itemId)
    if (!allowed) {
      return NextResponse.json({ error: 'Item not purchased' }, { status: 403 })
    }

    const todayDownloadCount = getTodayDownloadCount(purchases)
    if (todayDownloadCount >= PREMIUM_DAILY_DOWNLOAD_LIMIT) {
      return NextResponse.json(
        { error: 'Daily download limit reached (3 resources per day).' },
        { status: 429 }
      )
    }

    const material = MATERIALS[itemId]
    if (!material) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    const updatedPurchases = [...purchases, getDownloadLogEntry(itemId)]
    await db.userCredits.update({
      where: { userId: user.id },
      data: { purchases: JSON.stringify(updatedPurchases) },
    })

    return NextResponse.json({
      success: true,
      url: material.url,
      filename: material.filename,
      type: material.type,
      downloadsRemainingToday:
        PREMIUM_DAILY_DOWNLOAD_LIMIT - (todayDownloadCount + 1),
    })
  } catch (error) {
    logger.error('[YC-INSIDER-DOWNLOAD]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
