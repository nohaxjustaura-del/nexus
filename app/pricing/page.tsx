import { redirect } from 'next/navigation'
import PricingClient from '@/app/pricing/pricing-client'
import { getCurrentUser } from '@/lib/auth'
import { formatVerifiedInvestorCount, getVerifiedInvestorCount } from '@/lib/investor-public-stats'

export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirect=/pricing')
  }
  if (!user.emailVerified) {
    redirect(`/verify?redirect=/pricing&email=${encodeURIComponent(user.email)}`)
  }

  const count = await getVerifiedInvestorCount()
  const verifiedInvestorCountLabel = formatVerifiedInvestorCount(count)
  return <PricingClient verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
}
