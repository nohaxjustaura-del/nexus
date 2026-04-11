import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { syncPrismaUserFromAuth } from '@/lib/auth'
import { sanitizeAuthNextPathForUserType } from '@/lib/auth-flow-paths'
import { resolveUserApprovalAccess } from '@/lib/user-approval-access'
import { sendCursorDebugIngest } from '@/lib/cursor-debug-ingest'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PendingCookie = { name: string; value: string; options: CookieOptions }

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
    const oauthError = requestUrl.searchParams.get('error')
    const oauthErrorDescription = requestUrl.searchParams.get('error_description')
    const code = requestUrl.searchParams.get('code')
    const tokenHash = requestUrl.searchParams.get('token_hash')
    const tokenType = requestUrl.searchParams.get('type') || 'email'
    const confirm = requestUrl.searchParams.get('confirm') || ''
    const nextPath = requestUrl.searchParams.get('next') || '/founder/dashboard'
    let safeNext =
      nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/founder/dashboard'
  // #region agent log
  sendCursorDebugIngest({
    runId: 'callback-domain-debug',
    hypothesisId: 'C1,C2',
    location: 'app/api/auth/callback/route.ts:entry',
    message: 'Callback query received',
    data: {
      hasCode: Boolean(code),
      hasTokenHash: Boolean(tokenHash),
      tokenType,
      safeNext,
      host: requestUrl.host,
      userAgentHead: ua.slice(0, 120),
      hasReferer: Boolean(referer),
      secFetchUser,
      secFetchSite,
    },
  })
  // #endregion

    if (oauthError) {
      const login = new URL('/login', request.url)
      login.searchParams.set('oauth_error', oauthError)
      if (oauthErrorDescription) {
        login.searchParams.set('oauth_error_description', oauthErrorDescription.slice(0, 400))
      }
      return NextResponse.redirect(login)
    }

    if (!code && !tokenHash) {
      const v = new URL('/verify', request.url)
      v.searchParams.set('error', 'missing_code')
      v.searchParams.set('redirect', safeNext)
      return NextResponse.redirect(v)
    }

    // Guard against email scanners consuming one-time token links.
    // Any direct token_hash callback must pass through /auth/link and require a manual user click.
    if (tokenHash && confirm !== '1') {
      const bridge = new URL('/auth/link', request.url)
      bridge.searchParams.set('token_hash', tokenHash)
      bridge.searchParams.set('type', tokenType)
      bridge.searchParams.set('next', safeNext)
      return NextResponse.redirect(bridge)
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
      // Admin generateLink magiclink tokens often verify as type "email"; invite tokens need "invite" first.
      const attemptedTypes =
        tokenType === 'magiclink'
          ? [...new Set(['email', 'magiclink', 'invite'] as const)]
          : [...new Set([tokenType, 'email', 'magiclink', 'invite'] as const)]
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
  sendCursorDebugIngest({
    runId: 'callback-domain-debug',
    hypothesisId: 'C3',
    location: 'app/api/auth/callback/route.ts:auth-result',
    message: 'Callback auth result',
    data: {
      usedCodeFlow: Boolean(code),
      usedTokenHashFlow: Boolean(tokenHash),
      callbackError: callbackError?.message ?? null,
      suspiciousScanner:
        !secFetchUser ||
        /bot|spider|crawler|prefetch|urlscan|proofpoint|barracuda|mimecast|outlook|safelinks/i.test(
          ua
        ),
    },
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
      const userEmail = user.email
      if (userEmail) {
        const { approved, status } = await resolveUserApprovalAccess(userEmail)
        if (!approved) {
          await supabase.auth.signOut()
          const login = new URL('/login', request.url)
          login.searchParams.set('pendingApproval', '1')
          if (status === 'rejected') login.searchParams.set('rejected', '1')
          const res = NextResponse.redirect(login)
          jar.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
          return res
        }
      }

      const meta = (user.user_metadata?.user_type as string | undefined)?.toLowerCase()
      const ut =
        meta === 'vc' || meta === 'investor' ? 'vc' : meta === 'mentor' ? 'mentor' : 'founder'
      const fallback = ut === 'vc' ? '/vc/dashboard' : '/founder/dashboard'
      safeNext = sanitizeAuthNextPathForUserType(safeNext, ut, fallback)
    }

    const res = NextResponse.redirect(new URL(safeNext, request.url))
    jar.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  } catch (error) {
    console.error('auth callback unexpected failure:', error)
    const verify = new URL('/verify', request.url)
    verify.searchParams.set('error', 'callback')
    verify.searchParams.set('redirect', '/founder/dashboard')
    return NextResponse.redirect(verify)
  }

}
