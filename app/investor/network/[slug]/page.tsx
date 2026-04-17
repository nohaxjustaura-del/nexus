import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { getResourcePartner } from '@/lib/partner-resources'
import { ensureFounderNetworkPageAccess } from '@/lib/founder-network-page-gate'

const PartnerResourcesClient = dynamic(() => import('@/app/founder/network/partner-resources-client'), {
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Loading network...
    </div>
  ),
})

type Props = { params: { slug: string } }

export function generateMetadata({ params }: Props): Metadata {
  const partner = getResourcePartner(params.slug)
  if (!partner) return { title: 'Network' }
  return {
    title: `${partner.name} - Partner network`,
    description: partner.listDetail,
  }
}

export default async function InvestorPartnerResourceDetailPage({ params }: Props) {
  if (!getResourcePartner(params.slug)) notFound()
  await ensureFounderNetworkPageAccess()
  return <PartnerResourcesClient partnerSlug={params.slug} />
}
