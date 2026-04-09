import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { getResourcePartner } from '@/lib/partner-resources'

const PartnerResourcesClient = dynamic(() => import('../partner-resources-client'), {
  loading: () => (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      Loading resources…
    </div>
  ),
})

type Props = { params: { slug: string } }

export function generateMetadata({ params }: Props): Metadata {
  const p = getResourcePartner(params.slug)
  if (!p) return { title: 'Resources' }
  return {
    title: `${p.name} - Partner resources`,
    description: p.listDetail,
  }
}

export default function PartnerResourceDetailPage({ params }: Props) {
  if (!getResourcePartner(params.slug)) notFound()
  return <PartnerResourcesClient partnerSlug={params.slug} />
}
