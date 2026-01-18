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
  verified: boolean
}

function parseJSON<T>(str: string | null, fallback: T): T {
  if (!str) return fallback
  try {
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}

// Comprehensive list of filler patterns
const FILLER_PATTERNS = [
  /^Leading (investor|venture capital|VC|firm)/i,
  /^Premier (venture capital|VC|firm)/i,
  /^Top-tier (venture capital|VC|firm)/i,
  /^Established (venture capital|VC|firm)/i,
  /^Well-known (venture capital|VC|firm)/i,
  /^Prominent (venture capital|VC|firm)/i,
  /^Successful (venture capital|VC|firm)/i,
  /^Reputable (venture capital|VC|firm)/i,
  /^Venture capital firm/i,
  /^Investment firm/i,
  /^VC firm/i,
  /^We invest/i,
  /^We back/i,
  /^We support/i,
  /^We focus on/i,
  /^Specializing in/i,
  /^Focused on/i,
  /^Looking for/i,
  /^Seeking/i,
  /^Investing in/i,
  /^Backing/i,
  /^Supporting/i,
  /^Helping/i,
  /^Working with/i,
  /^Partnering with/i,
  /^Committed to/i,
  /^Dedicated to/i,
  /^Passionate about/i,
  /^Excited about/i,
  /^Interested in/i,
  /^Aimed at/i,
  /^Targeting/i,
  /^Building/i,
  /^Creating/i,
  /^Developing/i,
  /^Empowering/i,
  /^Enabling/i,
  /^Transforming/i,
  /^Revolutionizing/i,
  /^Disrupting/i,
  /^Innovating/i,
  /^Pioneering/i,
  /^Leading the way/i,
  /^At the forefront/i,
  /^Cutting-edge/i,
  /^State-of-the-art/i,
  /^Next-generation/i,
  /^World-class/i,
  /^Best-in-class/i,
  /^Industry-leading/i,
  /^Market-leading/i,
  /^Award-winning/i,
  /^Recognized/i,
  /^Renowned/i,
  /^Esteemed/i,
  /^Distinguished/i,
  /^Notable/i,
  /^Noteworthy/i,
  /^Significant/i,
  /^Substantial/i,
  /^Considerable/i,
  /^Extensive/i,
  /^Comprehensive/i,
  /^Complete/i,
  /^Full/i,
  /^Total/i,
  /^Entire/i,
  /^All/i,
  /^Every/i,
  /^Each/i,
  /^Various/i,
  /^Diverse/i,
  /^Multiple/i,
  /^Several/i,
  /^Many/i,
  /^Numerous/i,
  /^Countless/i,
  /^Unlimited/i,
  /^Infinite/i,
  /^Endless/i,
  /^Boundless/i,
  /^Limitless/i,
  /^Unrestricted/i,
  /^Unconstrained/i,
  /^Unfettered/i,
  /^Unbridled/i,
  /^Unchecked/i,
  /^Uncontrolled/i,
]

// Check if description is filler/generic
function isFillerDescription(description: string | null | undefined): boolean {
  if (!description || description.trim().length < 30) return true
  
  const desc = description.trim()
  
  // Check against filler patterns
  for (const pattern of FILLER_PATTERNS) {
    if (pattern.test(desc)) {
      // If it's very short and matches a pattern, it's definitely filler
      if (desc.length < 100) return true
      // If it's longer but still generic (no specific details), it might be filler
      if (desc.length < 150 && !desc.includes('portfolio') && !desc.includes('notable') && !desc.match(/\d+/)) {
        return true
      }
    }
  }
  
  // Check for very generic short descriptions
  if (desc.length < 50) return true
  
  // Check for repetitive content (same word repeated many times)
  const words = desc.toLowerCase().split(/\s+/)
  const wordCounts = new Map<string, number>()
  for (const word of words) {
    if (word.length > 3) { // Only count meaningful words
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    }
  }
  
  // If any word appears more than 4 times in a short description, it's likely filler
  for (const [word, count] of wordCounts.entries()) {
    if (count > 4 && desc.length < 200) {
      return true
    }
  }
  
  // Check if description lacks specific details (no firm name, no portfolio, no numbers, no specific sectors)
  const hasSpecificDetails = 
    desc.match(/\d+/) || // Has numbers
    desc.toLowerCase().includes('portfolio') ||
    desc.toLowerCase().includes('notable') ||
    desc.toLowerCase().includes('backed') ||
    desc.toLowerCase().includes('invested') ||
    desc.length > 200 // Long enough to be detailed
  
  if (!hasSpecificDetails && desc.length < 100) {
    return true
  }
  
  return false
}

// Check if description is unique and tailored
function isUniqueDescription(description: string | null | undefined, firmName: string): boolean {
  if (!description || description.trim().length < 50) return false
  
  const desc = description.toLowerCase()
  const firm = firmName.toLowerCase()
  
  // Must contain firm name or be very specific
  const containsFirmName = desc.includes(firm)
  const hasPortfolio = desc.includes('portfolio') || desc.includes('notable') || desc.includes('backed')
  const hasSpecificDetails = desc.match(/\d+/) || desc.length > 150
  const hasUniqueValue = desc.includes('known for') || desc.includes('specializes') || desc.includes('focuses')
  
  return containsFirmName || (hasPortfolio && hasSpecificDetails) || (hasUniqueValue && hasSpecificDetails)
}

// Generate a high-quality, tailored description
function generateTailoredDescription(vc: VCData): string | null {
  const sectors = parseJSON<string[]>(vc.sectors, [])
  const stages = parseJSON<string[]>(vc.stages, [])
  const valueAdd = parseJSON<string[]>(vc.valueAddTags, [])
  const portfolio = parseJSON<any[]>(vc.portfolio, [])
  const notableInvestments = parseJSON<string[]>(vc.notableInvestments, [])
  const geoFocus = parseJSON<string[]>(vc.geoFocus, [])
  
  const parts: string[] = []
  
  // Start with firm name and type
  if (vc.fundType === 'accelerator') {
    if (vc.firmName.toLowerCase().includes('yc') || vc.firmName.toLowerCase().includes('y combinator')) {
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
  
  // Add portfolio companies (makes it unique!)
  if (portfolio && Array.isArray(portfolio) && portfolio.length > 0) {
    const companies = portfolio.slice(0, 3).map((p: any) => {
      if (typeof p === 'string') return p
      if (p && typeof p === 'object' && p.name) return p.name
      return null
    }).filter(Boolean)
    
    if (companies.length > 0) {
      if (companies.length === 1) {
        parts.push(`portfolio includes ${companies[0]}`)
      } else if (companies.length === 2) {
        parts.push(`portfolio includes ${companies.join(' and ')}`)
      } else {
        parts.push(`portfolio includes ${companies.slice(0, 2).join(', ')}, and ${companies[2]}`)
      }
    }
  } else if (notableInvestments && Array.isArray(notableInvestments) && notableInvestments.length > 0) {
    const investments = notableInvestments.slice(0, 3)
    if (investments.length === 1) {
      parts.push(`notable investments include ${investments[0]}`)
    } else if (investments.length === 2) {
      parts.push(`notable investments include ${investments.join(' and ')}`)
    } else {
      parts.push(`notable investments include ${investments.slice(0, 2).join(', ')}, and ${investments[2]}`)
    }
  }
  
  // Add sector focus with specificity
  if (sectors.length > 0 && sectors.length <= 5) {
    if (sectors.length === 1) {
      parts.push(`specializing exclusively in ${sectors[0]}`)
    } else if (sectors.length === 2) {
      parts.push(`focused on ${sectors[0]} and ${sectors[1]}`)
    } else {
      parts.push(`focused on ${sectors.slice(0, 2).join(' and ')}, with additional interest in ${sectors.slice(2).join(', ')}`)
    }
  } else if (sectors.length > 5) {
    parts.push(`focused on ${sectors.slice(0, 2).join(' and ')} and other sectors`)
  }
  
  // Add stage specificity
  if (stages.length > 0 && stages.length <= 3) {
    if (stages.length === 1) {
      parts.push(`investing at the ${stages[0]} stage`)
    } else {
      parts.push(`investing from ${stages[0]} through ${stages[stages.length - 1]}`)
    }
  }
  
  // Add geographic focus if specific
  if (geoFocus.length > 0 && geoFocus.length <= 3 && !geoFocus.includes('Global')) {
    if (geoFocus.length === 1) {
      parts.push(`with a focus on ${geoFocus[0]}`)
    } else {
      parts.push(`focused on ${geoFocus.slice(0, -1).join(', ')}, and ${geoFocus[geoFocus.length - 1]}`)
    }
  }
  
  // Add unique value propositions
  if (valueAdd.length > 0 && valueAdd.length <= 4) {
    const uniqueValue = valueAdd.length === 1
      ? valueAdd[0].toLowerCase()
      : valueAdd.slice(0, -1).map(v => v.toLowerCase()).join(', ') + ', and ' + valueAdd[valueAdd.length - 1].toLowerCase()
    parts.push(`offers ${uniqueValue}`)
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
  if (vc.decisionSpeed && vc.decisionSpeed !== '2–4 weeks' && vc.decisionSpeed !== '2-4 weeks') {
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
  if (parts.length === 0) {
    return null // Can't generate a good description
  }
  
  let description = parts.join('. ')
  
  // Ensure it starts with capital letter and ends with period
  description = description.charAt(0).toUpperCase() + description.slice(1)
  if (!description.endsWith('.')) {
    description += '.'
  }
  
  // Must be at least 80 characters to be considered good
  if (description.length < 80) {
    return null
  }
  
  return description
}

// Check if VC has enough data to create a good description
function hasEnoughData(vc: VCData): boolean {
  const sectors = parseJSON<string[]>(vc.sectors, [])
  const portfolio = parseJSON<any[]>(vc.portfolio, [])
  const notableInvestments = parseJSON<string[]>(vc.notableInvestments, [])
  
  // Must have at least: sectors OR portfolio/notable investments OR stages
  const hasSectors = sectors.length > 0
  const hasPortfolio = (portfolio && portfolio.length > 0) || (notableInvestments && notableInvestments.length > 0)
  const hasStages = parseJSON<string[]>(vc.stages, []).length > 0
  
  return hasSectors || hasPortfolio || hasStages
}

async function main() {
  console.log('🔍 Analyzing all VCs for filler descriptions...\n')
  
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
        verified: true,
      },
      orderBy: {
        firmName: 'asc',
      },
    })
    
    console.log(`Found ${allVCs.length} VCs in database\n`)
    console.log('='.repeat(80))
    console.log('ANALYSIS STARTING...\n')
    
    let removedCount = 0
    let improvedCount = 0
    let keptCount = 0
    let skippedCount = 0
    
    const removedVCs: string[] = []
    const improvedVCs: string[] = []
    const keptVCs: string[] = []
    
    for (const vc of allVCs) {
      const currentDescription = vc.thesis || vc.bio || ''
      const isFiller = isFillerDescription(currentDescription)
      const isUnique = isUniqueDescription(currentDescription, vc.firmName)
      const hasData = hasEnoughData(vc as VCData)
      
      // If it's already unique and good, keep it
      if (!isFiller && isUnique) {
        keptCount++
        keptVCs.push(vc.firmName)
        console.log(`✅ KEPT: ${vc.firmName} (already has unique description)`)
        continue
      }
      
      // If it's filler but we have enough data, try to improve it
      if (isFiller && hasData) {
        const newDescription = generateTailoredDescription(vc as VCData)
        
        if (newDescription && newDescription.length >= 80) {
          // Update with improved description
          await prisma.investor.update({
            where: { id: vc.id },
            data: {
              thesis: newDescription,
              bio: vc.bio || newDescription,
            },
          })
          improvedCount++
          improvedVCs.push(vc.firmName)
          console.log(`✨ IMPROVED: ${vc.firmName}`)
          console.log(`   Old: ${currentDescription.substring(0, 80)}${currentDescription.length > 80 ? '...' : ''}`)
          console.log(`   New: ${newDescription.substring(0, 120)}${newDescription.length > 120 ? '...' : ''}`)
          console.log('')
        } else {
          // Can't generate a good description, remove the VC
          await prisma.investor.delete({
            where: { id: vc.id },
          })
          removedCount++
          removedVCs.push(vc.firmName)
          console.log(`❌ REMOVED: ${vc.firmName} (filler description, insufficient data to improve)`)
          console.log(`   Was: ${currentDescription.substring(0, 80)}${currentDescription.length > 80 ? '...' : ''}`)
          console.log('')
        }
      } else if (isFiller && !hasData) {
        // Filler description and no data to improve - remove
        await prisma.investor.delete({
          where: { id: vc.id },
        })
        removedCount++
        removedVCs.push(vc.firmName)
        console.log(`❌ REMOVED: ${vc.firmName} (filler description, no data to create better one)`)
        console.log(`   Was: ${currentDescription.substring(0, 80)}${currentDescription.length > 80 ? '...' : ''}`)
        console.log('')
      } else {
        // Not filler but not unique - try to improve
        const newDescription = generateTailoredDescription(vc as VCData)
        if (newDescription && newDescription.length >= 80) {
          await prisma.investor.update({
            where: { id: vc.id },
            data: {
              thesis: newDescription,
              bio: vc.bio || newDescription,
            },
          })
          improvedCount++
          improvedVCs.push(vc.firmName)
          console.log(`✨ IMPROVED: ${vc.firmName} (made more unique)`)
          console.log(`   New: ${newDescription.substring(0, 120)}${newDescription.length > 120 ? '...' : ''}`)
          console.log('')
        } else {
          skippedCount++
          console.log(`⏭️  SKIPPED: ${vc.firmName} (not filler, but couldn't improve further)`)
          console.log('')
        }
      }
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('📊 FINAL SUMMARY')
    console.log('='.repeat(80))
    console.log(`Total VCs analyzed: ${allVCs.length}`)
    console.log(`✅ Kept (already good): ${keptCount}`)
    console.log(`✨ Improved: ${improvedCount}`)
    console.log(`❌ Removed (filler, couldn't improve): ${removedCount}`)
    console.log(`⏭️  Skipped: ${skippedCount}`)
    console.log(`\nRemaining VCs: ${keptCount + improvedCount + skippedCount}`)
    console.log('='.repeat(80))
    
    if (removedVCs.length > 0) {
      console.log('\n❌ REMOVED VCs:')
      removedVCs.forEach(name => console.log(`   - ${name}`))
    }
    
    if (improvedVCs.length > 0) {
      console.log('\n✨ IMPROVED VCs:')
      improvedVCs.forEach(name => console.log(`   - ${name}`))
    }
    
  } catch (error: any) {
    console.error('❌ Fatal error:', error)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
    console.log('\n✅ Database connection closed')
  }
}

main()
  .catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })

