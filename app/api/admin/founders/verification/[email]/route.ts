import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const admin = await getCurrentUser(false)
    if (!admin || !isAdminEmail(admin.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const action = body?.action as 'approve' | 'reject'
    const reviewerEmail = (body?.reviewerEmail as string) || admin.email
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

    // Keep UserApproval in sync so auth/check, admin queues, and access rules stay consistent.
    const approvalStatus = action === 'approve' ? 'approved' : 'rejected'
    await db.userApproval.upsert({
      where: { email },
      create: {
        email,
        status: approvalStatus,
        reviewedAt: now,
      },
      update: {
        status: approvalStatus,
        reviewedAt: now,
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
