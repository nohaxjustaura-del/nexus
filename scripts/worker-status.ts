#!/usr/bin/env tsx

/**
 * CHECK WORKER STATUS
 * 
 * Displays the current status of all background worker jobs
 */

import { getWorkerStatus } from '../lib/background-worker'
import { logger } from '../lib/logger'

function main() {
  logger.info('SCRIPT', '📊 Checking worker status...\n')
  
  const status = getWorkerStatus()
  
  if (!status.running) {
    logger.warn('SCRIPT', '⚠️  Worker is NOT running')
    logger.info('SCRIPT', '💡 Start the worker with: npm run worker:start')
    process.exit(1)
  }
  
  logger.info('SCRIPT', '✅ Worker is running\n')
  logger.info('SCRIPT', `📋 Jobs (${status.jobs.length}):\n`)
  
  status.jobs.forEach((job, index) => {
    const statusEmoji = job.status === 'running' ? '🏃' : job.status === 'error' ? '❌' : '💤'
    
    console.log(`${index + 1}. ${statusEmoji} ${job.name}`)
    console.log(`   Status: ${job.status}`)
    console.log(`   Last run: ${job.lastRun || 'Never'}`)
    console.log(`   Next run: ${job.nextRun || 'Not scheduled'}`)
    console.log(`   Errors: ${job.errorCount}`)
    console.log('')
  })
  
  logger.info('SCRIPT', '✅ Status check complete')
}

main()
