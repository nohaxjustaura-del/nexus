import HomeClient from '@/app/home-client'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'

export default async function HomePage() {
  const count = await getVerifiedInvestorCount()
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return <HomeClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
}
