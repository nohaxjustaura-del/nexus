'use client'

import { useEffect, useState } from 'react'
import VCSearchSimple from "@/components/vc-search-simple"
import VCCardsGrid from "@/components/vc-cards-grid"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
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
    applicationUrl: string | null
    websiteUrl: string | null
    twitterUrl: string | null
    verified: boolean | null
  }>
  profileComplete: boolean
}

export default function DiscoverClient({ investors, profileComplete }: DiscoverClientProps) {
  const [mounted, setMounted] = useState(false)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  
  // Ensure investors is always an array
  const safeInvestors = Array.isArray(investors) ? investors : []

  useEffect(() => {
    setMounted(true)
    
    // Fetch all bookmarks once
    fetch('/api/bookmarks', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.bookmarks) {
          const ids = new Set<string>(
            (data.bookmarks as { investor: { id: string } }[]).map((b) => b.investor.id)
          )
          setBookmarkedIds(ids)
        }
      })
      .catch(() => {})
  }, [])

  if (!mounted) {
    return (
      <>
        <div className="mb-6">
          <div className="h-12 bg-muted rounded-md animate-pulse" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      {/* Search Bar + Smart Match */}
      <div className="mb-6 space-y-4">
        <VCSearchSimple />
        
        {/* Smart Match CTA */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/35 bg-gradient-to-r from-primary/10 via-card/60 to-purple-500/10 p-5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Want better-ranked matches?</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Analyze your pitch first, then use Smart Match to rank all 1,002 investors by fit
            </p>
          </div>
          <Link href="/founder/pitch-deck-analysis" className="shrink-0">
            <Button className="w-full rounded-full sm:w-auto">
              <Sparkles className="mr-2 h-4 w-4" />
              Get started
            </Button>
          </Link>
        </div>
      </div>

      {/* Investor Cards Grid */}
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
        <div className="text-center py-12 text-muted-foreground">
          <p>No investors found. Try adjusting your filters.</p>
        </div>
      )}
    </>
  )
}

