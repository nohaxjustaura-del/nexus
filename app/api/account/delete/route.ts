import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getSupabaseAuthUserFromRequest } from '@/lib/supabase/request-reader'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseAuthRouteClient } from '@/lib/supabase/route-handler'
import { deleteAllApplicationDataForAccount } from '@/lib/delete-user-account-data'
import { isAdminEmail } from '@/lib/constants'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Self-service account deletion: removes Prisma application data, deletes the Supabase auth user, and signs out.
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (isAdminEmail(user.email)) {
    return NextResponse.json(
      { error: 'Admin accounts cannot be deleted through this flow.' },
      { status: 403 },
    )
  }

  let body: { confirmEmail?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const confirm =
    typeof body.confirmEmail === 'string' ? body.confirmEmail.trim().toLowerCase() : ''
  const accountEmail = user.email.toLowerCase().trim()
  if (!confirm || confirm !== accountEmail) {
    return NextResponse.json(
      { error: 'Type your account email exactly to confirm deletion.' },
      { status: 400 },
    )
  }

  const authUser = await getSupabaseAuthUserFromRequest(request)
  if (!authUser?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await deleteAllApplicationDataForAccount(accountEmail, user.id)
  } catch (e) {
    logger.error('ACCOUNT_DELETE', `Prisma purge failed: ${String(e)}`)
    return NextResponse.json(
      { error: 'Could not complete account deletion. Try again or contact support.' },
      { status: 500 },
    )
  }

  try {
    const admin = createSupabaseAdminClient()
    const { error } = await admin.auth.admin.deleteUser(authUser.id)
    if (error) {
      logger.error('ACCOUNT_DELETE', `Supabase deleteUser failed: ${error.message}`)
      return NextResponse.json(
        {
          error:
            'Your app data was removed, but your login could not be deleted automatically. Contact support so we can finish removing your auth account.',
        },
        { status: 503 },
      )
    }
  } catch (e) {
    logger.error('ACCOUNT_DELETE', `Supabase admin error: ${String(e)}`)
    return NextResponse.json(
      {
        error:
          'Your app data was removed, but the login service is not configured to remove your credentials. Contact support.',
      },
      { status: 503 },
    )
  }

  const { supabase, applyAuthCookies } = createSupabaseAuthRouteClient(request)
  await supabase.auth.signOut()
  const res = NextResponse.json({ success: true })
  applyAuthCookies(res)
  return res
}
