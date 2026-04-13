import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import PricingClient from '@/app/pricing/pricing-client'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'
import { BRAND_NAME } from '@/lib/brand'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function pricingReturnPath(searchParams: Record<string, string | string[] | undefined>): string {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') q.set(key, value)
    else if (Array.isArray(value) && value[0]) q.set(key, value[0])
  }
  const s = q.toString()
  return s ? `/pricing?${s}` : '/pricing'
}

export async function generateMetadata(): Promise<Metadata> {
  const count = await getVerifiedInvestorCount()
  const label = formatVerifiedInvestorCount(count)
  const description = `Transparent plans for founders matching to ${label}+ verified investors. Fundraising intelligence, shortlists, and workflow tools, not a generic list builder.`
  const ogDescription = `${label}+ verified investors, ranked to your pitch. See how ${BRAND_NAME} pricing maps to credits and workflow access.`
  return {
    title: 'Pricing',
    description,
    openGraph: {
      title: `Pricing · ${BRAND_NAME}`,
      description: ogDescription,
    },
    twitter: {
      title: `Pricing · ${BRAND_NAME}`,
      description: ogDescription,
    },
  }
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect(`/signup?next=${encodeURIComponent(pricingReturnPath(searchParams))}`)
  }

  const count = await getVerifiedInvestorCount()
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return <PricingClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
}
