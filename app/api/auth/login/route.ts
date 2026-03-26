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

function debugLog(
  runId: string,
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  fetch('http://127.0.0.1:7464/ingest/8942f439-d0f1-43ea-9e6d-5d7995eef824', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '0f3c2c',
    },
    body: JSON.stringify({
      sessionId: '0f3c2c',
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
}

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
    // #region agent log
    debugLog(
      'pre-fix-domain-send',
      'H1,H2',
      'app/api/auth/login/route.ts:regular-login-pre-generate',
      'Prepared callback URL for magic link generation',
      {
        siteUrl,
        callbackUrl,
        hasResendKey: Boolean(process.env.RESEND_API_KEY),
        hasFromEnv: Boolean(process.env.RESEND_FROM_EMAIL),
        nodeEnv: process.env.NODE_ENV ?? null,
      }
    )
    // #endregion

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: callbackUrl,
      },
    })
    // #region agent log
    debugLog(
      'pre-fix-domain-send',
      'H3',
      'app/api/auth/login/route.ts:regular-login-generate-result',
      'Supabase generateLink returned',
      {
        hasLinkError: Boolean(linkError),
        linkErrorStatus: (linkError as any)?.status ?? null,
        linkErrorCode: (linkError as any)?.code ?? null,
        hasActionLink: Boolean(linkData?.properties?.action_link),
        otpLen: String(linkData?.properties?.email_otp ?? '').length,
      }
    )
    // #endregion

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
    const tokenHash = linkData.properties?.hashed_token
    if (!magicLink || !otp) {
      console.error('Login generateLink: missing action_link or email_otp', linkData.properties)
      return NextResponse.json(
        { error: 'Failed to generate sign-in link. Please try again.' },
        { status: 500 }
      )
    }

    const oneTapLink =
      tokenHash && typeof tokenHash === 'string'
        ? `${siteUrl}/auth/link?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent('/founder/onboarding')}&email=${encodeURIComponent(normalizedEmail)}`
        : magicLink

    const emailResult = await sendMagicLinkEmail(normalizedEmail, {
      magicLink: oneTapLink,
      otp,
      isNew: false,
    })
    // #region agent log
    debugLog(
      'pre-fix-domain-send',
      'H4,H5',
      'app/api/auth/login/route.ts:regular-login-send-result',
      'Magic-link send function returned',
      {
        sendSuccess: emailResult.success,
        resendTestingRecipientOnly:
          !emailResult.success ? Boolean(emailResult.resendTestingRecipientOnly) : false,
        usedDevConsoleFallback:
          emailResult.success ? Boolean((emailResult as any).devConsoleFallback) : false,
      }
    )
    // #endregion

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
          ...(resendHint ? { details: resendHint } : {}),
        },
        { status: 500 }
      )
    }

    const res = NextResponse.json({
      success: true,
      message: emailResult.devConsoleFallback
        ? RESEND_DEV_CONSOLE_FALLBACK_HINT
        : 'Sign-in link sent. Check your inbox and tap the one-click link to continue.',
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
