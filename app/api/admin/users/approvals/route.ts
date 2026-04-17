import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'
import { sendUserApprovalStatus } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function requireAdmin() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) return null
  return user
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const rows = await db.userApproval.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    return NextResponse.json({ success: true, approvals: rows })
  } catch (error: any) {
    console.error('List approvals error:', error)
    return NextResponse.json({ error: 'Failed to list approvals' }, { status: 500 })
  }
}

export async function PATCH() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const pending = await db.userApproval.findMany({
      where: { status: 'pending' },
      select: { email: true },
      take: 2000,
    })

    if (pending.length === 0) {
      return NextResponse.json({ success: true, approvedCount: 0 })
    }

    const now = new Date()
    const emails = pending.map((row) => row.email)
    await db.userApproval.updateMany({
      where: { email: { in: emails } },
      data: { status: 'approved', reviewedAt: now },
    })

    // Best-effort notification fanout.
    await Promise.allSettled(emails.map((email) => sendUserApprovalStatus(email, 'approved')))

    return NextResponse.json({ success: true, approvedCount: emails.length })
  } catch (error: any) {
    console.error('Approve all pending users error:', error)
    return NextResponse.json({ error: 'Failed to approve all pending users' }, { status: 500 })
  }
}
