import { db } from './db'
import type { User as PrismaUser } from '@prisma/client'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAuthUserFromRequest } from '@/lib/supabase/request-reader'
import {
  DEV_AI_BYPASS_COOKIE,
  getDevAiBypassEmail,
  isDevAiAnalysisBypassEnabled,
} from '@/lib/dev-ai-analysis-bypass'

/** Mirrors Supabase Auth `email_confirmed_at` (magic link / OAuth) for app gating in `/api/auth/check`. */
function emailVerifiedFromSupabase(authUser: SupabaseAuthUser): boolean {
  return Boolean(authUser.email_confirmed_at)
}

/**
 * Upserts the Prisma `User` row for the signed-in Supabase identity.
 * `emailVerified` follows Supabase only (set true when `email_confirmed_at` is present); never downgrades here.
 */
export async function syncPrismaUserFromAuth(authUser: SupabaseAuthUser): Promise<PrismaUser | null> {
  const email = authUser.email?.toLowerCase().trim()
  if (!email) {
    return null
  }

  const metaType = authUser.user_metadata?.user_type as string | undefined
  const userType =
    metaType === 'vc' || metaType === 'investor'
      ? 'vc'
      : metaType === 'mentor' || metaType === 'founder'
        ? metaType
        : 'founder'

  const supabaseEmailVerified = emailVerifiedFromSupabase(authUser)

  let user = await db.user.findUnique({ where: { email } })

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        emailVerified: supabaseEmailVerified,
        userType,
      },
    })
    return user
  }

  const updates: { emailVerified?: boolean; userType?: string } = {}
  if (!user.emailVerified && supabaseEmailVerified) {
    updates.emailVerified = true
  }
  if (metaType && user.userType !== userType) {
    updates.userType = userType
  }

  if (Object.keys(updates).length > 0) {
    user = await db.user.update({
      where: { id: user.id },
      data: updates,
    })
  }

  return user
}

export async function getCurrentUser(_extendSession: boolean = true): Promise<PrismaUser | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser) {
      return null
    }

    return syncPrismaUserFromAuth(authUser)
  } catch {
    return null
  }
}

export async function getUserFromRequest(request: NextRequest): Promise<PrismaUser | null> {
  try {
    const authUser = await getSupabaseAuthUserFromRequest(request)
    if (!authUser) {
      return null
    }
    return syncPrismaUserFromAuth(authUser)
  } catch {
    return null
  }
}

/**
 * Supabase session, then dev AI-bypass cookie (local only).
 * Use for /founder/ai-analysis API routes.
 */
export async function getCurrentUserIncludingDevBypass(): Promise<PrismaUser | null> {
  const u = await getCurrentUser()
  if (u) return u
  if (!isDevAiAnalysisBypassEnabled()) return null
  try {
    const cookieStore = await cookies()
    const id = cookieStore.get(DEV_AI_BYPASS_COOKIE)?.value
    if (!id) return null
    const row = await db.user.findUnique({ where: { id } })
    const expected = getDevAiBypassEmail()
    if (!row || row.email !== expected) return null
    return row
  } catch {
    return null
  }
}

/**
 * Resolves the Prisma user for unified AI analysis routes.
 * Order: (1) session from this request, (2) normal server session + dev bypass cookie (dev only).
 * Never uses an implicit admin DB user — unauthenticated calls must not run paid pipelines as admin.
 */
export async function getUserForAiAnalysis(request?: NextRequest): Promise<PrismaUser | null> {
  if (request) {
    const fromReq = await getUserFromRequest(request)
    if (fromReq) return fromReq
  }
  const fromCookie = await getCurrentUserIncludingDevBypass()
  if (fromCookie) return fromCookie
  return null
}

/** @deprecated Legacy JWT session  -  use Supabase Auth. */
export async function setSessionCookie(_token: string, response?: NextResponse) {
  if (response) {
    return response
  }
}

/** @deprecated Legacy JWT session  -  use Supabase Auth. */
export async function clearSession() {
  const cookieStore = await cookies()
  const names = cookieStore.getAll().map((c) => c.name)
  for (const name of names) {
    if (name.startsWith('sb-')) {
      cookieStore.delete(name)
    }
  }
}
