import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// This endpoint simulates what middleware sees
export async function GET(request: NextRequest) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    
    // Get cookie the same way middleware does
    const sessionCookie = request.cookies.get('session')
    
    // Also get it the way API routes do
    const cookieStore = await cookies()
    const apiRouteCookie = cookieStore.get('session')
    
    const debugInfo: any = {
      middlewareCookie: {
        exists: !!sessionCookie,
        hasValue: !!sessionCookie?.value,
        valueLength: sessionCookie?.value?.length || 0,
        valuePreview: sessionCookie?.value ? `${sessionCookie.value.substring(0, 30)}...` : null,
      },
      apiRouteCookie: {
        exists: !!apiRouteCookie,
        hasValue: !!apiRouteCookie?.value,
        valueLength: apiRouteCookie?.value?.length || 0,
        valuePreview: apiRouteCookie?.value ? `${apiRouteCookie.value.substring(0, 30)}...` : null,
      },
      allCookies: request.cookies.getAll().map(c => ({
        name: c.name,
        valueLength: c.value?.length || 0,
        valuePreview: c.value ? `${c.value.substring(0, 20)}...` : null,
      })),
    }
    
    // Try to decode JWT if cookie exists
    if (sessionCookie?.value) {
      try {
        const decoded = jwt.verify(sessionCookie.value, JWT_SECRET) as { userId: string; exp?: number }
        debugInfo.jwt = {
          valid: true,
          userId: decoded.userId,
          expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
          expired: decoded.exp ? decoded.exp * 1000 < Date.now() : false,
        }
        
        // Check user in database
        const user = await db.user.findUnique({
          where: { id: decoded.userId },
          select: { email: true, emailVerified: true, sessionToken: true, sessionExpires: true },
        })
        
        debugInfo.user = {
          exists: !!user,
          email: user?.email || null,
          emailVerified: user?.emailVerified || false,
          hasSessionToken: !!user?.sessionToken,
          sessionTokenMatch: user?.sessionToken === sessionCookie.value,
          sessionExpires: user?.sessionExpires?.toISOString() || null,
          sessionExpired: user?.sessionExpires ? user.sessionExpires < new Date() : false,
        }
      } catch (jwtError: any) {
        debugInfo.jwt = {
          valid: false,
          error: jwtError.message,
        }
      }
    } else {
      debugInfo.jwt = {
        valid: false,
        error: 'No cookie to verify',
      }
    }
    
    return NextResponse.json(debugInfo)
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 })
  }
}














