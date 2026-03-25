import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'
import { getSiteUrl } from '@/lib/site-url'
import { isSupabaseOtpRateLimited, otpErrorResponse } from '@/lib/supabase/otp-errors'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)

    const siteUrl = getSiteUrl(request)
    const emailRedirectTo = `${siteUrl}/api/auth/callback?next=${encodeURIComponent('/account')}`

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo,
      },
    })

    if (error) {
      console.error('Supabase login OTP error:', error)
      const notFound =
        error.message?.toLowerCase().includes('signups not allowed') ||
        error.message?.toLowerCase().includes('user not found')
      // #region agent log
      fetch('http://127.0.0.1:7464/ingest/8942f439-d0f1-43ea-9e6d-5d7995eef824', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '531446' },
        body: JSON.stringify({
          sessionId: '531446',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'app/api/auth/login/route.ts:error',
          message: 'login OTP error branch',
          data: {
            notFound,
            rateLimited: isSupabaseOtpRateLimited(error.message),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
      if (notFound) {
        return NextResponse.json(
          { error: 'No account found with this email. Please sign up first.' },
          { status: 404 }
        )
      }
      const { status, body } = otpErrorResponse(error.message)
      return NextResponse.json(body, { status })
    }

    const res = NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      email: normalizedEmail,
    })
    applyAuthCookies(res)
    return res
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process login',
        message: error?.message || 'Please try again.',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
