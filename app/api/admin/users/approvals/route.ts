import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

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
