#!/usr/bin/env tsx

/**
 * START BACKGROUND WORKER
 * 
 * Starts the automated background worker for real-time data updates
 */

import { startWorker, gracefulShutdown } from '../lib/background-worker'
import { logger } from '../lib/logger'

async function main() {
  logger.info('SCRIPT', '🚀 Starting background worker...')
  
  const args = process.argv.slice(2)
  const runImmediately = !args.includes('--no-immediate')
  
  await startWorker(runImmediately)
  
  logger.info('SCRIPT', '✅ Worker started successfully')
  logger.info('SCRIPT', '💡 Press Ctrl+C to stop the worker')
}

main().catch((error) => {
  logger.error('SCRIPT', 'Failed to start worker:', error)
  process.exit(1)
})
