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
  return {
    approved: status === 'approved',
    status,
  }
}
