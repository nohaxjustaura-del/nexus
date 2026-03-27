import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { syncPrismaUserFromAuth } from '@/lib/auth'
import { otpErrorResponse } from '@/lib/supabase/otp-errors'
import { ADMIN_EMAIL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)

    // Admin bypass: skip OTP email and auto-authenticate
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      try {
        const adminSupabase = createSupabaseAdminClient()
        const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
          type: 'magiclink',
          email: normalizedEmail,
        })

        if (linkError || !linkData) {
          console.error('Admin bypass generateLink error:', linkError)
          return NextResponse.json({ error: 'Admin login failed' }, { status: 500 })
        }

        const otp = linkData.properties?.email_otp
        if (!otp) {
          return NextResponse.json({ error: 'Admin login failed: no OTP generated' }, { status: 500 })
        }

        const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
          email: normalizedEmail,
          token: otp,
          type: 'email',
        })

        if (verifyError || !verifyData.user) {
          console.error('Admin bypass verifyOtp error:', verifyError)
          return NextResponse.json({ error: 'Admin login verification failed' }, { status: 500 })
        }

        const user = await syncPrismaUserFromAuth(verifyData.user)

        const res = NextResponse.json({
          success: true,
          adminBypass: true,
          user: user
            ? { id: user.id, email: user.email, emailVerified: user.emailVerified, userType: user.userType }
            : null,
        })
        applyAuthCookies(res)
        return res
      } catch (adminErr: any) {
        console.error('Admin bypass error:', adminErr)
        return NextResponse.json({ error: 'Admin login failed' }, { status: 500 })
      }
    }

    // No emailRedirectTo — Supabase sends a 6-digit OTP code email instead of a
    // magic link. This avoids the PKCE code-verifier cookie issue where the
    // code verifier set during login isn't present when the link is clicked from
    // an email client.
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      console.error('Supabase login OTP error:', error)
      const notFound =
        error.message?.toLowerCase().includes('signups not allowed') ||
        error.message?.toLowerCase().includes('user not found')
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
