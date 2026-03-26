import type { NextRequest } from 'next/server'

function isLocalUrl(url: string): boolean {
  return url.startsWith('http://localhost') || url.startsWith('http://127.')
}

/**
 * Canonical site origin for redirects (magic links, emailRedirectTo).
 *
 * Priority:
 *   1. NEXT_PUBLIC_URL  -  if set to a non-localhost value (i.e. production domain)
 *   2. NEXT_PUBLIC_APP_URL  -  same rule
 *   3. VERCEL_URL  -  auto-set by Vercel for every deployment (server-side only)
 *   4. Request headers  -  x-forwarded-host / host (most accurate at runtime)
 *   5. NEXT_PUBLIC_URL / NEXT_PUBLIC_APP_URL even if localhost (local dev fallback)
 *   6. http://localhost:3000
 *
 * In local dev: set NEXT_PUBLIC_URL=http://localhost:3000 in .env.local.
 * In production: set NEXT_PUBLIC_URL=https://your-app.vercel.app in Vercel env vars
 *   (Project Settings → Environment Variables → Production).
 */
export function getSiteUrl(request?: NextRequest): string {
  const publicUrl = process.env.NEXT_PUBLIC_URL?.replace(/\/$/, '')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
    : ''

  // Prefer a non-localhost explicit URL first
  if (publicUrl && !isLocalUrl(publicUrl)) return publicUrl
  if (appUrl && !isLocalUrl(appUrl)) return appUrl

  // On Vercel (VERCEL_URL auto-set), use the actual deployment URL
  if (vercelUrl) return vercelUrl

  // Use request host when available (accurate for any environment)
  if (request) {
    const host =
      request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    if (host) return `${proto}://${host}`
  }

  // Local dev fallback
  if (publicUrl) return publicUrl
  if (appUrl) return appUrl
  return 'http://localhost:3000'
}
