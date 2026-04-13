import { legacyNexusExtrasEnabled } from '@/lib/nexus-surface-flags'

/** Where invite / first magic-link should land after Supabase auth. */
export function signupCallbackPath(userType: string | undefined): string {
  const t = (userType || 'founder').toLowerCase()
  if (t === 'investor') return '/investor/onboarding'
  return '/founder/onboarding'
}

const SAFE_AUTH_NEXT_BASE = [
  '/founder/onboarding',
  '/vc/claim',
  '/founder/dashboard',
  '/vc/dashboard',
  '/vc/profile',
  '/investor/onboarding',
  '/investor/dashboard',
] as const

function safeAuthNextSet(): Set<string> {
  const s = new Set<string>(SAFE_AUTH_NEXT_BASE)
  if (legacyNexusExtrasEnabled()) {
    s.add('/founder/network')
  }
  return s
}

const FOUNDER_AUTH_NEXT_EXACT = new Set(['/founder/onboarding', '/founder/dashboard'])
const INVESTOR_AUTH_NEXT_EXACT = new Set(['/vc/claim', '/vc/dashboard', '/vc/profile', '/investor/onboarding', '/investor/dashboard'])

/** Limit optional `next` from the client (e.g. verify resend). */
export function safeAuthNextPath(candidate: string | undefined, fallback: string): string {
  if (candidate && candidate.startsWith('/') && !candidate.startsWith('//')) {
    const allowed = safeAuthNextSet()
    if (allowed.has(candidate)) return candidate
    const pathOnly = candidate.split('?')[0]?.split('#')[0] ?? ''
    if (pathOnly === '/pricing') return candidate
    if (
      legacyNexusExtrasEnabled() &&
      (candidate === '/founder/network' || candidate.startsWith('/founder/network/'))
    ) {
      return candidate
    }
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
    return fallback
  }

  if (p.startsWith('/vc/')) return fallback
  if (legacyNexusExtrasEnabled() && (p === '/founder/network' || p.startsWith('/founder/network/'))) return p
  if (FOUNDER_AUTH_NEXT_EXACT.has(p)) return p
  const pathOnly = p.split('?')[0]?.split('#')[0] ?? ''
  if (pathOnly === '/pricing') return p
  return fallback
}
