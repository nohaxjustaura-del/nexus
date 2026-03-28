#!/usr/bin/env tsx
/**
 * Run maintenance + growth workers in parallel (one terminal).
 *
 * Processes:
 *   1. scripts/worker-start.ts --loop — maintenance on existing investors (monthly thesis/profile windows, Exa pre-warm, embeddings on timer, validation, vc_directory sync)
 *   2. scripts/vc-supabase-ingest-worker.ts --discover — discovers new firm names via Exa, runs full VC research + ingest per candidate → Prisma Investor + Supabase vc_directory
 *
 * Do NOT also run npm run research-worker unless you want duplicate Exa/LLM load.
 *
 * Env (optional):
 *   WORKERS_DISCOVER_INTERVAL_MS   (default 30000 = 30s pause between discover passes; use 10000–60000 for ~10s–1m; min 10s enforced in ingest worker)
 *   WORKERS_DISCOVER_MAX_NEW       (default 20)
 *   WORKERS_DISCOVER_ROUNDS        (default 5)
 *   WORKERS_DISCOVER_PER_QUERY     (default 10)
 *   WORKERS_DISCOVER_QUERY_DELAY_MS (default 800)
 *   WORKERS_DISCOVER_DELAY_MS      (default 1000, delay after each firm ingest)
 *
 * Discover runs forever (loop) until you press Ctrl+C — same as before, only the default pause is shorter.
 */

import { spawn } from 'child_process'
import 'dotenv/config'
import { hasVcLlmConfigured } from '../lib/openrouter'

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

const dInterval = process.env.WORKERS_DISCOVER_INTERVAL_MS || '30000'
const dMaxNew = process.env.WORKERS_DISCOVER_MAX_NEW || '20'
const dRounds = process.env.WORKERS_DISCOVER_ROUNDS || '5'
const dPerQ = process.env.WORKERS_DISCOVER_PER_QUERY || '10'
const dQDelay = process.env.WORKERS_DISCOVER_QUERY_DELAY_MS || '800'
const dAfter = process.env.WORKERS_DISCOVER_DELAY_MS || '1000'

const intervalMs = Math.max(0, parseInt(dInterval, 10) || 30000)
const intervalSec = (intervalMs / 1000).toFixed(intervalMs % 1000 === 0 ? 0 : 1)

function logPipelineAndEnv() {
  const hasDb = !!process.env.DATABASE_URL?.trim()
  const hasExa = !!process.env.EXA_API_KEY?.trim()
  const hasLlm = hasVcLlmConfigured()
  const hasOr = !!process.env.OPENROUTER_API_KEY?.trim()
  const hasOllama =
    !!process.env.OLLAMA_BASE_URL?.trim() &&
    !!(process.env.OLLAMA_VC_MODEL || process.env.OLLAMA_MODEL)?.trim()
  const hasSb =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  console.log('')
  console.log('[workers] What runs:')
  console.log(
    '  • discover — Exa finds firm names not in DB → full VC research (Exa context + LLM extraction) → new/updated Prisma Investor + Supabase vc_directory',
  )
  console.log(
    '  • bg — existing DB investors only: thesis/profile refresh windows, Exa cache warm, embeddings, validation, Prisma→Supabase catch-up',
  )
  console.log('[workers] Config check:')
  console.log(`  • DATABASE_URL: ${hasDb ? 'set' : 'MISSING — Prisma will fail'}`)
  console.log(`  • EXA_API_KEY: ${hasExa ? 'set' : 'MISSING — discover + per-firm research retrieval need this'}`)
  console.log(
    `  • Investor LLM: OpenRouter=${hasOr ? 'set' : '—'}  Ollama=${hasOllama ? 'set' : '—'}  (need one; VC_LLM_PROVIDER=ollama forces local)`,
  )
  console.log(`  • LLM usable for research: ${hasLlm ? 'yes' : 'MISSING — ingest will not create/update investors'}`)
  console.log(`  • Supabase vc_directory: ${hasSb ? 'set' : 'incomplete — directory upserts may fail'}`)
  if (!hasExa || !hasLlm || !hasDb) {
    console.log('[workers] ⚠️  Fix missing env vars above or new firms will not be researched/saved.')
  }
  console.log('')
}

console.log('[workers] Starting: bg (worker-start --loop) + discover (vc-supabase-ingest-worker)')
logPipelineAndEnv()
console.log(
  `[workers] Discover env: interval=${dInterval}ms (~${intervalSec}s between passes) max-new=${dMaxNew} rounds=${dRounds} per-query=${dPerQ}`,
)
console.log(
  '[workers] Discover runs continuously until Ctrl+C (infinite loop). Use --once only if you run the ingest script directly.',
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
