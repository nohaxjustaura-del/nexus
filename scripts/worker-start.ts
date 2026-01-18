#!/usr/bin/env tsx

/**
 * START BACKGROUND WORKER
 * 
 * Starts the automated background worker for real-time data updates
 */

import { startWorker } from '../lib/background-worker'
import { logger } from '../lib/logger'

async function main() {
  logger.info('SCRIPT', '🚀 Starting background worker...')
  
  const args = process.argv.slice(2)
  const runImmediately = !args.includes('--no-immediate')
  
  await startWorker(runImmediately)
  
  logger.info('SCRIPT', '✅ Worker started successfully')
  logger.info('SCRIPT', '💡 Press Ctrl+C to stop the worker')
  
  // Keep process alive
  process.on('SIGTERM', () => {
    logger.info('SCRIPT', '📥 Received SIGTERM, shutting down...')
    process.exit(0)
  })
  
  process.on('SIGINT', () => {
    logger.info('SCRIPT', '📥 Received SIGINT, shutting down...')
    process.exit(0)
  })
}

main().catch((error) => {
  logger.error('SCRIPT', 'Failed to start worker:', error)
  process.exit(1)
})
