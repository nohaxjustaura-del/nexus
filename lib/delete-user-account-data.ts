import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

const log = (msg: string) => logger.info('ACCOUNT_PURGE', msg)

async function safe<T>(label: string, fn: () => Promise<T>): Promise<void> {
  try {
    await fn()
  } catch (e) {
    const err = e as { message?: string }
    logger.warn('ACCOUNT_PURGE', `${label}: ${err?.message || e}`)
  }
}

async function deleteFounderGraph(founderId: string, email: string) {
  await safe('vCFirmDeal', () => db.vCFirmDeal.deleteMany({ where: { founderId } }))

  await safe('notification founder', () => db.notification.deleteMany({ where: { founderId } }))

  await safe('profileMedia founder', () => db.profileMedia.deleteMany({ where: { founderId } }))
  await safe('achievement founder', () => db.achievement.deleteMany({ where: { founderId } }))
  await safe('savedSearch founder', () => db.savedSearch.deleteMany({ where: { founderId } }))

  await safe('referral founder', () =>
    db.referral.deleteMany({
      where: {
        OR: [
          { founderId },
          { referredEmail: email },
          { referredUserId: founderId },
          { AND: [{ referrerId: founderId }, { referrerType: 'founder' }] },
        ],
      },
    }),
  )

  await safe('profileView founder', () =>
    db.profileView.deleteMany({
      where: {
        OR: [{ viewerId: founderId }, { viewedId: founderId }],
      },
    }),
  )

  await safe('profileEndorsement founder', () =>
    db.profileEndorsement.deleteMany({
      where: {
        OR: [
          { AND: [{ endorserId: founderId }, { endorserType: 'founder' }] },
          { AND: [{ endorsedId: founderId }, { endorsedType: 'founder' }] },
        ],
      },
    }),
  )

  await safe('report founder', () =>
    db.report.deleteMany({
      where: {
        OR: [
          { AND: [{ reporterId: founderId }, { reporterType: 'founder' }] },
          { AND: [{ reportedId: founderId }, { reportedType: 'founder' }] },
        ],
      },
    }),
  )

  await safe('profilePrivacy founder', () => db.profilePrivacy.deleteMany({ where: { userId: founderId } }))
  await safe('matchInteraction founder', () => db.matchInteraction.deleteMany({ where: { founderId } }))

  await safe('bookmark founder', () => db.bookmark.deleteMany({ where: { founderId } }))
  await safe('application founder', () => db.application.deleteMany({ where: { founderId } }))
  await safe('matchScore founder', () => db.matchScore.deleteMany({ where: { founderId } }))
  await safe('resumeAnalysis founder', () => db.resumeAnalysis.deleteMany({ where: { founderId } }))

  const videoPitches = await db.videoPitch.findMany({ where: { founderId } }).catch(() => [] as { id: string }[])
  for (const pitch of videoPitches || []) {
    await safe('videoPitchReview', () => db.videoPitchReview.deleteMany({ where: { videoPitchId: pitch.id } }))
  }
  await safe('videoPitch founder', () => db.videoPitch.deleteMany({ where: { founderId } }))

  await safe('founder row', () => db.founder.delete({ where: { id: founderId } }))
}

async function deleteInvestorGraph(investorId: string, email: string) {
  await safe('vCFirmMember', () => db.vCFirmMember.deleteMany({ where: { investorId } }))

  await safe('notification investor', () => db.notification.deleteMany({ where: { investorId } }))

  await safe('profileMedia investor', () => db.profileMedia.deleteMany({ where: { investorId } }))
  await safe('achievement investor', () => db.achievement.deleteMany({ where: { investorId } }))
  await safe('savedSearch investor', () => db.savedSearch.deleteMany({ where: { investorId } }))

  await safe('referral investor', () =>
    db.referral.deleteMany({
      where: {
        OR: [
          { investorId },
          { referredEmail: email },
          { referredUserId: investorId },
          { AND: [{ referrerId: investorId }, { referrerType: 'investor' }] },
        ],
      },
    }),
  )

  await safe('profileView investor', () =>
    db.profileView.deleteMany({
      where: {
        OR: [{ viewerId: investorId }, { viewedId: investorId }],
      },
    }),
  )

  await safe('profileEndorsement investor', () =>
    db.profileEndorsement.deleteMany({
      where: {
        OR: [
          { AND: [{ endorserId: investorId }, { endorserType: 'investor' }] },
          { AND: [{ endorsedId: investorId }, { endorsedType: 'investor' }] },
        ],
      },
    }),
  )

  await safe('report investor', () =>
    db.report.deleteMany({
      where: {
        OR: [
          { AND: [{ reporterId: investorId }, { reporterType: 'investor' }] },
          { AND: [{ reportedId: investorId }, { reportedType: 'investor' }] },
        ],
      },
    }),
  )

  await safe('profilePrivacy investor', () => db.profilePrivacy.deleteMany({ where: { userId: investorId } }))
  await safe('matchInteraction investor', () => db.matchInteraction.deleteMany({ where: { investorId } }))

  await safe('bookmark investor', () => db.bookmark.deleteMany({ where: { investorId } }))
  await safe('application investor', () => db.application.deleteMany({ where: { investorId } }))
  await safe('matchScore investor', () => db.matchScore.deleteMany({ where: { investorId } }))

  await safe('investor row', () => db.investor.delete({ where: { id: investorId } }))
}

/**
 * Removes application database rows for this login (Prisma User id + email).
 * Does not delete the Supabase auth user or clear cookies — callers handle that.
 */
export async function deleteAllApplicationDataForAccount(emailRaw: string, prismaUserId: string): Promise<void> {
  const email = emailRaw.toLowerCase().trim()
  log(`start email=${email} userId=${prismaUserId}`)

  await safe('notification by prisma user id', () =>
    db.notification.deleteMany({ where: { userId: prismaUserId } }),
  )

  const founders = await db.founder.findMany({ where: { email } }).catch(() => [] as { id: string }[])
  for (const f of founders) {
    await deleteFounderGraph(f.id, email)
  }

  const investors = await db.investor.findMany({ where: { email } }).catch(() => [] as { id: string }[])
  for (const inv of investors) {
    await deleteInvestorGraph(inv.id, email)
  }

  await safe('mentor', () => db.mentor.deleteMany({ where: { email } }))

  await safe('userCredits', () => db.userCredits.deleteMany({ where: { userId: prismaUserId } }))

  await safe('verificationCode', () =>
    db.verificationCode.deleteMany({
      where: { OR: [{ email }, { userId: prismaUserId }] },
    }),
  )

  await safe('waitlist', () => db.waitlist.deleteMany({ where: { email } }))
  await safe('userApproval', () => db.userApproval.deleteMany({ where: { email } }))
  await safe('founderVerification', () => db.founderVerification.deleteMany({ where: { email } }))
  await safe('founderContact', () => db.founderContact.deleteMany({ where: { email } }))
  await safe('founderPrefs', () => db.founderPrefs.deleteMany({ where: { email } }))
  await safe('vCClaim', () => db.vCClaim.deleteMany({ where: { email } }))

  await safe('user row', () => db.user.delete({ where: { id: prismaUserId } }))

  log(`done email=${email}`)
}
