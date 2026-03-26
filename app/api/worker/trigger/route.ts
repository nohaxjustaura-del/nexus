/**
 * WORKER TRIGGER API ENDPOINT
 *
 * Manually trigger specific background jobs (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { researchVCsBatch } from '@/scripts/auto-research-vcs'
import { getLiveInvestorPulse } from '@/lib/exa-service'
import { logger } from '@/lib/logger'
import { isAdminEmail } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(false)
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobType, params } = await request.json()

    logger.info('API', `🎯 Triggering job: ${jobType}`)

    let result: any = null

    switch (jobType) {
      case 'vc-research': {
        const vcsToResearch = params?.vcs || [
          'Sequoia Capital', 'Andreessen Horowitz', 'Benchmark',
          'Accel', 'Y Combinator',
        ]
        await researchVCsBatch(vcsToResearch, {
          delayBetweenSearches: 2000,
          maxConcurrent: 2,
        })
        result = { updated: vcsToResearch.length }
        break
      }

      case 'exa-enrichment': {
        const limit = params?.limit || 10
        const vcs = await db.investor.findMany({
          where: { isPublic: true, discoverable: true },
          select: { id: true, firmName: true, sectors: true },
          take: limit,
          orderBy: { updatedAt: 'desc' },
        })

        let enriched = 0
        for (const vc of vcs) {
          try {
            let sectors: string[] = []
            try { sectors = JSON.parse(vc.sectors || '[]') } catch { /* ignore */ }
            await getLiveInvestorPulse(vc.firmName, sectors[0] || 'technology', vc.id)
            enriched++
            await new Promise(resolve => setTimeout(resolve, 2000))
          } catch { /* skip */ }
        }

        result = { total: vcs.length, enriched }
        break
      }

      case 'data-validation': {
        const issues: string[] = []

        const missingThesis = await db.investor.count({
          where: { OR: [{ thesis: null }, { thesis: '' }] },
        })
        if (missingThesis > 0) issues.push(`${missingThesis} VCs missing thesis`)

        const zeroCheckSize = await db.investor.count({
          where: { checkSizeMin: 0, checkSizeMax: 0 },
        })
        if (zeroCheckSize > 0) issues.push(`${zeroCheckSize} VCs with unknown check sizes`)

        const noEmbedding = await db.investor.count({
          where: { OR: [{ embedding: null }, { embedding: '' }] },
        })
        if (noEmbedding > 0) issues.push(`${noEmbedding} VCs missing embeddings`)

        const noStages = await db.investor.count({ where: { stages: '[]' } })
        if (noStages > 0) issues.push(`${noStages} VCs with empty stages`)

        result = { issues: issues.length, details: issues }
        break
      }

      default:
        return NextResponse.json(
          { error: `Unknown job type: ${jobType}. Valid types: vc-research, exa-enrichment, data-validation` },
          { status: 400 }
        )
    }

    logger.info('API', `✅ Job completed: ${jobType}`)

    return NextResponse.json({ success: true, jobType, result })
  } catch (error: any) {
    logger.error('API', 'Job failed:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to trigger job' },
      { status: 500 }
    )
  }
}
