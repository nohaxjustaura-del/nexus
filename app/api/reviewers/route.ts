import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get all active, verified reviewers
    const reviewers = await (db as any).reviewer.findMany({
      where: {
        active: true,
        verified: true,
        vcAccepted: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        acceptedVC: true,
        acceptedYear: true,
        expertise: true,
        bio: true,
        averageRating: true,
        totalReviews: true,
      },
      orderBy: [
        { averageRating: 'desc' },
        { totalReviews: 'desc' },
      ],
      take: 20,
    })

    return NextResponse.json({
      reviewers: reviewers.map((r: any) => ({
        ...r,
        expertise: r.expertise ? JSON.parse(r.expertise) : [],
      })),
    })
  } catch (error: any) {
    console.error('Error fetching reviewers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviewers', reviewers: [] },
      { status: 500 }
    )
  }
}








