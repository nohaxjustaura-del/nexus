import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalized = email.toLowerCase().trim()

    await db.userApproval.upsert({
      where: { email: normalized },
      create: {
        email: normalized,
        status: 'pending',
      },
      update: {
        status: 'pending',
        reviewedAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Email ${normalized} added to pending approvals`,
    })
  } catch (error: any) {
    console.error('Add pending approval error:', error)
    return NextResponse.json({ error: 'Failed to add pending approval' }, { status: 500 })
  }
}
