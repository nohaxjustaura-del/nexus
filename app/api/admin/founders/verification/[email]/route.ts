import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function ensureTable() {
  await (db as any).$executeRawUnsafe?.(`
    CREATE TABLE IF NOT EXISTS FounderVerification (
      email TEXT PRIMARY KEY,
      url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      submittedAt TEXT NOT NULL,
      verifiedAt TEXT,
      reviewerEmail TEXT
    );
  `)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    await ensureTable()
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
    const now = new Date().toISOString()
    await (db as any).$executeRawUnsafe?.(
      `INSERT INTO FounderVerification (email, status, submittedAt)
       VALUES (?, 'pending', ?)
       ON CONFLICT(email) DO NOTHING;`,
      email,
      now
    )
    await (db as any).$executeRawUnsafe?.(
      `UPDATE FounderVerification
       SET status = ?, verifiedAt = ?, reviewerEmail = ?
       WHERE email = ?;`,
      status,
      now,
      reviewerEmail,
      email
    )

    // Optional: mark some flag in user/founder records if needed later
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update founder verification error:', error)
    return NextResponse.json({ error: 'Failed to update verification', message: error?.message }, { status: 500 })
  }
}


