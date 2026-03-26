#!/usr/bin/env tsx

/**
 * START BACKGROUND WORKER
 * 
 * Starts the automated background worker for real-time data updates
 */

import { startWorker } from '../lib/background-worker'
import { logger } from '../lib/logger'

process.on('unhandledRejection', (reason) => {
  logger.error('SCRIPT', 'Unhandled promise rejection (worker keeps running):', reason)
})

process.on('uncaughtException', (err) => {
  logger.error('SCRIPT', 'Uncaught exception:', err)
})

async function main() {
  logger.info('SCRIPT', '🚀 Starting background worker...')

  const args = process.argv.slice(2)
  const runImmediately = !args.includes('--no-immediate')

  if (args.includes('--loop')) {
    process.env.WORKER_CONTINUOUS = 'true'
  }

  await startWorker(runImmediately)

  logger.info('SCRIPT', '✅ Worker started successfully')
  logger.info(
    'SCRIPT',
    '💡 Jobs repeat on a timer; VC research drains the queue batch-by-batch (resume via DB). Ctrl+C to stop.'
  )
}

main().catch((error) => {
  logger.error('SCRIPT', 'Failed to start worker:', error)
  process.exit(1)
})
