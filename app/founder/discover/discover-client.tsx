'use client'

import { Suspense } from 'react'
import VCSearchWrapperClient from "@/components/vc-search-wrapper-client"
import VCCardsGrid from "@/components/vc-cards-grid"

interface DiscoverClientProps {
  investors: Array<{
    id: string
    firmName: string | null
    name: string | null
    email: string | null
    sectors: string | null
    stages: string | null
    valueAddTags: string | null
    proofPoints: string | null
    portfolio: string | null
    notableInvestments: string | null
    thesis: string | null
    fundType: string | null
    personalityType: string | null
    decisionSpeed: string | null
    leadFollow: string | null
    ownershipTarget: string | null
    applicationUrl: string | null
    websiteUrl: string | null
    twitterUrl: string | null
    verified: boolean | null
  }>
  profileComplete: boolean
}

export default function DiscoverClient({ investors, profileComplete }: DiscoverClientProps) {
  // Ensure investors is always an array
  const safeInvestors = Array.isArray(investors) ? investors : []

  return (
    <>
      {/* Search Bar */}
      <div className="mb-6">
        <Suspense fallback={<div className="h-10 bg-slate-100 rounded-md animate-pulse" />}>
          <VCSearchWrapperClient />
        </Suspense>
      </div>

      {/* Investor Cards Grid */}
      <Suspense fallback={
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      }>
        {safeInvestors.length > 0 ? (
          <VCCardsGrid 
            investors={safeInvestors} 
            profileComplete={profileComplete} 
          />
        ) : (
          <div className="text-center py-12 text-slate-600">
            <p>No investors found. Try adjusting your filters.</p>
          </div>
        )}
      </Suspense>
    </>
  )
}

