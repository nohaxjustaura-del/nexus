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
      <div className="mb-6 space-y-4">
        <VCSearchSimple />

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Want AI to find your best matches?
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Analyze your pitch first, then use Smart Match to rank investors by fit.
            </p>
          </div>
          <Link href="/founder/pitch-deck-analysis" className="shrink-0">
            <Button
              variant="outline"
              className="w-full sm:w-auto border-foreground/20 bg-background hover:bg-muted text-foreground"
            >
              <Sparkles className="mr-2 h-4 w-4 opacity-70" />
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

