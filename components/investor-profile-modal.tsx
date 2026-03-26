'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, Heart, Copy, Send, Eye, Target, MapPin, Clock, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/toast-simple'
import {
  formatCheckSize,
  normalizeStage,
  dedupeAndClean,
  getIntroPreference,
  getDecisionSpeed,
  generateInvestorSummary,
  generateFitBullets,
  generateAvoidBullets,
} from '@/lib/investor-utils'
import { parseJSON } from '@/lib/utils'

interface InvestorProfileModalProps {
  investor: any
  isOpen: boolean
  onClose: () => void
  profileComplete: boolean
  isBookmarked?: boolean
  onBookmarkChange?: (investorId: string, isBookmarked: boolean) => void
}

export function InvestorProfileModal({ 
  investor, 
  isOpen, 
  onClose, 
  profileComplete,
  isBookmarked: isBookmarkedProp = false,
  onBookmarkChange
}: InvestorProfileModalProps) {
  const [mounted, setMounted] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(isBookmarkedProp)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync with parent prop
  useEffect(() => {
    setIsBookmarked(isBookmarkedProp)
  }, [isBookmarkedProp])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!mounted || !isOpen || !investor) return null

  // Parse data
  const stages = parseJSON<string[]>(investor.stages, [])
  const sectors = parseJSON<string[]>(investor.sectors, [])
  const geo = parseJSON<string[]>(investor.geography || investor.geoFocus, [])
  const valueAdd = parseJSON<string[]>(investor.valueAddTags, [])
  const portfolio = parseJSON<any[]>(investor.portfolio, [])
  const notableInvestments = parseJSON<string[]>(investor.notableInvestments, [])

  // Clean data
  const cleanStages = stages.map(normalizeStage)
  const cleanSectors = dedupeAndClean(sectors)
  const cleanGeo = dedupeAndClean(geo)

  // Generate content
  const summary = generateInvestorSummary(investor)
  const fitBullets = generateFitBullets(investor)
  const avoidBullets = generateAvoidBullets(investor)
  const introPreference = getIntroPreference(investor)
  const decisionSpeed = getDecisionSpeed(investor.decisionSpeed)

  // Determine CTA
  const isCorporateVC = investor.fundType === 'CVC' || investor.fundType === 'corporate'
  const isAccelerator = investor.fundType === 'accelerator'
  
  let primaryCTA = { label: 'View Details', icon: Eye, action: () => {} }
  let secondaryCTA = { label: 'Website', icon: ExternalLink, url: investor.websiteUrl }

  if (isCorporateVC) {
    if (introPreference === 'Warm intro preferred') {
      primaryCTA = { label: 'Request Intro', icon: Send, action: () => toast.success('Intro request coming soon!') }
    } else if (investor.email) {
      primaryCTA = { 
        label: 'Draft Partnership Email', 
        icon: Send, 
        action: () => window.open(`mailto:${investor.email}?subject=Partnership Inquiry - ${investor.firmName}`, '_blank')
      }
    } else if (investor.websiteUrl) {
      primaryCTA = { label: 'Visit Website', icon: ExternalLink, action: () => window.open(investor.websiteUrl, '_blank') }
    }
  } else if (isAccelerator) {
    if (investor.applicationUrl) {
      primaryCTA = { 
        label: 'Apply to Program', 
        icon: Send, 
        action: () => window.open(investor.applicationUrl, '_blank')
      }
    }
  } else {
    // Traditional VC
    if (investor.applicationUrl) {
      primaryCTA = { 
        label: 'Open Intake Form', 
        icon: Send, 
        action: () => window.open(investor.applicationUrl, '_blank')
      }
    } else if (introPreference === 'Warm intro preferred') {
      primaryCTA = { label: 'Request Intro', icon: Send, action: () => toast.success('Intro request coming soon!') }
    } else if (investor.email) {
      primaryCTA = { 
        label: 'Draft Outreach', 
        icon: Send, 
        action: () => window.open(`mailto:${investor.email}?subject=Investment Inquiry - ${investor.firmName}`, '_blank')
      }
    }
  }

  const handleBookmark = async () => {
    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ investorId: investor.id }),
      })

      const data = await response.json()
      setIsBookmarked(data.bookmarked)
      if (onBookmarkChange) {
        onBookmarkChange(investor.id, data.bookmarked)
      }
      toast.success(data.bookmarked ? 'Bookmarked!' : 'Bookmark removed')
    } catch (error) {
      toast.error('Failed to update bookmark')
    }
  }

  const handleCopyNotes = () => {
    const notes = `${investor.firmName}\n${summary}\n\nFit: ${fitBullets.join(', ')}\nIntro: ${introPreference}`
    navigator.clipboard.writeText(notes)
    toast.success('Notes copied to clipboard!')
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {investor.firmName}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {investor.verified && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {investor.fundType && (
                  <Badge variant="outline" className="capitalize">
                    {investor.fundType === 'CVC' ? 'Corporate VC' : 
                     investor.fundType === 'micro-VC' ? 'Micro VC' : 
                     investor.fundType}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Quick actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBookmark}
                className={isBookmarked ? 'text-red-600 hover:text-red-700' : ''}
              >
                <Heart className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyNotes}
              >
                <Copy className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Key Facts Row */}
        <div className="px-6 py-4 bg-muted/50 border-b">
          <div className="flex flex-wrap gap-2">
            {cleanStages.length > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-100 text-primary px-3 py-1.5 rounded-md text-sm font-medium">
                <Target className="h-4 w-4" />
                <span>{cleanStages.slice(0, 3).join(', ')}</span>
              </div>
            )}
            
            {investor.checkSizeMin && investor.checkSizeMax && (
              <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-md text-sm font-medium">
                <span>{formatCheckSize(investor.checkSizeMin, investor.checkSizeMax)}</span>
              </div>
            )}
            
            {cleanGeo.length > 0 && (
              <div className="flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-md text-sm font-medium">
                <MapPin className="h-4 w-4" />
                <span>{cleanGeo.slice(0, 2).join(', ')}</span>
              </div>
            )}
            
            {investor.leadFollow && (
              <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md text-sm font-medium">
                <span className="capitalize">
                  {investor.leadFollow === 'lead' ? 'Leads' : 
                   investor.leadFollow === 'follow' ? 'Follows' : 
                   'Either'}
                </span>
              </div>
            )}
            
            {introPreference !== 'Unknown' && (
              <div className="flex items-center gap-1.5 bg-muted text-foreground/85 px-3 py-1.5 rounded-md text-sm font-medium">
                <span>{introPreference}</span>
              </div>
            )}
            
            {decisionSpeed !== 'Unknown' && (
              <div className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium">
                <Clock className="h-4 w-4" />
                <span>{decisionSpeed}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          
          {/* Section 1: Summary */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Summary</h3>
            <p className="text-foreground/85 leading-relaxed">
              {summary}
            </p>
          </div>

          {/* Section 2: What They Look For */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">What They Look For</h3>
              
              {/* Best fit if */}
              {fitBullets.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-foreground/85 mb-2">Best fit if:</h4>
                  <ul className="space-y-2">
                    {fitBullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* They usually avoid */}
              {avoidBullets.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground/85 mb-2">They usually avoid:</h4>
                  <ul className="space-y-2">
                    {avoidBullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: How to Engage */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">How to Engage</h3>
              
              <div className="space-y-4">
                {/* Best path */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground/85 mb-2">Best path:</h4>
                  <p className="text-sm text-muted-foreground">{introPreference}</p>
                </div>

                {/* What to include */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground/85 mb-2">What to include:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• One-line pitch</li>
                    <li>• Key traction metric</li>
                    <li>• Why now + why you</li>
                    {isCorporateVC && <li>• Partnership angle / strategic fit</li>}
                  </ul>
                </div>

                {/* CTAs */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1"
                    onClick={primaryCTA.action}
                  >
                    <primaryCTA.icon className="h-4 w-4 mr-2" />
                    {primaryCTA.label}
                  </Button>
                  
                  {investor.websiteUrl && (
                    <Button 
                      variant="outline"
                      onClick={() => window.open(investor.websiteUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Website
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio (if available) */}
          {(notableInvestments.length > 0 || portfolio.length > 0) && (
            <div>
              <h3 className="text-sm font-semibold text-foreground/85 mb-3">Portfolio</h3>
              <div className="flex flex-wrap gap-2">
                {notableInvestments.slice(0, 8).map((company, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {company}
                  </Badge>
                ))}
                {portfolio.slice(0, 8 - notableInvestments.length).map((company, i) => {
                  const name = typeof company === 'string' ? company : company.name || company.company
                  return name ? (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Sectors */}
          {cleanSectors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground/85 mb-3">Sectors</h3>
              <div className="flex flex-wrap gap-2">
                {cleanSectors.map((sector, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {sector}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="pt-4 border-t flex flex-wrap gap-3 text-sm">
            {investor.websiteUrl && (
              <a 
                href={investor.websiteUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Website
              </a>
            )}
            {investor.linkedinUrl && (
              <a 
                href={investor.linkedinUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                LinkedIn
              </a>
            )}
            {investor.crunchbaseUrl && (
              <a 
                href={investor.crunchbaseUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Crunchbase
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvestorProfileModal

