import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getSiteUrl } from '@/lib/site-url'
import {
  RESEND_DEV_CONSOLE_FALLBACK_HINT,
  RESEND_TESTING_MODE_PUBLIC_MESSAGE,
  sendMagicLinkEmail,
} from '@/lib/email'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const siteUrl = getSiteUrl(request)
    const callbackUrl = `${siteUrl}/api/auth/callback?next=${encodeURIComponent('/founder/onboarding')}`

    const adminClient = createSupabaseAdminClient()

    // Determine whether the user already exists in Supabase so we pick the
    // correct link type. Use the Prisma User table as a fast proxy.
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })

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

    const magicLink = linkData.properties?.action_link
    const otp = linkData.properties?.email_otp

    if (!magicLink || !otp) {
      console.error('Resend-code generateLink: missing action_link or email_otp', linkData.properties)
      return NextResponse.json(
        { error: 'Failed to generate sign-in link. Please try again.' },
        { status: 500 }
      )
    }

    const emailResult = await sendMagicLinkEmail(normalizedEmail, {
      magicLink,
      otp,
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
      console.error('Resend-code email send failed:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      )
    }

    const { applyAuthCookies } = createSupabaseAuthRouteClient(request)

    const res = NextResponse.json({
      success: true,
      message: emailResult.devConsoleFallback
        ? RESEND_DEV_CONSOLE_FALLBACK_HINT
        : 'New sign-in email sent. Check your inbox for a link or 6-digit code.',
      ...(emailResult.devConsoleFallback ? { devConsoleFallback: true } : {}),
    })
    applyAuthCookies(res)
    return res
  } catch (error) {
    console.error('Resend code error:', error)
    return NextResponse.json({ error: 'Failed to resend code. Please try again.' }, { status: 500 })
  }
}
