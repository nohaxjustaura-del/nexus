'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, Crown, Target, Eye } from "lucide-react"
import Link from "next/link"
import VCDetailModal from '@/components/vc-detail-modal'
import { parseJSON } from '@/lib/utils'

interface VCCardClientProps {
  investor: any
  profileComplete: boolean
  isYC: boolean
  description: string
  fullDescription: string
  applicationLink: string | null
}

export function VCCardClient({ 
  investor, 
  profileComplete, 
  isYC, 
  description, 
  fullDescription,
  applicationLink 
}: VCCardClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

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
        className={`group relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl cursor-pointer ${
          isYC 
            ? 'border-2 border-amber-400 bg-gradient-to-br from-amber-50/50 to-white shadow-sm hover:border-amber-500' 
            : 'border border-slate-200 bg-white hover:border-primary/40 hover:shadow-lg'
        }`}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        {/* Top accent for YC only */}
        {isYC && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
        )}
        
        <CardHeader className="pb-3 pt-5 relative z-10">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <CardTitle className={`text-lg font-bold leading-tight transition-colors group-hover:text-primary ${isYC ? 'text-amber-600' : 'text-slate-900'}`}>
                {investor?.firmName || 'Unknown Firm'}
              </CardTitle>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {investor?.verified && (
                <Badge className="text-xs bg-green-100 text-green-800 border-green-300 group-hover:scale-105 transition-transform">
                  Verified
                </Badge>
              )}
              {investor?.fundType && (
                <Badge variant="outline" className="text-xs capitalize group-hover:border-primary/50 transition-colors">
                  {investor.fundType}
                </Badge>
              )}
              {isYC && (
                <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300 group-hover:scale-105 transition-transform">
                  Top VC
                </Badge>
              )}
            </div>
          </div>
          
          {/* Description - truncated with "Read more" hint */}
          <div className="mb-4">
            <p className="text-sm text-slate-700 leading-relaxed mb-2 font-medium">
              {description || fullDescription || 'No description available.'}
            </p>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                setIsModalOpen(true)
              }}
              className="text-xs text-primary hover:text-primary/80 hover:underline flex items-center gap-1 font-medium transition-colors"
            >
              <Eye className="h-3 w-3" />
              View full description
            </button>
          </div>
          
          {/* Stages - with icon */}
          {safeStages.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-600 mb-3 bg-slate-50 px-2 py-1 rounded-md group-hover:bg-primary/5 transition-colors">
              <Target className="h-3 w-3 text-primary" />
              <span className="font-medium">{safeStages.slice(0, 3).join(', ')}{safeStages.length > 3 ? '...' : ''}</span>
            </div>
          )}
          
          {/* Sectors - interactive badges */}
          {safeSectors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {safeSectors.slice(0, 3).map((sector: string, i: number) => (
                <Badge 
                  key={i} 
                  variant="secondary" 
                  className="text-xs group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors"
                >
                  {sector}
                </Badge>
              ))}
              {safeSectors.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{safeSectors.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="pb-4 relative z-10">
          {/* Niche Details - enhanced */}
          <div className="space-y-2.5">
            {safeValueAdd.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {safeValueAdd.slice(0, 3).map((tag: string, i: number) => (
                  <Badge 
                    key={i} 
                    variant="outline" 
                    className="text-xs bg-primary/5 border-primary/20 text-primary group-hover:bg-primary/10 group-hover:border-primary/30 transition-all"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {proofPoints && (Array.isArray(proofPoints) ? proofPoints.length > 0 : Object.keys(proofPoints).length > 0) && (
              <div className="text-xs text-slate-600 bg-slate-50 px-2 py-1.5 rounded-md group-hover:bg-primary/5 transition-colors">
                <span className="font-semibold text-slate-700">Focus: </span>
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
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Style:</span>
                <span className="capitalize">{String(investor.personalityType).replace('-', ' ')}</span>
              </div>
            )}
            
            {investor?.leadFollow && investor.leadFollow !== 'either' && (
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">
                  {investor.leadFollow === 'lead' ? '✓ Leads' : 'Follows'} rounds
                </span>
                {investor?.decisionSpeed && (
                  <span className="text-slate-500">• {investor.decisionSpeed}</span>
                )}
              </div>
            )}
          </div>
          
          {/* YC Insider subsection - only for Y Combinator */}
          {isYC && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <Link href="/founder/yc-insider" className="flex items-center gap-2 text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all shadow-sm hover:shadow-md hover:scale-105 transform">
                <Crown className="h-4 w-4" />
                <span>YC Insider: Alumni tips & office hours</span>
              </Link>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center gap-2 pt-4 border-t border-slate-100 relative z-10 bg-slate-50/50 group-hover:bg-white transition-colors">
          {profileComplete ? (
            applicationLink ? (
              <a 
                href={applicationLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button className={`w-full font-semibold transition-all group-hover:scale-105 ${isYC ? 'bg-amber-600 hover:bg-amber-700 shadow-md hover:shadow-lg' : 'bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg'}`} size="sm">
                  Apply
                </Button>
              </a>
            ) : (
              <a 
                href={`mailto:${investor?.email || 'contact@example.com'}?subject=Investment Inquiry`} 
                className="flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button className="w-full font-semibold bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all group-hover:scale-105" size="sm">
                  Contact ↗
                </Button>
              </a>
            )
          ) : (
            <Link 
              href="/founder/onboarding" 
              className="flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button className="w-full font-medium border-2 hover:border-primary hover:bg-primary/5 transition-all" size="sm" variant="outline">
                Complete Profile
              </Button>
            </Link>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="hover:bg-red-50 hover:text-red-600 transition-all rounded-lg group-hover:scale-110"
            onClick={(e) => e.stopPropagation()}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* Modal */}
      {investor && (
        <VCDetailModal
          investor={investor}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          profileComplete={profileComplete}
          fullDescription={fullDescription || description}
        />
      )}
    </>
  )
}

// Ensure default export for compatibility
export default VCCardClient

