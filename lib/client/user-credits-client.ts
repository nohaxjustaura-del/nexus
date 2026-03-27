/**
 * Coalesces concurrent GET /api/user/credits calls and short-TTL caches successes
 * so the nav CreditCounter and page-level hooks do not hammer the API on mount/HMR.
 */
import { normalizeUserCreditsApiPayload } from '@/lib/client/normalize-user-credits-api'

const TTL_MS = 2500

type CreditsPayload = Record<string, unknown>

let inFlight: Promise<{ ok: boolean; data: CreditsPayload }> | null = null
let lastSuccess: { at: number; data: CreditsPayload } | null = null

export function invalidateUserCreditsClientCache(): void {
  lastSuccess = null
}

export async function getUserCreditsClient(): Promise<{ ok: boolean; data: CreditsPayload }> {
  const now = Date.now()
  if (lastSuccess && now - lastSuccess.at < TTL_MS) {
    return { ok: true, data: lastSuccess.data }
  }

  if (!inFlight) {
    inFlight = (async () => {
      const res = await fetch('/api/user/credits', { credentials: 'include' })
      const raw = await res.json().catch(() => ({}))
      const normalized = normalizeUserCreditsApiPayload(raw)
      const data = { ...normalized } as unknown as CreditsPayload
      if (res.ok) {
        lastSuccess = { at: Date.now(), data }
      }
      return { ok: res.ok, data }
    })().finally(() => {
      inFlight = null
    })
  }

  return inFlight
}
