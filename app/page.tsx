import HomeClient from '@/app/home-client'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'
import { getHomeDemoRubric } from '@/lib/home-demo-rubric'

export default async function HomePage() {
  const [count, homeDemoRubric] = await Promise.all([getVerifiedInvestorCount(), getHomeDemoRubric()])
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return (
    <HomeClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} homeDemoRubric={homeDemoRubric} />
  )
}
