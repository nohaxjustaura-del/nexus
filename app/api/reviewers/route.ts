import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { reviewerAssignableWhere } from '@/lib/reviewer-filters'

export const dynamic = 'force-dynamic'

function parseExpertise(raw: string | null | undefined): unknown[] {
  if (!raw || !raw.trim()) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export async function GET(_request: NextRequest) {
  try {
    const reviewers = await (db as any).reviewer.findMany({
      where: reviewerAssignableWhere(),
      select: {
        id: true,
        name: true,
        email: true,
        acceptedVC: true,
        vcAccepted: true,
        verified: true,
        acceptedYear: true,
        expertise: true,
        bio: true,
        averageRating: true,
        totalReviews: true,
      },
      orderBy: [{ averageRating: 'desc' }, { totalReviews: 'desc' }],
      take: 20,
    })

    return NextResponse.json({
      reviewers: reviewers.map((r: { expertise?: string | null }) => ({
        ...r,
        expertise: parseExpertise(r.expertise),
      })),
    })
  } catch (error: unknown) {
    console.error('Error fetching reviewers:', error)
    return NextResponse.json({ error: 'Failed to fetch reviewers', reviewers: [] }, { status: 500 })
  }
}
