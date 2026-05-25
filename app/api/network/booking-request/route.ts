import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canAccessFounderNetwork } from '@/lib/founder-network-access'
import { getResourcePartner } from '@/lib/partner-resources'
import { validateBookingRequest } from '@/lib/network/validate-booking-request'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Network access check (same criteria as ensureFounderNetworkPageAccess)
    const [uc, approval, investor] = await Promise.all([
      db.userCredits.findUnique({
        where: { userId: user.id },
        select: { isPremium: true, purchases: true },
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

    if (
      !canAccessFounderNetwork({
        isPremium: Boolean(uc?.isPremium),
        purchasesJson: uc?.purchases ?? null,
        email: user.email,
        userApprovalStatus: approval?.status ?? null,
        investorVerified: Boolean(investor?.verified),
      })
    ) {
      return NextResponse.json(
        { error: 'Network access required to book meetings.' },
        { status: 403 }
      )
    }

    // 3. Rate limit: max 5 booking requests per user per 24 hours
    const recentCount = await db.networkMeetingBooking.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      },
    })
    if (recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Too many booking requests. Please wait before submitting another.' },
        { status: 429 }
      )
    }

    // 4. Parse and validate body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const raw = body as Record<string, unknown>

    // Trim strings before validation
    const partnerSlug =
      typeof raw.partnerSlug === 'string' ? raw.partnerSlug.trim() : ''
    const founderName =
      typeof raw.founderName === 'string' ? raw.founderName.trim() : ''
    const purpose =
      typeof raw.purpose === 'string' ? raw.purpose.trim() : ''
    const details =
      typeof raw.details === 'string' ? raw.details.trim() : undefined

    const validation = validateBookingRequest({
      partnerSlug,
      founderName,
      purpose,
      details,
    })

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // 5. Validate partnerSlug exists and founderName belongs to that partner
    const partner = getResourcePartner(partnerSlug)
    if (!partner) {
      return NextResponse.json(
        { error: 'Unknown partner.' },
        { status: 400 }
      )
    }

    const founderExists = partner.foundersPreview.some((f) => f.name === founderName)
    if (!founderExists) {
      return NextResponse.json(
        { error: 'Unknown contact for this partner.' },
        { status: 400 }
      )
    }

    // 6. Create the booking record
    const booking = await db.networkMeetingBooking.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        partnerSlug,
        founderName,
        purpose,
        details: details && details.length > 0 ? details : null,
        status: 'pending_calendar',
      },
    })

    return NextResponse.json({ success: true, bookingId: booking.id })
  } catch (error) {
    logger.error('[NETWORK-BOOKING-REQUEST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
