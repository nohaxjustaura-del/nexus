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
import { isAdminEmail } from '@/lib/constants'

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

    // Admin bypass: generate link, verify OTP or token_hash server-side, and return an
    // already-authenticated session so the admin never needs to check email.
    if (isAdminEmail(normalizedEmail)) {
      try {
        let { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email: normalizedEmail,
        })

        // If the auth user does not exist yet, create a confirmed user and retry (some projects return "not found").
        if (linkError) {
          const msg = (linkError.message || '').toLowerCase()
          const notFound =
            msg.includes('user not found') ||
            msg.includes('no user found') ||
            msg.includes('not found') ||
            (linkError as { status?: number }).status === 404
          if (notFound) {
            const { error: createErr } = await adminClient.auth.admin.createUser({
              email: normalizedEmail,
              email_confirm: true,
            })
            if (
              createErr &&
              !String(createErr.message || '')
                .toLowerCase()
                .includes('already been registered')
            ) {
              console.error('Admin bypass createUser error:', createErr)
              return NextResponse.json(
                {
                  error: 'Admin login failed',
                  ...(process.env.NODE_ENV === 'development'
                    ? { details: createErr.message, step: 'createUser' }
                    : {}),
                },
                { status: 500 }
              )
            }
            // Always retry generateLink after create (or "already registered") — first error may be transient.
            const retry = await adminClient.auth.admin.generateLink({
              type: 'magiclink',
              email: normalizedEmail,
            })
            linkData = retry.data
            linkError = retry.error
          }
        }

        if (linkError || !linkData) {
          console.error('Admin bypass generateLink error:', linkError)
          return NextResponse.json(
            {
              error: 'Admin login failed',
              ...(process.env.NODE_ENV === 'development'
                ? { details: linkError?.message, code: (linkError as { code?: string }).code }
                : {}),
            },
            { status: 500 }
          )
        }

        const props = linkData.properties
        const emailOtp = props?.email_otp?.trim() || ''
        const tokenHash =
          typeof props?.hashed_token === 'string' && props.hashed_token.length > 0
            ? props.hashed_token
            : null

        let verifiedUser = null as Awaited<ReturnType<typeof supabase.auth.verifyOtp>>['data']['user']
        let verifyError: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>['error'] | null = null

        // Prefer numeric OTP when present; Supabase may omit email_otp on some projects — use hashed_token.
        if (emailOtp) {
          for (const type of ['email', 'magiclink'] as const) {
            const { data, error } = await supabase.auth.verifyOtp({
              email: normalizedEmail,
              token: emailOtp,
              type,
            })
            if (!error && data.user) {
              verifiedUser = data.user
              verifyError = null
              break
            }
            verifyError = error
          }
        }

        if (!verifiedUser && tokenHash) {
          for (const type of ['email', 'magiclink', 'invite'] as const) {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type,
            })
            if (!error && data.user) {
              verifiedUser = data.user
              verifyError = null
              break
            }
            verifyError = error
          }
        }

        if (!verifiedUser) {
          console.error('Admin bypass verifyOtp error:', verifyError, {
            hadOtp: Boolean(emailOtp),
            hadTokenHash: Boolean(tokenHash),
          })
          return NextResponse.json(
            {
              error: 'Admin login verification failed',
              ...(process.env.NODE_ENV === 'development'
                ? {
                    details: verifyError?.message,
                    hadOtp: Boolean(emailOtp),
                    hadTokenHash: Boolean(tokenHash),
                  }
                : {}),
            },
            { status: 500 }
          )
        }

        const user = await syncPrismaUserFromAuth(verifiedUser)

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
        return NextResponse.json(
          {
            error: 'Admin login failed',
            ...(process.env.NODE_ENV === 'development'
              ? { details: adminErr?.message, step: 'exception' }
              : {}),
          },
          { status: 500 }
        )
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
    const tokenHash = linkData.properties?.hashed_token
    if (!magicLink) {
      console.error('Login generateLink: missing action_link', linkData.properties)
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
