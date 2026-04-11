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
import { db } from '@/lib/db'
import { resolveUserApprovalAccess } from '@/lib/user-approval-access'
import { safeAuthNextPath, sanitizeAuthNextPathForUserType } from '@/lib/auth-flow-paths'
import { sendMagicLinkViaSupabaseOtp, sendSignupInviteViaSupabase } from '@/lib/supabase/auth-email-delivery'
import { AUTH_EMAIL_SPAM_DELIVERABILITY_HINT } from '@/lib/resend-user-messages'

export const dynamic = 'force-dynamic'

function hasResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

export async function POST(request: NextRequest) {
  try {
    const { email, next: nextFromBody } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Determine whether the user already exists in Supabase so we pick the
    // correct link type. Use the Prisma User table as a fast proxy.
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })

    const afterAuthPath = existingUser
      ? sanitizeAuthNextPathForUserType(
          typeof nextFromBody === 'string' ? nextFromBody : undefined,
          existingUser.userType,
          existingUser.userType === 'vc' || existingUser.userType === 'investor'
            ? '/vc/claim'
            : '/founder/onboarding'
        )
      : safeAuthNextPath(
          typeof nextFromBody === 'string' ? nextFromBody : undefined,
          '/founder/onboarding'
        )

    const siteUrl = getSiteUrl(request)
    const callbackUrl = `${siteUrl}/api/auth/callback?next=${encodeURIComponent(afterAuthPath)}`

    const adminClient = createSupabaseAdminClient()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (existingUser) {
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
    }

    const { applyAuthCookies } = createSupabaseAuthRouteClient(request)

    async function respondSupabaseSuccess(message: string) {
      const res = NextResponse.json({
        success: true,
        message,
        deliveredBy: 'supabase' as const,
      })
      applyAuthCookies(res)
      return res
    }

    if (!hasResendConfigured()) {
      if (!supabaseUrl || !anonKey) {
        return NextResponse.json(
          {
            error:
              'Email is not configured. Set RESEND_API_KEY or ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.',
            code: 'EMAIL_NOT_CONFIGURED',
          },
          { status: 503 }
        )
      }
      if (existingUser) {
        const otp = await sendMagicLinkViaSupabaseOtp({
          supabaseUrl,
          anonKey,
          email: normalizedEmail,
          emailRedirectTo: callbackUrl,
        })
        if (!otp.ok) {
          return NextResponse.json(
            {
              error: 'Failed to send sign-in email. Check Supabase Auth email settings in the dashboard.',
              code: 'EMAIL_SEND_FAILED',
              details: otp.message,
            },
            { status: 500 }
          )
        }
        return respondSupabaseSuccess(
          `New sign-in link sent via Supabase. Check your inbox (and spam) and tap the link to continue. ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`
        )
      }
      const invite = await sendSignupInviteViaSupabase({
        admin: adminClient,
        email: normalizedEmail,
        redirectTo: callbackUrl,
        userMetadata: { user_type: 'founder' },
      })
      if (!invite.ok) {
        return NextResponse.json(
          {
            error: 'Failed to send verification email. Check Supabase Auth email settings in the dashboard.',
            code: 'EMAIL_SEND_FAILED',
            details: invite.message,
          },
          { status: 500 }
        )
      }
      return respondSupabaseSuccess(
        `New verification link sent via Supabase. Check your inbox (and spam) and tap the link to continue. ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`
      )
    }

    const generateResult = existingUser
      ? await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email: normalizedEmail,
          options: { redirectTo: callbackUrl },
        })
      : await adminClient.auth.admin.generateLink({
          type: 'invite',
          email: normalizedEmail,
          options: { redirectTo: callbackUrl },
        })

    const { data: linkData, error: linkError } = generateResult

    if (linkError) {
      console.error('Resend-code generateLink error:', linkError)
      return NextResponse.json(
        { error: 'Failed to generate a new sign-in link. Please try again.' },
        { status: 500 }
      )
    }

    const tokenHash = linkData.properties?.hashed_token
    const linkType = existingUser ? 'magiclink' : 'invite'
    if (!tokenHash || typeof tokenHash !== 'string') {
      console.error('Resend-code generateLink: missing hashed_token', linkData.properties)
      return NextResponse.json(
        { error: 'Failed to generate sign-in link. Please try again.' },
        { status: 500 }
      )
    }

    const oneTapLink = `${siteUrl}/auth/link?token_hash=${encodeURIComponent(tokenHash)}&type=${linkType}&next=${encodeURIComponent(afterAuthPath)}&email=${encodeURIComponent(normalizedEmail)}`

    const emailResult = await sendMagicLinkEmail(normalizedEmail, {
      magicLink: oneTapLink,
      isNew: !existingUser,
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
      console.error('Resend-code email send failed:', resendHint || emailResult.error)
      if (supabaseUrl && anonKey) {
        if (existingUser) {
          const otp = await sendMagicLinkViaSupabaseOtp({
            supabaseUrl,
            anonKey,
            email: normalizedEmail,
            emailRedirectTo: callbackUrl,
          })
          if (otp.ok) {
            return respondSupabaseSuccess(
              `We could not send through Resend, so we sent a new sign-in link via Supabase. Check your inbox (and spam). ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`
            )
          }
        } else {
          const invite = await sendSignupInviteViaSupabase({
            admin: adminClient,
            email: normalizedEmail,
            redirectTo: callbackUrl,
            userMetadata: { user_type: 'founder' },
          })
          if (invite.ok) {
            return respondSupabaseSuccess(
              `We could not send through Resend, so we sent a new verification link via Supabase. Check your inbox (and spam). ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`
            )
          }
        }
      }
      return NextResponse.json(
        {
          error: 'Failed to send email. Please try again.',
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
        : `A new link has been sent. Check your inbox and tap the one-click link to continue. ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`,
      ...(emailResult.devConsoleFallback ? { devConsoleFallback: true } : {}),
    })
    applyAuthCookies(res)
    return res
  } catch (error) {
    console.error('Resend sign-in link error:', error)
    return NextResponse.json({ error: 'Failed to resend sign-in link. Please try again.' }, { status: 500 })
  }
}
