/**
 * Run an Exa SDK operation distributing load across ALL keys in getExaApiKeys().
 *
 * Key-selection strategy
 * ─────────────────────
 * Instead of always starting at key 1 and falling through, every new call begins at
 * the next position in a round-robin cursor.  This spreads requests across all live
 * keys so their individual QPS budgets (each ~10 req/s on the standard plan) are all
 * utilised rather than only the first non-exhausted key.
 *
 * Per-key dead window
 * ───────────────────
 * When a key returns a quota/auth/credits error it is marked "dead" for
 * EXA_KEY_DEAD_MS (default: same as EXA_RESEARCH_COOLDOWN_MS, i.e. 1 h).  Dead keys
 * are skipped in the rotation.  If EVERY key is dead the caller gets
 * `all_keys_quota` and the global cooldown fires.
 *
 * Fallback on any error
 * ─────────────────────
 * Any error (quota OR transient) advances to the next key so a single bad key never
 * blocks a request.
 */

import Exa from 'exa-js'
import {
  exaQuotaErrorMessage,
  isExaGlobalCooldownActive,
  triggerExaGlobalCooldown,
  EXA_GLOBAL_COOLDOWN_MS,
} from '@/lib/exa-global-cooldown'
import { getExaApiKeys } from '@/lib/exa-keys'

// ─── Per-key dead tracking ────────────────────────────────────────────────────

function parseKeyDeadMs(): number {
  const raw = process.env.EXA_KEY_DEAD_MS?.trim()
  const n = raw ? parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n > 0) return Math.min(n, 24 * 60 * 60 * 1000)
  return EXA_GLOBAL_COOLDOWN_MS // mirrors global cooldown by default (1 h)
}

/** How long a quota-exhausted key is skipped before being retried (ms). */
export const EXA_KEY_DEAD_MS = parseKeyDeadMs()

const keyDeadUntil = new Map<string, number>()

function isKeyDead(key: string): boolean {
  const until = keyDeadUntil.get(key)
  if (until == null) return false
  if (Date.now() >= until) {
    keyDeadUntil.delete(key)
    return false
  }
  return true
}

function markKeyDead(key: string): void {
  keyDeadUntil.set(key, Date.now() + EXA_KEY_DEAD_MS)
}

/** Expose for the debug route (/api/debug/exa). */
export function getKeyDeadStatus(): Array<{ index: number; key: string; deadUntil: number | null }> {
  const keys = getExaApiKeys()
  return keys.map((k, i) => ({
    index: i + 1,
    key: k,
    deadUntil: keyDeadUntil.get(k) ?? null,
  }))
}

// ─── Round-robin cursor ───────────────────────────────────────────────────────

// Node.js is single-threaded; advancing the cursor synchronously before the first
// await is race-free for async concurrent callers.
let rrCursor = 0

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExaKeyFailoverResult<T> =
  | { ok: true; data: T; keyIndex: number }
  | { ok: false; kind: 'no_keys' | 'cooldown' | 'all_keys_quota'; message?: string }
  | { ok: false; kind: 'non_quota_error'; message: string }

function shortMsg(msg: string, max = 140): string {
  const t = msg.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function runExaWithKeyFailover<T>(
  run: (exa: Exa, keyIndex: number) => Promise<T>,
): Promise<ExaKeyFailoverResult<T>> {
  const keys = getExaApiKeys()
  if (keys.length === 0) return { ok: false, kind: 'no_keys' }
  if (isExaGlobalCooldownActive()) return { ok: false, kind: 'cooldown' }

  // Build the ordered attempt sequence starting from the round-robin cursor.
  // Dead keys are moved to the END so they still act as fallback if all live
  // keys also fail (avoids false `all_keys_quota` when transient errors occur).
  const startAt = rrCursor % keys.length
  rrCursor = (rrCursor + 1) % keys.length // advance before any await

  const liveIndices: number[] = []
  const deadIndices: number[] = []
  for (let offset = 0; offset < keys.length; offset++) {
    const idx = (startAt + offset) % keys.length
    if (isKeyDead(keys[idx]!)) {
      deadIndices.push(idx)
    } else {
      liveIndices.push(idx)
    }
  }
  const attemptOrder = [...liveIndices, ...deadIndices]

  let lastMsg = ''
  let everyFailureQuotaLike = true

  for (let attempt = 0; attempt < attemptOrder.length; attempt++) {
    const keyIdx = attemptOrder[attempt]!
    const key = keys[keyIdx]!
    const exa = new Exa(key)

    try {
      const data = await run(exa, keyIdx)
      return { ok: true, data, keyIndex: keyIdx }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      lastMsg = msg
      const isQuota = exaQuotaErrorMessage(msg)

      if (!isQuota) everyFailureQuotaLike = false

      const isLastAttempt = attempt >= attemptOrder.length - 1
      if (!isLastAttempt) {
        const tag = isQuota ? 'quota/rate-limit' : 'failed'
        if (isQuota) markKeyDead(key)
        console.warn(
          `[EXA] Key ${keyIdx + 1}/${keys.length} ${tag} — trying next key: ${shortMsg(msg)}`,
        )
        continue
      }

      // Last key also failed
      if (isQuota) markKeyDead(key)

      if (everyFailureQuotaLike) {
        console.warn(
          `[EXA] All ${keys.length} key(s) exhausted (quota/auth/rate-limit) — global Exa cooldown.`,
        )
        triggerExaGlobalCooldown()
        return { ok: false, kind: 'all_keys_quota', message: lastMsg }
      }

      console.warn(`[EXA] All ${keys.length} key(s) exhausted — ${shortMsg(lastMsg, 200)}`)
      return { ok: false, kind: 'non_quota_error', message: lastMsg }
    }
  }

  return { ok: false, kind: 'non_quota_error', message: lastMsg || 'Exa failover: no result' }
}
