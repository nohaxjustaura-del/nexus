import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { researchVCsBatch } from '@/scripts/auto-research-vcs'
import { runApplyContactBatch } from '@/lib/vc-apply-contact-research'
import { getLiveInvestorPulse } from '@/lib/exa-service'
import { syncRecentPublicDiscoverableToVcDirectory } from '@/lib/vc-supabase-sync'
import { isLikelyRealFirmName } from '@/lib/firm-name-quality'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TriggerBody = {
  jobType?: string
  params?: {
    limit?: number
    maxRows?: number
    lookbackHours?: number
    vcs?: string[]
    /** vc-apply-contact-research: replace existing URLs when new values validate */
    overwrite?: boolean
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(false)
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobType, params } = (await request.json()) as TriggerBody
    if (!jobType) {
      return NextResponse.json({ error: 'Missing jobType' }, { status: 400 })
    }

    logger.info('API', `🎯 Triggering job: ${jobType}`)
    let result: unknown = null

    switch (jobType) {
      case 'vc-research': {
        const vcs =
          params?.vcs?.length ?
            params.vcs
          : ['Sequoia Capital', 'Andreessen Horowitz', 'Benchmark', 'Accel', 'Y Combinator']
        await researchVCsBatch(vcs, { delayBetweenSearches: 2000, maxConcurrent: 2, mode: 'full' })
        result = { updated: vcs.length }
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
        const firms = rows
          .filter(
            r =>
              isLikelyRealFirmName(r.firmName) &&
              (!r.thesis || r.thesis.trim().length < 20),
          )
          .slice(0, limit)
          .map(r => r.firmName)
        await researchVCsBatch(firms, { delayBetweenSearches: 2500, maxConcurrent: 2, mode: 'thesis' })
        result = { mode: 'thesis', firms: firms.length }
        break
      }
      case 'vc-apply-contact-research': {
        const limit = Math.min(80, Math.max(1, params?.limit ?? 20))
        const vcs = params?.vcs?.length ? params.vcs.filter(Boolean) : undefined
        const overwrite = Boolean(params?.overwrite)
        result = await runApplyContactBatch({
          firmNames: vcs,
          limit: vcs?.length ? Math.max(vcs.length, limit) : limit,
          overwrite,
          delayBetweenMs: Math.max(
            800,
            parseInt(process.env.WORKER_VC_RESEARCH_DELAY_MS || '2500', 10) || 2500,
          ),
          maxConcurrent: Math.min(
            3,
            Math.max(1, parseInt(process.env.WORKER_VC_RESEARCH_MAX_CONCURRENT || '2', 10) || 2),
          ),
        })
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
        const firms = rows.map(r => r.firmName).filter(n => isLikelyRealFirmName(n))
        await researchVCsBatch(firms, { delayBetweenSearches: 2500, maxConcurrent: 2, mode: 'profile' })
        result = { mode: 'profile', firms: firms.length }
        break
      }
      case 'exa-enrichment': {
        const take = params?.limit ?? 10
        const investors = await db.investor.findMany({
          where: { isPublic: true },
          select: { id: true, firmName: true, sectors: true },
          take,
          orderBy: { updatedAt: 'desc' },
        })
        let enriched = 0
        for (const inv of investors) {
          let sectors: string[] = []
          try {
            sectors = JSON.parse(inv.sectors || '[]') as string[]
          } catch {
            /* ignore */
          }
          try {
            await getLiveInvestorPulse(inv.firmName, sectors[0] || 'technology', inv.id)
            enriched++
            await new Promise(r => setTimeout(r, 2000))
          } catch {
            /* continue */
          }
        }
        result = { total: investors.length, enriched }
        break
      }
      case 'vc-directory-sync': {
        const maxRows = Math.min(400, Math.max(10, params?.maxRows ?? 150))
        const lookbackHours = Math.min(168, Math.max(6, params?.lookbackHours ?? 72))
        result = await syncRecentPublicDiscoverableToVcDirectory({
          maxRows,
          lookbackMs: 3600000 * lookbackHours,
        })
        break
      }
      case 'data-validation': {
        const issues: string[] = []
        const missingThesis = await db.investor.count({
          where: { OR: [{ thesis: null }, { thesis: '' }] },
        })
        if (missingThesis > 0) issues.push(`${missingThesis} VCs missing thesis`)
        const unknownCheck = await db.investor.count({
          where: { checkSizeMin: 0, checkSizeMax: 0 },
        })
        if (unknownCheck > 0) issues.push(`${unknownCheck} VCs with unknown check sizes`)
        const missingEmb = await db.investor.count({
          where: { OR: [{ embedding: null }, { embedding: '' }] },
        })
        if (missingEmb > 0) issues.push(`${missingEmb} VCs missing embeddings`)
        const emptyStages = await db.investor.count({ where: { stages: '[]' } })
        if (emptyStages > 0) issues.push(`${emptyStages} VCs with empty stages`)
        result = { issues: issues.length, details: issues }
        break
      }
      case 'embeddings': {
        const { default: rebuildEmbeddings } = await import('@/scripts/rebuild-embeddings-auto')
        result = await rebuildEmbeddings()
        break
      }
      default:
        return NextResponse.json(
          {
            error: `Unknown job type: ${jobType}. Valid: vc-research, vc-thesis-research, vc-profile-research, vc-apply-contact-research, exa-enrichment, vc-directory-sync, data-validation, embeddings`,
          },
          { status: 400 },
        )
    }

    logger.info('API', `✅ Job completed: ${jobType}`)
    return NextResponse.json({ success: true, jobType, result })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to trigger job'
    logger.error('API', 'Job failed:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
