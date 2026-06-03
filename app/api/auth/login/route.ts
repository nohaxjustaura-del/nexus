import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSiteUrl } from '@/lib/site-url'
import {
  RESEND_DEV_CONSOLE_FALLBACK_HINT,
  RESEND_TESTING_MODE_PUBLIC_MESSAGE,
  formatResendErrorMessage,
  sendMagicLinkEmail,
} from '@/lib/email'
import { AUTH_EMAIL_SPAM_DELIVERABILITY_HINT } from '@/lib/resend-user-messages'
import { resolveUserApprovalAccess } from '@/lib/user-approval-access'
import { sendCursorDebugIngest } from '@/lib/cursor-debug-ingest'
import { sendMagicLinkViaSupabaseOtp } from '@/lib/supabase/auth-email-delivery'
import {
  isTestSuperAccountIdentifier,
  signInTestSuperAccount,
} from '@/lib/test-super-account'

export const dynamic = 'force-dynamic'

function hasResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const rawLogin = typeof email === 'string' ? email.trim() : ''

    if (!rawLogin) {
      return NextResponse.json({ error: 'Please provide an email address' }, { status: 400 })
    }

  if (isTestSuperAccountIdentifier(rawLogin)) {
    const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)
    return signInTestSuperAccount(request, supabase, applyAuthCookies)
  }

    if (!rawLogin.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = rawLogin.toLowerCase().trim()

    const { applyAuthCookies } = createSupabaseAuthRouteClient(request)
    const adminClient = createSupabaseAdminClient()

    // Admins use the same magic-link flow; resolveUserApprovalAccess auto-approves admin emails.
    // Rejected accounts cannot request a new sign-in link.
    try {
      const { approved, status } = await resolveUserApprovalAccess(normalizedEmail)
      if (!approved) {
        return NextResponse.json(
          {
            error:
              status === 'rejected'
                ? 'Your application was not approved. If you have questions, you can reply to our earlier email.'
                : 'Our team is still verifying your account. We’ll email you as soon as you’re approved.',
            code: status === 'rejected' ? 'ACCOUNT_REJECTED' : 'ACCOUNT_PENDING_APPROVAL',
            approvalStatus: status,
          },
          { status: 403 }
        )
      }
    } catch (approvalErr) {
      console.error('Login approval check error:', approvalErr)
      return NextResponse.json(
        { error: 'Unable to verify account status. Please try again.' },
        { status: 500 }
      )
    }

    // Regular users: magic link via Supabase Admin + Resend when configured; otherwise Supabase Auth email (signInWithOtp).
    const siteUrl = getSiteUrl(request)
    // Returning users should land on Hub (dashboard), not onboarding; signup still uses /founder/onboarding.
    const callbackUrl = `${siteUrl}/api/auth/callback?next=${encodeURIComponent('/founder/dashboard')}`
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!hasResendConfigured()) {
      if (!supabaseUrl || !anonKey) {
        return NextResponse.json(
          {
            error:
              'Email sign-in is not configured. Set RESEND_API_KEY or ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.',
            code: 'EMAIL_NOT_CONFIGURED',
          },
          { status: 503 }
        )
      }
      const otp = await sendMagicLinkViaSupabaseOtp({
        supabaseUrl,
        anonKey,
        email: normalizedEmail,
        emailRedirectTo: callbackUrl,
      })
      if (!otp.ok) {
        console.error('Login signInWithOtp error:', otp.message)
        return NextResponse.json(
          {
            error: 'Failed to send sign-in email. Check Supabase Auth email (SMTP) in the project dashboard.',
            code: 'EMAIL_SEND_FAILED',
            details: otp.message,
          },
          { status: 500 }
        )
      }
      const res = NextResponse.json({
        success: true,
        message: `Sign-in link sent via Supabase. Check your inbox (and spam) and tap the link to continue. ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`,
        email: normalizedEmail,
        deliveredBy: 'supabase' as const,
      })
      applyAuthCookies(res)
      return res
    }

    // #region agent log
    sendCursorDebugIngest({
      runId: 'pre-fix-domain-send',
      hypothesisId: 'H1,H2',
      location: 'app/api/auth/login/route.ts:regular-login-pre-generate',
      message: 'Prepared callback URL for magic link generation',
      data: {
        siteUrl,
        callbackUrl,
        hasResendKey: Boolean(process.env.RESEND_API_KEY?.trim()),
        hasFromEnv: Boolean(process.env.RESEND_FROM_EMAIL),
        nodeEnv: process.env.NODE_ENV ?? null,
      },
    })
    // #endregion

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: callbackUrl,
      },
    })
    // #region agent log
    sendCursorDebugIngest({
      runId: 'pre-fix-domain-send',
      hypothesisId: 'H3',
      location: 'app/api/auth/login/route.ts:regular-login-generate-result',
      message: 'Supabase generateLink returned',
      data: {
        hasLinkError: Boolean(linkError),
        linkErrorStatus: (linkError as any)?.status ?? null,
        linkErrorCode: (linkError as any)?.code ?? null,
        hasActionLink: Boolean(linkData?.properties?.action_link),
        otpLen: String(linkData?.properties?.email_otp ?? '').length,
      },
    })
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

    const tokenHash = linkData.properties?.hashed_token
    // Never email Supabase action_link: it redirects with ?code= and exchangeCodeForSession fails without a PKCE cookie.
    if (!tokenHash || typeof tokenHash !== 'string') {
      console.error('Login generateLink: missing hashed_token', linkData.properties)
      return NextResponse.json(
        { error: 'Failed to generate sign-in link. Please try again.' },
        { status: 500 }
      )
    }

    const oneTapLink = `${siteUrl}/auth/link?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent('/founder/dashboard')}&email=${encodeURIComponent(normalizedEmail)}`

    const emailResult = await sendMagicLinkEmail(normalizedEmail, {
      magicLink: oneTapLink,
      isNew: false,
    })
    // #region agent log
    sendCursorDebugIngest({
      runId: 'pre-fix-domain-send',
      hypothesisId: 'H4,H5',
      location: 'app/api/auth/login/route.ts:regular-login-send-result',
      message: 'Magic-link send function returned',
      data: {
        sendSuccess: emailResult.success,
        resendTestingRecipientOnly:
          !emailResult.success ? Boolean(emailResult.resendTestingRecipientOnly) : false,
        usedDevConsoleFallback:
          emailResult.success ? Boolean((emailResult as any).devConsoleFallback) : false,
      },
    })
    // #endregion

    if (!emailResult.success) {
      const resendHint = formatResendErrorMessage(emailResult.error)
      const resendTestingOnly = Boolean(emailResult.resendTestingRecipientOnly)
      if (resendTestingOnly) {
        console.warn(
          'Resend test mode blocked this recipient; trying Supabase sign-in email fallback.',
          resendHint || emailResult.error
        )
      } else {
        console.error('Login email send failed:', resendHint || emailResult.error)
      }
      if (supabaseUrl && anonKey) {
        const otp = await sendMagicLinkViaSupabaseOtp({
          supabaseUrl,
          anonKey,
          email: normalizedEmail,
          emailRedirectTo: callbackUrl,
        })
        if (otp.ok) {
          const res = NextResponse.json({
            success: true,
            message: resendTestingOnly
              ? `Your Resend project is in test mode (it cannot email arbitrary addresses yet), so we sent your sign-in link via Supabase instead. Check your inbox (and spam). ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`
              : `We could not send email through Resend, so we sent your sign-in link via Supabase instead. Check your inbox (and spam). ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`,
            email: normalizedEmail,
            deliveredBy: 'supabase' as const,
            resendError: resendHint || undefined,
          })
          applyAuthCookies(res)
          return res
        }
      }
      if (resendTestingOnly) {
        return NextResponse.json(
          {
            error: RESEND_TESTING_MODE_PUBLIC_MESSAGE,
            code: 'RESEND_TESTING_RECIPIENT',
          },
          { status: 503 }
        )
      }
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
        : `Sign-in link sent. Check your inbox and tap the one-click link to continue. ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`,
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
