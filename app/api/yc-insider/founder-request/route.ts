import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FOUNDER_KEYS = new Set(['william', 'inigo'])
const REQUEST_TYPES = new Set(['ask', 'book'])

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

    const isPremium = Boolean(userCredits.isPremium) || isAdminEmail(user.email)
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

    if (!FOUNDER_KEYS.has(founderKey) || !REQUEST_TYPES.has(requestType)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
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

    await db.yCInsiderFounderRequest.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        founderKey,
        requestType,
        message,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('YC Insider founder request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
