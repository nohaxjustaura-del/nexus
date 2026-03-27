'use client'

import { useEffect, useState } from 'react'
import VCSearchSimple from "@/components/vc-search-simple"
import VCCardsGrid from "@/components/vc-cards-grid"
import Link from "next/link"

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
    checkMin: number | null
    checkMax: number | null
    applicationUrl: string | null
    websiteUrl: string | null
    twitterUrl: string | null
    verified: boolean | null
  }>
  profileComplete: boolean
}

export default function DiscoverClient({ investors, profileComplete }: DiscoverClientProps) {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const safeInvestors = Array.isArray(investors) ? investors : []

  useEffect(() => {
    fetch('/api/bookmarks', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.bookmarks) {
          const ids = new Set<string>(
            (data.bookmarks as { investor: { id: string } }[]).map((b) => b.investor.id)
          )
          setBookmarkedIds(ids)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <VCSearchSimple />
        </div>
        <Link
          href="/founder/ai-analysis"
          className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Analyze pitch for ranked matches →
        </Link>
      </div>

      {safeInvestors.length > 0 ? (
        <VCCardsGrid 
          investors={safeInvestors} 
          profileComplete={profileComplete}
          bookmarkedIds={bookmarkedIds}
          onBookmarkChange={(investorId: string, isBookmarked: boolean) => {
            setBookmarkedIds(prev => {
              const next = new Set(prev)
              if (isBookmarked) {
                next.add(investorId)
              } else {
                next.delete(investorId)
              }
              return next
            })
          }}
        />
      ) : (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No investors match. Try search or switch to &quot;All&quot; for the full directory.
        </div>
      )}
    </>
  )
}

