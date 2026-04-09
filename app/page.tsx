import HomeClient from '@/app/home-client'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'
import { getHomeDemoRubric } from '@/lib/home-demo-rubric'

/** Align with cached investor count / demo rubric so the marketing home can be statically regenerated. */
export const revalidate = 120

export default async function HomePage() {
  const [count, homeDemoRubric] = await Promise.all([getVerifiedInvestorCount(), getHomeDemoRubric()])
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return (
    <HomeClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} homeDemoRubric={homeDemoRubric} />
  )
}
