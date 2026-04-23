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

function parseStringList(val: unknown, max = 50): string[] {
  return parseJSON(val)
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max)
}

type PageParams = { id: string } | Promise<{ id: string }>

async function resolveParamsId(params: PageParams): Promise<string> {
  const p = await Promise.resolve(params)
  return p.id
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const id = await resolveParamsId(params)
  const investor = await db.investor.findUnique({
    where: { id, isPublic: true },
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

export default async function InvestorProfilePage({ params }: { params: PageParams }) {
  const id = await resolveParamsId(params)

  const row = await db.investor.findUnique({
    where: { id, isPublic: true },
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
      foundedYear: true,
      partnerNames: true,
      activelyInvesting: true,
      lastDealDate: true,
      enrichedAt: true,
      portfolioCompanies: {
        orderBy: { investmentYear: 'desc' },
        select: {
          id: true,
          companyName: true,
          companyWebsite: true,
          sector: true,
          stage: true,
          investmentYear: true,
          investmentDate: true,
          amount: true,
          isLead: true,
          coInvestors: true,
          confidence: true,
        },
      },
      enrichmentCache: {
        select: { snapshot: true, recentDeals: true },
      },
    },
  })

  if (!row) notFound()

  const { enrichmentCache, portfolioCompanies: portfolioRows, ...investorBase } = row

  const enrichment = enrichmentCache
    ? {
        snapshot: enrichmentCache.snapshot ?? null,
        recentDeals: enrichmentCache.recentDeals ?? null,
      }
    : null

  const portfolioCompanies = portfolioRows.map(({ investmentDate, ...rest }) => ({
    ...rest,
    investmentDate: investmentDate?.toISOString() ?? null,
  }))

  const recentDealsParsed = parseJSON(enrichmentCache?.recentDeals) as unknown[]
  const recentDealKeys =
    recentDealsParsed[0] && typeof recentDealsParsed[0] === 'object'
      ? Object.keys(recentDealsParsed[0] as object).slice(0, 8)
      : []

  // #region agent log
  fetch('http://127.0.0.1:7471/ingest/0f685c44-f6c8-4b99-b23e-84e0cc9d4f08', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6d9bda' },
    body: JSON.stringify({
      sessionId: '6d9bda',
      location: 'app/investors/[id]/page.tsx:server',
      message: 'investor_profile_server_row',
      hypothesisId: 'H1-H6',
      data: {
        resolvedId: id,
        firmName: row.firmName,
        portfolioCompanyRows: portfolioRows.length,
        hasEnrichmentCacheRow: Boolean(enrichmentCache),
        snapshotChars: enrichmentCache?.snapshot?.length ?? 0,
        thesisChars: row.thesis?.length ?? 0,
        recentDealsParsedLen: recentDealsParsed.length,
        recentDealFirstKeys: recentDealKeys,
        foundedYear: row.foundedYear,
        partnerNamesDbType: typeof investorBase.partnerNames,
        sectorsJsonLen: typeof investorBase.sectors === 'string' ? investorBase.sectors.length : 0,
        stagesJsonLen: typeof investorBase.stages === 'string' ? investorBase.stages.length : 0,
        enrichedAt: investorBase.enrichedAt?.toISOString?.() ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  return (
    <InvestorProfileClient
      investor={{
        ...investorBase,
        lastDealDate: investorBase.lastDealDate?.toISOString() ?? null,
        enrichedAt: investorBase.enrichedAt?.toISOString() ?? null,
        partnerNames: parseStringList(investorBase.partnerNames, 5),
        portfolioCompanies,
        stages: parseJSON(investorBase.stages) as string[],
        sectors: parseJSON(investorBase.sectors) as string[],
        geoFocus: parseJSON(investorBase.geoFocus) as string[],
        geography: parseJSON(investorBase.geography) as string[],
        valueAddTags: parseJSON(investorBase.valueAddTags) as string[],
        portfolio: parseJSON(investorBase.portfolio) as PortfolioListItem[],
        proofPoints: parseJSON(investorBase.proofPoints) as string[],
      }}
      enrichment={
        enrichment
          ? {
              snapshot: enrichment.snapshot,
              recentDeals: recentDealsParsed as Array<{
                name?: string
                title?: string
                date?: string | null
                amount?: string
              }>,
            }
          : null
      }
    />
  )
}
