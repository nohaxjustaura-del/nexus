import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const freshUser = await db.user.findUnique({
      where: { id: user.id },
      select: { startupProfile: true, founderProfile: true, onboardingCompleted: true },
    })

    if (!freshUser?.startupProfile) {
      return NextResponse.json({ exists: false })
    }

    let draft: Record<string, unknown> = {}
    try {
      draft = JSON.parse(freshUser.startupProfile)
    } catch {
      draft = {}
    }

    return NextResponse.json({
      exists: true,
      completed: Boolean(freshUser.onboardingCompleted),
      draft,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load onboarding draft', message: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json().catch(() => ({}))
    const draft = payload && typeof payload === 'object' ? payload : {}

    await db.user.update({
      where: { id: user.id },
      data: {
        startupProfile: JSON.stringify(draft),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to save onboarding draft', message: error?.message },
      { status: 500 }
    )
  }
}
