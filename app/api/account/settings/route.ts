import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { getSupabaseAuthUserFromRequest } from '@/lib/supabase/request-reader'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const ALLOWED = new Set(['founder', 'mentor', 'vc', 'investor'])

function normalizeUserType(raw: unknown): 'founder' | 'mentor' | 'vc' | null {
  if (typeof raw !== 'string') return null
  const t = raw.toLowerCase().trim()
  if (!ALLOWED.has(t)) return null
  if (t === 'investor') return 'vc'
  if (t === 'mentor') return 'mentor'
  if (t === 'vc') return 'vc'
  return 'founder'
}

/**
 * Update account-level settings (e.g. portal role). Keeps Prisma User and Supabase
 * auth user_metadata.user_type aligned so sync does not overwrite on next request.
 */
export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { userType?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const normalized = normalizeUserType(body.userType)
  if (!normalized) {
    return NextResponse.json({ error: 'Invalid userType' }, { status: 400 })
  }

  const authUser = await getSupabaseAuthUserFromRequest(request)
  if (!authUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const metaType = normalized

  await db.user.update({
    where: { id: user.id },
    data: { userType: normalized },
  })

  try {
    const admin = createSupabaseAdminClient()
    const { error } = await admin.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        user_type: metaType,
      },
    })
    if (error) {
      console.error('Supabase admin updateUser failed:', error)
      return NextResponse.json(
        { error: 'Could not sync account type. Try again.' },
        { status: 500 },
      )
    }
  } catch (e) {
    console.error('Supabase admin client error:', e)
    return NextResponse.json(
      { error: 'Account type service is not configured.' },
      { status: 503 },
    )
  }

  return NextResponse.json({ success: true, userType: normalized })
}
