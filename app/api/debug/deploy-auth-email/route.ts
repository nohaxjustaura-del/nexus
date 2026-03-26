import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

function masked(value: string | undefined): string | null {
  if (!value) return null
  const t = value.trim()
  if (!t) return null
  if (t.length <= 8) return `${t.slice(0, 2)}***`
  return `${t.slice(0, 4)}***${t.slice(-4)}`
}

export async function GET(request: NextRequest) {
  const siteUrl = getSiteUrl(request)
  const callbackUrl = `${siteUrl}/api/auth/callback?next=${encodeURIComponent('/founder/onboarding')}`
  const from = process.env.RESEND_FROM_EMAIL || 'NEXUS <onboarding@resend.dev>'

  return NextResponse.json({
    ok: true,
    runtime: process.env.NODE_ENV ?? null,
    deployment: {
      vercelEnv: process.env.VERCEL_ENV ?? null,
      vercelUrl: process.env.VERCEL_URL ?? null,
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    },
    authEmail: {
      computedSiteUrl: siteUrl,
      callbackUrl,
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
      resendApiKeyMasked: masked(process.env.RESEND_API_KEY),
      resendFrom: from,
    },
  })
}

