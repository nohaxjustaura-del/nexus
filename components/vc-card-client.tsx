'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, Crown, Target, Eye, Send } from "lucide-react"
import Link from "next/link"
import InvestorProfileModal from '@/components/investor-profile-modal'
import { parseJSON } from '@/lib/utils'
import { toast } from '@/components/ui/toast-simple'

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

  return (
    <>
      <Card
        className={`group relative flex h-full min-h-[280px] cursor-pointer flex-col overflow-hidden border-border/70 bg-gradient-to-b from-card via-card to-card/92 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_20px_48px_-28px_hsl(var(--primary)/0.35)] ${
          isYC ? 'ring-1 ring-primary/20' : 'ring-1 ring-white/[0.04]'
        }`}
        onClick={() => setIsModalOpen(true)}
      >
        {isYC && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60 opacity-90" />
        )}

        <CardHeader className="pb-3 pt-5 relative z-10 flex-1">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <CardTitle
                className={`text-lg font-semibold leading-tight text-foreground ${isYC ? 'tracking-tight' : ''}`}
              >
                {investor?.firmName || 'Unknown Firm'}
              </CardTitle>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {investor?.verified && (
                <Badge
                  variant="outline"
                  className="text-xs font-normal text-muted-foreground border-border bg-transparent"
                >
                  Verified
                </Badge>
              )}
              {investor?.fundType && (
                <Badge
                  variant="outline"
                  className="text-xs capitalize font-normal text-muted-foreground border-border"
                >
                  {investor.fundType}
                </Badge>
              )}
              {isYC && (
                <Badge variant="outline" className="text-xs font-normal text-foreground border-foreground/30">
                  Featured
                </Badge>
              )}
            </div>
          </div>
          
          {/* Description - truncated with "Read more" hint */}
          <div className="mb-4">
            <p className="text-sm text-foreground/85 leading-relaxed mb-2 font-medium">
              {description || fullDescription || 'No description available.'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsModalOpen(true)
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline flex items-center gap-1 font-medium transition-colors"
            >
              <Eye className="h-3 w-3" />
              View full description
            </button>
          </div>
          
          {/* Key Facts Row - stage, check, geo */}
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            {safeStages.length > 0 && (
              <div className="flex items-center gap-1 border border-border bg-muted/40 text-foreground px-2 py-1 rounded-md">
                <Target className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{safeStages.slice(0, 2).join(', ')}</span>
              </div>
            )}
            {investor?.checkSizeMin && investor?.checkSizeMax && (
              <div className="flex items-center gap-1 border border-border bg-muted/40 text-foreground px-2 py-1 rounded-md">
                <span className="font-medium tabular-nums">
                  ${investor.checkSizeMin >= 1000 ? `${Math.round(investor.checkSizeMin/1000)}M` : `${investor.checkSizeMin}k`}–
                  ${investor.checkSizeMax >= 1000 ? `${Math.round(investor.checkSizeMax/1000)}M` : `${investor.checkSizeMax}k`}
                </span>
              </div>
            )}
            {investor?.leadFollow && (
              <div className="flex items-center gap-1 border border-border bg-muted/40 text-foreground px-2 py-1 rounded-md">
                <span className="font-medium capitalize">{investor.leadFollow === 'lead' ? 'Leads' : investor.leadFollow === 'follow' ? 'Follows' : 'Either'}</span>
              </div>
            )}
          </div>
          
          {/* Sectors - max 3 */}
          {safeSectors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {safeSectors.slice(0, 3).map((sector: string, i: number) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs font-normal text-muted-foreground border-border"
                >
                  {sector}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="pb-4 relative z-10 flex-1">
          {/* Differentiator chips - max 3, unique only */}
          <div className="space-y-2.5">
            {safeValueAdd.length > 0 && (() => {
              // Filter out generic/duplicate tags
              const uniqueTags = safeValueAdd.filter((tag: string) => {
                const lower = tag.toLowerCase()
                // Keep only specific, non-generic tags
                return !lower.includes('focused') && 
                       !lower.includes('invests') && 
                       !lower.includes('additional') &&
                       tag.length < 25 // Keep it concise
              }).slice(0, 3) // Max 3
              
              return uniqueTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {uniqueTags.map((tag: string, i: number) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs font-normal border-border text-muted-foreground"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )
            })()}
            
            {proofPoints && (Array.isArray(proofPoints) ? proofPoints.length > 0 : Object.keys(proofPoints).length > 0) && (
              <div className="text-xs text-muted-foreground border border-border/60 bg-muted/30 px-2 py-1.5 rounded-md">
                <span className="font-semibold text-foreground/85">Focus: </span>
                {Array.isArray(proofPoints) 
                  ? proofPoints.slice(0, 2).join(', ')
                  : (() => {
                      const firstKey = Object.keys(proofPoints)[0]
                      const firstValue = (proofPoints as any)[firstKey]
                      if (Array.isArray(firstValue)) {
                        return firstValue.slice(0, 2).join(', ')
                      }
                      return firstKey
                    })()
                }
              </div>
            )}
            
            {investor?.personalityType && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="font-semibold text-foreground/85">Style:</span>
                <span className="capitalize">{String(investor.personalityType).replace('-', ' ')}</span>
              </div>
            )}
            
            {investor?.leadFollow && investor.leadFollow !== 'either' && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="font-semibold text-foreground/85">
                  {investor.leadFollow === 'lead' ? '✓ Leads' : 'Follows'} rounds
                </span>
                {investor?.decisionSpeed && (
                  <span className="text-muted-foreground">• {investor.decisionSpeed}</span>
                )}
              </div>
            )}
          </div>
          
          {/* YC Insider subsection - only for Y Combinator */}
          {isYC && (
            <div className="mt-4 pt-4 border-t border-border">
              <Link
                href="/founder/yc-insider"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 text-xs font-medium border border-border rounded-md px-3 py-2 text-foreground hover:bg-muted/50 transition-colors"
              >
                <Crown className="h-4 w-4 text-muted-foreground" />
                <span>YC Insider: tips and office hours</span>
              </Link>
            </div>
          )}
        </CardContent>

        <CardFooter className="mt-auto flex items-center gap-2 pt-4 border-t border-border/80 relative z-10 bg-muted/15">
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

