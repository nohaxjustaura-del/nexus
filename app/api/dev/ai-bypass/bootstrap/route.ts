import { NextRequest, NextResponse } from 'next/server'
import {
  DEV_AI_BYPASS_COOKIE,
  getOrCreateDevAiBypassUser,
  isDevAiAnalysisBypassEnabled,
  isLocalDevRequest,
} from '@/lib/dev-ai-analysis-bypass'

export const dynamic = 'force-dynamic'

/**
 * Sets an HttpOnly cookie linking the browser to the local dev sandbox Prisma user.
 * Only when NODE_ENV=development, NEXT_PUBLIC_DEV_AI_ANALYSIS_BYPASS=true, and Host is localhost.
 */
export async function POST(request: NextRequest) {
  if (!isDevAiAnalysisBypassEnabled() || !isLocalDevRequest(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const user = await getOrCreateDevAiBypassUser()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(DEV_AI_BYPASS_COOKIE, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
