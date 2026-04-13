import type { Metadata } from 'next'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'
import { BRAND_NAME } from '@/lib/brand'
import FounderLandingClient from '@/app/founder/founder-landing-client'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'Founders',
  description: `${BRAND_NAME} for founders: allocator-style pitch analysis, ranked investor matches from verified VCs and angels, discovery, crash courses, and outreach workflow, not generic AI lists.`,
  openGraph: {
    title: `Founders · ${BRAND_NAME}`,
    description: `Pitch analysis, investor discovery, and ranked shortlists from verified mandates.`,
  },
  twitter: {
    title: `Founders · ${BRAND_NAME}`,
    description: `Pitch analysis, discovery, and ranked investor shortlists in one workspace.`,
  },
}

export default async function FounderLandingPage() {
  const count = await getVerifiedInvestorCount()
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return <FounderLandingClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
}
