import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
        status: 'rejected',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Claim rejected',
    })
  } catch (error) {
    console.error('Error rejecting VC claim:', error)
    return NextResponse.json(
      { error: 'Failed to reject claim' },
      { status: 500 }
    )
  }
}


