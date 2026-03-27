#!/usr/bin/env tsx

/**
 * Print in-process worker job status (same source as GET /api/worker/status).
 * Only meaningful while this Node process has started the worker (e.g. Next.js dev with worker started, or rare embeds).
 * CLI maintenance: use logs from npm run worker:start / workers:all.
 */

import { getWorkerStatus } from '../lib/background-worker'
import { logger } from '../lib/logger'

function main() {
  logger.info('SCRIPT', '📊 Checking worker status...\n')
  
  const status = getWorkerStatus()
  
  if (!status.running) {
    logger.warn('SCRIPT', '⚠️  In-process worker is NOT running in this Node instance')
    logger.info('SCRIPT', '💡 Start CLI maintenance: npm run worker:start  |  maintenance + discover: npm run workers:all')
    process.exit(1)
  }
  
  logger.info('SCRIPT', '✅ Worker is running\n')
  logger.info('SCRIPT', `📋 Jobs (${status.jobs.length}):\n`)
  
  status.jobs.forEach((job, index) => {
    const statusEmoji = job.status === 'running' ? '🏃' : job.status === 'error' ? '❌' : '💤'
    
    console.log(`${index + 1}. ${statusEmoji} ${job.name}`)
    if (job.summary) console.log(`   ${job.summary}`)
    if (job.cadence) console.log(`   Schedule: ${job.cadence}`)
    console.log(`   Status: ${job.status}`)
    console.log(`   Last run: ${job.lastRun || 'Never'}`)
    console.log(`   Next run: ${job.nextRun || 'Not scheduled'}`)
    console.log(`   Errors: ${job.errorCount}`)
    console.log('')
  })
  
  logger.info('SCRIPT', '✅ Status check complete')
}

main()
