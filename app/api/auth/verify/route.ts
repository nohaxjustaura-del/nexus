import { NextRequest, NextResponse } from 'next/server'
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
    const token = String(code).replace(/\s/g, '')

    const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)

    // #region agent log
    fetch('http://127.0.0.1:7471/ingest/0f685c44-f6c8-4b99-b23e-84e0cc9d4f08',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2f72c9'},body:JSON.stringify({sessionId:'2f72c9',location:'app/api/auth/verify/route.ts:20',message:'verifyOtp called',data:{email:normalizedEmail,tokenLength:token.length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token,
      type: 'email',
    })
    // #region agent log
    fetch('http://127.0.0.1:7471/ingest/0f685c44-f6c8-4b99-b23e-84e0cc9d4f08',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2f72c9'},body:JSON.stringify({sessionId:'2f72c9',location:'app/api/auth/verify/route.ts:28',message:'verifyOtp result',data:{hasError:!!error,errorMsg:error?.message||null,hasUser:!!data?.user,userId:data?.user?.id||null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (error || !data.user) {
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
