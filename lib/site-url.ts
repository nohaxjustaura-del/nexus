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
 *   1. NEXT_PUBLIC_URL  -  if set to a non-localhost value (i.e. production domain)
 *   2. NEXT_PUBLIC_APP_URL  -  same rule
 *   3. VERCEL_URL  -  auto-set by Vercel for every deployment (server-side only)
 *   4. Request headers  -  x-forwarded-host / host (most accurate at runtime)
 *   5. NEXT_PUBLIC_URL / NEXT_PUBLIC_APP_URL even if localhost (local dev fallback)
 *   6. http://localhost:3000
 *
 * In local dev you may keep NEXT_PUBLIC_URL as production for client-side metadata;
 * API routes pass `request` into getSiteUrl so auth redirects still land on localhost.
 * In production: set NEXT_PUBLIC_URL=https://your-app.vercel.app in Vercel env vars.
 */
export function getSiteUrl(request?: NextRequest): string {
  if (request) {
    const local = localOriginFromRequest(request)
    if (local) return local
  }

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
