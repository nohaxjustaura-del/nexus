/**
 * User-facing copy for Supabase Auth OTP / magic-link errors.
 * Rate limits are enforced by Supabase and cannot be disabled from app code.
 */
export function isSupabaseOtpRateLimited(raw: string | undefined): boolean {
  const msg = (raw || '').toLowerCase()
  return (
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('email rate limit') ||
    msg.includes('over_email_send_rate_limit')
  )
}

export function mapSupabaseOtpError(raw: string | undefined): string {
  if (isSupabaseOtpRateLimited(raw)) {
    return (
      'Too many sign-in emails were sent recently (Supabase limits this to stop spam). ' +
      'Wait 1–2 minutes and try again, or check your inbox and spam for a code or link we already sent. ' +
      'If you own this project: Supabase Dashboard → Authentication → increase rate limits or use custom SMTP.'
    )
  }
  return raw || 'Something went wrong. Please try again.'
}

/** JSON body + status for route handlers (non–user-not-found cases). */
export function otpErrorResponse(raw: string | undefined): { status: number; body: Record<string, unknown> } {
  return {
    status: 400,
    body: {
      error: mapSupabaseOtpError(raw),
    },
  }
}
