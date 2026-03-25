import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)
    await supabase.auth.signOut()

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
    applyAuthCookies(response)
    return response
  } catch (error) {
    console.error('Logout error:', error)
    const response = NextResponse.json({ success: true, message: 'Logged out' })
    return response
  }
}
