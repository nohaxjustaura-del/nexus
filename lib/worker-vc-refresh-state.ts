/**
 * Persisted schedule for VC thesis vs profile field refreshes.
 * Survives worker restarts: monthly windows stay aligned with last cycle completion.
 */

import * as fs from 'fs'
import * as path from 'path'

export const WORKER_VC_REFRESH_STATE_PATH = path.join(
  process.cwd(),
  'data',
  'worker-vc-refresh-state.json',
)

export type WorkerVcRefreshSegment = {
  /** ISO time — a new refresh cycle may start only when Date.now() >= this */
  nextCycleNotBefore: string
  /** When we last drained the queue (no more candidates in that cycle) */
  lastCycleCompletedAt: string | null
  /** Last batch finished (partial progress) */
  lastBatchAt: string | null
}

export type WorkerVcRefreshState = {
  version: 1
  thesis: WorkerVcRefreshSegment
  profile: WorkerVcRefreshSegment
}

export function getThesisRefreshIntervalMs(): number {
  const d = process.env.WORKER_THESIS_REFRESH_INTERVAL_MS?.trim()
  const n = d ? parseInt(d, 10) : NaN
  if (Number.isFinite(n) && n >= 60_000) return n
  return 30 * 24 * 60 * 60 * 1000
}

export function getProfileRefreshIntervalMs(): number {
  const d = process.env.WORKER_PROFILE_REFRESH_INTERVAL_MS?.trim()
  const n = d ? parseInt(d, 10) : NaN
  if (Number.isFinite(n) && n >= 60_000) return n
  return 30 * 24 * 60 * 60 * 1000
}

function defaultSegment(): WorkerVcRefreshSegment {
  return {
    nextCycleNotBefore: new Date(0).toISOString(),
    lastCycleCompletedAt: null,
    lastBatchAt: null,
  }
}

export function readWorkerVcRefreshState(): WorkerVcRefreshState {
  try {
    if (!fs.existsSync(WORKER_VC_REFRESH_STATE_PATH)) {
      return {
        version: 1,
        thesis: defaultSegment(),
        profile: defaultSegment(),
      }
    }
    const raw = fs.readFileSync(WORKER_VC_REFRESH_STATE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as WorkerVcRefreshState
    if (!parsed.thesis || !parsed.profile) throw new Error('invalid shape')
    return {
      version: 1,
      thesis: { ...defaultSegment(), ...parsed.thesis },
      profile: { ...defaultSegment(), ...parsed.profile },
    }
  } catch {
    return {
      version: 1,
      thesis: defaultSegment(),
      profile: defaultSegment(),
    }
  }
}

export function writeWorkerVcRefreshState(state: WorkerVcRefreshState): void {
  const dir = path.dirname(WORKER_VC_REFRESH_STATE_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(WORKER_VC_REFRESH_STATE_PATH, JSON.stringify(state, null, 2), 'utf8')
}

export function isThesisRefreshDue(state: WorkerVcRefreshState, now = Date.now()): boolean {
  const t = new Date(state.thesis.nextCycleNotBefore).getTime()
  return now >= t
}

export function isProfileRefreshDue(state: WorkerVcRefreshState, now = Date.now()): boolean {
  const t = new Date(state.profile.nextCycleNotBefore).getTime()
  return now >= t
}

/** Call when a thesis batch ran (had firms). */
export function markThesisBatchRan(state: WorkerVcRefreshState): void {
  state.thesis.lastBatchAt = new Date().toISOString()
  writeWorkerVcRefreshState(state)
}

/** Call when thesis queue was empty for this cycle — advance monthly gate. */
export function completeThesisRefreshCycle(state: WorkerVcRefreshState): void {
  const now = Date.now()
  state.thesis.lastCycleCompletedAt = new Date(now).toISOString()
  state.thesis.lastBatchAt = state.thesis.lastCycleCompletedAt
  state.thesis.nextCycleNotBefore = new Date(now + getThesisRefreshIntervalMs()).toISOString()
  writeWorkerVcRefreshState(state)
}

export function markProfileBatchRan(state: WorkerVcRefreshState): void {
  state.profile.lastBatchAt = new Date().toISOString()
  writeWorkerVcRefreshState(state)
}

export function completeProfileRefreshCycle(state: WorkerVcRefreshState): void {
  const now = Date.now()
  state.profile.lastCycleCompletedAt = new Date(now).toISOString()
  state.profile.lastBatchAt = state.profile.lastCycleCompletedAt
  state.profile.nextCycleNotBefore = new Date(now + getProfileRefreshIntervalMs()).toISOString()
  writeWorkerVcRefreshState(state)
}
