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
  const errorParam = requestUrl.searchParams.get('error')
  const errorDesc = requestUrl.searchParams.get('error_description')
  const nextPath = requestUrl.searchParams.get('next') || '/founder/onboarding'
  const safeNext = nextPath.startsWith('/') ? nextPath : '/'

  // #region agent log
  fetch('http://127.0.0.1:7471/ingest/0f685c44-f6c8-4b99-b23e-84e0cc9d4f08',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2f72c9'},body:JSON.stringify({sessionId:'2f72c9',location:'app/api/auth/callback/route.ts:22',message:'callback GET hit',data:{hasCode:!!code,codePrefix:code?.slice(0,8)||null,errorParam,errorDesc,fullSearch:requestUrl.search,cookies:request.cookies.getAll().map(c=>c.name)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (!code) {
    return NextResponse.redirect(new URL('/verify?error=missing_code', request.url))
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
    verify.searchParams.set('next', safeNext)
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
