import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'
import { otpErrorResponse } from '@/lib/supabase/otp-errors'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)

    // No emailRedirectTo — forces 6-digit OTP code email.
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
      },
    })

    if (error) {
      const { status, body } = otpErrorResponse(error.message)
      return NextResponse.json(body, { status })
    }

    const res = NextResponse.json({
      success: true,
      message: 'New verification code sent to your email',
    })
    applyAuthCookies(res)
    return res
  } catch (error) {
    console.error('Resend code error:', error)
    return NextResponse.json({ error: 'Failed to resend code. Please try again.' }, { status: 500 })
  }
}
