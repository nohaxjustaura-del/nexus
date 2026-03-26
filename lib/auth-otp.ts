/**
 * Build ordered OTP token candidates for Supabase verifyOtp (handles 6 vs 8 digit codes).
 */
export function otpVerificationCandidates(raw: string): string[] {
  const digits = raw.replace(/\D/g, '')
  const out: string[] = []
  const push = (s: string) => {
    if (s.length > 0 && !out.includes(s)) out.push(s)
  }
  push(raw.trim())
  push(digits)
  if (digits.length > 6) {
    push(digits.slice(0, 6))
    push(digits.slice(-6))
  }
  if (digits.length > 8) {
    push(digits.slice(0, 8))
    push(digits.slice(-8))
  }
  return out
}
