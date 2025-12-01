import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendVerificationCode } from '@/lib/email'

export const dynamic = 'force-dynamic'

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists and is not already verified
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (user && user.emailVerified) {
      return NextResponse.json(
        { error: 'This email is already verified' },
        { status: 400 }
      )
    }

    // Delete old unverified codes
    await db.verificationCode.deleteMany({
      where: {
        email: normalizedEmail,
        verified: false,
      },
    })

    // Generate new code
    const code = generateVerificationCode()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    // Create verification code
    await db.verificationCode.create({
      data: {
        code,
        email: normalizedEmail,
        userId: user?.id,
        expiresAt,
        verified: false,
      },
    })

    // Send email
    await sendVerificationCode(normalizedEmail, code)

    return NextResponse.json({
      success: true,
      message: 'New verification code sent to your email',
    })
  } catch (error) {
    console.error('Resend code error:', error)
    return NextResponse.json(
      { error: 'Failed to resend code. Please try again.' },
      { status: 500 }
    )
  }
}















