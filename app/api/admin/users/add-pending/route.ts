import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalized = email.toLowerCase().trim()

    const now = new Date()
    await db.userApproval.upsert({
      where: { email: normalized },
      create: {
        email: normalized,
        status: 'approved',
        reviewedAt: now,
      },
      update: {
        status: 'approved',
        reviewedAt: now,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Email ${normalized} recorded as approved`,
    })
  } catch (error: any) {
    console.error('Add pending approval error:', error)
    return NextResponse.json({ error: 'Failed to add pending approval' }, { status: 500 })
  }
}
