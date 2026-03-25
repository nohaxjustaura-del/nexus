import type { NextRequest } from 'next/server'

/**
 * Canonical site origin for redirects (magic links, emailRedirectTo).
 * Set NEXT_PUBLIC_URL in production (e.g. https://your-app.vercel.app).
 */
export function getSiteUrl(request?: NextRequest): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/\/$/, '')}` : '')

  if (fromEnv) return fromEnv

  if (request) {
    const host =
      request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    if (host) return `${proto}://${host}`
  }

  return 'http://localhost:3000'
}
