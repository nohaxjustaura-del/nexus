import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, source, userType } = await request.json()

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    // Check if already on waitlist
    const existing = await db.waitlist.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You're already on the waitlist!",
        alreadyExists: true,
      })
    }

    // Add to waitlist
    const waitlistEntry = await db.waitlist.create({
      data: {
        email,
        source: source || 'unknown',
        userType: userType || 'founder',
        notified: false,
      },
    })

    // Send notification email to admin
    await sendAdminNotification(email, source, userType)

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist!',
      id: waitlistEntry.id,
    })
  } catch (error: any) {
    logger.error('WAITLIST', 'Failed to add to waitlist:', error?.message || error)
    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    )
  }
}

// Send notification to admin
async function sendAdminNotification(
  userEmail: string,
  source?: string,
  userType?: string
) {
  const adminEmail = 'nohaxjustaura@gmail.com'
  
  // In production, use Resend or similar:
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'FounderMatch <noreply@foundermatch.com>',
  //   to: adminEmail,
  //   subject: `New Waitlist Signup: ${userEmail}`,
  //   html: `
  //     <h2>New Waitlist Signup</h2>
  //     <p><strong>Email:</strong> ${userEmail}</p>
  //     <p><strong>Source:</strong> ${source || 'Unknown'}</p>
  //     <p><strong>Type:</strong> ${userType || 'Founder'}</p>
  //     <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
  //   `,
  // })

  // Log waitlist signup (in production, send email notification)
  logger.log(`[WAITLIST] New signup: ${userEmail} (${userType || 'Founder'}) from ${source || 'Unknown'}`)
  
  // Future: Actually send email using Resend, SendGrid, or AWS SES
  return true
}

// Get waitlist count (for stats)
export async function GET() {
  try {
    const count = await db.waitlist.count()
    const recent = await db.waitlist.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        email: true,
        source: true,
        userType: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      count,
      recent,
    })
  } catch (error) {
    return NextResponse.json({ count: 0, recent: [] })
  }
}















