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
import { signupCallbackPath } from '@/lib/auth-flow-paths'
import { isExistingUserAuthError } from '@/lib/auth-user-exists-error'
import { sendSignupInviteViaSupabase } from '@/lib/supabase/auth-email-delivery'
import { AUTH_EMAIL_SPAM_DELIVERABILITY_HINT } from '@/lib/resend-user-messages'

export const dynamic = 'force-dynamic'

function hasResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

export async function POST(request: NextRequest) {
  try {
    const { email, userType } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const rawType = typeof userType === 'string' ? userType : 'founder'
    const supabaseUserType =
      rawType === 'investor' ? 'vc' : rawType === 'mentor' ? 'mentor' : 'founder'
    const afterAuthPath = signupCallbackPath(rawType)

    const siteUrl = getSiteUrl(request)
    const callbackUrl = `${siteUrl}/api/auth/callback?next=${encodeURIComponent(afterAuthPath)}`

    const adminClient = createSupabaseAdminClient()

    if (!hasResendConfigured()) {
      const invite = await sendSignupInviteViaSupabase({
        admin: adminClient,
        email: normalizedEmail,
        redirectTo: callbackUrl,
        userMetadata: { user_type: supabaseUserType },
      })
      if (!invite.ok) {
        if (isExistingUserAuthError({ message: invite.message, code: invite.code })) {
          return NextResponse.json(
            {
              error: 'An account with this email already exists.',
              existingAccount: true,
              message: 'Try logging in instead.',
            },
            { status: 400 }
          )
        }
        console.error('Signup inviteUserByEmail error:', invite.message, invite.code)
        return NextResponse.json(
          {
            error: 'Failed to send verification email. Check Supabase Auth email settings (SMTP) in the dashboard.',
            code: 'EMAIL_SEND_FAILED',
            details: invite.message,
          },
          { status: 500 }
        )
      }
      const { applyAuthCookies } = createSupabaseAuthRouteClient(request)
      const res = NextResponse.json({
        success: true,
        message: `Verification email sent via Supabase. Check your inbox (and spam) and tap the link to continue. ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`,
        email: normalizedEmail,
        deliveredBy: 'supabase' as const,
      })
      applyAuthCookies(res)
      return res
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: normalizedEmail,
      options: {
        redirectTo: callbackUrl,
        data: {
          user_type: supabaseUserType,
        },
      },
    })

    if (linkError) {
      if (isExistingUserAuthError(linkError)) {
        return NextResponse.json(
          {
            error: 'An account with this email already exists.',
            existingAccount: true,
            message: 'Try logging in instead.',
          },
          { status: 400 }
        )
      }

      console.error('Signup generateLink error:', linkError)
      return NextResponse.json(
        { error: 'Failed to create verification link. Please try again.' },
        { status: 500 }
      )
    }

    const tokenHash = linkData.properties?.hashed_token
    if (!tokenHash || typeof tokenHash !== 'string') {
      console.error('Signup generateLink: missing hashed_token', linkData.properties)
      return NextResponse.json(
        { error: 'Failed to generate sign-in link. Please try again.' },
        { status: 500 }
      )
    }

    const oneTapLink = `${siteUrl}/auth/link?token_hash=${encodeURIComponent(tokenHash)}&type=invite&next=${encodeURIComponent(afterAuthPath)}&email=${encodeURIComponent(normalizedEmail)}`

    const emailResult = await sendMagicLinkEmail(normalizedEmail, {
      magicLink: oneTapLink,
      isNew: true,
    })

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
      console.error('Signup email send failed:', resendHint || emailResult.error)
      return NextResponse.json(
        {
          error: 'Failed to send verification email. Please try again.',
          code: 'EMAIL_SEND_FAILED',
          ...(resendHint ? { details: resendHint } : {}),
        },
        { status: 500 }
      )
    }

    const { applyAuthCookies } = createSupabaseAuthRouteClient(request)

    const res = NextResponse.json({
      success: true,
      message: emailResult.devConsoleFallback
        ? RESEND_DEV_CONSOLE_FALLBACK_HINT
        : `Verification email sent. Check your inbox and tap the one-click link to continue. ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`,
      email: normalizedEmail,
      ...(emailResult.devConsoleFallback ? { devConsoleFallback: true } : {}),
    })
    applyAuthCookies(res)
    return res
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process signup',
        message: error?.message || 'Please try again.',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
