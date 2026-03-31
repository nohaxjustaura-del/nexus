import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { bypassesAiCredits } from '@/lib/dev-ai-analysis-bypass'
import {
  sendYcInsiderFounderRequestAdminAlert,
  sendYcInsiderFounderRequestUserConfirmation,
} from '@/lib/email'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FOUNDER_KEYS = new Set(['william', 'inigo'])
const REQUEST_TYPES = new Set(['ask', 'book'])

function founderDisplayName(key: string): string {
  if (key === 'william') return 'William Namgyal'
  if (key === 'inigo') return 'Inigo Lenderking'
  return key
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let userCredits = await db.userCredits.findUnique({
      where: { userId: user.id },
      select: { isPremium: true },
    })

    if (!userCredits) {
      userCredits = await db.userCredits.create({
        data: { userId: user.id, credits: 0, isPremium: false },
        select: { isPremium: true },
      })
    }

    const isPremium = Boolean(userCredits.isPremium) || bypassesAiCredits(user.email)
    if (!isPremium) {
      return NextResponse.json(
        { error: 'Premium membership required to contact founders.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const founderKey = typeof body.founderKey === 'string' ? body.founderKey.trim().toLowerCase() : ''
    const requestType = typeof body.requestType === 'string' ? body.requestType.trim().toLowerCase() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const topicRaw = typeof body.topic === 'string' ? body.topic.trim() : ''
    const timezoneRaw = typeof body.timezone === 'string' ? body.timezone.trim() : ''

    if (!FOUNDER_KEYS.has(founderKey) || !REQUEST_TYPES.has(requestType)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (topicRaw.length < 3) {
      return NextResponse.json(
        { error: 'Please add a short topic or subject (at least 3 characters).' },
        { status: 400 }
      )
    }

    if (topicRaw.length > 300) {
      return NextResponse.json({ error: 'Topic is too long.' }, { status: 400 })
    }

    if (requestType === 'book') {
      if (timezoneRaw.length < 2) {
        return NextResponse.json(
          { error: 'Please add your timezone so we can schedule (e.g. America/New_York).' },
          { status: 400 }
        )
      }
      if (timezoneRaw.length > 120) {
        return NextResponse.json({ error: 'Timezone field is too long.' }, { status: 400 })
      }
    } else if (timezoneRaw.length > 120) {
      return NextResponse.json({ error: 'Timezone field is too long.' }, { status: 400 })
    }

    if (message.length < 8) {
      return NextResponse.json(
        { error: 'Please add a bit more detail (at least 8 characters).' },
        { status: 400 }
      )
    }

    if (message.length > 8000) {
      return NextResponse.json({ error: 'Message is too long.' }, { status: 400 })
    }

    const created = await db.yCInsiderFounderRequest.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        founderKey,
        requestType,
        topic: topicRaw,
        timezone: timezoneRaw.length > 0 ? timezoneRaw : null,
        message,
        status: 'new',
      },
    })

    const rt = requestType as 'ask' | 'book'
    try {
      await sendYcInsiderFounderRequestAdminAlert({
        id: created.id,
        userEmail: user.email,
        founderKey,
        requestType: rt,
        topic: created.topic,
        timezone: created.timezone,
        message: created.message,
      })
    } catch (e) {
      logger.error('[YC-INSIDER-FOUNDER-REQUEST] Admin alert email failed', e)
    }
    try {
      await sendYcInsiderFounderRequestUserConfirmation(user.email, rt, founderDisplayName(founderKey))
    } catch (e) {
      logger.error('[YC-INSIDER-FOUNDER-REQUEST] User confirmation email failed', e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[YC-INSIDER-FOUNDER-REQUEST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
