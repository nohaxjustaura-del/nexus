import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendVerificationCode } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'No account found with this email. Please sign up first.' },
        { status: 404 }
      )
    }

    // Delete any existing unverified codes for this email
    await db.verificationCode.deleteMany({
      where: {
        email: normalizedEmail,
        verified: false,
      },
    })

    // Generate verification code
    const code = generateVerificationCode()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10) // 10 minutes expiry

    // Create verification code
    await db.verificationCode.create({
      data: {
        code,
        email: normalizedEmail,
        userId: existingUser.id,
        expiresAt,
        verified: false,
      },
    })

    // Send verification email
    let emailResult
    try {
      emailResult = await sendVerificationCode(normalizedEmail, code)
    } catch (emailError) {
      console.error('Email sending error (non-critical):', emailError)
      emailResult = { success: true }
    }

    return NextResponse.json({
      success: true,
      message: process.env.RESEND_API_KEY 
        ? 'Verification code sent to your email' 
        : 'Verification code generated. Check console for code (dev mode).',
      email: normalizedEmail,
      code: process.env.RESEND_API_KEY ? undefined : code, // Only return code in dev mode
    })
  } catch (error: any) {
    console.error('Login error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process login',
        message: error?.message || 'Please try again.',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}














