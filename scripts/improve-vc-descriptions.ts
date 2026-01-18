import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface VCData {
  id: string
  firmName: string
  name: string
  email: string
  thesis: string | null
  bio: string | null
  fundType: string | null
  sectors: string
  stages: string
  valueAddTags: string
  portfolio: string | null
  notableInvestments: string | null
  fundSize: string | null
  personalityType: string | null
  decisionSpeed: string | null
  leadFollow: string
  ownershipTarget: string | null
  geoFocus: string
  checkMin: number | null
  checkMax: number | null
}

function parseJSON<T>(str: string | null, fallback: T): T {
  if (!str) return fallback
  try {
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}

function generateUniqueDescription(vc: VCData): string {
  const sectors = parseJSON<string[]>(vc.sectors, [])
  const stages = parseJSON<string[]>(vc.stages, [])
  const valueAdd = parseJSON<string[]>(vc.valueAddTags, [])
  const portfolio = parseJSON<any[]>(vc.portfolio, [])
  const notableInvestments = parseJSON<string[]>(vc.notableInvestments, [])
  const geoFocus = parseJSON<string[]>(vc.geoFocus, [])
  
  // Build a unique, tailored description for this specific VC
  const parts: string[] = []
  
  // Start with firm-specific context
  const firmName = vc.firmName.toLowerCase()
  
  // Add fund type context with firm-specific language
  if (vc.fundType === 'accelerator') {
    if (firmName.includes('dorm') || firmName.includes('student')) {
      parts.push(`${vc.firmName} is a student-focused accelerator`)
    } else if (firmName.includes('yc') || firmName.includes('y combinator')) {
      parts.push(`${vc.firmName} is the world's most successful startup accelerator`)
    } else {
      parts.push(`${vc.firmName} is an accelerator program`)
    }
  } else if (vc.fundType === 'CVC') {
    parts.push(`${vc.firmName} is a corporate venture capital fund`)
  } else if (vc.fundType === 'micro-VC') {
    parts.push(`${vc.firmName} is a micro-VC fund`)
  } else if (vc.fundType === 'angel') {
    parts.push(`${vc.firmName} is an angel investor network`)
  } else {
    parts.push(`${vc.firmName} is a venture capital firm`)
  }
  
  // Add unique sector focus with specific details
  if (sectors.length > 0) {
    if (sectors.length === 1) {
      parts.push(`specializing exclusively in ${sectors[0]}`)
    } else if (sectors.length === 2) {
      parts.push(`focused on ${sectors[0]} and ${sectors[1]}`)
    } else {
      const primarySectors = sectors.slice(0, 2)
      parts.push(`focused on ${primarySectors.join(' and ')}, with additional interest in ${sectors.slice(2).join(', ')}`)
    }
  }
  
  // Add stage specificity
  if (stages.length > 0) {
    if (stages.length === 1) {
      parts.push(`investing at the ${stages[0]} stage`)
    } else {
      parts.push(`investing from ${stages[0]} through ${stages[stages.length - 1]}`)
    }
  }
  
  // Add geographic focus if specific
  if (geoFocus.length > 0 && !geoFocus.includes('Global')) {
    if (geoFocus.length === 1) {
      parts.push(`with a focus on ${geoFocus[0]}`)
    } else if (geoFocus.length <= 3) {
      parts.push(`focused on ${geoFocus.join(', ')}`)
    }
  }
  
  // Add unique value propositions
  if (valueAdd.length > 0) {
    const uniqueValue = valueAdd.length === 1
      ? valueAdd[0].toLowerCase()
      : valueAdd.slice(0, -1).map(v => v.toLowerCase()).join(', ') + ', and ' + valueAdd[valueAdd.length - 1].toLowerCase()
    parts.push(`offers ${uniqueValue}`)
  }
  
  // Add portfolio highlights if available (makes it unique)
  if (portfolio && Array.isArray(portfolio) && portfolio.length > 0) {
    const notableCompanies = portfolio.slice(0, 2).map((p: any) => {
      if (typeof p === 'string') return p
      if (p && typeof p === 'object' && p.name) return p.name
      return null
    }).filter(Boolean)
    
    if (notableCompanies.length > 0) {
      parts.push(`portfolio includes ${notableCompanies.join(' and ')}`)
    }
  } else if (notableInvestments && Array.isArray(notableInvestments) && notableInvestments.length > 0) {
    const topInvestments = notableInvestments.slice(0, 2)
    parts.push(`notable investments include ${topInvestments.join(' and ')}`)
  }
  
  // Add personality/approach (makes it unique)
  if (vc.personalityType) {
    if (vc.personalityType === 'hands-on') {
      parts.push(`known for hands-on operational support`)
    } else if (vc.personalityType === 'mentor') {
      parts.push(`provides deep mentorship and strategic guidance`)
    } else if (vc.personalityType === 'visionary') {
      parts.push(`takes a long-term, visionary approach to investing`)
    } else if (vc.personalityType === 'supportive') {
      parts.push(`known for being founder-friendly and supportive`)
    }
  }
  
  // Add decision speed if unique
  if (vc.decisionSpeed && vc.decisionSpeed !== '2–4 weeks') {
    parts.push(`decision speed: ${vc.decisionSpeed}`)
  }
  
  // Add check size context if relevant
  if (vc.checkMin && vc.checkMax) {
    if (vc.checkMin < 50) {
      parts.push(`writes small checks ($${vc.checkMin}K-$${vc.checkMax}K) for early-stage companies`)
    } else if (vc.checkMax > 2000) {
      parts.push(`writes large checks ($${vc.checkMin}K-$${vc.checkMax}K) for growth-stage companies`)
    }
  }
  
  // Add lead/follow preference
  if (vc.leadFollow && vc.leadFollow !== 'either') {
    if (vc.leadFollow === 'lead') {
      parts.push(`typically leads investment rounds`)
    } else {
      parts.push(`typically follows other investors`)
    }
  }
  
  // Combine into a cohesive description
  let description = parts.join('. ')
  
  // Ensure it starts with capital letter and ends with period
  if (description.length > 0) {
    description = description.charAt(0).toUpperCase() + description.slice(1)
    if (!description.endsWith('.')) {
      description += '.'
    }
  } else {
    // Fallback if no parts
    description = `${vc.firmName} is a venture capital firm${sectors.length > 0 ? ` focused on ${sectors.slice(0, 2).join(' and ')}` : ''}${stages.length > 0 ? ` investing at the ${stages[0]} stage` : ''}.`
  }
  
  return description
}

function isDescriptionGood(description: string | null): boolean {
  if (!description || description.trim().length < 50) {
    return false
  }
  
  // Check for generic phrases that indicate a poor description
  const genericPhrases = [
    'Leading investor',
    'Venture capital firm',
    'Invests in startups',
    'Looking for',
    'We invest',
    'We back',
  ]
  
  // If it's too generic (starts with common phrases without firm-specific details)
  const isGeneric = genericPhrases.some(phrase => 
    description.toLowerCase().startsWith(phrase.toLowerCase()) && description.length < 100
  )
  
  return !isGeneric && description.length >= 50
}

async function main() {
  console.log('🔍 Analyzing VC descriptions...\n')
  
  try {
    const allVCs = await prisma.investor.findMany({
      select: {
        id: true,
        firmName: true,
        name: true,
        email: true,
        thesis: true,
        bio: true,
        fundType: true,
        sectors: true,
        stages: true,
        valueAddTags: true,
        portfolio: true,
        notableInvestments: true,
        fundSize: true,
        personalityType: true,
        decisionSpeed: true,
        leadFollow: true,
        ownershipTarget: true,
        geoFocus: true,
        checkMin: true,
        checkMax: true,
      },
      orderBy: {
        firmName: 'asc',
      },
    })
    
    console.log(`Found ${allVCs.length} VCs in database\n`)
    
    let improvedCount = 0
    let skippedCount = 0
    let errors = 0
    
    for (const vc of allVCs) {
      try {
        // Check if current thesis/bio is good
        const currentDescription = vc.thesis || vc.bio || ''
        const hasGoodDescription = isDescriptionGood(currentDescription)
        
        if (hasGoodDescription) {
          // Check if it's unique enough (contains firm name or specific details)
          const isUnique = currentDescription.toLowerCase().includes(vc.firmName.toLowerCase()) ||
                          currentDescription.length > 100 ||
                          currentDescription.includes('portfolio') ||
                          currentDescription.includes('notable')
          
          if (isUnique) {
            skippedCount++
            continue
          }
        }
        
        // Generate improved description
        const improvedDescription = generateUniqueDescription(vc as VCData)
        
        // Update the VC with improved description
        // Use thesis field as primary, bio as fallback
        await prisma.investor.update({
          where: { id: vc.id },
          data: {
            thesis: improvedDescription,
            // Also update bio if it was empty
            bio: vc.bio || improvedDescription,
          },
        })
        
        improvedCount++
        console.log(`✅ ${vc.firmName}: ${improvedDescription.substring(0, 100)}...`)
      } catch (error: any) {
        errors++
        console.error(`❌ Error updating ${vc.firmName}:`, error.message)
      }
    }
    
    console.log(`\n✨ Summary:`)
    console.log(`   - Improved: ${improvedCount} VCs`)
    console.log(`   - Skipped (already good): ${skippedCount} VCs`)
    console.log(`   - Errors: ${errors} VCs`)
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
    console.log('\nDatabase connection closed')
  }
}

main()
  .catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })


