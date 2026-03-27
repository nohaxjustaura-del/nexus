import type { NextRequest } from 'next/server'

function isLocalUrl(url: string): boolean {
  return url.startsWith('http://localhost') || url.startsWith('http://127.')
}

/** True when the Host header is clearly this machine (local Next.js dev server). */
function isLocalDevHost(hostHeader: string): boolean {
  const h = hostHeader.split(',')[0].trim().toLowerCase()
  return (
    h === 'localhost' ||
    h.startsWith('localhost:') ||
    h === '127.0.0.1' ||
    h.startsWith('127.0.0.1:') ||
    h === '[::1]' ||
    h.startsWith('[::1]:')
  )
}

/**
 * When you run `next dev`, magic-link / OAuth callback URLs must use this origin —
 * even if NEXT_PUBLIC_URL still points at production (common when copying .env).
 */
function localOriginFromRequest(request: NextRequest): string | null {
  const raw =
    request.headers.get('x-forwarded-host')?.split(',')[0].trim() ||
    request.headers.get('host')?.split(',')[0].trim() ||
    ''
  if (!raw || !isLocalDevHost(raw)) return null
  const protoRaw = request.headers.get('x-forwarded-proto')?.split(',')[0].trim().toLowerCase()
  const proto = protoRaw === 'https' || protoRaw === 'http' ? protoRaw : 'http'
  return `${proto}://${raw}`
}

/**
 * Canonical site origin for redirects (magic links, emailRedirectTo).
 *
 * Priority:
 *   0. Local dev request  -  if Host is localhost / 127.0.0.1 / ::1, use that origin
 *      (stops sign-in from sending you to production when NEXT_PUBLIC_URL is still prod).
 *   Production (NODE_ENV !== 'development'):
 *   1. NEXT_PUBLIC_URL  -  if set to a non-localhost value
 *   2. NEXT_PUBLIC_APP_URL  -  same
 *   3. VERCEL_URL  -  deployment preview URL
 *   Development: skip (1)-(3) so copied Vercel env does not redirect off your machine.
 *   4. Request headers  -  x-forwarded-host / host
 *   5. NEXT_PUBLIC_* only if localhost-shaped
 *   6. http://127.0.0.1:$PORT (default 3000)
 *
 * In production: set NEXT_PUBLIC_URL=https://your-app.vercel.app in Vercel env vars.
 */
export function getSiteUrl(request?: NextRequest): string {
  if (request) {
    const local = localOriginFromRequest(request)
    if (local) return local
  }

  const isDev = process.env.NODE_ENV === 'development'
  const publicUrl = process.env.NEXT_PUBLIC_URL?.replace(/\/$/, '')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
    : ''

  if (!isDev) {
    // Production / preview: prefer explicit public URL, then Vercel deployment URL
    if (publicUrl && !isLocalUrl(publicUrl)) return publicUrl
    if (appUrl && !isLocalUrl(appUrl)) return appUrl
    if (vercelUrl) return vercelUrl
  }
  // Local dev: never use production or VERCEL_URL (avoids redirects to vercel.app when .env is copied from Vercel)

  // Use request host when available
  if (request) {
    const host =
      request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const protoRaw = request.headers.get('x-forwarded-proto')?.split(',')[0].trim().toLowerCase()
    const proto =
      protoRaw === 'https' || protoRaw === 'http'
        ? protoRaw
        : isLocalDevHost(host.split(',')[0].trim())
          ? 'http'
          : 'https'
    if (host) return `${proto}://${host}`
  }

  if (publicUrl && isLocalUrl(publicUrl)) return publicUrl
  if (appUrl && isLocalUrl(appUrl)) return appUrl

  const port = process.env.PORT || '3000'
  return `http://127.0.0.1:${port}`
}
