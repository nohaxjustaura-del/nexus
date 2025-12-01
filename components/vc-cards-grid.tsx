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
}

function VCCardsGrid({ investors, profileComplete }: VCCardsGridProps) {
  // Guard against invalid investors array
  if (!investors || !Array.isArray(investors)) {
    return null
  }

  // Generate unique, useful description from available data
  const generateFullDescription = (investor: Investor) => {
    // Guard against invalid investor
    if (!investor || typeof investor !== 'object') {
      return 'No description available.'
    }
    const sectors = parseJSON<string[]>(investor.sectors, [])
    const valueAdd = parseJSON<string[]>(investor.valueAddTags, [])
    const proofPoints = parseJSON<any>(investor.proofPoints, {})
    const portfolio = parseJSON<any[]>(investor.portfolio, [])
    const notableInvestments = parseJSON<string[]>(investor.notableInvestments, [])
    
    // Priority 1: Use thesis if available and specific
    if (investor.thesis && investor.thesis.length > 30 && !investor.thesis.includes('Leading investor')) {
      return investor.thesis
    }
    
    // Priority 2: Combine unique value props with specific details (full version)
    const parts: string[] = []
    
    // Add fund type context
    if (investor.fundType === 'accelerator') {
      parts.push('Accelerator program')
    } else if (investor.fundType === 'CVC') {
      parts.push('Corporate venture capital fund')
    } else if (investor.fundType === 'micro-VC') {
      parts.push('Micro-VC fund')
    } else if (investor.fundType === 'institutional') {
      parts.push('Institutional venture capital firm')
    }
    
    // Add unique value props (all of them)
    if (valueAdd.length > 0) {
      const valueAddText = valueAdd.length === 1 
        ? valueAdd[0].toLowerCase()
        : valueAdd.slice(0, -1).map(v => v.toLowerCase()).join(', ') + ', and ' + valueAdd[valueAdd.length - 1].toLowerCase()
      parts.push(`offers ${valueAddText}`)
    }
    
    // Add personality/approach
    if (investor.personalityType) {
      if (investor.personalityType === 'hands-on') {
        parts.push('with hands-on operational support')
      } else if (investor.personalityType === 'mentor') {
        parts.push('with deep mentorship and guidance')
      } else if (investor.personalityType === 'hands-off') {
        parts.push('with a hands-off approach')
      }
    }
    
    // Add sector focus (all sectors)
    if (sectors.length > 0) {
      if (sectors.length === 1) {
        parts.push(`focused on ${sectors[0]}`)
      } else if (sectors.length === 2) {
        parts.push(`focused on ${sectors.join(' and ')}`)
      } else {
        parts.push(`focused on ${sectors.slice(0, -1).join(', ')}, and ${sectors[sectors.length - 1]}`)
      }
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
    
    // Combine all parts
    const description = parts.length > 0 
      ? parts.join('. ').charAt(0).toUpperCase() + parts.join('. ').slice(1) + '.'
      : `Leading ${investor.fundType || 'venture capital'} investor${sectors.length > 0 ? ` in ${sectors.slice(0, 2).join(' and ')}` : ' in technology'}.`
    
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

