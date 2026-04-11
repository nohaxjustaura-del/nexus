import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'
import { db } from '@/lib/db'
import { getCoverageStats } from '@/lib/discovery-coverage-tracker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser(false)
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [
      totalInvestors,
      verifiedCount,
      discoverableCount,
      withEmbedding,
      candidateStats,
      recentInvestors7d,
      recentInvestors30d,
    ] = await Promise.all([
      db.investor.count(),
      db.investor.count({ where: { verified: true } }),
      db.investor.count({ where: { discoverable: true, isPublic: true } }),
      db.investor.count({ where: { embedding: { not: null } } }),
      db.vCDiscoveryCandidate.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      db.investor.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      db.investor.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ])

    const pipeline: Record<string, number> = {}
    for (const row of candidateStats) {
      pipeline[row.status] = row._count.id
    }

    const coverage = getCoverageStats()

    return NextResponse.json({
      investors: {
        total: totalInvestors,
        verified: verifiedCount,
        discoverable: discoverableCount,
        withEmbedding,
        added7d: recentInvestors7d,
        added30d: recentInvestors30d,
      },
      pipeline,
      coverage,
    })
  } catch (e) {
    console.error('[discovery-stats] Error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
