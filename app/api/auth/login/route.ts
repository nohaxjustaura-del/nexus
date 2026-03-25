import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      console.error('Supabase login OTP error:', error)
      const notFound =
        error.message?.toLowerCase().includes('signups not allowed') ||
        error.message?.toLowerCase().includes('user not found')
      return NextResponse.json(
        {
          error: notFound
            ? 'No account found with this email. Please sign up first.'
            : error.message || 'Failed to send verification code',
        },
        { status: notFound ? 404 : 400 }
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
    console.error('Login error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process login',
        message: error?.message || 'Please try again.',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
