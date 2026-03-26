import { db } from './db'
import type { User as PrismaUser } from '@prisma/client'
import type { User as SupabaseAuthUser } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAuthUserFromRequest } from '@/lib/supabase/request-reader'

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
