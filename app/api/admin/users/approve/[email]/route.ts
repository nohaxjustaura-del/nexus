import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendUserApprovalStatus } from '@/lib/email'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function requireAdmin() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) return null
  return user
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const email = decodeURIComponent(params.email || '').toLowerCase().trim()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    await db.userApproval.upsert({
      where: { email },
      create: {
        email,
        status: 'approved',
        reviewedAt: new Date(),
      },
      update: {
        status: 'approved',
        reviewedAt: new Date(),
      },
    })

    try {
      await sendUserApprovalStatus(email, 'approved')
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Approve user error:', error)
    return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, ctx: { params: { email: string } }) {
  const res = await PATCH(request, ctx)
  try {
    const data = await res.clone().json()
    if (data?.success) {
      const url = new URL('/admin/approvals?approved=1', request.nextUrl.origin)
      return NextResponse.redirect(url, { status: 302 })
    }
  } catch {
    /* ignore */
  }
  return res
}
