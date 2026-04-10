import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { portalRedirectIfNeeded } from '@/lib/portal-middleware'

/** Skip `getUser()` when no Supabase session cookies are present — avoids a network round-trip for anonymous traffic. */
function hasSupabaseSessionCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => {
    if (!name.startsWith('sb-')) return false
    return /auth|access-token|refresh-token/.test(name)
  })
}

export async function updateSupabaseSession(request: NextRequest) {
  const forward = {
    request: {
      headers: request.headers,
    },
  }

  if (!hasSupabaseSessionCookies(request)) {
    return NextResponse.next(forward)
  }

  let response = NextResponse.next(forward)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.cookies.set({
          name,
          value,
          ...options,
        })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        response.cookies.set({
          name,
          value: '',
          ...options,
        })
      },
    },
  })

  // Refreshes auth session when needed and writes updated cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const redirected = portalRedirectIfNeeded(request, user, response)
    if (redirected) return redirected
  }

  return response
}
