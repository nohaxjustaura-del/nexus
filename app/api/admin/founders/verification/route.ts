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

export async function GET() {
  try {
    await ensureTable()
    const rows = await (db as any).$queryRawUnsafe?.(`
      SELECT email, url, status, submittedAt, verifiedAt, reviewerEmail
      FROM FounderVerification
      ORDER BY submittedAt DESC
      LIMIT 200;
    `)
    return NextResponse.json({ success: true, items: rows || [] })
  } catch (error: any) {
    console.error('List founder verifications error:', error)
    return NextResponse.json({ error: 'Failed to list verifications', message: error?.message }, { status: 500 })
  }
}


