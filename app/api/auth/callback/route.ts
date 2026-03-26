import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { syncPrismaUserFromAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PendingCookie = { name: string; value: string; options: CookieOptions }

/**
 * Supabase PKCE redirect target. Prefer this path in Redirect URLs (same family as /api/auth/*).
 * Add: {NEXT_PUBLIC_URL}/api/auth/callback
 */
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    return NextResponse.redirect(new URL('/login?error=auth_config', request.url))
  }

  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextPath = requestUrl.searchParams.get('next') || '/founder/onboarding'
  const safeNext = nextPath.startsWith('/') ? nextPath : '/'

  if (!code) {
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

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('auth callback exchangeCodeForSession:', error.message)
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
}
