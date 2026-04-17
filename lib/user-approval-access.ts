import { db } from '@/lib/db'
import { isAdminEmail } from '@/lib/constants'

export type UserApprovalStatus = 'pending' | 'approved' | 'rejected'

/**
 * Ensures a `UserApproval` row exists for every signup.
 * Pending rows represent the waitlist and block app access until explicitly approved.
 */
export async function resolveUserApprovalAccess(email: string): Promise<{
  approved: boolean
  status: UserApprovalStatus
}> {
  const normalized = email.toLowerCase().trim()
  if (isAdminEmail(normalized)) {
    return { approved: true, status: 'approved' }
  }

  let row = await db.userApproval.findUnique({ where: { email: normalized } })
  if (!row) {
    row = await db.userApproval.create({
      data: { email: normalized, status: 'pending' },
    })
  }

  const status = row.status as UserApprovalStatus
  return {
    approved: status === 'approved',
    status,
  }
}
