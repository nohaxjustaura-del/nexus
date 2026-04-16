import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { isAdminEmail } from '@/lib/constants'
import { canAccessFounderNetwork } from '@/lib/founder-network-access'

/** Redirects to pricing when the session cannot access the founder network hub. */
export async function ensureFounderNetworkPageAccess() {
  const user = await getCurrentUser()
  if (!user) {
    redirect(`/signup?next=${encodeURIComponent('/pricing?from=network')}`)
  }

  if (isAdminEmail(user.email)) return

  const [uc, approval, investor] = await Promise.all([
    db.userCredits.findUnique({
      where: { userId: user.id },
      select: { isPremium: true, purchases: true },
    }),
    db.userApproval.findUnique({
      where: { email: user.email },
      select: { status: true },
    }),
    db.investor.findUnique({
      where: { email: user.email },
      select: { verified: true },
    }),
  ])

  if (
    !canAccessFounderNetwork({
      isPremium: Boolean(uc?.isPremium),
      purchasesJson: uc?.purchases ?? null,
      email: user.email,
      userApprovalStatus: approval?.status ?? null,
      investorVerified: Boolean(investor?.verified),
    })
  ) {
    redirect('/pricing?from=network')
  }
}
