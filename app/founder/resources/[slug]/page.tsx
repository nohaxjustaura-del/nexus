import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getResourcePartner } from '@/lib/partner-resources'
import PartnerResourcesClient from '../partner-resources-client'

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
