import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, userType } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        data: {
          user_type: userType || 'founder',
        },
      },
    })

    if (error) {
      if (error.message?.includes('already registered') || error.status === 422) {
        return NextResponse.json(
          {
            error: 'An account with this email may already exist',
            existingAccount: true,
            message: 'Try logging in instead.',
          },
          { status: 400 }
        )
      }
      console.error('Supabase signup OTP error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to send verification code' },
        { status: 400 }
      )
    }

    const res = NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      email: normalizedEmail,
    })
    applyAuthCookies(res)
    return res
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process signup',
        message: error?.message || 'Please try again.',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
