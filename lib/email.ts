import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationCode(email: string, code: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`
📧 Verification Code Email (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: ${email}
Subject: Your FounderMatch Verification Code

Your verification code is: ${code}

This code will expire in 10 minutes.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
    return { success: true }
  }

  try {
    console.log(`📧 Sending verification email to: ${email}`)
    const { data, error } = await resend.emails.send({
      from: 'FounderMatch <onboarding@resend.dev>',
      to: email,
      subject: 'Your FounderMatch Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">FounderMatch Verification</h2>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">
            ${code}
          </div>
          <p style="color: #666;">This code will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
      text: `Your FounderMatch verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
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

export async function sendVCClaimReceipt(toEmail: string, name: string, firmName: string) {
  const subject = 'Your VC application is under review — FounderMatch'
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
      from: 'FounderMatch <onboarding@resend.dev>',
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
  const subject = 'Your Founder application is under review — FounderMatch'
  const plain = `Hi ${name || 'there'},

Thanks for creating your FounderMatch profile. We received your information and ID.
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
      from: 'FounderMatch <onboarding@resend.dev>',
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
  const subj =
    status === 'approved'
      ? 'Your FounderMatch account is approved'
      : 'Your FounderMatch application status'
  const plain =
    status === 'approved'
      ? `Hi there,

Good news — your FounderMatch account has been approved. You now have full access to analysis tools and investor outreach.

You can sign in and continue here: https://localhost:3000/founder/discover`
      : `Hi there,

Your FounderMatch application was not approved at this time. You may reply to this email with any additional information.`

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
      from: 'FounderMatch <onboarding@resend.dev>',
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


