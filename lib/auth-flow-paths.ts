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
])

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
