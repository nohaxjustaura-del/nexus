import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
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

    // Delete all related data in correct order (respecting foreign key constraints)
    try {
      // 1. Delete UserCredits (linked by userId)
      await db.userCredits.deleteMany({
        where: { userId }
      }).catch(() => {})

      // 2. Delete Founders and all their related data
      const founders = await db.founder.findMany({
        where: { email }
      })
      
      for (const founder of founders) {
        // Delete all related founder data (cascade deletes handle most, but be explicit)
        await db.bookmark.deleteMany({ where: { founderId: founder.id } }).catch(() => {})
        await db.application.deleteMany({ where: { founderId: founder.id } }).catch(() => {})
        await db.matchScore.deleteMany({ where: { founderId: founder.id } }).catch(() => {})
        await db.resumeAnalysis.deleteMany({ where: { founderId: founder.id } }).catch(() => {})
        
        // Video pitches (cascade should handle, but be explicit)
        const videoPitches = await db.videoPitch.findMany({ where: { founderId: founder.id } }).catch(() => [])
        for (const pitch of videoPitches || []) {
          await db.videoPitchReview.deleteMany({ where: { videoPitchId: pitch.id } }).catch(() => {})
        }
        await db.videoPitch.deleteMany({ where: { founderId: founder.id } }).catch(() => {})
        
        // Delete founder
        await db.founder.delete({ where: { id: founder.id } }).catch(() => {})
      }

      // 3. Delete Investors and all their related data
      const investors = await db.investor.findMany({
        where: { email }
      })
      
      for (const investor of investors) {
        // Delete all related investor data
        await db.bookmark.deleteMany({ where: { investorId: investor.id } }).catch(() => {})
        await db.application.deleteMany({ where: { investorId: investor.id } }).catch(() => {})
        await db.matchScore.deleteMany({ where: { investorId: investor.id } }).catch(() => {})
        
        // Delete investor
        await db.investor.delete({ where: { id: investor.id } }).catch(() => {})
      }

      // 4. Delete VerificationCodes
      await db.verificationCode.deleteMany({
        where: { email }
      }).catch(() => {})

      // 5. Delete Waitlist entries
      await db.waitlist.deleteMany({
        where: { email }
      }).catch(() => {})

      // 6. Delete UserApproval entries
      await (db as any).userApproval?.deleteMany?.({
        where: { email }
      }).catch(() => {})

      // 7. Delete FounderVerification entries
      await (db as any).founderVerification?.deleteMany?.({
        where: { email }
      }).catch(() => {})

      // 8. Delete FounderContact entries
      await (db as any).founderContact?.deleteMany?.({
        where: { email }
      }).catch(() => {})

      // 9. Delete FounderPrefs entries
      await (db as any).founderPrefs?.deleteMany?.({
        where: { email }
      }).catch(() => {})

      // 10. Delete VCClaim entries
      await db.vCClaim.deleteMany({
        where: { email }
      }).catch(() => {})

      // 11. Finally, delete the User record
      await db.user.delete({
        where: { id: userId }
      })

      logger.info('ADMIN_DELETE', `Successfully deleted account for: ${email}`)

      return NextResponse.json({ 
        success: true, 
        email,
        message: `Account for ${email} has been completely deleted` 
      })
    } catch (deleteError: any) {
      logger.error('ADMIN_DELETE', `Error during deletion: ${deleteError?.message}`, deleteError)
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


