import { db } from './db'
import type { User as PrismaUser } from '@prisma/client'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAuthUserFromRequest } from '@/lib/supabase/request-reader'
import { ADMIN_EMAILS_ORDERED } from '@/lib/constants'
import {
  DEV_AI_BYPASS_COOKIE,
  getDevAiBypassEmail,
  isDevAiAnalysisBypassEnabled,
} from '@/lib/dev-ai-analysis-bypass'

export async function syncPrismaUserFromAuth(authUser: SupabaseAuthUser): Promise<PrismaUser | null> {
  const email = authUser.email?.toLowerCase().trim()
  if (!email) {
    return null
  }

  const metaType = authUser.user_metadata?.user_type as string | undefined
  const userType = metaType === 'vc' || metaType === 'mentor' || metaType === 'founder' ? metaType : 'founder'

  let user = await db.user.findUnique({ where: { email } })

  if (!user) {
    user = await db.user.create({
      data: {
        email,
        emailVerified: true,
        userType,
      },
    })
    return user
  }

  const updates: { emailVerified?: boolean; userType?: string } = {}
  if (!user.emailVerified) {
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

export async function getAdminUser(): Promise<PrismaUser | null> {
  if (ADMIN_EMAILS_ORDERED.length === 0) return null
  try {
    for (const email of ADMIN_EMAILS_ORDERED) {
      const u = await db.user.findUnique({ where: { email } })
      if (u) return u
    }
    return null
  } catch {
    return null
  }
}

/** Tries Supabase session first; falls back to admin user for analysis routes (scoring branch behavior). */
export async function getCurrentUserOrAdmin(): Promise<PrismaUser | null> {
  const user = await getCurrentUser()
  if (user) return user
  return getAdminUser()
}

/** Same as getUserFromRequest with admin fallback. */
export async function getUserFromRequestOrAdmin(
  request: NextRequest,
): Promise<PrismaUser | null> {
  const user = await getUserFromRequest(request)
  if (user) return user
  return getAdminUser()
}

/**
 * Supabase session, then dev AI-bypass cookie (local only), then admin fallback.
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

export async function getUserForAiAnalysis(request?: NextRequest): Promise<PrismaUser | null> {
  if (request) {
    const fromReq = await getUserFromRequest(request)
    if (fromReq) return fromReq
  }
  const fromCookie = await getCurrentUserIncludingDevBypass()
  if (fromCookie) return fromCookie
  return getAdminUser()
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
