import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const admin = await getCurrentUser(false)
    if (!admin || !isAdminEmail(admin.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const items = await db.founderVerification.findMany({
      orderBy: { submittedAt: 'desc' },
      take: 200,
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('List founder verifications error:', error)
    return NextResponse.json(
      { error: 'Failed to list verifications', message: error?.message },
      { status: 500 }
    )
  }
}
