import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateSessionToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Helper endpoint to fix session issues
// This will verify the user and create a fresh session
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    let user = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Mark user as verified and generate new session
    user = await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
      },
    })

    // Generate new session token
    const sessionToken = await generateSessionToken(user.id)

    // Create response with new session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Session fixed! User verified and new session created.',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    })

    // Set session cookie
    const maxAgeSeconds = 60 * 60 * 24 * 90 // 90 days
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeSeconds,
      path: '/',
    })

    return response
  } catch (error: any) {
    console.error('Fix session error:', error)
    return NextResponse.json(
      { error: 'Failed to fix session', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to check current session
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie?.value) {
      return NextResponse.json({
        hasSession: false,
        message: 'No session cookie found',
      })
    }

    // Try to get user
    const { getCurrentUser } = await import('@/lib/auth')
    const user = await getCurrentUser(false)

    return NextResponse.json({
      hasSession: true,
      hasUser: !!user,
      userEmail: user?.email || null,
      userVerified: user?.emailVerified || false,
      message: user
        ? user.emailVerified
          ? 'Session is valid and user is verified'
          : 'Session is valid but user is not verified'
        : 'Session cookie exists but user not found',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}














