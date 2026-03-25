import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Legacy "fix session" endpoint. Sessions are managed by Supabase; users should sign in again with email OTP if needed.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Not supported',
      message: 'Sessions use Supabase Auth. Please request a new login code from the login page.',
    },
    { status: 410 }
  )
}

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser(false)

    return NextResponse.json({
      hasSession: !!user,
      hasUser: !!user,
      userEmail: user?.email || null,
      userVerified: user?.emailVerified || false,
      message: user
        ? user.emailVerified
          ? 'Supabase session is valid'
          : 'User record needs attention'
        : 'No valid Supabase session',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
