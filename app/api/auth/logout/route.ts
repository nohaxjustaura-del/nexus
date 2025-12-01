import { NextRequest, NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value

    if (token) {
      try {
        // Clear session from database
        await db.user.updateMany({
          where: { sessionToken: token },
          data: {
            sessionToken: null,
            sessionExpires: null,
          },
        })
      } catch (dbError) {
        console.error('Database logout error:', dbError)
        // Continue anyway to clear cookie
      }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    // Clear cookie on response with explicit expiration
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    })

    // Also try to delete it
    response.cookies.delete('session')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    
    // Still return success and clear cookie even on error
    const response = NextResponse.json({
      success: true,
      message: 'Logged out',
    })
    
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    response.cookies.delete('session')
    
    return response
  }
}


