import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    // Ensure UserApproval table exists
    await (db as any).$executeRawUnsafe?.(`
      CREATE TABLE IF NOT EXISTS UserApproval (
        email TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt TEXT NOT NULL,
        reviewedAt TEXT
      );
    `)

    const now = new Date().toISOString()
    
    // Insert or update to pending status
    await (db as any).$executeRawUnsafe?.(`
      INSERT INTO UserApproval (email, status, createdAt, reviewedAt)
      VALUES (?, 'pending', ?, NULL)
      ON CONFLICT(email) DO UPDATE SET status='pending', reviewedAt=NULL;
    `, email, now)

    return NextResponse.json({ 
      success: true,
      message: `Email ${email} added to pending approvals`
    })
  } catch (error: any) {
    console.error('Add pending approval error:', error)
    return NextResponse.json(
      { error: 'Failed to add pending approval' },
      { status: 500 }
    )
  }
}










