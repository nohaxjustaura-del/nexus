import PricingClient from '@/app/pricing/pricing-client'
import { getCurrentUser } from '@/lib/auth'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const user = await getCurrentUser().catch(() => null)
  const isAuthenticated = !!(user && user.emailVerified)

  const count = await getVerifiedInvestorCount()
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return <PricingClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} isAuthenticated={isAuthenticated} />
}
