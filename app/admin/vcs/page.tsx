import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'
import { redirect } from 'next/navigation'
import {
  loadAdminVcsInvestorsForDirectory,
  loadAdminVcClaimsForDirectory,
} from '@/lib/admin/vcs-directory-data'
import { AdminVcsClient } from './admin-vcs-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminVCsPage() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) {
    redirect('/')
  }

  let investors: Awaited<ReturnType<typeof loadAdminVcsInvestorsForDirectory>> = []
  let claims: Awaited<ReturnType<typeof loadAdminVcClaimsForDirectory>> = []
  let loadError: string | null = null

  try {
    ;[investors, claims] = await Promise.all([
      loadAdminVcsInvestorsForDirectory(),
      loadAdminVcClaimsForDirectory(),
    ])
  } catch (e) {
    console.error('[admin/vcs] initial load failed', e)
    loadError = 'Could not load VC data from the database. Try refreshing the page.'
  }

  const initialInvestors = investors.map((inv) => ({
    ...inv,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  }))

  const initialClaims = claims.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  return (
    <AdminVcsClient
      initialInvestors={initialInvestors}
      initialClaims={initialClaims}
      loadError={loadError}
    />
  )
}
