import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { isAdminEmail } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      const res = NextResponse.json({ authenticated: false, verified: false })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res
    }

    let approved = false
    /** Used for dev auto-approve; undefined if approval read failed. */
    let signupApprovalStatus: string | undefined
    try {
      // Read-first: avoid a write on every poll (layout + nav used to upsert each time).
      let row = await db.userApproval.findUnique({
        where: { email: user.email },
      })
      if (!row) {
        try {
          row = await db.userApproval.create({
            data: { email: user.email, status: 'pending' },
          })
        } catch {
          row = await db.userApproval.findUnique({
            where: { email: user.email },
          })
        }
      }
      signupApprovalStatus = row?.status
      approved = row?.status === 'approved'
      // Founder ID verification (admin panel) updates FounderVerification, not always UserApproval.
      if (!approved) {
        const fv = await db.founderVerification.findUnique({
          where: { email: user.email },
        })
        if (fv?.status === 'approved') {
          approved = true
        }
      }
    } catch (approvalError) {
      logger.error('AUTH_CHECK', 'Approval check error', approvalError)
      approved = false
    }

    if (isAdminEmail(user.email) && !approved) {
      try {
        await db.userApproval.upsert({
          where: { email: user.email },
          create: {
            email: user.email,
            status: 'approved',
            reviewedAt: new Date(),
          },
          update: {
            status: 'approved',
            reviewedAt: new Date(),
          },
        })
        approved = true
        logger.log('AUTH_CHECK', `Auto-approved admin email: ${user.email}`)
      } catch (autoApproveErr) {
        approved = true
        logger.warn('AUTH_CHECK', 'Auto-approve DB update failed, granting access anyway')
      }
    }

    // Local dev: new accounts get UserApproval `pending`, while login still allows them through
    // resolveUserApprovalAccess — but founder routes require verified=true here, which left the hub
    // permanently blocked. Auto-approve pending signups in development only (opt out below).
    const devAutoApprove =
      process.env.NODE_ENV === 'development' &&
      process.env.DISABLE_DEV_APPROVAL_BYPASS !== '1' &&
      !approved &&
      signupApprovalStatus === 'pending'

    if (devAutoApprove) {
      try {
        await db.userApproval.update({
          where: { email: user.email },
          data: { status: 'approved', reviewedAt: new Date() },
        })
        approved = true
        logger.log('AUTH_CHECK', `Dev auto-approved pending signup: ${user.email}`)
      } catch {
        approved = true
        logger.warn('AUTH_CHECK', 'Dev auto-approve DB update failed; granting verified session anyway')
      }
    }

    const isAdmin = isAdminEmail(user.email)
    const isVerified = isAdmin || (user.emailVerified && approved)

    if (!isVerified) {
      const res = NextResponse.json({
        authenticated: true,
        verified: false,
        email: user.email,
        userEmail: user.email,
        isAdmin,
        needsApproval: !approved,
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
