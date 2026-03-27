import { Resend } from 'resend'
import { BRAND_NAME } from '@/lib/brand'
import { getSiteUrl } from '@/lib/site-url'
import { sendCursorDebugIngest } from '@/lib/cursor-debug-ingest'

export {
  RESEND_DEV_CONSOLE_FALLBACK_HINT,
  RESEND_TESTING_MODE_PUBLIC_MESSAGE,
} from '@/lib/resend-user-messages'

const resend = new Resend(process.env.RESEND_API_KEY)

function emailFromHeader(): string {
  const raw = process.env.RESEND_FROM_EMAIL
  let result: string
  if (!raw) {
    result = `${BRAND_NAME} <onboarding@resend.dev>`
  } else {
    const trimmed = raw.trim()
    // Vercel env UI sometimes stores quotes literally; strip one wrapping pair.
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      const unwrapped = trimmed.slice(1, -1).trim()
      result = unwrapped ? unwrapped : trimmed
    } else {
      result = trimmed
    }
  }
  // Resend requires `email@x` or `Name <email@x>`. Accept common env mistake: `NEXUS noreply@x.y` (no brackets).
  if (!result.includes('<') && result.includes('@')) {
    const loose = /^(.+?)\s+(\S+@\S+)$/.exec(result)
    if (loose) {
      const name = loose[1].trim()
      const addr = loose[2].trim()
      if (name && addr) result = `${name} <${addr}>`
    }
  }
  return result
}

/** Stable string for logs and dev API responses (Resend returns { message } or plain strings). */
export function formatResendErrorMessage(error: unknown): string {
  if (error == null) return ''
  if (typeof error === 'string') return error
  if (typeof error === 'object' && 'message' in error && (error as { message: unknown }).message != null) {
    return String((error as { message: unknown }).message)
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function isResendTestingRecipientError(error: unknown): boolean {
  const s = formatResendErrorMessage(error).toLowerCase()
  return (
    s.includes('only send testing emails') ||
    s.includes('verify a domain') ||
    s.includes('domain is not verified') ||
    s.includes('must verify') ||
    (s.includes('testing') && s.includes('recipient')) ||
    s.includes('not allowed to send') ||
    (s.includes('restricted') && s.includes('recipient'))
  )
}

function usesResendDevFromAddress(): boolean {
  return emailFromHeader().toLowerCase().includes('onboarding@resend.dev')
}

export async function sendVerificationCode(email: string, code: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`
📧 Verification Code Email (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: ${email}
Subject: Your ${BRAND_NAME} verification code

Your verification code is: ${code}

This code will expire in 10 minutes.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    return { success: true }
  }

  try {
    console.log(`📧 Sending verification email to: ${email}`)
    const { data, error } = await resend.emails.send({
      from: emailFromHeader(),
      to: email,
      subject: `Your ${BRAND_NAME} verification code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">${BRAND_NAME} verification</h2>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">
            ${code}
          </div>
          <p style="color: #666;">This code will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
      text: `Your ${BRAND_NAME} verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
    })
    if (error) {
      console.error('❌ Resend API error:', error)
      return { success: false, error }
    }
    console.log('✅ Email sent successfully:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Email send error:', error)
    return { success: false, error }
  }
}

export async function sendMagicLinkEmail(
  email: string,
  {
    magicLink,
    isNew = false,
  }: { magicLink: string; isNew?: boolean }
) {
  const fromHeader = emailFromHeader()
  const subject = isNew
    ? `Verify your ${BRAND_NAME} account`
    : `Sign in to ${BRAND_NAME}`

  const headline = isNew ? 'Confirm your email address' : 'Sign in to your account'
  const intro = isNew
    ? `Click the button below to verify your email and activate your ${BRAND_NAME} account.`
    : `Click the button below to sign in to your ${BRAND_NAME} account instantly (no password needed).`

  if (!process.env.RESEND_API_KEY) {
    console.log(`
📧 Magic Link Email (Development Mode, no RESEND_API_KEY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: ${email}
Subject: ${subject}

${intro}

Magic link: ${magicLink}
This link expire in 1 hour.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    return { success: true, devConsoleFallback: true }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">${BRAND_NAME}</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:48px 40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">${headline}</h1>
              <p style="margin:0 0 32px;font-size:15px;color:#64748b;line-height:1.6;">${intro}</p>
              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="border-radius:10px;background:#2563eb;">
                    <a href="${magicLink}"
                       target="_blank"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.1px;">
                      ${isNew ? 'Verify my email' : 'Sign in to ' + BRAND_NAME}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;line-height:1.5;">This link expire in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${headline}

${intro}

Sign-in link (click to authenticate instantly):
${magicLink}
This link expire in 1 hour. If you didn't request this, you can safely ignore this email.

The ${BRAND_NAME} team`

  try {
    console.log(`📧 Sending magic-link email to: ${email}`)
    // #region agent log
    sendCursorDebugIngest({
      runId: 'pre-fix-domain-send',
      hypothesisId: 'H4',
      location: 'lib/email.ts:sendMagicLinkEmail-pre-send',
      message: 'About to call resend.emails.send',
      data: {
        fromDomain: fromHeader.includes('@') ? fromHeader.split('@').pop()?.replace(/[>\s]/g, '') : null,
        usesResendDevFromAddress: usesResendDevFromAddress(),
        magicLinkHost: (() => {
          try {
            return new URL(magicLink).host
          } catch {
            return null
          }
        })(),
      },
    })
    // #endregion
    const { data, error } = await resend.emails.send({
      from: fromHeader,
      to: email,
      subject,
      html,
      text,
    })
    if (error) {
      console.error('❌ Resend API error (magic link):', error)
      // #region agent log
      sendCursorDebugIngest({
        runId: 'pre-fix-domain-send',
        hypothesisId: 'H5',
        location: 'lib/email.ts:sendMagicLinkEmail-resend-error',
        message: 'Resend send returned error',
        data: {
          statusCode: (error as any)?.statusCode ?? null,
          name: (error as any)?.name ?? null,
          message: formatResendErrorMessage(error).slice(0, 220),
          testingRestriction: isResendTestingRecipientError(error),
        },
      })
      // #endregion
      if (isResendTestingRecipientError(error)) {
        return { success: false, error, resendTestingRecipientOnly: true as const }
      }
      return { success: false, error }
    }
    console.log('✅ Magic-link email sent successfully:', data?.id)
    return {
      success: true,
      data,
      ...(usesResendDevFromAddress() ? { devConsoleFallback: true as const } : {}),
    }
  } catch (error) {
    console.error('❌ Magic-link email send error:', error)
    if (isResendTestingRecipientError(error)) {
      return { success: false, error, resendTestingRecipientOnly: true as const }
    }
    return { success: false, error }
  }
}

export async function sendVCClaimReceipt(toEmail: string, name: string, firmName: string) {
  const subject = `Your VC application is under review - ${BRAND_NAME}`
  const plain = `Hi ${name || 'there'},

Thanks for submitting your VC profile for ${firmName}.
Our team will review your information and verify the profile shortly. You'll receive an update within 24 hours.`

  if (!process.env.RESEND_API_KEY) {
    console.log(`
📧 VC Claim Receipt (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: ${toEmail}
Subject: ${subject}

${plain}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    return { success: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailFromHeader(),
      to: toEmail,
      subject,
      text: plain,
      html: `<p>${plain.replace(/\n/g, '<br>')}</p>`,
    })
    if (error) return { success: false, error }
    return { success: true, data }
  } catch (error) {
    console.error('Email send error (claim receipt):', error)
    return { success: false, error }
  }
}

export async function sendFounderApplicationReceipt(toEmail: string, name?: string) {
  const subject = `Your Founder application is under review - ${BRAND_NAME}`
  const plain = `Hi ${name || 'there'},

Thanks for creating your ${BRAND_NAME} profile. We received your information and ID.
Our team will review your account within 24 hours and notify you once approved.

If you didn’t request this, you can ignore this email.`

  if (!process.env.RESEND_API_KEY) {
    console.log(`
📧 Founder Application Receipt (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: ${toEmail}
Subject: ${subject}

${plain}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    return { success: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailFromHeader(),
      to: toEmail,
      subject,
      text: plain,
      html: `<p>${plain.replace(/\n/g, '<br>')}</p>`,
    })
    if (error) return { success: false, error }
    return { success: true, data }
  } catch (error) {
    console.error('Email send error (founder receipt):', error)
    return { success: false, error }
  }
}

export async function sendUserApprovalStatus(toEmail: string, status: 'approved' | 'rejected') {
  const base = getSiteUrl()
  const subj =
    status === 'approved'
      ? `Your ${BRAND_NAME} account is approved`
      : `Your ${BRAND_NAME} application status`
  const plain =
    status === 'approved'
      ? `Hi there,

Good news: your ${BRAND_NAME} account has been approved. You now have full access to analysis tools and investor outreach.

You can sign in and continue here: ${base}/founder/discover`
      : `Hi there,

Your ${BRAND_NAME} application was not approved at this time. You may reply to this email with any additional information.`

  if (!process.env.RESEND_API_KEY) {
    console.log(`
📧 User Approval (${status}) (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: ${toEmail}
Subject: ${subj}

${plain}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    return { success: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailFromHeader(),
      to: toEmail,
      subject: subj,
      text: plain,
      html: `<p>${plain.replace(/\n/g, '<br>')}</p>`,
    })
    if (error) return { success: false, error }
    return { success: true, data }
  } catch (error) {
    console.error('Email send error (user approval):', error)
    return { success: false, error }
  }
}


