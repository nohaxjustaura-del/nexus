/** Where invite / first magic-link should land after Supabase auth. */
export function signupCallbackPath(userType: string | undefined): string {
  const t = (userType || 'founder').toLowerCase()
  if (t === 'investor') return '/vc/claim'
  return '/founder/onboarding'
}

const SAFE_AUTH_NEXT = new Set([
  '/founder/onboarding',
  '/vc/claim',
  '/founder/dashboard',
  '/vc/dashboard',
  '/vc/profile',
  '/founder/network',
])

const FOUNDER_AUTH_NEXT_EXACT = new Set(['/founder/onboarding', '/founder/dashboard'])
const INVESTOR_AUTH_NEXT_EXACT = new Set(['/vc/claim', '/vc/dashboard', '/vc/profile'])

/** Limit optional `next` from the client (e.g. verify resend). */
export function safeAuthNextPath(candidate: string | undefined, fallback: string): string {
  if (
    candidate &&
    candidate.startsWith('/') &&
    !candidate.startsWith('//') &&
    SAFE_AUTH_NEXT.has(candidate)
  ) {
    return candidate
  }
  return fallback
}

function isInvestorUserType(userType: string | undefined): boolean {
  const t = (userType || '').toLowerCase()
  return t === 'vc' || t === 'investor'
}

/**
 * Restrict post-auth `next` / `redirect` to paths allowed for this account portal
 * (founder/mentor vs investor).
 */
export function sanitizeAuthNextPathForUserType(
  candidate: string | undefined,
  userType: string | undefined,
  fallback: string
): string {
  if (!candidate?.trim()) return fallback
  const p = candidate.trim()
  if (!p.startsWith('/') || p.startsWith('//')) return fallback

  if (isInvestorUserType(userType)) {
    if (INVESTOR_AUTH_NEXT_EXACT.has(p)) return p
    if (p === '/founder/network' || p.startsWith('/founder/network/')) return p
    return fallback
  }

  if (p.startsWith('/vc/')) return fallback
  if (p === '/founder/network' || p.startsWith('/founder/network/')) return p
  if (FOUNDER_AUTH_NEXT_EXACT.has(p)) return p
  return fallback
}
