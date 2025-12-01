import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Danger: admin-only endpoint. Deletes user and related records by email.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
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


