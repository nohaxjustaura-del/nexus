import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Debug endpoint to check session status
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    const user = await getCurrentUser(false)
    
    return NextResponse.json({
      hasCookie: !!sessionCookie,
      cookieValue: sessionCookie?.value ? `${sessionCookie.value.substring(0, 30)}...` : null,
      cookieLength: sessionCookie?.value?.length || 0,
      hasUser: !!user,
      userEmail: user?.email || null,
      userVerified: user?.emailVerified || false,
      sessionToken: user?.sessionToken ? `${user.sessionToken.substring(0, 30)}...` : null,
      sessionExpires: user?.sessionExpires?.toISOString() || null,
      tokenMatch: user && sessionCookie ? user.sessionToken === sessionCookie.value : false,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}














