import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)
    const { data, error } = await supabase.auth.refreshSession()

    if (error || !data.session) {
      return NextResponse.json({ success: false, error: 'Not authenticated' })
    }

    const res = NextResponse.json({
      success: true,
      message: 'Session refreshed',
    })
    applyAuthCookies(res)
    return res
  } catch (error) {
    return NextResponse.json({ error: 'Failed to refresh session' }, { status: 500 })
  }
}
