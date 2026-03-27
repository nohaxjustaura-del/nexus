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
import { syncRecentPublicDiscoverableToVcDirectory } from '@/lib/vc-supabase-sync'

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
          mode: 'full',
        })
        result = { updated: vcsToResearch.length }
        break
      }

      case 'vc-thesis-research': {
        const limit = Math.min(50, Math.max(1, params?.limit ?? 15))
        const rows = await db.investor.findMany({
          where: { OR: [{ thesis: null }, { thesis: '' }] },
          select: { firmName: true, thesis: true },
          take: limit * 2,
          orderBy: { updatedAt: 'asc' },
        })
        const names = rows
          .filter((r) => !r.thesis || r.thesis.trim().length < 20)
          .slice(0, limit)
          .map((r) => r.firmName)
        await researchVCsBatch(names, {
          delayBetweenSearches: 2500,
          maxConcurrent: 2,
          mode: 'thesis',
        })
        result = { mode: 'thesis', firms: names.length }
        break
      }

      case 'vc-profile-research': {
        const limit = Math.min(50, Math.max(1, params?.limit ?? 15))
        const rows = await db.investor.findMany({
          where: {
            OR: [
              { checkSizeMin: 0 },
              { portfolio: null },
              { portfolio: '' },
              { stages: '[]' },
              { sectors: '[]' },
              { bio: '' },
            ],
          },
          select: { firmName: true },
          take: limit,
          orderBy: { updatedAt: 'asc' },
        })
        const names = rows.map((r) => r.firmName)
        await researchVCsBatch(names, {
          delayBetweenSearches: 2500,
          maxConcurrent: 2,
          mode: 'profile',
        })
        result = { mode: 'profile', firms: names.length }
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

      case 'vc-directory-sync': {
        const maxRows = Math.min(400, Math.max(10, params?.maxRows ?? 150))
        const lookbackHours = Math.min(168, Math.max(6, params?.lookbackHours ?? 72))
        const dir = await syncRecentPublicDiscoverableToVcDirectory({
          maxRows,
          lookbackMs: lookbackHours * 60 * 60 * 1000,
        })
        result = dir
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

      case 'embeddings': {
        const { default: runRebuild } = await import('@/scripts/rebuild-embeddings-auto')
        result = await runRebuild()
        break
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown job type: ${jobType}. Valid: vc-research, vc-thesis-research, vc-profile-research, exa-enrichment, vc-directory-sync, data-validation, embeddings`,
          },
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
