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

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const p = getResourcePartner(slug)
  if (!p) return { title: 'Network' }
  return {
    title: `${p.name} - Partner network`,
    description: p.listDetail,
  }
}

export default async function PartnerResourceDetailPage({ params }: Props) {
  const { slug } = await params
  if (!getResourcePartner(slug)) notFound()
  await ensureFounderNetworkPageAccess()
  return <PartnerResourcesClient partnerSlug={slug} />
}
