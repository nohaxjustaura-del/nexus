import { db } from '@/lib/db'
import { isAdminEmail } from '@/lib/constants'

export type UserApprovalStatus = 'pending' | 'approved' | 'rejected'

/**
 * Ensures a `UserApproval` row exists and is auto-approved when not rejected.
 * Only `rejected` blocks auth email flows; app access uses email verification in `/api/auth/check`.
 */
export async function resolveUserApprovalAccess(email: string): Promise<{
  approved: boolean
  status: UserApprovalStatus
}> {
  const normalized = email.toLowerCase().trim()
  if (isAdminEmail(normalized)) {
    return { approved: true, status: 'approved' }
  }

  const now = new Date()
  let row = await db.userApproval.findUnique({ where: { email: normalized } })
  if (!row) {
    row = await db.userApproval.create({
      data: { email: normalized, status: 'approved', reviewedAt: now },
    })
  } else if (row.status === 'pending') {
    row = await db.userApproval.update({
      where: { email: normalized },
      data: { status: 'approved', reviewedAt: now },
    })
  }

  const status = row.status as UserApprovalStatus
  return {
    approved: status !== 'rejected',
    status,
  }
}
