#!/usr/bin/env tsx

/**
 * Start the CLI maintenance worker (lib/background-worker.ts).
 *
 * Schedules thesis/profile refresh windows, Exa pre-warm, embeddings, validation,
 * and Prisma→Supabase vc_directory sync. Use `--loop` for continuous timers
 * (npm run worker:start). This process is separate from the Next.js in-process worker UI.
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
    '💡 Jobs run on timers; VC research drains batches from the DB queue. Pair with npm run workers:all for discover ingest. Ctrl+C to stop.',
  )
}

main().catch((error) => {
  logger.error('SCRIPT', 'Failed to start worker:', error)
  process.exit(1)
})
