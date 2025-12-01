import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendUserApprovalStatus } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const email = decodeURIComponent(params.email || '').toLowerCase().trim()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    await (db as any).$executeRawUnsafe?.(`
      CREATE TABLE IF NOT EXISTS UserApproval (
        email TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt TEXT NOT NULL,
        reviewedAt TEXT
      );
    `)

    const now = new Date().toISOString()
    await (db as any).$executeRawUnsafe?.(
      `INSERT INTO UserApproval (email, status, createdAt, reviewedAt)
       VALUES (?, 'approved', ?, ?)
       ON CONFLICT(email) DO UPDATE SET status='approved', reviewedAt=?;`,
      email,
      now,
      now,
      now
    )

    // Notify the user
    try { await sendUserApprovalStatus(email, 'approved') } catch {}

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Approve user error:', error)
    return NextResponse.json({ error: 'Failed to approve user' }, { status: 500 })
  }
}

// Convenience: allow approval via GET so clicking the URL in a browser works
export async function GET(
  request: NextRequest,
  ctx: { params: { email: string } }
) {
  const res = await PATCH(request, ctx)
  // If JSON success, redirect admin to approvals page for UX
  try {
    const data = await res.clone().json()
    if (data?.success) {
      const url = new URL('/admin/approvals?approved=1', request.nextUrl.origin)
      return NextResponse.redirect(url, { status: 302 })
    }
  } catch {}
  return res
}


