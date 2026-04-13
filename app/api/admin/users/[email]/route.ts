import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { deleteAllApplicationDataForAccount } from '@/lib/delete-user-account-data'
import { logger } from '@/lib/logger'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'
import { sendUserApprovalStatus } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PatchAction = 'reject_signup' | 'revoke_access' | 'revoke_verification'

async function requireAdmin() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) {
    return null
  }
  return user
}

/**
 * Admin-only. reject_signup: decline pending signup. revoke_access: lock out (approval + founder ID). revoke_verification: founder ID only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rawEmail = params.email || ''
    const email = decodeURIComponent(rawEmail).toLowerCase().trim()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    if (isAdminEmail(email)) {
      return NextResponse.json({ error: 'Cannot change admin accounts' }, { status: 403 })
    }

    let body: { action?: PatchAction; reviewerEmail?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const action = body?.action
    if (action !== 'reject_signup' && action !== 'revoke_access' && action !== 'revoke_verification') {
      return NextResponse.json(
        { error: 'Invalid action', allowed: ['reject_signup', 'revoke_access', 'revoke_verification'] },
        { status: 400 }
      )
    }

    const reviewerEmail = (body.reviewerEmail as string) || admin.email
    const now = new Date()

    if (action === 'revoke_verification') {
      const existing = await db.founderVerification.findUnique({ where: { email } })
      if (!existing) {
        return NextResponse.json({ success: true, message: 'No founder verification on file', skipped: true })
      }
      await db.founderVerification.update({
        where: { email },
        data: {
          status: 'rejected',
          verifiedAt: now,
          reviewerEmail,
        },
      })
      logger.info('ADMIN_PATCH', `Revoked founder verification for ${email}`)
      return NextResponse.json({ success: true, action: 'revoke_verification' })
    }

    // reject_signup | revoke_access: always update UserApproval
    await db.userApproval.upsert({
      where: { email },
      create: {
        email,
        status: 'rejected',
        reviewedAt: now,
      },
      update: {
        status: 'rejected',
        reviewedAt: now,
      },
    })

    if (action === 'revoke_access') {
      await db.founderVerification
        .updateMany({
          where: { email },
          data: {
            status: 'rejected',
            verifiedAt: now,
            reviewerEmail,
          },
        })
        .catch(() => {})
    }

    try {
      await sendUserApprovalStatus(email, 'rejected')
    } catch {
      /* non-fatal */
    }

    logger.info('ADMIN_PATCH', `${action} for ${email}`)
    return NextResponse.json({ success: true, action })
  } catch (error: unknown) {
    const err = error as { message?: string }
    logger.error('ADMIN_PATCH', 'Failed:', err?.message || error)
    return NextResponse.json(
      { error: 'Failed to update user', message: err?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

// Danger: admin-only endpoint. Deletes user and related records by email.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rawEmail = params.email || ''
    const email = decodeURIComponent(rawEmail).toLowerCase().trim()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    if (isAdminEmail(email)) {
      return NextResponse.json({ error: 'Cannot delete admin accounts' }, { status: 403 })
    }

    logger.info('ADMIN_DELETE', `Starting deletion for email: ${email}`)

    // Find the User record first to get userId
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true }
    })

    if (!user) {
      logger.warn('ADMIN_DELETE', `User not found for email: ${email}`)
      return NextResponse.json({ error: 'User not found', email }, { status: 404 })
    }

    const userId = user.id

    try {
      await deleteAllApplicationDataForAccount(email, userId)

      logger.info('ADMIN_DELETE', `Successfully deleted account for: ${email}`)

      return NextResponse.json({
        success: true,
        email,
        message: `Account for ${email} has been completely deleted`,
      })
    } catch (deleteError: unknown) {
      const err = deleteError as { message?: string }
      logger.error('ADMIN_DELETE', `Error during deletion: ${err?.message}`, deleteError)
      throw deleteError
    }
  } catch (error: any) {
    logger.error('ADMIN_DELETE', 'Failed to delete user:', error?.message || error)
    return NextResponse.json(
      { error: 'Failed to delete user', message: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}


