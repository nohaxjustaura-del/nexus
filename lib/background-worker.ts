/**
 * ===============================================================================
 * BACKGROUND WORKER SYSTEM v2  -  Streamlined & Integrated with Exa Enrichment
 * ===============================================================================
 *
 * Jobs:
 *  1. VC Thesis        (24h tick, monthly window) — dual Exa + OpenRouter; applies thesis only (see data/worker-vc-refresh-state.json)
 *  2. VC Profile       (24h tick, monthly window) — same retrieval; applies non-thesis fields only
 *  3. Exa Enrichment   (24h)  -  Pre-warm VCEnrichmentCache via Exa for top VCs
 *  4. Embeddings          (24h)  -  Regenerate Voyage AI embeddings + FAISS index
 *  5. Data Validation    (12h)  -  Check data quality, flag gaps, report stats
 *  6. VC directory sync  (6h)   -  Prisma → Supabase vc_directory for recently updated public rows (heals failed ingest upserts)
 *
 * Removed:
 *  - YC Trends (separate job)  -  YC is just another VC; the research job covers it
 *  - Market Trends  -  was generating analysis and discarding it; replaced by
 *    live Exa enrichment which actually stores and uses its output
 *
 * Env tuning (optional):
 *  - WORKER_VC_RESEARCH_BATCH_SIZE, WORKER_VC_RESEARCH_DELAY_MS, WORKER_VC_RESEARCH_MAX_CONCURRENT
 *  - WORKER_EXA_UNCACHED_TAKE, WORKER_EXA_STALE_TAKE, WORKER_EXA_ENRICH_DELAY_MS
 *  - WORKER_THESIS_REFRESH_INTERVAL_MS, WORKER_PROFILE_REFRESH_INTERVAL_MS (default ~30d each)
 *  - WORKER_VC_DIRECTORY_SYNC_INTERVAL_MS (default 6h)
 *  - WORKER_VALIDATION_EXA_SAMPLE (default 0) — if > 0, sample that many public VCs and score DB vs fresh Exa + LLM (e.g. Ollama qwen2.5:7b)
 *  - WORKER_VALIDATION_EXA_DELAY_MS (default 2500) — pause between Exa validation samples
 *  - VC_VALIDATION_EXA_CONTEXT_CHARS (default 12000) — max chars of Exa text passed to the LLM
 *  - WORKER_VALIDATION_FULL_LOCAL_AUDIT=1 — scan ALL investors with lib/investor-quality-audit (logs summary + top error rows)
 */

import { db } from './db'
import { logger } from './logger'
import { isLikelyRealFirmName } from './firm-name-quality'
import { researchVCsBatch } from '../scripts/auto-research-vcs'
import { getLiveInvestorPulse } from './exa-service'
import {
  readWorkerVcRefreshState,
  isThesisRefreshDue,
  isProfileRefreshDue,
  completeThesisRefreshCycle,
  completeProfileRefreshCycle,
  markThesisBatchRan,
  markProfileBatchRan,
} from './worker-vc-refresh-state'
import { syncRecentPublicDiscoverableToVcDirectory } from './vc-supabase-sync'
import { verifyInvestorAgainstExa } from './vc-db-exa-quality-check'
import { hasVcLlmConfigured } from './openrouter'
import { auditInvestorLocal, auditSeverityScore, type InvestorLocalAuditInput } from './investor-quality-audit'

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

export interface WorkerJob {
  id: string
  name: string
  type:
    | 'vc-thesis'
    | 'vc-profile'
    | 'exa-enrichment'
    | 'embeddings'
    | 'validation'
    | 'vc-directory-sync'
  priority: number
  interval: number
  lastRun?: Date
  nextRun?: Date
  status: 'idle' | 'running' | 'error'
  errorCount: number
  maxErrors: number
}

interface WorkerConfig {
  enabled: boolean
  jobs: WorkerJob[]
  gracefulShutdownTimeout: number
}

const DEFAULT_CONFIG: WorkerConfig = {
  enabled: true,
  gracefulShutdownTimeout: 30000,
  jobs: [
    {
      id: 'vc-thesis-monthly',
      name: 'VC Thesis refresh (monthly cycle)',
      type: 'vc-thesis',
      priority: 9,
      interval: 24 * 60 * 60 * 1000,
      status: 'idle',
      errorCount: 0,
      maxErrors: 3,
    },
    {
      id: 'vc-profile-monthly',
      name: 'VC Profile fields refresh (monthly cycle)',
      type: 'vc-profile',
      priority: 8,
      interval: 24 * 60 * 60 * 1000,
      status: 'idle',
      errorCount: 0,
      maxErrors: 3,
    },
    {
      id: 'exa-enrichment-daily',
      name: 'Exa Live Enrichment Pre-Warm',
      type: 'exa-enrichment',
      priority: 7,
      interval: 24 * 60 * 60 * 1000,
      status: 'idle',
      errorCount: 0,
      maxErrors: 5,
    },
    {
      id: 'embeddings-rebuild',
      name: 'Semantic Search Embeddings',
      type: 'embeddings',
      priority: 6,
      interval: 24 * 60 * 60 * 1000,
      status: 'idle',
      errorCount: 0,
      maxErrors: 3,
    },
    {
      id: 'data-validation',
      name: 'Data Accuracy Validation',
      type: 'validation',
      priority: 5,
      interval: 12 * 60 * 60 * 1000,
      status: 'idle',
      errorCount: 0,
      maxErrors: 5,
    },
    {
      id: 'vc-directory-sync',
      name: 'Supabase VC directory sync (recent Prisma rows)',
      type: 'vc-directory-sync',
      priority: 4,
      interval: (() => {
        const minMs = 60 * 60 * 1000
        const fallback = 6 * 60 * 60 * 1000
        const fromEnv = parseInt(process.env.WORKER_VC_DIRECTORY_SYNC_INTERVAL_MS || '', 10)
        return Math.max(minMs, Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : fallback)
      })(),
      status: 'idle',
      errorCount: 0,
      maxErrors: 5,
    },
  ],
}

/** Accurate summaries for admin UI, API status, and `npm run worker:status` */
export const WORKER_JOB_UI_META: Record<string, { summary: string; cadence: string }> = {
  'vc-thesis-monthly': {
    summary:
      'Backfills missing or very short thesis text for real firm names using Exa plus your configured LLM. Honors the monthly thesis window in data/worker-vc-refresh-state.json.',
    cadence:
      'Scheduler tick every 24h; batches run only while the monthly thesis cycle is open (interval: WORKER_THESIS_REFRESH_INTERVAL_MS in lib/worker-vc-refresh-state.ts).',
  },
  'vc-profile-monthly': {
    summary:
      'Refreshes non-thesis fields (stages, sectors, check size, portfolio, bio, etc.) for investors in the open monthly profile window.',
    cadence:
      'Scheduler tick every 24h; work only when the profile cycle is open (WORKER_PROFILE_REFRESH_INTERVAL_MS in lib/worker-vc-refresh-state.ts).',
  },
  'exa-enrichment-daily': {
    summary:
      'Pre-warms VC enrichment cache via Exa live pulse for public discoverable investors so matching and profiles see fresher context.',
    cadence: 'Every 24 hours.',
  },
  'embeddings-rebuild': {
    summary:
      'Regenerates Voyage embeddings and rebuilds the FAISS index backing semantic investor search. Individual public investors also refresh on research writes when VOYAGE_API_KEY is set (see lib/vc-embedding-sync.ts).',
    cadence:
      'Every 24 hours. Not run immediately on worker startup (timer only); use Admin “Run now” or npm run embeddings:rebuild for an on-demand rebuild.',
  },
  'data-validation': {
    summary:
      'Aggregates data-gap counts, optional full-table local audit when WORKER_VALIDATION_FULL_LOCAL_AUDIT=1, and optional Exa+LLM samples when WORKER_VALIDATION_EXA_SAMPLE > 0.',
    cadence: 'Every 12 hours.',
  },
  'vc-directory-sync': {
    summary:
      'Syncs recently updated public Prisma investors into Supabase vc_directory to heal missed upserts and keep search directory rows aligned.',
    cadence:
      'Default every 6h (minimum 1h); set WORKER_VC_DIRECTORY_SYNC_INTERVAL_MS. Not run on worker startup; timer only.',
  },
}

// ============================================================================
// WORKER STATE
// ============================================================================

let workerConfig: WorkerConfig = { ...DEFAULT_CONFIG }
let isRunning = false
let scheduledJobs: Map<string, NodeJS.Timeout> = new Map()

// ============================================================================
// JOB EXECUTORS
// ============================================================================

/**
 * Thesis-only refresh. Runs only during an open monthly window (see worker-vc-refresh-state.json).
 */
async function executeVCThesisResearch(): Promise<void> {
  logger.info('WORKER', '📝 Starting VC thesis refresh job...')

  try {
    const state = readWorkerVcRefreshState()
    if (!isThesisRefreshDue(state)) {
      logger.info(
        'WORKER',
        `⏭️ Thesis cycle not open yet — next eligible after ${state.thesis.nextCycleNotBefore}`,
      )
      return
    }

    const batchTake = Math.min(
      100,
      Math.max(5, parseInt(process.env.WORKER_VC_RESEARCH_BATCH_SIZE || '25', 10) || 25),
    )
    const delayMs = Math.max(
      500,
      parseInt(process.env.WORKER_VC_RESEARCH_DELAY_MS || '2500', 10) || 2500,
    )
    const maxConcurrent = Math.min(
      5,
      Math.max(1, parseInt(process.env.WORKER_VC_RESEARCH_MAX_CONCURRENT || '2', 10) || 2),
    )

    const vcsToUpdate = await db.investor.findMany({
      where: {
        OR: [{ thesis: { equals: null } }, { thesis: '' }],
      },
      select: { firmName: true, thesis: true },
      take: batchTake,
      orderBy: { updatedAt: 'asc' },
    })

    const needingThesis = vcsToUpdate.filter((v) => {
      if (!isLikelyRealFirmName(v.firmName)) return false
      return !v.thesis || v.thesis.trim().length < 20
    })

    if (needingThesis.length === 0) {
      logger.info('WORKER', '✅ Thesis queue empty — closing monthly thesis cycle')
      completeThesisRefreshCycle(readWorkerVcRefreshState())
      return
    }

    const firmNames = needingThesis.map((vc) => vc.firmName)
    logger.info('WORKER', `📋 Thesis batch ${firmNames.length}: ${firmNames.slice(0, 5).join(', ')}...`)

    await researchVCsBatch(firmNames, {
      delayBetweenSearches: delayMs,
      maxConcurrent,
      mode: 'thesis',
    })

    markThesisBatchRan(readWorkerVcRefreshState())
    logger.info('WORKER', `✅ Thesis batch finished (${firmNames.length} firms); cycle stays open until queue drains`)
  } catch (error: any) {
    logger.error('WORKER', 'VC thesis refresh failed:', error.message)
    throw error
  }
}

/**
 * Profile fields (non-thesis). Separate monthly window in worker-vc-refresh-state.json.
 */
async function executeVCProfileResearch(): Promise<void> {
  logger.info('WORKER', '📋 Starting VC profile fields refresh job...')

  try {
    const state = readWorkerVcRefreshState()
    if (!isProfileRefreshDue(state)) {
      logger.info(
        'WORKER',
        `⏭️ Profile cycle not open yet — next eligible after ${state.profile.nextCycleNotBefore}`,
      )
      return
    }

    const batchTake = Math.min(
      100,
      Math.max(5, parseInt(process.env.WORKER_VC_RESEARCH_BATCH_SIZE || '25', 10) || 25),
    )
    const delayMs = Math.max(
      500,
      parseInt(process.env.WORKER_VC_RESEARCH_DELAY_MS || '2500', 10) || 2500,
    )
    const maxConcurrent = Math.min(
      5,
      Math.max(1, parseInt(process.env.WORKER_VC_RESEARCH_MAX_CONCURRENT || '2', 10) || 2),
    )

    const vcsToUpdate = await db.investor.findMany({
      where: {
        OR: [
          { checkSizeMin: { equals: 0 } },
          { portfolio: null },
          { portfolio: '' },
          { stages: { equals: '[]' } },
          { sectors: { equals: '[]' } },
          // bio is required String in schema (default ""); null is invalid for Prisma filters
          { bio: '' },
        ],
      },
      select: { firmName: true },
      take: batchTake,
      orderBy: { updatedAt: 'asc' },
    })

    if (vcsToUpdate.length === 0) {
      logger.info('WORKER', '✅ Profile queue empty — closing monthly profile cycle')
      completeProfileRefreshCycle(readWorkerVcRefreshState())
      return
    }

    const firmNames = vcsToUpdate.map((vc) => vc.firmName).filter((name) => isLikelyRealFirmName(name))
    if (firmNames.length === 0) {
      logger.info('WORKER', '✅ Profile queue has no high-quality firm names; skipping this run')
      return
    }
    logger.info('WORKER', `📋 Profile batch ${firmNames.length}: ${firmNames.slice(0, 5).join(', ')}...`)

    await researchVCsBatch(firmNames, {
      delayBetweenSearches: delayMs,
      maxConcurrent,
      mode: 'profile',
    })

    markProfileBatchRan(readWorkerVcRefreshState())
    logger.info('WORKER', `✅ Profile batch finished (${firmNames.length} firms); cycle stays open until queue drains`)
  } catch (error: any) {
    logger.error('WORKER', 'VC profile refresh failed:', error.message)
    throw error
  }
}

/**
 * Pre-warm VCEnrichmentCache via Exa for the most-bookmarked and most-matched
 * VCs so that live analysis doesn't hit cold-start latency.
 */
async function executeExaEnrichment(): Promise<void> {
  logger.info('WORKER', '🌐 Starting Exa enrichment pre-warm...')

  try {
    // Find VCs that are most likely to be shown to founders:
    // top bookmarked + any without a cache entry yet
    const uncachedTake = Math.min(
      80,
      Math.max(5, parseInt(process.env.WORKER_EXA_UNCACHED_TAKE || '20', 10) || 20),
    )
    const staleTake = Math.min(
      50,
      Math.max(3, parseInt(process.env.WORKER_EXA_STALE_TAKE || '15', 10) || 15),
    )

    const uncachedVCs = await db.investor.findMany({
      where: {
        isPublic: true,
        discoverable: true,
        enrichmentCache: { is: null },
      },
      select: { id: true, firmName: true, sectors: true },
      take: uncachedTake,
      orderBy: { updatedAt: 'desc' },
    })

    // Also refresh stale cache entries (>24h old)
    const staleCache = await db.vCEnrichmentCache.findMany({
      where: {
        lastUpdated: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { investorId: true, investor: { select: { firmName: true, sectors: true } } },
      take: staleTake,
      orderBy: { lastUpdated: 'asc' },
    })

    const toEnrich = [
      ...uncachedVCs.map(vc => ({ id: vc.id, firmName: vc.firmName, sectors: vc.sectors })),
      ...staleCache.map(c => ({ id: c.investorId, firmName: c.investor.firmName, sectors: c.investor.sectors })),
    ]

    if (toEnrich.length === 0) {
      logger.info('WORKER', '✅ All VC enrichment caches are fresh')
      return
    }

    logger.info('WORKER', `🌐 Enriching ${toEnrich.length} VCs via Exa...`)

    let enriched = 0
    let failed = 0

    const exaDelayMs = Math.max(
      500,
      parseInt(process.env.WORKER_EXA_ENRICH_DELAY_MS || '2000', 10) || 2000,
    )

    // Process sequentially to be gentle on Exa rate limits
    for (const vc of toEnrich) {
      try {
        let sectors: string[] = []
        try { sectors = JSON.parse(vc.sectors || '[]') } catch { /* ignore */ }
        const domain = sectors[0] || 'technology'

        await getLiveInvestorPulse(vc.firmName, domain, vc.id)
        enriched++

        await new Promise(resolve => setTimeout(resolve, exaDelayMs))
      } catch (err: any) {
        logger.warn('WORKER', `⚠️ Enrichment failed for ${vc.firmName}:`, err?.message)
        failed++
      }
    }

    logger.info('WORKER', `✅ Exa enrichment complete: ${enriched} enriched, ${failed} failed`)
  } catch (error: any) {
    logger.error('WORKER', 'Exa enrichment failed:', error.message)
    throw error
  }
}

/**
 * Regenerate embeddings for semantic search
 */
async function executeEmbeddingsRebuild(): Promise<void> {
  logger.info('WORKER', '🔄 Starting embeddings rebuild...')

  try {
    const { default: rebuildEmbeddings } = await import('../scripts/rebuild-embeddings-auto')
    const result = await rebuildEmbeddings()

    logger.info('WORKER', `✅ Embeddings rebuilt: ${result.embeddingsGenerated} investors, ${(result.duration / 1000).toFixed(2)}s`)
  } catch (error: any) {
    logger.error('WORKER', 'Embeddings rebuild failed:', error.message)
    throw error
  }
}

/**
 * Validate data accuracy and report gaps.
 * Does NOT crash on invalid Prisma queries.
 */
async function executeVCDirectorySync(): Promise<void> {
  logger.info('WORKER', '📤 Starting Supabase vc_directory sync (recent Prisma investors)...')

  try {
    const maxRows = Math.min(
      300,
      Math.max(30, parseInt(process.env.WORKER_VC_DIRECTORY_SYNC_MAX_ROWS || '120', 10) || 120),
    )
    const lookbackHours = Math.max(
      6,
      Math.min(168, parseInt(process.env.WORKER_VC_DIRECTORY_SYNC_LOOKBACK_HOURS || '50', 10) || 50),
    )
    const result = await syncRecentPublicDiscoverableToVcDirectory({
      lookbackMs: lookbackHours * 60 * 60 * 1000,
      maxRows,
    })

    if (result.skipped) {
      logger.info('WORKER', `⏭️ VC directory sync skipped: ${result.reason || 'not configured'}`)
      return
    }

    logger.info(
      'WORKER',
      `✅ VC directory sync: examined ${result.examined}, ok ${result.upserted}, failed ${result.failed}`,
    )
  } catch (error: any) {
    logger.error('WORKER', 'VC directory sync failed:', error.message)
    throw error
  }
}

async function executeDataValidation(): Promise<void> {
  logger.info('WORKER', '🔍 Starting data validation...')

  try {
    const issues: string[] = []

    // 1. VCs with missing thesis
    const missingThesis = await db.investor.count({
      where: { OR: [{ thesis: null }, { thesis: '' }] },
    })
    if (missingThesis > 0) issues.push(`${missingThesis} VCs missing thesis`)

    // 2. VCs with zero check sizes (both min and max are 0)
    const zeroCheckSize = await db.investor.count({
      where: { checkSizeMin: 0, checkSizeMax: 0 },
    })
    if (zeroCheckSize > 0) issues.push(`${zeroCheckSize} VCs with unknown check sizes (both 0)`)

    // 3. VCs where min > max (invalid data)
    const allVCs = await db.investor.findMany({
      where: { checkSizeMin: { gt: 0 }, checkSizeMax: { gt: 0 } },
      select: { id: true, checkSizeMin: true, checkSizeMax: true },
    })
    const invertedCheckSize = allVCs.filter(vc => vc.checkSizeMin > vc.checkSizeMax).length
    if (invertedCheckSize > 0) issues.push(`${invertedCheckSize} VCs with checkSizeMin > checkSizeMax`)

    // 4. VCs not updated in 90+ days
    const outdatedVCs = await db.investor.count({
      where: { updatedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
    })
    if (outdatedVCs > 0) issues.push(`${outdatedVCs} VCs not updated in 90+ days`)

    // 5. VCs with empty portfolio
    const noPortfolio = await db.investor.count({
      where: { OR: [{ portfolio: null }, { portfolio: '' }, { portfolio: '[]' }] },
    })
    if (noPortfolio > 0) issues.push(`${noPortfolio} VCs with no portfolio data`)

    // 6. VCs with default fundType (never classified)
    const defaultFundType = await db.investor.count({
      where: { fundType: 'Venture Capital' },
    })
    const totalVCs = await db.investor.count()
    if (defaultFundType > totalVCs * 0.8) {
      issues.push(`${defaultFundType}/${totalVCs} VCs still have default fund type  -  likely unclassified`)
    }

    // 7. VCs with missing or empty embeddings
    const noEmbedding = await db.investor.count({
      where: { OR: [{ embedding: null }, { embedding: '' }] },
    })
    if (noEmbedding > 0) issues.push(`${noEmbedding} VCs missing embeddings (will not appear in vector search)`)

    // 8. VCs with empty stages
    const noStages = await db.investor.count({
      where: { stages: '[]' },
    })
    if (noStages > 0) issues.push(`${noStages} VCs with empty stages array  -  hard filter will skip them`)

    // Report
    if (issues.length > 0) {
      logger.warn('WORKER', `⚠️ Data quality issues (${issues.length}):\n  - ${issues.join('\n  - ')}`)
    } else {
      logger.info('WORKER', '✅ Data validation passed  -  no issues found')
    }

    if (process.env.WORKER_VALIDATION_FULL_LOCAL_AUDIT === '1') {
      const invRows = await db.investor.findMany({
        select: {
          id: true,
          firmName: true,
          email: true,
          thesis: true,
          bio: true,
          checkSizeMin: true,
          checkSizeMax: true,
          stages: true,
          sectors: true,
          geography: true,
          fundType: true,
          portfolio: true,
          websiteUrl: true,
          embedding: true,
          isPublic: true,
          discoverable: true,
        },
        orderBy: { firmName: 'asc' },
      })
      const audits = invRows.map((r) => auditInvestorLocal(r as InvestorLocalAuditInput))
      const errN = audits.filter((a) => a.errorCount > 0).length
      const warnN = audits.filter((a) => a.warnCount > 0).length
      const codes = new Map<string, number>()
      for (const a of audits) {
        for (const iss of a.issues) codes.set(iss.code, (codes.get(iss.code) || 0) + 1)
      }
      const topCodes = [...codes.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 12)
        .map(([c, n]) => `${c}=${n}`)
        .join(', ')
      logger.info(
        'WORKER',
        `📋 Full local investor audit: ${audits.length} rows, ${errN} with errors, ${warnN} with warns. Top codes: ${topCodes}`,
      )
      const worst = [...audits].sort((x, y) => auditSeverityScore(y) - auditSeverityScore(x)).slice(0, 8)
      for (const a of worst) {
        if (a.errorCount === 0 && a.warnCount === 0) continue
        const codesHere = a.issues
          .filter((i) => i.level === 'error' || i.level === 'warn')
          .map((i) => i.code)
          .join(', ')
        logger.warn('WORKER', `   ⚠️ ${a.firmName}: ${codesHere || 'info-only'}`)
      }
    }

    // Optional: Exa + LLM spot-check (same stack as VC research — verifies stored rows vs live web excerpts)
    const exaSample = Math.min(
      15,
      Math.max(0, parseInt(process.env.WORKER_VALIDATION_EXA_SAMPLE || '0', 10) || 0),
    )
    if (exaSample > 0) {
      if (!process.env.EXA_API_KEY?.trim()) {
        logger.warn('WORKER', '⏭️ WORKER_VALIDATION_EXA_SAMPLE > 0 but EXA_API_KEY missing — skipping Exa+LLM checks')
      } else if (!hasVcLlmConfigured()) {
        logger.warn(
          'WORKER',
          '⏭️ WORKER_VALIDATION_EXA_SAMPLE > 0 but no LLM — set OLLAMA_BASE_URL+OLLAMA_MODEL (e.g. qwen2.5:7b) or OPENROUTER_API_KEY',
        )
      } else {
        const delayMs = Math.max(
          500,
          parseInt(process.env.WORKER_VALIDATION_EXA_DELAY_MS || '2500', 10) || 2500,
        )
        const rows = await db.investor.findMany({
          where: { isPublic: true, discoverable: true },
          select: {
            firmName: true,
            thesis: true,
            bio: true,
            checkSizeMin: true,
            checkSizeMax: true,
            stages: true,
            sectors: true,
            geography: true,
            fundType: true,
            portfolio: true,
            websiteUrl: true,
            updatedAt: true,
          },
          take: exaSample,
          orderBy: { updatedAt: 'desc' },
        })

        logger.info(
          'WORKER',
          `🔎 Exa+LLM validation sample: ${rows.length} investor row(s) (recently updated first)…`,
        )

        let checked = 0
        for (const row of rows) {
          try {
            const r = await verifyInvestorAgainstExa(row)
            if (!r) continue
            checked++
            if (r.skippedReason === 'no_exa' || r.skippedReason === 'no_llm') {
              logger.warn('WORKER', `⚠️ ${r.firmName}: ${r.issues[0] || r.skippedReason}`)
              continue
            }
            const flag = r.aligned ? '✅' : '⚠️'
            const tail = r.summary ? ` — ${r.summary}` : ''
            logger.info(
              'WORKER',
              `${flag} ${r.firmName}: score ${r.score}/100, Exa ${r.exaTotalResults} hit(s)${tail}`,
            )
            if (r.issues.length) {
              logger.warn('WORKER', `   issues: ${r.issues.join('; ')}`)
            }
          } catch (e: any) {
            logger.warn('WORKER', `⚠️ Exa+LLM check failed for ${row.firmName}:`, e?.message || e)
          }
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
        if (checked === 0) {
          logger.info('WORKER', '⏭️ Exa+LLM validation: no rows passed the firm-name quality gate')
        }
      }
    }

    logger.info('WORKER', '✅ Data validation complete')
  } catch (error: any) {
    logger.error('WORKER', 'Data validation failed:', error.message)
    throw error
  }
}

// ============================================================================
// JOB SCHEDULER
// ============================================================================

async function executeJob(job: WorkerJob): Promise<void> {
  if (job.status === 'running') {
    logger.warn('WORKER', `⏭️ Job ${job.name} already running, skipping...`)
    return
  }

  job.status = 'running'
  job.lastRun = new Date()

  logger.info('WORKER', `▶️ Running job: ${job.name} (priority: ${job.priority})`)

  try {
    switch (job.type) {
      case 'vc-thesis':
        await executeVCThesisResearch()
        break
      case 'vc-profile':
        await executeVCProfileResearch()
        break
      case 'exa-enrichment':
        await executeExaEnrichment()
        break
      case 'embeddings':
        await executeEmbeddingsRebuild()
        break
      case 'validation':
        await executeDataValidation()
        break
      case 'vc-directory-sync':
        await executeVCDirectorySync()
        break
      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }

    job.errorCount = 0
    job.status = 'idle'
    logger.info('WORKER', `✅ Job completed: ${job.name}`)
  } catch (error: any) {
    job.errorCount++
    job.status = 'error'
    logger.error('WORKER', `❌ Job failed: ${job.name} (error ${job.errorCount}/${job.maxErrors})`, error.message)

    if (job.errorCount >= job.maxErrors) {
      logger.error('WORKER', `🚫 Job disabled due to repeated failures: ${job.name}`)
      return
    }
  }

  scheduleJob(job)
}

function scheduleJob(job: WorkerJob): void {
  const existingTimeout = scheduledJobs.get(job.id)
  if (existingTimeout) clearTimeout(existingTimeout)

  job.nextRun = new Date(Date.now() + job.interval)

  const timeout = setTimeout(() => {
    executeJob(job).catch(err => {
      logger.error('WORKER', `Unhandled error in scheduled job ${job.name}:`, err?.message || err)
    })
  }, job.interval)
  scheduledJobs.set(job.id, timeout)

  logger.info('WORKER', `⏰ Scheduled ${job.name} for ${job.nextRun.toISOString()}`)
}

async function startAllJobsImmediate(): Promise<void> {
  logger.info('WORKER', '🚀 Starting all jobs immediately...')

  const sortedJobs = [...workerConfig.jobs].sort((a, b) => b.priority - a.priority)

  for (const job of sortedJobs) {
    // Embeddings rebuild takes hours at 3 RPM  -  only run on the 24h schedule,
    // not on every worker startup. Use `npm run rebuild-faiss-index` for manual runs.
    if (job.type === 'embeddings' || job.type === 'vc-directory-sync') {
      logger.info(
        'WORKER',
        `⏭️ Skipping ${job.name} on startup (runs on timer only — avoids duplicate load right after deploy)`,
      )
      scheduleJob(job)
      continue
    }

    await executeJob(job)
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  logger.info('WORKER', '✅ All jobs started')
}

// ============================================================================
// WORKER LIFECYCLE
// ============================================================================

export async function startWorker(runImmediately = true): Promise<void> {
  if (isRunning) {
    logger.warn('WORKER', '⚠️ Worker already running')
    return
  }

  isRunning = true
  logger.info('WORKER', '🚀 Starting background worker system...')
  logger.info('WORKER', `📋 Jobs configured: ${workerConfig.jobs.length}`)

  if (runImmediately) {
    await startAllJobsImmediate()
  } else {
    workerConfig.jobs.forEach(job => scheduleJob(job))
  }

  logger.info('WORKER', '✅ Background worker started successfully')
}

export async function stopWorker(): Promise<void> {
  if (!isRunning) {
    logger.warn('WORKER', '⚠️ Worker not running')
    return
  }

  logger.info('WORKER', '🛑 Stopping background worker...')

  scheduledJobs.forEach((timeout, jobId) => {
    clearTimeout(timeout)
    logger.info('WORKER', `⏹️ Cancelled job: ${jobId}`)
  })

  scheduledJobs.clear()
  isRunning = false

  logger.info('WORKER', '✅ Background worker stopped')
}

export function getWorkerStatus(): {
  running: boolean
  jobs: Array<{
    id: string
    name: string
    status: string
    lastRun?: string
    nextRun?: string
    errorCount: number
    summary?: string
    cadence?: string
  }>
} {
  return {
    running: isRunning,
    jobs: workerConfig.jobs.map(job => {
      const meta = WORKER_JOB_UI_META[job.id]
      return {
        id: job.id,
        name: job.name,
        status: job.status,
        lastRun: job.lastRun?.toISOString(),
        nextRun: job.nextRun?.toISOString(),
        errorCount: job.errorCount,
        ...(meta ? { summary: meta.summary, cadence: meta.cadence } : {}),
      }
    }),
  }
}

export async function gracefulShutdown(signal: string): Promise<void> {
  logger.info('WORKER', `📥 Received ${signal}, shutting down gracefully...`)
  await stopWorker()
  await db.$disconnect()
  logger.info('WORKER', '👋 Shutdown complete')
  process.exit(0)
}

// ============================================================================
// SIGNAL HANDLERS
// ============================================================================

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
