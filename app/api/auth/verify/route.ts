import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateSessionToken, setSessionCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    // Validate input
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find the verification code
    const verificationCode = await db.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        code: code,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Check if code is expired
    if (verificationCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Mark code as verified
    await db.verificationCode.update({
      where: { id: verificationCode.id },
      data: { verified: true },
    })

    // Get or create user
    let user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      user = await db.user.create({
        data: {
          email: normalizedEmail,
          emailVerified: true,
        },
      })
    } else {
      // Update user to verified
      user = await db.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      })
    }

    // Generate session token
    const sessionToken = await generateSessionToken(user.id)
    
    // Create response first
    const response = NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        userType: user.userType,
      },
    })
    
    // Set session cookie directly on response (this is the correct way for API routes)
    const maxAgeSeconds = 60 * 60 * 24 * 90 // 90 days
    
    // Cookie options - ensure it works on localhost and production
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // false for localhost, true for production
      sameSite: 'lax' as const,
      maxAge: maxAgeSeconds,
      path: '/',
      // Don't set domain - let browser use default (works for localhost and production)
    }
    
    response.cookies.set('session', sessionToken, cookieOptions)
    
    // Verify cookie was set
    const cookieWasSet = response.cookies.has('session')
    const cookieValue = response.cookies.get('session')?.value
    
    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🍪 Cookie set with options:', cookieOptions)
      console.log('✅ Session cookie set:', {
        tokenLength: sessionToken.length,
        userId: user.id,
        email: user.email,
        verified: user.emailVerified,
        cookieSet: cookieWasSet,
        cookieValueExists: !!cookieValue,
        cookieValuePreview: cookieValue ? `${cookieValue.substring(0, 20)}...` : 'NOT SET',
      })
    }
    
    if (!cookieWasSet || !cookieValue) {
      console.error('❌ WARNING: Cookie was not set on response!')
      // Try setting it again as a fallback
      try {
        response.cookies.set('session', sessionToken, cookieOptions)
        console.log('🔄 Retried setting cookie')
      } catch (retryError) {
        console.error('❌ Failed to set cookie on retry:', retryError)
      }
    }
    
    return response
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify code. Please try again.' },
      { status: 500 }
    )
  }
}


