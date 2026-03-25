import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const body = await request.json()
    const action = body?.action as 'approve' | 'reject'
    const reviewerEmail = body?.reviewerEmail || 'admin@local'
    const email = decodeURIComponent(params.email || '').toLowerCase().trim()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const status = action === 'approve' ? 'approved' : 'rejected'
    const now = new Date()

    await db.founderVerification.upsert({
      where: { email },
      create: {
        email,
        status,
        submittedAt: now,
        verifiedAt: now,
        reviewerEmail,
      },
      update: {
        status,
        verifiedAt: now,
        reviewerEmail,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update founder verification error:', error)
    return NextResponse.json(
      { error: 'Failed to update verification', message: error?.message },
      { status: 500 }
    )
  }
}
