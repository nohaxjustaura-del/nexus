import Exa from 'exa-js'
import { NextResponse } from 'next/server'
import { getExaApiKeys, hasExaApiKey } from '@/lib/exa-keys'
import { getKeyDeadStatus, EXA_KEY_DEAD_MS } from '@/lib/exa-key-failover'

export const dynamic = 'force-dynamic'

/**
 * Tests EVERY Exa key individually and reports status for each.
 * GET /api/debug/exa
 *
 * Dev-only by default; set EXA_DEBUG_ALLOW_PRODUCTION=true to expose in prod.
 */
export async function GET() {
  const allowProd = process.env.EXA_DEBUG_ALLOW_PRODUCTION === 'true'
  if (process.env.NODE_ENV === 'production' && !allowProd) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  if (!hasExaApiKey()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: 'Set EXA_API_KEYS (or EXA_API_KEY) in .env.local, then restart npm run dev.',
    })
  }

  const keys = getExaApiKeys()

  const results = await Promise.all(
    keys.map(async (key, i) => {
      const label = `key_${i + 1}`
      const preview = `${key.slice(0, 8)}…`
      const t0 = Date.now()
      try {
        const exa = new Exa(key)
        const res = await exa.search('venture capital seed investment 2025', {
          type: 'auto',
          numResults: 1,
        })
        const ms = Date.now() - t0
        return {
          index: i + 1,
          label,
          preview,
          status: 'ok' as const,
          ms,
          resultCount: res.results?.length ?? 0,
          sampleTitle: res.results?.[0]?.title ?? null,
        }
      } catch (e: unknown) {
        const ms = Date.now() - t0
        const msg = e instanceof Error ? e.message : String(e)
        const isQuota = /402|403|429|quota|credit|limit|exceeded|payment|unauthor/i.test(msg)
        const isAuth = /401|unauthor|invalid.*key|api.*key/i.test(msg)
        return {
          index: i + 1,
          label,
          preview,
          status: isAuth ? ('auth_error' as const) : isQuota ? ('quota_exhausted' as const) : ('error' as const),
          ms,
          error: msg.slice(0, 200),
        }
      }
    }),
  )

  const working = results.filter((r) => r.status === 'ok')
  const quotaExhausted = results.filter((r) => r.status === 'quota_exhausted')
  const authErrors = results.filter((r) => r.status === 'auth_error')
  const otherErrors = results.filter((r) => r.status === 'error')

  const deadStatus = getKeyDeadStatus()

  return NextResponse.json({
    ok: working.length > 0,
    totalKeys: keys.length,
    keyDeadWindowMs: EXA_KEY_DEAD_MS,
    summary: {
      working: working.length,
      quota_exhausted: quotaExhausted.length,
      auth_error: authErrors.length,
      other_error: otherErrors.length,
    },
    recommendation:
      quotaExhausted.length > 0 || authErrors.length > 0
        ? `Key(s) ${[...quotaExhausted, ...authErrors].map((r) => r.index).join(', ')} are dead — they will be skipped automatically (round-robin). To remove the overhead entirely, delete them from EXA_API_KEYS in .env.local.`
        : 'All keys healthy — round-robin distributing load across all keys.',
    keys: results,
    currentDeadKeys: deadStatus
      .filter((s) => s.deadUntil !== null)
      .map((s) => ({
        index: s.index,
        preview: `${s.key.slice(0, 8)}…`,
        deadUntilMs: s.deadUntil,
        deadUntilISO: s.deadUntil ? new Date(s.deadUntil).toISOString() : null,
      })),
  })
}
