/**
 * BACKGROUND VC RESEARCH WORKER
 *
 * Runs on an interval: Exa + LLM enrichment via researchVC + updateVCInDatabase.
 * For full-corpus backfills use: npm run research-vcs -- --all (public / Discover rows only)
 * Auto-hide bogus public rows: set VC_RESEARCH_AUTO_HIDE_BOGUS=1 (same as CLI script).
 *
 * Note: does not run apply-contact URL pass (researchApplyContactAndUpdate) — that stays on the
 * research-vcs batch path only, to keep this daemon lighter per firm.
 *
 * External APIs used:
 *   - Exa (lib/exa-keys.ts) — web retrieval for each firm (3 searches per firm in lib/vc-research-retrieval)
 *   - OpenRouter and/or Ollama — LLM extraction (same env as rest of VC pipeline)
 * When Exa returns quota/payment/rate-limit errors, a global cooldown applies and this worker
 * stops the current batch without writing rows (updatedAt unchanged for skipped firms).
 */

import { db } from '../lib/db'
import { isInvestorEligibleForWorkers } from '../lib/investor-worker-eligibility'
import { ExaResearchQuotaBlockedError } from '../lib/vc-research-retrieval'
import { investorStalestFirstOrderBy, researchVC, updateVCInDatabase } from './auto-research-vcs'

interface WorkerConfig {
  intervalMinutes: number // How often to run
  batchSize: number // How many VCs per run
  priorityVCs?: string[] // VCs to prioritize
}

class VCResearchWorker {
  private config: WorkerConfig
  private isRunning = false
  private intervalId: NodeJS.Timeout | null = null
  
  constructor(config: WorkerConfig) {
    this.config = config
  }
  
  /**
   * Start the worker
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Worker already running')
      return
    }
    
    this.isRunning = true
    console.log(`🚀 Starting VC Research Worker`)
    console.log(`   Interval: ${this.config.intervalMinutes} minutes`)
    console.log(`   Batch size: ${this.config.batchSize} VCs per run`)
    console.log(`   Press Ctrl+C to stop\n`)
    
    // Run immediately
    this.runBatch()
    
    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runBatch()
    }, this.config.intervalMinutes * 60 * 1000)
  }
  
  /**
   * Stop the worker
   */
  stop() {
    if (!this.isRunning) {
      return
    }
    
    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log('\n🛑 Worker stopped')
  }
  
  /**
   * Run a batch of VC research
   */
  private async runBatch() {
    const startTime = Date.now()
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📅 ${new Date().toISOString()}`)
    console.log(`🔍 Starting research batch...`)
    
    try {
      // Get VCs that need research (prioritize unverified or old data)
      const vcsToResearch = await this.getVCsToResearch()
      
      if (vcsToResearch.length === 0) {
        console.log('✅ No VCs need research at this time')
        return
      }
      
      console.log(`   Found ${vcsToResearch.length} VCs to research`)
      
      let updated = 0
      let failed = 0
      
      // Research each VC
      for (const vc of vcsToResearch.slice(0, this.config.batchSize)) {
        try {
          const research = await researchVC(vc.firmName, 'full', { investorId: vc.id })
          if (research) {
            const success = await updateVCInDatabase(research, vc.id)
            if (success) {
              updated++
            } else {
              failed++
            }
          } else {
            failed++
          }

          // Rate limiting - wait between searches
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (error: any) {
          if (error instanceof ExaResearchQuotaBlockedError) {
            console.error(
              `   🛑 Exa quota/cooldown (${error.reason}) — stopping batch. Remaining VCs in this run were not updated.`,
            )
            break
          }
          console.error(`   ❌ Error processing ${vc.firmName}:`, error.message)
          failed++
        }
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`\n✅ Batch complete (${duration}s):`)
      console.log(`   ✅ Updated: ${updated}`)
      console.log(`   ❌ Failed: ${failed}`)
      console.log(`${'='.repeat(60)}\n`)
    } catch (error: any) {
      console.error('❌ Batch error:', error.message)
    }
  }
  
  /**
   * Get list of VCs that need research
   */
  private async getVCsToResearch(): Promise<Array<{ id: string; firmName: string }>> {
    const takeEligible = (rows: Array<{ id: string; firmName: string }>) =>
      rows.filter((r) => isInvestorEligibleForWorkers(r.firmName)).slice(0, this.config.batchSize)

    const overFetch = Math.min(300, Math.max(this.config.batchSize * 15, this.config.batchSize))

    // Priority 1: Priority VCs if specified
    if (this.config.priorityVCs && this.config.priorityVCs.length > 0) {
      const priorityVCs = await db.investor.findMany({
        where: {
          firmName: { in: this.config.priorityVCs },
          verified: true,
        },
        select: { id: true, firmName: true },
      })

      const eligible = takeEligible(priorityVCs)
      if (eligible.length > 0) {
        return eligible
      }
    }

    // Priority 2: Unverified VCs (over-fetch then filter — avoids idle sleeps on ineligible names)
    const unverified = await db.investor.findMany({
      where: { verified: false, isPublic: true },
      select: { id: true, firmName: true },
      take: overFetch,
      orderBy: investorStalestFirstOrderBy,
    })

    const eligibleUnverified = takeEligible(unverified)
    if (eligibleUnverified.length > 0) {
      return eligibleUnverified
    }

    // Priority 3: Verified VCs (re-enrichment / stale)
    const verified = await db.investor.findMany({
      where: { verified: true, isPublic: true },
      select: { id: true, firmName: true },
      take: overFetch,
      orderBy: investorStalestFirstOrderBy,
    })

    return takeEligible(verified)
  }
}

// Main execution
async function main() {
  const config: WorkerConfig = {
    intervalMinutes: parseInt(process.env.VC_RESEARCH_INTERVAL_MINUTES || '60'), // Default: 1 hour
    batchSize: parseInt(process.env.VC_RESEARCH_BATCH_SIZE || '10'), // Default: 10 VCs per run
    priorityVCs: [
      'Benchmark',
      'Accel',
      'First Round Capital',
      'Lightspeed Venture Partners',
      'Index Ventures',
      'Greylock Partners',
      'Bessemer Venture Partners',
      'General Catalyst',
      'NEA',
      'Insight Partners',
    ],
  }
  
  const worker = new VCResearchWorker(config)
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Received SIGINT, shutting down gracefully...')
    worker.stop()
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    console.log('\n\n⚠️  Received SIGTERM, shutting down gracefully...')
    worker.stop()
    process.exit(0)
  })
  
  // Start worker
  worker.start()
}

// Run if called directly
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { VCResearchWorker }
