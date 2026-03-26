/**
 * ===============================================================================
 * BACKGROUND WORKER SYSTEM v2  -  Streamlined & Integrated with Exa Enrichment
 * ===============================================================================
 *
 * Jobs:
 *  1. VC Research     (24h)  -  Web search + AI extraction to fill missing fields
 *  2. Exa Enrichment  (24h)  -  Pre-warm VCEnrichmentCache via Exa for top VCs
 *  3. Embeddings      (24h)  -  Regenerate Voyage AI embeddings + FAISS index
 *  4. Data Validation  (12h)  -  Check data quality, flag gaps, report stats
 *
 * Removed:
 *  - YC Trends (separate job)  -  YC is just another VC; the research job covers it
 *  - Market Trends  -  was generating analysis and discarding it; replaced by
 *    live Exa enrichment which actually stores and uses its output
 */

import { db } from './db'
import { logger } from './logger'
import { researchVCsBatch } from '../scripts/auto-research-vcs'
import { getLiveInvestorPulse } from './exa-service'

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

export interface WorkerJob {
  id: string
  name: string
  type: 'vc-research' | 'exa-enrichment' | 'embeddings' | 'validation'
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
      id: 'vc-research-daily',
      name: 'VC Data Research & Update',
      type: 'vc-research',
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
  ],
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
 * Research and update VC data  -  fills ALL missing fields via web search + AI.
 * Targets VCs that are stale (>30 days), missing thesis, or have 0 check sizes.
 */
async function executeVCResearch(): Promise<void> {
  logger.info('WORKER', '🔍 Starting VC research job...')

  try {
    const vcsToUpdate = await db.investor.findMany({
      where: {
        OR: [
          { updatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          { thesis: { equals: null } },
          { thesis: '' },
          { checkSizeMin: { equals: 0 } },
          { portfolio: { equals: null } },
          { portfolio: '' },
        ],
      },
      select: { firmName: true },
      take: 20,
      orderBy: { updatedAt: 'asc' },
    })

    if (vcsToUpdate.length === 0) {
      logger.info('WORKER', '✅ All VCs are up to date')
      return
    }

    const firmNames = vcsToUpdate.map(vc => vc.firmName)
    logger.info('WORKER', `📋 Updating ${firmNames.length} VCs: ${firmNames.slice(0, 5).join(', ')}...`)

    await researchVCsBatch(firmNames, {
      delayBetweenSearches: 3000,
      maxConcurrent: 2,
    })

    logger.info('WORKER', `✅ VC research complete: ${firmNames.length} VCs updated`)
  } catch (error: any) {
    logger.error('WORKER', 'VC research failed:', error.message)
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
    const uncachedVCs = await db.investor.findMany({
      where: {
        isPublic: true,
        discoverable: true,
        enrichmentCache: { is: null },
      },
      select: { id: true, firmName: true, sectors: true },
      take: 15,
      orderBy: { updatedAt: 'desc' },
    })

    // Also refresh stale cache entries (>24h old)
    const staleCache = await db.vCEnrichmentCache.findMany({
      where: {
        lastUpdated: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { investorId: true, investor: { select: { firmName: true, sectors: true } } },
      take: 10,
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

    // Process sequentially to be gentle on Exa rate limits
    for (const vc of toEnrich) {
      try {
        let sectors: string[] = []
        try { sectors = JSON.parse(vc.sectors || '[]') } catch { /* ignore */ }
        const domain = sectors[0] || 'technology'

        await getLiveInvestorPulse(vc.firmName, domain, vc.id)
        enriched++

        // 2s delay between calls
        await new Promise(resolve => setTimeout(resolve, 2000))
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
      case 'vc-research':
        await executeVCResearch()
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
    if (job.type === 'embeddings') {
      logger.info('WORKER', `⏭️ Skipping ${job.name} on startup (runs on 24h schedule only)`)
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
  }>
} {
  return {
    running: isRunning,
    jobs: workerConfig.jobs.map(job => ({
      id: job.id,
      name: job.name,
      status: job.status,
      lastRun: job.lastRun?.toISOString(),
      nextRun: job.nextRun?.toISOString(),
      errorCount: job.errorCount,
    })),
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
