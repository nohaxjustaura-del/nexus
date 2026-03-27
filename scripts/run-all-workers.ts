#!/usr/bin/env tsx
/**
 * Run maintenance + growth workers in parallel (one terminal).
 *
 * Processes:
 *   1. scripts/worker-start.ts --loop  — VC research, Exa enrichment pre-warm, validation, embeddings on timer
 *   2. scripts/vc-supabase-ingest-worker.ts --discover — dual-Exa discovery → Prisma (isPublic+discoverable) + Supabase vc_directory per firm; bg worker also runs periodic vc_directory catch-up for recent rows
 *
 * Do NOT also run npm run research-worker unless you want duplicate Exa/OpenRouter load.
 *
 * Env (optional):
 *   WORKERS_DISCOVER_INTERVAL_MS   (default 1800000 = 30m)
 *   WORKERS_DISCOVER_MAX_NEW       (default 20)
 *   WORKERS_DISCOVER_ROUNDS        (default 5)
 *   WORKERS_DISCOVER_PER_QUERY     (default 10)
 *   WORKERS_DISCOVER_QUERY_DELAY_MS (default 1200)
 *   WORKERS_DISCOVER_DELAY_MS      (default 2500, delay after each firm ingest)
 */

import { spawn } from 'child_process'

const children: ReturnType<typeof spawn>[] = []

function prefixLines(stream: NodeJS.ReadableStream | null, label: string, isErr: boolean) {
  if (!stream) return
  const dest = isErr ? process.stderr : process.stdout
  const prefix = `[${label}] `
  let buf = ''
  stream.on('data', (chunk: Buffer | string) => {
    buf += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    const parts = buf.split(/\r?\n/)
    buf = parts.pop() ?? ''
    for (const line of parts) {
      if (line.length) dest.write(prefix + line + '\n')
      else dest.write('\n')
    }
  })
  stream.on('end', () => {
    if (buf.length) dest.write(prefix + buf + '\n')
  })
}

function spawnTsx(label: string, args: string[]) {
  const win = process.platform === 'win32'
  const child = spawn(win ? 'npx.cmd' : 'npx', ['tsx', ...args], {
    cwd: process.cwd(),
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: win,
    env: { ...process.env },
  })
  prefixLines(child.stdout, label, false)
  prefixLines(child.stderr, label, true)
  children.push(child)
  child.on('exit', (code, signal) => {
    const why = signal ? `signal ${signal}` : `code ${code}`
    process.stderr.write(`[${label}] process exited (${why})\n`)
  })
}

function shutdown() {
  for (const c of children) {
    if (!c.killed) c.kill('SIGTERM')
  }
}

process.on('SIGINT', () => {
  console.log('\n[workers] SIGINT — stopping children…')
  shutdown()
  setTimeout(() => process.exit(0), 500).unref()
})

process.on('SIGTERM', () => {
  shutdown()
  setTimeout(() => process.exit(0), 500).unref()
})

const dInterval = process.env.WORKERS_DISCOVER_INTERVAL_MS || '1800000'
const dMaxNew = process.env.WORKERS_DISCOVER_MAX_NEW || '20'
const dRounds = process.env.WORKERS_DISCOVER_ROUNDS || '5'
const dPerQ = process.env.WORKERS_DISCOVER_PER_QUERY || '10'
const dQDelay = process.env.WORKERS_DISCOVER_QUERY_DELAY_MS || '1200'
const dAfter = process.env.WORKERS_DISCOVER_DELAY_MS || '2500'

console.log('[workers] Starting: bg (worker-start --loop) + discover (vc-supabase-ingest-worker)')
console.log(
  `[workers] Discover env: interval=${dInterval}ms max-new=${dMaxNew} rounds=${dRounds} per-query=${dPerQ}`,
)

spawnTsx('bg', ['scripts/worker-start.ts', '--loop'])
spawnTsx('discover', [
  'scripts/vc-supabase-ingest-worker.ts',
  '--discover',
  '--interval-ms',
  dInterval,
  '--max-new',
  dMaxNew,
  '--discover-rounds',
  dRounds,
  '--discover-per-query',
  dPerQ,
  '--discover-query-delay-ms',
  dQDelay,
  '--delay-ms',
  dAfter,
])
