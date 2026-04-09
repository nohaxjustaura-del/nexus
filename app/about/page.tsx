import AboutClient from '@/app/about/about-client'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: `About`,
  description:
    'NEXUS helps founders analyze pitch materials and get ranked investor shortlists from verified mandates, with fundraising-specific depth and workflow instead of a generic chat-style answer.',
  openGraph: {
    title: `About | NEXUS`,
    description:
      'Investor matching for founders: allocator-style pitch analysis, verified investor data, and ranked shortlists with rationale.',
  },
}

export default async function AboutPage() {
  const count = await getVerifiedInvestorCount()
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return <AboutClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
}
