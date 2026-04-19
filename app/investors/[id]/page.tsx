import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'
import InvestorProfileClient, { type PortfolioListItem } from './investor-profile-client'

export const dynamic = 'force-dynamic'

function parseJSON(val: unknown): unknown[] {
  if (Array.isArray(val)) return val
  if (typeof val !== 'string') return []
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const investor = await db.investor.findUnique({
    where: { id: params.id, isPublic: true },
    select: { firmName: true, fundType: true, thesis: true },
  })
  if (!investor) return { title: 'Investor Not Found' }

  const desc = investor.thesis
    ? investor.thesis.slice(0, 155) + '...'
    : `${investor.firmName} - ${investor.fundType || 'Venture Capital'} investor profile on ${BRAND_NAME}.`
  return {
    title: `${investor.firmName} - ${BRAND_NAME}`,
    description: desc,
  }
}

export default async function InvestorProfilePage({ params }: { params: { id: string } }) {
  const investor = await db.investor.findUnique({
    where: { id: params.id, isPublic: true },
    select: {
      id: true,
      firmName: true,
      name: true,
      bio: true,
      verified: true,
      stages: true,
      sectors: true,
      geoFocus: true,
      geography: true,
      checkMin: true,
      checkMax: true,
      checkSizeMin: true,
      checkSizeMax: true,
      fundType: true,
      fundSize: true,
      leadFollow: true,
      thesis: true,
      portfolio: true,
      notableInvestments: true,
      proofPoints: true,
      valueAddTags: true,
      personalityType: true,
      decisionSpeed: true,
      ownershipTarget: true,
      websiteUrl: true,
      applicationUrl: true,
      twitterUrl: true,
      linkedinUrl: true,
      crunchbaseUrl: true,
    },
  })

  if (!investor) notFound()

  let enrichment: { snapshot: string | null; recentDeals: string | null } | null = null
  try {
    const cache = await (db as any).vCEnrichmentCache.findUnique({
      where: { investorId: params.id },
      select: { snapshot: true, recentDeals: true },
    })
    if (cache) {
      enrichment = {
        snapshot: cache.snapshot ?? null,
        recentDeals: cache.recentDeals ?? null,
      }
    }
  } catch {
    // enrichment cache may not exist
  }

  return (
    <InvestorProfileClient
      investor={{
        ...investor,
        stages: parseJSON(investor.stages) as string[],
        sectors: parseJSON(investor.sectors) as string[],
        geoFocus: parseJSON(investor.geoFocus) as string[],
        geography: parseJSON(investor.geography) as string[],
        valueAddTags: parseJSON(investor.valueAddTags) as string[],
        portfolio: parseJSON(investor.portfolio) as PortfolioListItem[],
        proofPoints: parseJSON(investor.proofPoints) as string[],
      }}
      enrichment={enrichment ? {
        snapshot: enrichment.snapshot,
        recentDeals: parseJSON(enrichment.recentDeals) as Array<{ name?: string; date?: string; amount?: string }>,
      } : null}
    />
  )
}
