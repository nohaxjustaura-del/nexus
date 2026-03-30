import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { revalidateVerifiedInvestorCountCache } from '@/lib/investor-public-stats'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(false)
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { verified } = await request.json()
    const investorId = params.id

    const investor = await db.investor.update({
      where: { id: investorId },
      data: { verified: verified === true },
    })

    revalidateVerifiedInvestorCountCache()

    return NextResponse.json({ 
      success: true,
      investor: {
        id: investor.id,
        verified: investor.verified,
      }
    })
  } catch (error) {
    console.error('Error updating verification:', error)
    return NextResponse.json(
      { error: 'Failed to update verification status' },
      { status: 500 }
    )
  }
}














