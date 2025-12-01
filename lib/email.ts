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
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'FounderMatch <onboarding@resend.dev>',
      to: email,
      subject: 'Your FounderMatch Verification Code',
      html: `<p>Your verification code is <strong>${code}</strong></p>`,
      text: `Your verification code is ${code}`,
    })
    if (error) return { success: false, error }
    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
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
      from: process.env.RESEND_FROM_EMAIL || 'FounderMatch <onboarding@resend.dev>',
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
      from: process.env.RESEND_FROM_EMAIL || 'FounderMatch <onboarding@resend.dev>',
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
      from: process.env.RESEND_FROM_EMAIL || 'FounderMatch <onboarding@resend.dev>',
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


