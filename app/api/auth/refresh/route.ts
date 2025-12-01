import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, refreshSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Endpoint to refresh session (called periodically by client)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(false) // Don't auto-refresh here, we'll do it manually
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Refresh the session expiration
    await refreshSession(user.id)
    
    return NextResponse.json({
      success: true,
      message: 'Session refreshed',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to refresh session' },
      { status: 500 }
    )
  }
}














