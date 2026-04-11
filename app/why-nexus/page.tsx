import WhyNexusClient from '@/app/why-nexus/why-nexus-client'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'
import type { Metadata } from 'next'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'Why NEXUS',
  description:
    'Why NEXUS beats spreadsheets, static databases, and generic AI for fundraising. Ranked investor shortlists from your pitch, not guesswork.',
  robots: { index: false, follow: false },
}

export default async function WhyNexusPage() {
  const count = await getVerifiedInvestorCount()
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return <WhyNexusClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
}
