import type { Metadata } from 'next'
import HomeClient from '@/app/home-client'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'
import { getHomeDemoRubric } from '@/lib/home-demo-rubric'
import { BRAND_DEFAULT_TITLE } from '@/lib/brand'

/** Align with cached investor count / demo rubric so the marketing home can be statically regenerated. */
export const revalidate = 120

export async function generateMetadata(): Promise<Metadata> {
  const count = await getVerifiedInvestorCount()
  const label = formatVerifiedInvestorCount(count)
  const description = `NEXUS is fundraising intelligence built for investor fit, not a spreadsheet, a static directory, or a one-off chat reply. It reads your pitch like an investor would, scores fit, and ranks ${label}+ verified VCs, angels, accelerators, and corporate venture arms. You get a shortlist tied to real mandates, not a generic list of who might invest.`
  const ogDescription = `${label}+ verified investors ranked to your story and stage. Shortlists, rationale, and outreach in one workflow, not a one-off answer from a general chat model.`
  return {
    description,
    openGraph: {
      title: BRAND_DEFAULT_TITLE,
      description: ogDescription,
    },
    twitter: {
      title: BRAND_DEFAULT_TITLE,
      description: ogDescription,
    },
  }
}

export default async function HomePage() {
  const [count, homeDemoRubric] = await Promise.all([getVerifiedInvestorCount(), getHomeDemoRubric()])
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return (
    <HomeClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} homeDemoRubric={homeDemoRubric} />
  )
}
