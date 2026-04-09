import PricingClient from '@/app/pricing/pricing-client'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'

export const revalidate = 120

export default async function PricingPage() {
  const count = await getVerifiedInvestorCount()
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return <PricingClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
}
