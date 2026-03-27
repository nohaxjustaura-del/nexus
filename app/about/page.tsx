import AboutClient from '@/app/about/about-client'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: `About`,
  description:
    'NEXUS helps founders analyze pitch materials, explore a verified investor directory, and get ranked shortlists aligned to stage, sector, and thesis.',
  openGraph: {
    title: `About | NEXUS`,
    description:
      'Investor matching for founders: AI-assisted analysis, verified investor data, and ranked match shortlists.',
  },
}

export default async function AboutPage() {
  const count = await getVerifiedInvestorCount()
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return <AboutClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
}
