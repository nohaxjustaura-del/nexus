import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { canAccessFounderResources } from '@/lib/founder-resources-access'

/** Redirects to pricing when the session cannot access partner resources. */
export async function ensureFounderResourcesPageAccess() {
  const user = await getCurrentUser()
  if (!user) redirect('/pricing?from=resources')

  const uc = await db.userCredits.findUnique({
    where: { userId: user.id },
    select: { isPremium: true, purchases: true },
  })

  if (
    !canAccessFounderResources({
      isPremium: Boolean(uc?.isPremium),
      purchasesJson: uc?.purchases ?? null,
      email: user.email,
    })
  ) {
    redirect('/pricing?from=resources')
  }
}
