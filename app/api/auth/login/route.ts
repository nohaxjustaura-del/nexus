import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { syncPrismaUserFromAuth } from '@/lib/auth'
import { getSiteUrl } from '@/lib/site-url'
import {
  RESEND_DEV_CONSOLE_FALLBACK_HINT,
  RESEND_TESTING_MODE_PUBLIC_MESSAGE,
  formatResendErrorMessage,
  sendMagicLinkEmail,
} from '@/lib/email'
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
    const adminClient = createSupabaseAdminClient()

    // Admin bypass: generate link, verify OTP server-side, and return an
    // already-authenticated session so the admin never needs to check email.
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      try {
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
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

    // Regular users: generate a magic link + OTP via Supabase Admin API
    // and send the email ourselves through Resend.
    const siteUrl = getSiteUrl(request)
    const callbackUrl = `${siteUrl}/api/auth/callback?next=${encodeURIComponent('/founder/onboarding')}`

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: callbackUrl,
      },
    })

    if (linkError) {
      console.error('Login generateLink error:', linkError)
      const notFound =
        linkError.message?.toLowerCase().includes('user not found') ||
        linkError.message?.toLowerCase().includes('invalid user') ||
        (linkError as any).status === 404
      if (notFound) {
        return NextResponse.json(
          { error: 'No account found with this email. Please sign up first.' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create sign-in link. Please try again.' },
        { status: 500 }
      )
    }

    const magicLink = linkData.properties?.action_link
    const otp = linkData.properties?.email_otp

    if (!magicLink || !otp) {
      console.error('Login generateLink: missing action_link or email_otp', linkData.properties)
      return NextResponse.json(
        { error: 'Failed to generate sign-in link. Please try again.' },
        { status: 500 }
      )
    }

    const emailResult = await sendMagicLinkEmail(normalizedEmail, { magicLink, otp, isNew: false })

    if (!emailResult.success) {
      if (emailResult.resendTestingRecipientOnly) {
        return NextResponse.json(
          {
            error: RESEND_TESTING_MODE_PUBLIC_MESSAGE,
            code: 'RESEND_TESTING_RECIPIENT',
          },
          { status: 503 }
        )
      }
      const resendHint = formatResendErrorMessage(emailResult.error)
      console.error('Login email send failed:', resendHint || emailResult.error)
      return NextResponse.json(
        {
          error: 'Failed to send sign-in email. Please try again.',
          code: 'EMAIL_SEND_FAILED',
          ...(process.env.NODE_ENV === 'development' && resendHint
            ? { details: resendHint }
            : {}),
        },
        { status: 500 }
      )
    }

    const res = NextResponse.json({
      success: true,
      message: emailResult.devConsoleFallback
        ? RESEND_DEV_CONSOLE_FALLBACK_HINT
        : 'Sign-in email sent. Check your inbox for a link or 8-digit code.',
      email: normalizedEmail,
      ...(emailResult.devConsoleFallback ? { devConsoleFallback: true } : {}),
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
