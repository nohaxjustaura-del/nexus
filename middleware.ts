import { type NextRequest } from 'next/server'
import { updateSupabaseSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSupabaseSession(request)
}

export const config = {
  matcher: [
    // Skip session refresh for static assets and well-known files (faster TTFB, less cookie churn).
    // Skip /api/auth/callback so middleware does not run getUser() before the OAuth/magic-link exchange sets cookies.
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|api/auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
