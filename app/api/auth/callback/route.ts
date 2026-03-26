import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { syncPrismaUserFromAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PendingCookie = { name: string; value: string; options: CookieOptions }

function debugLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  fetch('http://127.0.0.1:7464/ingest/8942f439-d0f1-43ea-9e6d-5d7995eef824', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '0f3c2c',
    },
    body: JSON.stringify({
      sessionId: '0f3c2c',
      runId: 'callback-domain-debug',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
}

/**
 * Supabase PKCE redirect target. Prefer this path in Redirect URLs (same family as /api/auth/*).
 * Add: {NEXT_PUBLIC_URL}/api/auth/callback
 */
export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      return NextResponse.redirect(new URL('/login?error=auth_config', request.url))
    }

    const requestUrl = new URL(request.url)
    const ua = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    const secFetchUser = request.headers.get('sec-fetch-user') || ''
    const secFetchSite = request.headers.get('sec-fetch-site') || ''
    const code = requestUrl.searchParams.get('code')
    const tokenHash = requestUrl.searchParams.get('token_hash')
    const tokenType = requestUrl.searchParams.get('type') || 'email'
    const nextPath = requestUrl.searchParams.get('next') || '/founder/onboarding'
    const safeNext = nextPath.startsWith('/') ? nextPath : '/'
  // #region agent log
  debugLog('C1,C2', 'app/api/auth/callback/route.ts:entry', 'Callback query received', {
    hasCode: Boolean(code),
    hasTokenHash: Boolean(tokenHash),
    tokenType,
    safeNext,
    host: requestUrl.host,
    userAgentHead: ua.slice(0, 120),
    hasReferer: Boolean(referer),
    secFetchUser,
    secFetchSite,
  })
  // #endregion

    if (!code && !tokenHash) {
      const v = new URL('/verify', request.url)
      v.searchParams.set('error', 'missing_code')
      v.searchParams.set('redirect', safeNext)
      return NextResponse.redirect(v)
    }

    const jar: PendingCookie[] = []

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: PendingCookie[]) {
          cookiesToSet.forEach((c) => jar.push(c))
        },
      },
    })

    let callbackError: { message?: string } | null = null

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) callbackError = error
    } else if (tokenHash) {
      // Supports direct one-tap links with token_hash generated from Admin API.
      const attemptedTypes = Array.from(new Set([tokenType, 'email', 'magiclink', 'invite']))
      for (const t of attemptedTypes) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: t as 'email' | 'magiclink' | 'invite',
        })
        if (!error) {
          callbackError = null
          break
        }
        callbackError = error
      }
    }
  // #region agent log
  debugLog('C3', 'app/api/auth/callback/route.ts:auth-result', 'Callback auth result', {
    usedCodeFlow: Boolean(code),
    usedTokenHashFlow: Boolean(tokenHash),
    callbackError: callbackError?.message ?? null,
    suspiciousScanner:
      !secFetchUser ||
      /bot|spider|crawler|prefetch|urlscan|proofpoint|barracuda|mimecast|outlook|safelinks/i.test(
        ua
      ),
  })
  // #endregion

    if (callbackError) {
      console.error('auth callback failure:', callbackError.message)
      const verify = new URL('/verify', request.url)
      verify.searchParams.set('error', 'callback')
      verify.searchParams.set('redirect', safeNext)
      return NextResponse.redirect(verify)
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      await syncPrismaUserFromAuth(user)
    }

    const res = NextResponse.redirect(new URL(safeNext, request.url))
    jar.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  } catch (error) {
    console.error('auth callback unexpected failure:', error)
    const verify = new URL('/verify', request.url)
    verify.searchParams.set('error', 'callback')
    verify.searchParams.set('redirect', '/founder/onboarding')
    return NextResponse.redirect(verify)
  }
}
