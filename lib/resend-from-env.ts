/**
 * RESEND_FROM_EMAIL is often set from docs, OS env, or bad copies. Invalid values are ignored
 * so the app falls back to onboarding@resend.dev (same as omitting the variable).
 */

const DOC_PLACEHOLDER_DOMAINS = new Set(
  [
    'that-domain',
    'your-verified-domain.com',
    'yourdomain.com',
    'example.com',
    'localhost',
    'test.com',
  ].map((d) => d.toLowerCase())
)

/** Extract host part of the first email-like token in a From header string. */
export function parseDomainFromResendFromRaw(raw: string): string | null {
  let s = raw.trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  const angle = s.match(/<([^>]+)>/)
  const addr = (angle ? angle[1] : s).trim()
  const at = addr.lastIndexOf('@')
  if (at === -1) return null
  return addr.slice(at + 1).toLowerCase()
}

export function shouldIgnoreResendFromEnv(raw: string | undefined | null): boolean {
  const t = raw?.trim()
  if (!t) return false
  const domain = parseDomainFromResendFromRaw(t)
  if (!domain) return true
  if (DOC_PLACEHOLDER_DOMAINS.has(domain)) return true
  if (!domain.includes('.')) return true
  return false
}

export function getResendFromEmailRaw(): string | undefined {
  const t = process.env.RESEND_FROM_EMAIL?.trim()
  return t || undefined
}

/** Value actually used for Resend `from` normalization; undefined → use default onboarding@resend.dev */
export function getEffectiveResendFromEmailRaw(): string | undefined {
  const raw = getResendFromEmailRaw()
  if (!raw) return undefined
  if (shouldIgnoreResendFromEnv(raw)) return undefined
  return raw
}

export function describeResendFromEnvIgnoredReason(raw: string | undefined): string | undefined {
  if (!raw?.trim() || !shouldIgnoreResendFromEnv(raw)) return undefined
  const domain = parseDomainFromResendFromRaw(raw)
  if (domain && DOC_PLACEHOLDER_DOMAINS.has(domain)) {
    return `RESEND_FROM_EMAIL uses placeholder domain "${domain}". It is ignored; the app uses the default sender (onboarding@resend.dev). Remove it from System / User environment variables or .env if you did not mean to set this.`
  }
  if (domain && !domain.includes('.')) {
    return `RESEND_FROM_EMAIL domain "${domain}" is not a valid public domain. It is ignored; the app uses onboarding@resend.dev.`
  }
  return 'RESEND_FROM_EMAIL could not be parsed as a valid From address. It is ignored; the app uses onboarding@resend.dev.'
}
