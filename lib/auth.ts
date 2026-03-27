import { db } from './db'
import type { User as PrismaUser } from '@prisma/client'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAuthUserFromRequest } from '@/lib/supabase/request-reader'
import { ADMIN_EMAIL } from '@/lib/constants'

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

/**
 * Returns the admin user from the DB. Used as a fallback for unauthenticated
 * requests on public-facing pages (e.g. AI analysis) so they can run with
 * admin-level access without requiring login.
 */
export async function getAdminUser(): Promise<PrismaUser | null> {
  try {
    return await db.user.findUnique({ where: { email: ADMIN_EMAIL.toLowerCase() } })
  } catch {
    return null
  }
}

/**
 * Tries to authenticate the current user via Supabase cookies.
 * If no session exists, falls back to the admin user so unauthenticated
 * visitors can still use the AI analysis features.
 */
export async function getCurrentUserOrAdmin(): Promise<PrismaUser | null> {
  const user = await getCurrentUser()
  if (user) return user
  return getAdminUser()
}

/**
 * Same as getUserFromRequest but falls back to the admin user.
 */
export async function getUserFromRequestOrAdmin(request: NextRequest): Promise<PrismaUser | null> {
  const user = await getUserFromRequest(request)
  if (user) return user
  return getAdminUser()
}

/** @deprecated Legacy JWT session — use Supabase Auth. */
export async function setSessionCookie(_token: string, response?: NextResponse) {
  if (response) {
    return response
  }
}

/** @deprecated Legacy JWT session — use Supabase Auth. */
export async function clearSession() {
  const cookieStore = await cookies()
  const names = cookieStore.getAll().map((c) => c.name)
  for (const name of names) {
    if (name.startsWith('sb-')) {
      cookieStore.delete(name)
    }
  }
}
