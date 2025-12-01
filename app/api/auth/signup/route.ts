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
    const { email, userType } = await request.json()

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please provide a valid email address' },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser && existingUser.emailVerified) {
      return NextResponse.json(
        { 
          error: 'An account with this email already exists',
          existingAccount: true,
          message: 'Please log in instead. If you forgot your password, use the login page to get a new verification code.'
        },
        { status: 400 }
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

    // Create or update user
    let user
    if (existingUser) {
      user = existingUser
    } else {
      user = await db.user.create({
        data: {
          email: normalizedEmail,
          userType: userType || 'founder',
          emailVerified: false,
        },
      })
    }

    // Create verification code
    await db.verificationCode.create({
      data: {
        code,
        email: normalizedEmail,
        userId: user.id,
        expiresAt,
        verified: false,
      },
    })

    // Send verification email (always succeeds in dev mode, even if email service fails)
    let emailResult
    try {
      emailResult = await sendVerificationCode(normalizedEmail, code)
    } catch (emailError) {
      console.error('Email sending error (non-critical):', emailError)
      // In dev mode, this is fine - code is logged to console
      emailResult = { success: true }
    }
    
    // Always return success - code is created in database
    // In development mode (no RESEND_API_KEY), code is logged to console
    // In production, if email fails, user can use resend code feature
    if (!emailResult.success && process.env.RESEND_API_KEY) {
      console.error('Email sending failed, but code was created:', emailResult.error)
      // Still return success - user can use resend code feature
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
    console.error('Signup error:', error)
    
    // Always return JSON, never HTML
    return NextResponse.json(
      { 
        error: 'Failed to process signup',
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

