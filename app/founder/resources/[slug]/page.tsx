import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { getResourcePartner } from '@/lib/partner-resources'
import { ensureFounderResourcesPageAccess } from '@/lib/founder-resources-page-gate'

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

export default async function PartnerResourceDetailPage({ params }: Props) {
  if (!getResourcePartner(params.slug)) notFound()
  await ensureFounderResourcesPageAccess()
  return <PartnerResourcesClient partnerSlug={params.slug} />
}
