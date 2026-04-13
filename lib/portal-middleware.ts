import type { User } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

/** Align with lib/auth.ts syncPrismaUserFromAuth metadata normalization. */
export function portalRoleFromAuthUser(user: User): 'founder' | 'investor' {
  const metaType = (user.user_metadata?.user_type as string | undefined)?.toLowerCase()
  if (metaType === 'vc' || metaType === 'investor') return 'investor'
  return 'founder'
}

export function portalRedirectIfNeeded(
  request: NextRequest,
  user: User,
  baseResponse: NextResponse
): NextResponse | null {
  const pathname = request.nextUrl.pathname
  const role = portalRoleFromAuthUser(user)

  if (role === 'investor') {
    if (pathname.startsWith('/founder')) {
      const networkOk =
        pathname === '/founder/network' || pathname.startsWith('/founder/network/')
      if (!networkOk) {
        const url = request.nextUrl.clone()
        url.pathname = '/investor/dashboard'
        url.search = ''
        const redirectResponse = NextResponse.redirect(url)
        for (const c of baseResponse.cookies.getAll()) {
          redirectResponse.cookies.set(c.name, c.value)
        }
        return redirectResponse
      }
    }
    return null
  }

  if (pathname.startsWith('/vc') || pathname.startsWith('/investor')) {
    const url = request.nextUrl.clone()
    url.pathname = '/founder/dashboard'
    url.search = ''
    const redirectResponse = NextResponse.redirect(url)
    for (const c of baseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(c.name, c.value)
    }
    return redirectResponse
  }

  return null
}
