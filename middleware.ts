import { NextResponse, type NextRequest } from 'next/server'
import { updateSupabaseSession } from '@/lib/supabase/middleware'
import { nexusLegacyApiBlocked, nexusLegacyRedirectTarget } from '@/lib/nexus-surface-flags'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const legacyRedirect = nexusLegacyRedirectTarget(pathname)
  if (legacyRedirect) {
    return NextResponse.redirect(new URL(legacyRedirect, request.url))
  }
  if (nexusLegacyApiBlocked(pathname)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return updateSupabaseSession(request)
}

export const config = {
  matcher: [
    // Keep middleware on app/page routes, but skip all APIs except legacy blocked paths.
    '/((?!api/|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    '/api/analyze-resume/:path*',
    '/api/yc-insider/:path*',
  ],
}
