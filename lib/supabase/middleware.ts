import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { portalRedirectIfNeeded } from '@/lib/portal-middleware'
import { isAdminEmail } from '@/lib/constants'

/** Skip `getUser()` when no Supabase session cookies are present — avoids a network round-trip for anonymous traffic. */
function hasSupabaseSessionCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => {
    if (!name.startsWith('sb-')) return false
    return /auth|access-token|refresh-token/.test(name)
  })
}

/** Admins may preview app portals; paths outside this set still route to the admin hub. */
function adminBypassAllowed(pathname: string): boolean {
  if (pathname.startsWith('/admin')) return true
  const portalPrefixes = ['/founder', '/investor', '/mentor', '/vc', '/account'] as const
  return portalPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
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
    if (isAdminEmail(user.email) && !adminBypassAllowed(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      url.search = ''
      const redirectResponse = NextResponse.redirect(url)
      for (const c of response.cookies.getAll()) {
        redirectResponse.cookies.set(c.name, c.value)
      }
      return redirectResponse
    }

    if (!isAdminEmail(user.email)) {
      const redirected = portalRedirectIfNeeded(request, user, response)
      if (redirected) return redirected
    }
  }

  return response
}
