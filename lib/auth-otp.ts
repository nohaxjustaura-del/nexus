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

/**
 * Supabase email OTP is 6 digits. We display 8 by appending a deterministic checksum.
 * The verify flow accepts the first 6 digits from this format.
 */
export function formatDisplayOtp(rawOtp: string): string {
  const digits = String(rawOtp || '').replace(/\D/g, '')
  if (digits.length !== 6) return digits
  const checksum = (Number(digits) % 97).toString().padStart(2, '0')
  return `${digits}${checksum}`
}
