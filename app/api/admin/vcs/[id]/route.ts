import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { revalidateVerifiedInvestorCountCache } from '@/lib/investor-public-stats'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(false)
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const investorId = params.id
    if (!investorId) {
      return NextResponse.json({ error: 'Missing investor id' }, { status: 400 })
    }

    // Ensure it exists
    const existing = await db.investor.findUnique({ where: { id: investorId } })
    if (!existing) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
    }

    await db.investor.delete({
      where: { id: investorId },
    })

    if (existing.verified) {
      revalidateVerifiedInvestorCountCache()
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting investor:', error)
    return NextResponse.json(
      { error: 'Failed to delete investor' },
      { status: 500 }
    )
  }
}



