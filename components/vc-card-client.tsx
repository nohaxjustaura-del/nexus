'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, Library, Send } from "lucide-react"
import Link from "next/link"
import InvestorProfileModal from '@/components/investor-profile-modal'
import { parseJSON, fmtCheckRange } from '@/lib/utils'
import { toast } from '@/components/ui/toast-simple'
import { legacyNexusExtrasEnabled } from '@/lib/nexus-surface-flags'

const SIGNUP_NETWORK_PRICING = `/signup?next=${encodeURIComponent('/pricing?from=network')}`

interface VCCardClientProps {
  investor: any
  profileComplete: boolean
  isYC: boolean
  description: string
  fullDescription: string
  applicationLink: string | null
  isBookmarked?: boolean
  onBookmarkChange?: (investorId: string, isBookmarked: boolean) => void
}

export function VCCardClient({ 
  investor, 
  profileComplete, 
  isYC, 
  description, 
  fullDescription,
  applicationLink,
  isBookmarked: isBookmarkedProp,
  onBookmarkChange
}: VCCardClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(isBookmarkedProp || false)
  const [networkHref, setNetworkHref] = useState('/pricing?from=network')

  useEffect(() => {
    if (!isYC) return
    let cancelled = false
    fetch('/api/account/capabilities', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (legacyNexusExtrasEnabled() && data?.authenticated && data.canAccessFounderNetwork) {
          setNetworkHref('/founder/network')
        } else if (data?.authenticated) {
          setNetworkHref('/pricing?from=network')
        } else {
          setNetworkHref(SIGNUP_NETWORK_PRICING)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isYC])

  // Update local state when prop changes
  useEffect(() => {
    setIsBookmarked(isBookmarkedProp || false)
  }, [isBookmarkedProp])

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ investorId: investor.id }),
      })

      const data = await response.json()
      const newBookmarkState = data.bookmarked
      setIsBookmarked(newBookmarkState)
      
      // Notify parent component
      if (onBookmarkChange) {
        onBookmarkChange(investor.id, newBookmarkState)
      }
      
      toast.success(newBookmarkState ? 'Bookmarked!' : 'Bookmark removed')
    } catch (error) {
      toast.error('Failed to update bookmark')
    }
  }

  // Removed handleQuickApply - now just direct link to application URL

  // Guard against missing investor data with more thorough checks
  if (!investor || typeof investor !== 'object' || !investor.id) {
    return null
  }

  // Use safe JSON parsing with fallbacks
  let sectors: string[] = []
  let stages: string[] = []
  let valueAdd: string[] = []
  let proofPoints: any = {}
  
  try {
    sectors = parseJSON<string[]>(investor?.sectors, [])
    stages = parseJSON<string[]>(investor?.stages, [])
    valueAdd = parseJSON<string[]>(investor?.valueAddTags, [])
    proofPoints = parseJSON<any>(investor?.proofPoints, {})
  } catch (error) {
    // Silently continue with empty defaults
  }
  
  // Ensure arrays are actually arrays
  const safeSectors = Array.isArray(sectors) ? sectors : []
  const safeStages = Array.isArray(stages) ? stages : []
  const safeValueAdd = Array.isArray(valueAdd) ? valueAdd : []

  const checkMin = investor?.checkMin ?? investor?.checkSizeMin
  const checkMax = investor?.checkMax ?? investor?.checkSizeMax
  const raw = fmtCheckRange(checkMin, checkMax)
  const checkLabel = raw !== 'N/A' ? raw : null

  const uniqueValueTags = safeValueAdd
    .filter((tag: string) => {
      const lower = tag.toLowerCase()
      return (
        !lower.includes('focused') &&
        !lower.includes('invests') &&
        !lower.includes('additional') &&
        tag.length < 28
      )
    })
    .slice(0, 2)

  return (
    <>
      <Card
        className={`group flex h-full cursor-pointer flex-col border-border bg-card shadow-sm transition-shadow hover:border-border hover:shadow-md ${
          isYC ? 'ring-1 ring-primary/15' : ''
        }`}
        onClick={() => setIsModalOpen(true)}
      >
        <CardHeader className="space-y-3 pb-3 pt-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base font-semibold leading-snug">
              {investor?.firmName || 'Unknown Firm'}
            </CardTitle>
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {investor?.verified && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Verified
                </Badge>
              )}
              {isYC && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  Featured
                </Badge>
              )}
            </div>
          </div>

          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {description || fullDescription || 'No description yet.'}
          </p>

          <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            {safeStages.length > 0 && (
              <span className="rounded-md bg-muted/80 px-2 py-0.5 font-medium text-foreground">
                {safeStages.slice(0, 2).join(' · ')}
              </span>
            )}
            {checkLabel && (
              <span className="rounded-md bg-muted/80 px-2 py-0.5 font-medium tabular-nums text-foreground">
                {checkLabel}
              </span>
            )}
            {investor?.leadFollow && (
              <span className="rounded-md bg-muted/80 px-2 py-0.5 font-medium capitalize text-foreground">
                {investor.leadFollow === 'lead' ? 'Leads' : investor.leadFollow === 'follow' ? 'Follows' : 'Lead or follow'}
              </span>
            )}
            {investor?.decisionSpeed && (
              <span className="rounded-md px-2 py-0.5">{investor.decisionSpeed}</span>
            )}
          </div>

          {safeSectors.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {safeSectors.slice(0, 4).map((sector: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[10px] font-normal text-muted-foreground">
                  {sector}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-2 pb-3 pt-0">
          {uniqueValueTags.length > 0 && (
            <p className="line-clamp-2 text-[11px] text-muted-foreground">{uniqueValueTags.join(' · ')}</p>
          )}

          {isYC && (
            <Link
              href={networkHref}
              onClick={(e) => e.stopPropagation()}
              className="mt-auto flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-muted/50"
            >
              <Library className="h-3.5 w-3.5 text-muted-foreground" />
              Network
            </Link>
          )}
        </CardContent>

        <CardFooter className="mt-auto flex gap-2 border-t border-border/60 bg-muted/20 px-4 py-3">
          {profileComplete ? (
            <>
              {applicationLink ? (
                <a
                  href={applicationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    className="w-full font-medium bg-foreground text-background hover:bg-foreground/90"
                    size="sm"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Apply
                  </Button>
                </a>
              ) : investor?.email ? (
                <a
                  href={`mailto:${investor.email}?subject=Investment Inquiry`}
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button className="w-full font-medium bg-foreground text-background hover:bg-foreground/90" size="sm">
                    Contact ↗
                  </Button>
                </a>
              ) : (
                <Button className="flex-1 cursor-not-allowed bg-muted font-medium text-muted-foreground" size="sm" disabled>
                  Contact N/A
                </Button>
              )}
            </>
          ) : (
            <Link
              href="/founder/onboarding"
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button className="w-full font-medium border-border hover:bg-muted" size="sm" variant="outline">
                Complete profile
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`shrink-0 rounded-md border border-transparent ${
              isBookmarked
                ? 'text-foreground bg-muted hover:bg-muted/80'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            onClick={handleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this VC'}
          >
            <Heart className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
        </CardFooter>
      </Card>

      {/* Modal */}
      {investor && (
        <InvestorProfileModal
          investor={investor}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          profileComplete={profileComplete}
          isBookmarked={isBookmarked}
          onBookmarkChange={(investorId: string, newState: boolean) => {
            setIsBookmarked(newState)
            if (onBookmarkChange) {
              onBookmarkChange(investorId, newState)
            }
          }}
        />
      )}
    </>
  )
}

// Ensure default export for compatibility
export default VCCardClient

