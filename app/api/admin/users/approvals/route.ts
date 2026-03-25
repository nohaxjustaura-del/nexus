import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
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
