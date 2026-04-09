import AboutClient from '@/app/about/about-client'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'
import type { Metadata } from 'next'

export const revalidate = 120

export const metadata: Metadata = {
  title: `About`,
  description:
    'NEXUS helps founders analyze pitch materials and get ranked shortlists of investors. Matches use verified mandates and fundraising-focused workflows, not a generic chat reply.',
  openGraph: {
    title: `About | NEXUS`,
    description:
      'Pitch analysis, verified investor data, and ranked shortlists with clear rationale for founders.',
  },
}

export default async function AboutPage() {
  const count = await getVerifiedInvestorCount()
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return <AboutClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
}
