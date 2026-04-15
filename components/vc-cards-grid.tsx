'use client'

import { useMemo } from 'react'
import VCCardClient from '@/components/vc-card-client'
import { generateInvestorSummary, truncateInvestorSummaryForCard } from '@/lib/investor-utils'

interface Investor {
  id: string
  firmName?: string | null
  name?: string | null
  email?: string | null
  sectors?: string | null
  stages?: string | null
  valueAddTags?: string | null
  proofPoints?: string | null
  geography?: string | null
  portfolio?: string | null
  notableInvestments?: string | null
  thesis?: string | null
  bio?: string | null
  fundSize?: string | null
  checkSizeMin?: number | null
  checkSizeMax?: number | null
  fundType?: string | null
  personalityType?: string | null
  decisionSpeed?: string | null
  leadFollow?: string | null
  ownershipTarget?: string | null
  checkMin?: number | null
  checkMax?: number | null
  applicationUrl?: string | null
  websiteUrl?: string | null
  verified?: boolean | null
  [key: string]: any
}

interface VCCardsGridProps {
  investors: Investor[]
  profileComplete: boolean
  bookmarkedIds?: Set<string>
  onBookmarkChange?: (investorId: string, isBookmarked: boolean) => void
}

function VCCardsGrid({ investors, profileComplete, bookmarkedIds, onBookmarkChange }: VCCardsGridProps) {
  const safeInvestors = useMemo(
    () => (Array.isArray(investors) ? investors : []),
    [investors],
  )

  const validInvestors = useMemo(
    () =>
      safeInvestors.filter((investor) => {
        return investor && typeof investor === 'object' && investor.id && investor.firmName
      }),
    [safeInvestors],
  )

  /** Same summary logic as the profile modal (thesis → bio → structured). */
  const generateFullDescription = (investor: Investor) => {
    if (!investor || typeof investor !== 'object' || !investor.firmName) {
      return 'No description available.'
    }
    return generateInvestorSummary({
      firmName: investor.firmName,
      fundType: investor.fundType ?? undefined,
      stages: investor.stages ?? undefined,
      sectors: investor.sectors ?? undefined,
      checkSizeMin: investor.checkSizeMin ?? investor.checkMin ?? undefined,
      checkSizeMax: investor.checkSizeMax ?? investor.checkMax ?? undefined,
      geography: investor.geography ?? undefined,
      geoFocus: investor.geoFocus ?? undefined,
      leadFollow: investor.leadFollow ?? undefined,
      valueAddTags: investor.valueAddTags ?? undefined,
      personalityType: investor.personalityType ?? undefined,
      decisionSpeed: investor.decisionSpeed ?? undefined,
      notableInvestments: investor.notableInvestments ?? undefined,
      proofPoints: investor.proofPoints ?? undefined,
      portfolio: investor.portfolio ?? undefined,
      thesis: investor.thesis ?? undefined,
      bio: investor.bio ?? undefined,
      fundSize: investor.fundSize ?? undefined,
    })
  }

  if (validInvestors.length === 0) {
    return null
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {validInvestors.map((investor) => {
        try {
          const fullDescription = generateFullDescription(investor)
          const truncatedDescription = truncateInvestorSummaryForCard(fullDescription, 150)
          const isYC = (investor.firmName || '')?.toLowerCase().includes('y combinator') || false
          
          // Ensure all VCs have an application link
          const applicationLink = investor.applicationUrl || investor.websiteUrl || (investor.email ? `mailto:${investor.email}?subject=Investment Inquiry` : null)

          return (
            <VCCardClient
              key={investor.id}
              investor={investor}
              profileComplete={profileComplete}
              isYC={isYC}
              description={truncatedDescription || fullDescription || 'No description available.'}
              fullDescription={fullDescription || truncatedDescription || 'No description available.'}
              applicationLink={applicationLink}
              isBookmarked={bookmarkedIds?.has(investor.id) || false}
              onBookmarkChange={onBookmarkChange}
            />
          )
        } catch (error) {
          // Skip invalid investor cards silently to prevent crashes
          return null
        }
      })}
    </div>
  )
}

export { VCCardsGrid }
export default VCCardsGrid

