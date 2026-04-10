import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { getResourcePartner } from '@/lib/partner-resources'
import { ensureFounderNetworkPageAccess } from '@/lib/founder-network-page-gate'

const PartnerResourcesClient = dynamic(() => import('../partner-resources-client'), {
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Loading network…
    </div>
  ),
})

type Props = { params: { slug: string } }

export function generateMetadata({ params }: Props): Metadata {
  const p = getResourcePartner(params.slug)
  if (!p) return { title: 'Network' }
  return {
    title: `${p.name} - Partner network`,
    description: p.listDetail,
  }
}

export default async function PartnerResourceDetailPage({ params }: Props) {
  if (!getResourcePartner(params.slug)) notFound()
  await ensureFounderNetworkPageAccess()
  return <PartnerResourcesClient partnerSlug={params.slug} />
}
