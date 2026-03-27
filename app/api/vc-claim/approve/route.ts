import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { revalidateVerifiedInvestorCountCache } from '@/lib/investor-public-stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { claimId, notes } = await request.json()

    if (!claimId) {
      return NextResponse.json(
        { error: 'Claim ID is required' },
        { status: 400 }
      )
    }

    // Get the claim
    const claim = await db.vCClaim.findUnique({
      where: { id: claimId },
    })

    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    if (claim.status !== 'pending') {
      return NextResponse.json(
        { error: 'Claim is not pending' },
        { status: 400 }
      )
    }

    // Update claim status
    await db.vCClaim.update({
      where: { id: claimId },
      data: {
        status: 'approved',
      },
    })
    
    // If VC profile exists for this email, mark it as verified
    try {
      await db.investor.updateMany({
        where: { email: claim.email },
        data: { verified: true },
      })
    } catch {
      /* optional: investor row may not exist yet */
    }

    revalidateVerifiedInvestorCountCache()

    return NextResponse.json({
      success: true,
      message: 'Claim approved',
    })
  } catch (error) {
    console.error('Error approving VC claim:', error)
    return NextResponse.json(
      { error: 'Failed to approve claim' },
      { status: 500 }
    )
  }
}
