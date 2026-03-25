import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require verification
const publicRoutes = [
  '/',
  '/signup',
  '/login',
  '/verify',
  '/vc-guide',
  '/about',
  '/contact',
  '/cookies',
  '/disclaimer',
  '/dmca',
  '/security',
  '/privacy',
  '/terms',
  '/verification-notice',
  '/pricing',
  '/blog',
  '/vc/claim', // Allow VC claim page
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for API routes, static files, etc.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/admin')
  ) {
    return NextResponse.next()
  }
  
  // Allow public routes
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // Allow all routes (auth logic can be re-enabled when needed)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

