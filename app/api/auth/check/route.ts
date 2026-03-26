import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ADMIN_EMAIL } from '@/lib/constants'

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
    try {
      // Avoid race-condition duplicates under concurrent auth checks.
      const row = await db.userApproval.upsert({
        where: { email: user.email },
        create: {
          email: user.email,
          status: 'pending',
        },
        update: {},
      })
      approved = row.status === 'approved'
    } catch (approvalError) {
      logger.error('AUTH_CHECK', 'Approval check error', approvalError)
      approved = false
    }

    if (user.email === ADMIN_EMAIL && !approved) {
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

    const isAdmin = user.email === ADMIN_EMAIL
    const isVerified = isAdmin || (user.emailVerified && approved)

    if (!isVerified) {
      const res = NextResponse.json({
        authenticated: true,
        verified: false,
        email: user.email,
        userEmail: user.email,
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
