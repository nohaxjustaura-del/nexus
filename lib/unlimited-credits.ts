/**
 * Unlimited-credits allowlist (UNLIMITED_CREDITS_EMAIL).
 * Kept in a module that is never imported by client components so Next.js does not evaluate
 * process.env.* at client bundle build time with an empty env (which broke server checks when
 * constants.ts was shared with client imports).
 */
export function isUnlimitedCreditsEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const norm = email.trim().toLowerCase()
  const raw = (process.env.UNLIMITED_CREDITS_EMAIL ?? '').replace(/^\uFEFF/, '')
  for (const part of raw.split(',')) {
    const e = part.trim().toLowerCase()
    if (e.includes('@') && e === norm) return true
  }
  return false
}
