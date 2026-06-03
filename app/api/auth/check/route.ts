import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { isAdminEmail } from '@/lib/constants'
import { resolveUserApprovalAccess } from '@/lib/user-approval-access'
import { isTestSuperAccountEmail } from '@/lib/test-super-account'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      const res = NextResponse.json({ authenticated: false, verified: false })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res
    }

    const emailNorm = user.email.toLowerCase().trim()

    /** `UserApproval` is only used to hard-block rejected accounts; email verification unlocks the product. */
    let accountRejected = false
    try {
      await resolveUserApprovalAccess(emailNorm)
      const row = await db.userApproval.findUnique({ where: { email: emailNorm } })
      accountRejected = row?.status === 'rejected'
    } catch (approvalError) {
      logger.error('AUTH_CHECK', 'Approval check error', approvalError)
      accountRejected = false
    }

    if (isAdminEmail(user.email) && accountRejected) {
      try {
        await db.userApproval.upsert({
          where: { email: emailNorm },
          create: {
            email: emailNorm,
            status: 'approved',
            reviewedAt: new Date(),
          },
          update: {
            status: 'approved',
            reviewedAt: new Date(),
          },
        })
        accountRejected = false
        logger.log('AUTH_CHECK', `Cleared rejection for admin email: ${user.email}`)
      } catch {
        accountRejected = false
        logger.warn('AUTH_CHECK', 'Admin unblock DB update failed; granting access anyway')
      }
    }

    const isAdmin = isAdminEmail(user.email)
    const isTestSuper = isTestSuperAccountEmail(user.email)
    /** `emailVerified` on `User` is synced from Supabase `email_confirmed_at` in `syncPrismaUserFromAuth` (not a separate manual flag). */
    const isVerified = isAdmin || isTestSuper || (Boolean(user.emailVerified) && !accountRejected)

    if (!isVerified) {
      const res = NextResponse.json({
        authenticated: true,
        verified: false,
        email: user.email,
        userEmail: user.email,
        isAdmin,
        needsApproval: false,
        accountRejected,
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
        },
      })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res
    }

    const res = NextResponse.json({
      authenticated: true,
      verified: true,
      email: user.email,
      userEmail: user.email,
      isAdmin,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
    })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res
  } catch (error) {
    logger.error('AUTH_CHECK', 'Error checking auth', error)
    const res = NextResponse.json({ authenticated: false, verified: false })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res
  }
}
