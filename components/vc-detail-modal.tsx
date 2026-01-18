'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, MapPin, Target, Building2, Calendar, CheckCircle, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface VCDetailModalProps {
  investor: {
    id: string
    name: string
    firmName: string
    email?: string
    verified: boolean
    fundType?: string
    stages?: string
    sectors?: string
    geoFocus?: string
    checkMin?: number
    checkMax?: number
    thesis?: string
    proofPoints?: string
    portfolio?: string
    notableInvestments?: string
    valueAddTags?: string
    ethicsTags?: string
    personalityType?: string
    decisionSpeed?: string
    leadFollow?: string
    fundSize?: string
    ownershipTarget?: string
    linkedinUrl?: string
    websiteUrl?: string
    applicationUrl?: string
  }
  isOpen: boolean
  onClose: () => void
  profileComplete: boolean
  fullDescription: string
}

export function VCDetailModal({ investor, isOpen, onClose, profileComplete, fullDescription }: VCDetailModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  if (!mounted || !isOpen) return null

  // Safe JSON parsing with fallbacks
  const parseSafe = <T,>(str: string | null | undefined, fallback: T): T => {
    if (!str) return fallback
    try {
      return JSON.parse(str) as T
    } catch {
      return fallback
    }
  }

  const stages = parseSafe<string[]>(investor.stages as string, [])
  const sectors = parseSafe<string[]>(investor.sectors as string, [])
  const geoFocus = parseSafe<string[]>(investor.geoFocus as string, [])
  const valueAdd = parseSafe<string[]>(investor.valueAddTags as string, [])
  const ethics = parseSafe<string[]>(investor.ethicsTags as string, [])
  const portfolio = parseSafe<any[]>(investor.portfolio as string, [])
  const notableInvestments = parseSafe<string[]>(investor.notableInvestments as string, [])
  const proofPoints = parseSafe<any>(investor.proofPoints as string, {})

  const applicationLink = investor.applicationUrl || investor.websiteUrl || (investor.email ? `mailto:${investor.email}?subject=Investment Inquiry` : null)

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-slate-600" />
        </button>

        {/* Header */}
        <CardHeader className="pb-4 pt-6 pr-12 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-slate-900 mb-2">
                {investor.firmName}
              </CardTitle>
              {investor.name && investor.name !== investor.firmName && (
                <p className="text-sm text-slate-600">by {investor.name}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {investor.verified && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              {investor.fundType && (
                <Badge variant="outline" className="capitalize">
                  {investor.fundType}
                </Badge>
              )}
            </div>
          </div>

          {/* Full Description */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                About
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {fullDescription}
              </p>
            </div>

            {/* Investment Thesis */}
            {investor.thesis && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Investment Thesis
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {investor.thesis}
                </p>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6 space-y-6">
          {/* Investment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stages.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Investment Stages
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {stages.map((stage: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs capitalize">
                      {stage}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(investor.checkMin || investor.checkMax) && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Check Size
                </h4>
                <p className="text-sm text-slate-700 font-medium">
                  ${investor.checkMin || 0}k - ${investor.checkMax || 0}k
                </p>
              </div>
            )}

            {investor.fundSize && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Fund Size
                </h4>
                <p className="text-sm text-slate-700">{investor.fundSize}</p>
              </div>
            )}

            {geoFocus.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Geographic Focus
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {geoFocus.map((geo: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {geo}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sectors */}
          {sectors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Sectors
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {sectors.map((sector: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {sector}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Value Add */}
          {valueAdd.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Value-Add Services
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {valueAdd.map((tag: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Proof Points / Focus Areas */}
          {proofPoints && (Array.isArray(proofPoints) ? proofPoints.length > 0 : Object.keys(proofPoints).length > 0) && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Focus Areas
              </h4>
              <div className="text-sm text-slate-700">
                {Array.isArray(proofPoints) 
                  ? proofPoints.join(', ')
                  : Object.entries(proofPoints).map(([key, value]: [string, any]) => {
                      if (Array.isArray(value)) {
                        return `${key}: ${value.join(', ')}`
                      }
                      return `${key}: ${value}`
                    }).join(' • ')
                }
              </div>
            </div>
          )}

          {/* Portfolio */}
          {portfolio.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Portfolio Companies
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {portfolio.slice(0, 10).map((company: any, i: number) => {
                  const name = typeof company === 'string' ? company : (company?.name || company)
                  return (
                    <Badge key={i} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  )
                })}
                {portfolio.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{portfolio.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Notable Investments */}
          {notableInvestments.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                Notable Investments
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {notableInvestments.map((investment: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {investment}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            {investor.personalityType && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Style: </span>
                <span className="text-sm text-slate-700 capitalize">{investor.personalityType.replace('-', ' ')}</span>
              </div>
            )}

            {investor.decisionSpeed && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Decision Speed: </span>
                <span className="text-sm text-slate-700">{investor.decisionSpeed}</span>
              </div>
            )}

            {investor.leadFollow && investor.leadFollow !== 'either' && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Round Role: </span>
                <span className="text-sm text-slate-700 capitalize">{investor.leadFollow === 'lead' ? 'Leads rounds' : 'Follows rounds'}</span>
              </div>
            )}

            {investor.ownershipTarget && (
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Ownership Target: </span>
                <span className="text-sm text-slate-700">{investor.ownershipTarget}</span>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
            {investor.websiteUrl && (
              <a 
                href={investor.websiteUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
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
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                LinkedIn
              </a>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-200">
            {profileComplete ? (
              applicationLink ? (
                <a href={applicationLink} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full font-semibold bg-primary hover:bg-primary/90 shadow-md">
                    Apply Now
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              ) : investor.email ? (
                <a href={`mailto:${investor.email}?subject=Investment Inquiry`} className="block">
                  <Button className="w-full font-semibold bg-primary hover:bg-primary/90 shadow-md">
                    Contact VC
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              ) : (
                <Button className="w-full font-semibold bg-slate-400 cursor-not-allowed" disabled>
                  Contact Info Unavailable
                </Button>
              )
            ) : (
              <Link href="/founder/onboarding" className="block">
                <Button className="w-full font-medium border-2 hover:border-primary hover:bg-primary/5" variant="outline">
                  Complete Profile to Apply
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </div>
    </div>
  )
}

export default VCDetailModal

