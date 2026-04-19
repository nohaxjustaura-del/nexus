/**
 * Single in-process Exa quota / rate-limit cooldown for all pipelines
 * (VC research retrieval, discovery scrape, apply-contact passes).
 * One 402/429/etc. pauses every caller until the window ends.
 */

const TWENTY_FOUR_H = 24 * 60 * 60 * 1000

function parseCooldownMs(): number {
  const raw =
    process.env.EXA_RESEARCH_COOLDOWN_MS?.trim() ||
    process.env.EXA_DISCOVERY_COOLDOWN_MS?.trim() ||
    ''
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return 60 * 60 * 1000 // 1h default
  return Math.min(n, TWENTY_FOUR_H)
}

export const EXA_GLOBAL_COOLDOWN_MS = parseCooldownMs()

let nextAllowedAt: number | null = null

export function isExaGlobalCooldownActive(): boolean {
  return nextAllowedAt != null && Date.now() < nextAllowedAt
}

export function msUntilExaGlobalCooldownEnds(): number {
  if (!nextAllowedAt || Date.now() >= nextAllowedAt) return 0
  return nextAllowedAt - Date.now()
}

/** Call when Exa returns payment/quota/rate-limit style errors. */
export function triggerExaGlobalCooldown(): void {
  nextAllowedAt = Date.now() + EXA_GLOBAL_COOLDOWN_MS
}

export function exaQuotaErrorMessage(msg: string): boolean {
  return /402|403|429|quota|credit|credits?\s*limit|limit|exceeded|payment|unauthor|top\s*up|rate\s*limit/i.test(
    msg,
  )
}
