import { db } from '@/lib/db'
import { isAdminEmail } from '@/lib/constants'

export type UserApprovalStatus = 'pending' | 'approved' | 'rejected'

export async function resolveUserApprovalAccess(email: string): Promise<{
  approved: boolean
  status: UserApprovalStatus
}> {
  const normalized = email.toLowerCase().trim()
  if (isAdminEmail(normalized)) {
    return { approved: true, status: 'approved' }
  }
  const row = await db.userApproval.upsert({
    where: { email: normalized },
    create: { email: normalized, status: 'pending' },
    update: {},
  })
  const status = row.status as UserApprovalStatus
  // Only hard-reject "rejected" accounts. Pending users must still be able to complete
  // magic-link / OTP flows; /api/auth/check + founder verification gate product access.
  return {
    approved: status !== 'rejected',
    status,
  }
}
