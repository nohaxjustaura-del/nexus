import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { revalidateVerifiedInvestorCountCache } from '@/lib/investor-public-stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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














