'use client'

import VCCardClient from '@/components/vc-card-client'
import { parseJSON } from '@/lib/utils'

interface Investor {
  id: string
  firmName?: string | null
  name?: string | null
  email?: string | null
  sectors?: string | null
  stages?: string | null
  valueAddTags?: string | null
  proofPoints?: string | null
  portfolio?: string | null
  notableInvestments?: string | null
  thesis?: string | null
  fundType?: string | null
  personalityType?: string | null
  decisionSpeed?: string | null
  leadFollow?: string | null
  ownershipTarget?: string | null
  applicationUrl?: string | null
  websiteUrl?: string | null
  verified?: boolean | null
  [key: string]: any
}

interface VCCardsGridProps {
  investors: Investor[]
  profileComplete: boolean
  bookmarkedIds?: Set<string>
  onBookmarkChange?: (investorId: string, isBookmarked: boolean) => void
}

function VCCardsGrid({ investors, profileComplete, bookmarkedIds, onBookmarkChange }: VCCardsGridProps) {
  // Guard against invalid investors array
  if (!investors || !Array.isArray(investors)) {
    return null
  }

  // Generate unique, high-signal description (3-part structure)
  const generateFullDescription = (investor: Investor) => {
    // Guard against invalid investor
    if (!investor || typeof investor !== 'object') {
      return 'No description available.'
    }
    const sectors = parseJSON<string[]>(investor.sectors, [])
    const stages = parseJSON<string[]>(investor.stages, [])
    const valueAdd = parseJSON<string[]>(investor.valueAddTags, [])
    const proofPoints = parseJSON<any>(investor.proofPoints, {})
    const portfolio = parseJSON<any[]>(investor.portfolio, [])
    const notableInvestments = parseJSON<string[]>(investor.notableInvestments, [])
    
    // Priority 1: Use thesis if available and specific
    if (investor.thesis && investor.thesis.length > 30 && !investor.thesis.includes('Leading investor')) {
      return investor.thesis
    }
    
    // NEW: 3-part structure (Identity + Behavior + Best-for)
    const parts: string[] = []
    
    // PART 1: Identity wedge (stage + sector + type)
    let identity = ''
    
    // Stage
    if (stages.length > 0) {
      identity = stages.slice(0, 2).join('/') + ' '
    }
    
    // Sector (max 2)
    if (sectors.length > 0) {
      identity += sectors.slice(0, 2).join(' + ') + ' '
    }
    
    // Fund type
    if (investor.fundType === 'accelerator') {
      identity += 'accelerator'
    } else if (investor.fundType === 'micro-VC') {
      identity += 'micro-VC'
    } else if (investor.fundType === 'CVC') {
      identity += 'corporate VC'
    } else {
      identity += 'investor'
    }
    
    // Add unique angle if available
    if (valueAdd.length > 0 && valueAdd[0]) {
      const uniqueTag = valueAdd[0].toLowerCase()
      if (uniqueTag.includes('oss') || uniqueTag.includes('open source')) {
        identity += ' with OSS bias'
      } else if (uniqueTag.includes('technical')) {
        identity += ' for technical founders'
      } else if (uniqueTag.includes('student')) {
        identity += ' backing student founders'
      }
    }
    
    parts.push(identity.trim())
    
    // PART 2: Behavior/proof (lead, check size, decision speed)
    const behaviors: string[] = []
    
    if (investor.leadFollow === 'lead') {
      behaviors.push('leads rounds')
    } else if (investor.leadFollow === 'follow') {
      behaviors.push('follows')
    }
    
    if (investor.checkSizeMin && investor.checkSizeMax) {
      const min = investor.checkSizeMin >= 1000 ? `$${Math.round(investor.checkSizeMin/1000)}M` : `$${investor.checkSizeMin}k`
      const max = investor.checkSizeMax >= 1000 ? `$${Math.round(investor.checkSizeMax/1000)}M` : `$${investor.checkSizeMax}k`
      behaviors.push(`${min}–${max} checks`)
    }
    
    if (investor.decisionSpeed && !investor.decisionSpeed.includes('typical')) {
      behaviors.push(investor.decisionSpeed.toLowerCase())
    }
    
    if (behaviors.length > 0) {
      parts.push(behaviors.join(', '))
    }
    
    // PART 3: Best-for (what they look for)
    if (investor.personalityType === 'hands-on') {
      parts.push('Best if you want operational help')
    } else if (investor.personalityType === 'mentor') {
      parts.push('Best for first-time founders needing guidance')
    } else if (notableInvestments.length > 0) {
      parts.push(`Backed ${notableInvestments[0]}`)
    } else if (portfolio.length > 0 && portfolio[0]) {
      parts.push(`Portfolio includes ${portfolio[0]}`)
    }
    
    // Add proof points if available (all of them)
    if (proofPoints && (Array.isArray(proofPoints) ? proofPoints.length > 0 : Object.keys(proofPoints).length > 0)) {
      if (Array.isArray(proofPoints)) {
        parts.push(`seeking startups with: ${proofPoints.join(', ')}`)
      } else if (typeof proofPoints === 'object') {
        const proofPointEntries = Object.entries(proofPoints).map(([key, value]: [string, any]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.join(', ')}`
          }
          return `${key}: ${value}`
        })
        if (proofPointEntries.length > 0) {
          parts.push(`looking for: ${proofPointEntries.join('; ')}`)
        }
      }
    }
    
    // Add portfolio highlights
    if (portfolio && Array.isArray(portfolio) && portfolio.length > 0) {
      const notableCompanies = portfolio.slice(0, 3).map((p: any) => {
        if (typeof p === 'string') return p
        if (p && typeof p === 'object' && p.name) return p.name
        return null
      }).filter(Boolean)
      
      if (notableCompanies.length > 0) {
        parts.push(`portfolio includes: ${notableCompanies.join(', ')}`)
      }
    } else if (notableInvestments && Array.isArray(notableInvestments) && notableInvestments.length > 0) {
      parts.push(`notable investments: ${notableInvestments.slice(0, 5).join(', ')}`)
    }
    
    // Add decision speed
    if (investor.decisionSpeed) {
      parts.push(`decision speed: ${investor.decisionSpeed}`)
    }
    
    // Add lead/follow preference
    if (investor.leadFollow && investor.leadFollow !== 'either') {
      parts.push(`${investor.leadFollow === 'lead' ? 'typically leads' : 'typically follows'} investment rounds`)
    }
    
    // Add ownership target
    if (investor.ownershipTarget) {
      parts.push(`targets ${investor.ownershipTarget} ownership`)
    }
    
    // Combine all parts into professional description
    if (parts.length === 0) {
      // Fallback: Create professional description from basic info
      const fundTypeLabel = investor.fundType === 'accelerator' ? 'startup accelerator' :
                           investor.fundType === 'CVC' ? 'corporate venture capital fund' :
                           investor.fundType === 'micro-VC' ? 'early-stage venture capital fund' :
                           'venture capital firm'
      
      const sectorText = sectors.length > 0 
        ? ` specializing in ${sectors.slice(0, 2).join(' and ')}`
        : ''
      
      const stageText = stages.length > 0
        ? `. Invests in ${stages.slice(0, 2).join(' and ')} stage companies`
        : ''
      
      return `${fundTypeLabel.charAt(0).toUpperCase() + fundTypeLabel.slice(1)}${sectorText}${stageText}.`
    }
    
    // Join parts with proper formatting
    const description = parts.join('. ').charAt(0).toUpperCase() + parts.join('. ').slice(1) + '.'
    
    return description
  }
  
  // Generate truncated description for card
  const generateTruncatedDescription = (investor: Investor) => {
    const full = generateFullDescription(investor)
    return full.length > 150 ? full.substring(0, 150) + '...' : full
  }

  // Guard against empty or invalid investors array
  if (!investors || !Array.isArray(investors) || investors.length === 0) {
    return null
  }

  const validInvestors = investors.filter((investor) => {
    return investor && 
           typeof investor === 'object' && 
           investor.id && 
           investor.firmName
  })

  if (validInvestors.length === 0) {
    return null
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {validInvestors.map((investor) => {
        try {
          const truncatedDescription = generateTruncatedDescription(investor)
          const fullDescription = generateFullDescription(investor)
          const isYC = (investor.firmName || '')?.toLowerCase().includes('y combinator') || false
          
          // Ensure all VCs have an application link
          const applicationLink = investor.applicationUrl || investor.websiteUrl || (investor.email ? `mailto:${investor.email}?subject=Investment Inquiry` : null)

          return (
            <VCCardClient
              key={investor.id}
              investor={investor}
              profileComplete={profileComplete}
              isYC={isYC}
              description={truncatedDescription || fullDescription || 'No description available.'}
              fullDescription={fullDescription || truncatedDescription || 'No description available.'}
              applicationLink={applicationLink}
              isBookmarked={bookmarkedIds?.has(investor.id) || false}
              onBookmarkChange={onBookmarkChange}
            />
          )
        } catch (error) {
          // Skip invalid investor cards silently to prevent crashes
          return null
        }
      })}
    </div>
  )
}

export { VCCardsGrid }
export default VCCardsGrid

