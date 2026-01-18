import { db } from './db'
import { logger } from './logger'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Session duration: 90 days (like modern apps - Spotify, Netflix, etc.)
const SESSION_DURATION_DAYS = 90

export async function generateSessionToken(userId: string): Promise<string> {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: `${SESSION_DURATION_DAYS}d` })
  
  // Store session in database
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)
  
  await db.user.update({
    where: { id: userId },
    data: {
      sessionToken: token,
      sessionExpires: expiresAt,
    },
  })
  
  return token
}

// Refresh session expiration (extends session on activity)
export async function refreshSession(userId: string): Promise<void> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)
  
  await db.user.update({
    where: { id: userId },
    data: {
      sessionExpires: expiresAt,
    },
  })
}

export async function getCurrentUser(extendSession: boolean = true) {
  try {
    // Removed verbose logging to reduce terminal spam
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    
    if (!token) {
      // No session token
      return null
    }
    
    // Verifying JWT
    // Verify JWT is valid (not expired, correct signature)
    let decoded: { userId: string; exp?: number }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; exp?: number }
      // JWT verified
    } catch (error) {
      // Invalid or expired JWT
      // JWT verification failed
      return null
    }
    
    // Check JWT expiration
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null
    }
    
    let user
    try {
      // Fetching user from database
      user = await db.user.findUnique({
        where: { id: decoded.userId },
      })
      // User fetched
    } catch (dbError) {
      // Database error - return null to allow page to load
      console.error('[AUTH] Database error in getCurrentUser:', dbError instanceof Error ? dbError.message : dbError)
      return null
    }
    
    // Check if user exists
    if (!user) {
      // User not found
      return null
    }
    
    // Check if session expired in database (only if sessionExpires exists)
    // JWT expiration is already checked above
    if (user.sessionExpires && user.sessionExpires < new Date()) {
      return null
    }
    
    // Auto-refresh session on activity (if session expires in less than 7 days)
    if (extendSession && user.sessionExpires) {
      try {
        const daysUntilExpiry = (user.sessionExpires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        if (daysUntilExpiry < 7) {
          // Refresh session if it's expiring soon
          await refreshSession(user.id)
        }
      } catch (refreshError) {
        // Silently fail - session refresh is not critical
        console.error('Session refresh error:', refreshError)
      }
    }
    
    // Return user - trust JWT validation for session validity
    // Don't require strict token matching to avoid blocking valid sessions
    // getCurrentUser success
    return user
  } catch (error) {
    return null
  }
}

export async function setSessionCookie(token: string, response?: NextResponse) {
  // Calculate maxAge in seconds (90 days)
  const maxAgeSeconds = 60 * 60 * 24 * SESSION_DURATION_DAYS
  
  // Cookie options for persistence
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only secure in production (localhost needs false)
    sameSite: 'lax' as const, // Allows cross-site requests but maintains security
    maxAge: maxAgeSeconds, // 90 days
    path: '/', // Available site-wide
  }
  
  if (response) {
    // For API routes, set cookie directly on response object
    // This is the correct way for Next.js API routes
    response.cookies.set('session', token, cookieOptions)
    return response
  } else {
    // For server components/pages
    try {
      const cookieStore = await cookies()
      cookieStore.set('session', token, cookieOptions)
    } catch (error) {
      // If cookies() fails (e.g., in API routes), log but don't throw
      console.error('Failed to set cookie via cookies():', error)
    }
  }
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

// Get user from NextRequest (for API routes)
export async function getUserFromRequest(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value
    
    if (!token) {
      return null
    }
    
    // Verify JWT is valid
    let decoded: { userId: string; exp?: number }
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; exp?: number }
    } catch (error) {
      return null
    }
    
    // Check JWT expiration
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null
    }
    
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    })
    
    if (!user) {
      return null
    }
    
    // Check if session expired in database
    if (user.sessionExpires && user.sessionExpires < new Date()) {
      return null
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      return null
    }
    
    return user
  } catch (error) {
    return null
  }
}


