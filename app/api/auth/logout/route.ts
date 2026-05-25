import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Logout error:', error)
  }
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
  applyAuthCookies(response)
  return response
}
