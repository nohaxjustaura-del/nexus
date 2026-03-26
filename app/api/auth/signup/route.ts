import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSiteUrl } from '@/lib/site-url'
import {
  RESEND_DEV_CONSOLE_FALLBACK_HINT,
  RESEND_TESTING_MODE_PUBLIC_MESSAGE,
  sendMagicLinkEmail,
} from '@/lib/email'

export const dynamic = 'force-dynamic'

function isExistingUserLinkError(err: { message?: string; code?: string } | null) {
  if (!err) return false
  if (err.code === 'email_exists') return true
  const msg = (err.message || '').toLowerCase()
  if (msg.includes('already been registered') || msg.includes('already registered')) return true
  if (msg.includes('user with this email') && msg.includes('registered')) return true
  return false
}

export async function POST(request: NextRequest) {
  try {
    const { email, userType } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const siteUrl = getSiteUrl(request)
    const callbackUrl = `${siteUrl}/api/auth/callback?next=${encodeURIComponent('/founder/onboarding')}`

    const adminClient = createSupabaseAdminClient()

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: normalizedEmail,
      options: {
        redirectTo: callbackUrl,
        data: {
          user_type: userType || 'founder',
        },
      },
    })

    if (linkError) {
      if (isExistingUserLinkError(linkError)) {
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

    const magicLink = linkData.properties?.action_link
    const otp = linkData.properties?.email_otp

    if (!magicLink || !otp) {
      console.error('Signup generateLink: missing action_link or email_otp', linkData.properties)
      return NextResponse.json(
        { error: 'Failed to generate sign-in link. Please try again.' },
        { status: 500 }
      )
    }

    const emailResult = await sendMagicLinkEmail(normalizedEmail, {
      magicLink,
      otp,
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
      console.error('Signup email send failed:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    const { applyAuthCookies } = createSupabaseAuthRouteClient(request)

    const res = NextResponse.json({
      success: true,
      message: emailResult.devConsoleFallback
        ? RESEND_DEV_CONSOLE_FALLBACK_HINT
        : 'Verification email sent. Check your inbox for a sign-in link or 8-digit code.',
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
