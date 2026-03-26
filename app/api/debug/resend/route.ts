import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Smoke-test Resend configuration (no email sent). Dev-focused.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const key = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()

  if (!key) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: 'Set RESEND_API_KEY in .env.local, then restart the dev server.',
    })
  }

  const hints: string[] = []
  if (!from) {
    hints.push(
      'Set RESEND_FROM_EMAIL="NEXUS <noreply@YOUR_REAL_DOMAIN.com>". The domain must match what you verified in Resend.',
    )
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    hasFromEmail: Boolean(from),
    hints,
  })
}
