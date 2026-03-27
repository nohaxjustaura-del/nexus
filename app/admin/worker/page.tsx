import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdminEmail } from '@/lib/constants'
import { WorkerDashboardClient } from './worker-dashboard-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function WorkerDashboardPage() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) {
    redirect('/')
  }

  return <WorkerDashboardClient />
}
