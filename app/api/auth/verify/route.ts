import { NextRequest, NextResponse } from 'next/server'
import { otpVerificationCandidates } from '@/lib/auth-otp'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'
import { syncPrismaUserFromAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const candidates = otpVerificationCandidates(String(code))
    if (candidates.length === 0) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)

    let data: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>['data'] | null = null
    let error: Awaited<ReturnType<typeof supabase.auth.verifyOtp>>['error'] | null = null

    for (const token of candidates) {
      const result = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token,
        type: 'email',
      })
      data = result.data
      error = result.error
      if (!result.error && result.data?.user) {
        break
      }
    }

    if (error || !data?.user) {
      return NextResponse.json(
        { error: error?.message || 'Invalid verification code' },
        { status: 400 }
      )
    }

    const user = await syncPrismaUserFromAuth(data.user)

    const res = NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: user
        ? {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
            userType: user.userType,
          }
        : null,
    })
    applyAuthCookies(res)
    return res
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: 'Failed to verify code. Please try again.' }, { status: 500 })
  }
}
