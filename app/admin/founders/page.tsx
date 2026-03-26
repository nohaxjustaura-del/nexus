import { FounderVerificationReviewPanel } from '@/components/admin/founder-verification-review-panel'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdminEmail } from '@/lib/constants'
import {
  enrichFounderVerifications,
  serializeFounderVerificationRows,
} from '@/lib/admin/founder-verifications'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminFoundersPage() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) {
    redirect('/')
  }

  const [pendingRows, recentDoneRows] = await Promise.all([
    db.founderVerification.findMany({
      where: { status: 'pending' },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    }),
    db.founderVerification.findMany({
      where: { status: { not: 'pending' } },
      orderBy: { verifiedAt: 'desc' },
      take: 25,
    }),
  ])

  const pendingEnriched = await enrichFounderVerifications(pendingRows)
  const recentEnriched = await enrichFounderVerifications(recentDoneRows)

  const pending = serializeFounderVerificationRows(pendingEnriched)
  const recentDecisions = serializeFounderVerificationRows(recentEnriched)

  return (
    <div className="container mx-auto px-4 py-8">
      <FounderVerificationReviewPanel pending={pending} recentDecisions={recentDecisions} />
    </div>
  )
}
