import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Legacy path: forwards to /api/auth/callback (where the real handler lives).
 * Add /api/auth/callback to Supabase Redirect URLs; keep this if old links used /auth/callback.
 */
export function GET(request: NextRequest) {
  const u = new URL(request.url)
  u.pathname = '/api/auth/callback'
  return NextResponse.redirect(u)
}
