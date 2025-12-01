import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await (db as any).$executeRawUnsafe?.(`
      CREATE TABLE IF NOT EXISTS UserApproval (
        email TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt TEXT NOT NULL,
        reviewedAt TEXT
      );
    `)
    const rows = await (db as any).$queryRawUnsafe?.(
      `SELECT email, status, createdAt, reviewedAt FROM UserApproval ORDER BY createdAt DESC LIMIT 500;`
    )
    return NextResponse.json({ success: true, approvals: rows || [] })
  } catch (error: any) {
    console.error('List approvals error:', error)
    return NextResponse.json({ error: 'Failed to list approvals' }, { status: 500 })
  }
}


