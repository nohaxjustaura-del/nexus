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
import { resolveUserApprovalAccess } from '@/lib/user-approval-access'
import { getPostLoginPath, resolvePostLoginRedirectFromRequestBody } from '@/lib/constants'
import { sendCursorDebugIngest } from '@/lib/cursor-debug-ingest'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, redirect: redirectBody, next: nextBody } = body as {
      email?: string
      redirect?: string
      next?: string
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { applyAuthCookies } = createSupabaseAuthRouteClient(request)
    const adminClient = createSupabaseAdminClient()

    // Admins use the same magic-link flow; resolveUserApprovalAccess auto-approves admin emails.
    // Everyone else: require approval before we send a sign-in link.
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

    // Regular users: generate a magic link + OTP via Supabase Admin API
    // and send the email ourselves through Resend.
    const siteUrl = getSiteUrl(request)
    const postLogin = resolvePostLoginRedirectFromRequestBody(redirectBody ?? nextBody)
    // Returning users land on post-login path (default Hub); signup still uses /founder/onboarding.
    const callbackUrl = `${siteUrl}/api/auth/callback?next=${encodeURIComponent(postLogin)}`
    // #region agent log
    sendCursorDebugIngest({
      runId: 'pre-fix-domain-send',
      hypothesisId: 'H1,H2',
      location: 'app/api/auth/login/route.ts:regular-login-pre-generate',
      message: 'Prepared callback URL for magic link generation',
      data: {
        siteUrl,
        callbackUrl,
        hasResendKey: Boolean(process.env.RESEND_API_KEY),
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

    const oneTapLink = `${siteUrl}/auth/link?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent(postLogin)}&email=${encodeURIComponent(normalizedEmail)}`

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
