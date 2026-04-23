'use client'

import { useEffect, useMemo, useState } from 'react'
import VCSearchSimple from '@/components/vc-search-simple'
import VCCardsGrid from '@/components/vc-cards-grid'
import InvestorTable from '@/components/investor-intelligence/InvestorTable'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LayoutGrid, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiscoverClientProps {
  /** When true (?all=1), show the full investor list (no server cap); expand virtualized window to match. */
  viewAll?: boolean
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

type ViewMode = 'table' | 'cards'

export default function DiscoverClient({
  investors,
  profileComplete,
  viewAll = false,
}: DiscoverClientProps) {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const safeInvestors = useMemo(() => (Array.isArray(investors) ? investors : []), [investors])
  const [visibleCount, setVisibleCount] = useState(() =>
    viewAll && Array.isArray(investors) ? investors.length : 24,
  )
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const hasMore = safeInvestors.length > visibleCount
  const visibleInvestors = useMemo(() => safeInvestors.slice(0, visibleCount), [safeInvestors, visibleCount])

  useEffect(() => {
    if (viewAll) {
      setVisibleCount(safeInvestors.length)
    } else {
      setVisibleCount(24)
    }
  }, [viewAll, safeInvestors.length])

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
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'table'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Table view"
            >
              <Table2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'cards'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Link
            href="/founder/ai-analysis"
            className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Analyze for ranked matches
          </Link>
        </div>
      </div>

      {safeInvestors.length > 0 ? (
        <>
          {viewMode === 'table' ? (
            <InvestorTable investors={visibleInvestors} totalCount={safeInvestors.length} />
          ) : (
            <VCCardsGrid
              investors={visibleInvestors}
              profileComplete={profileComplete}
              bookmarkedIds={bookmarkedIds}
              onBookmarkChange={(investorId: string, isBookmarked: boolean) => {
                setBookmarkedIds((prev) => {
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
          )}
          {hasMore ? (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + 24)}>
                Load 24 more investors
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No matches yet. Adjust search or switch to &quot;All&quot;.
        </div>
      )}
    </>
  )
}
