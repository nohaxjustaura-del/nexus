import type { Metadata } from 'next'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'
import { BRAND_NAME } from '@/lib/brand'
import InvestorLandingClient from '@/app/investor/investor-landing-client'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'Investors',
  description: `${BRAND_NAME} for investors, angels, and funds: claim a verified listing, keep your mandate current, and review structured founder applicants with exports, not another noisy inbound channel.`,
  openGraph: {
    title: `Investors Â· ${BRAND_NAME}`,
    description: `Claim your listing, review applicants, and export your pipeline on ${BRAND_NAME}.`,
  },
  twitter: {
    title: `Investors Â· ${BRAND_NAME}`,
    description: `Verified investor profiles, applicant review, and dashboard exports.`,
  },
}

export default async function InvestorLandingPage() {
  const count = await getVerifiedInvestorCount()
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return <InvestorLandingClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
}

