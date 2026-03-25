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
        shouldCreateUser: true,
      },
    })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to resend verification code' },
        { status: 400 }
      )
    }

    const res = NextResponse.json({
      success: true,
      message: 'New verification code sent to your email',
    })
    applyAuthCookies(res)
    return res
  } catch (error) {
    console.error('Resend code error:', error)
    return NextResponse.json({ error: 'Failed to resend code. Please try again.' }, { status: 500 })
  }
}
