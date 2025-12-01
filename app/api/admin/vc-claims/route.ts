import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const claims = await db.vCClaim.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ claims })
  } catch (error) {
    console.error('Error fetching VC claims:', error)
    return NextResponse.json(
      { error: 'Failed to fetch VC claims' },
      { status: 500 }
    )
  }
}














