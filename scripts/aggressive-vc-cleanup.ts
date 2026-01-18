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

// Generic value-add tags that should be removed (not unique to specific VCs)
const GENERIC_VALUE_ADD_TAGS = [
  'fintech', 'payments', 'enterprise', 'saas', 'b2b', 'b2c', 'ai/ml', 'ai', 'ml', 
  'deep tech', 'infrastructure', 'enterprise software', 'software', 'consumer',
  'healthcare', 'healthtech', 'edtech', 'climatetech', 'biotech', 'life sciences',
  'mentorship', 'network', 'connections', 'guidance', 'support', 'resources',
  'partnerships', 'strategic guidance', 'operational support', 'hands-on support',
  'market access', 'customer introductions', 'talent', 'recruiting', 'hiring',
  'marketing', 'sales', 'business development', 'product', 'engineering',
  'technical', 'technical_founders', 'deep_tech', 'ai_ml', 'multi_stage', 'global',
  'fiserv_partnership', 'banking technology', 'financial services', 'retail tech',
  'consumer brands', 'e-commerce', 'marketplace', 'd2c', 'dtc', 'web3', 'crypto',
  'defi', 'dex', 'gaming', 'esports', 'entertainment', 'media', 'content',
  'advertising', 'analytics', 'data', 'cloud', 'devops', 'security', 'cybersecurity',
  'iot', 'hardware', 'robotics', 'automation', 'mobility', 'automotive', 'ev',
  'autonomous', 'space', 'energy', 'sustainability', 'climate', 'agriculture',
  'food', 'retail', 'supply chain', 'logistics', 'transportation', 'travel',
  'hospitality', 'real estate', 'proptech', 'legaltech', 'regtech', 'insurtech',
  'wealthtech', 'lending', 'banking', 'capital', 'funding', 'investment',
  'venture capital', 'vc', 'accelerator', 'incubator', 'startup', 'founders',
  'entrepreneurs', 'innovation', 'technology', 'tech', 'digital', 'online',
  'mobile', 'apps', 'platform', 'marketplace', 'saas platform', 'api', 'apis',
  'developer tools', 'open source', 'blockchain', 'cryptocurrency', 'nft',
  'metaverse', 'ar', 'vr', 'augmented reality', 'virtual reality', 'ai safety',
  'global health', 'animal welfare', 'social impact', 'impact', 'sustainability',
  'diversity', 'inclusion', 'inclusive', 'underrepresented', 'women', 'minorities',
  'immigrants', 'students', 'veterans', 'lgbtq', 'black founders', 'latinx',
  'asian', 'african american', 'hispanic', 'native american', 'indigenous',
  'emerging markets', 'developing countries', 'africa', 'asia', 'latin america',
  'europe', 'middle east', 'southeast asia', 'india', 'china', 'japan', 'korea',
  'brazil', 'mexico', 'canada', 'australia', 'uk', 'united kingdom', 'germany',
  'france', 'spain', 'italy', 'netherlands', 'sweden', 'israel', 'singapore',
  'hong kong', 'taiwan', 'philippines', 'indonesia', 'thailand', 'vietnam',
  'malaysia', 'south korea', 'japan', 'china', 'india', 'brazil', 'mexico',
  'argentina', 'chile', 'colombia', 'peru', 'venezuela', 'ecuador', 'uruguay',
  'paraguay', 'bolivia', 'nicaragua', 'costa rica', 'panama', 'guatemala',
  'honduras', 'el salvador', 'dominican republic', 'puerto rico', 'cuba',
  'haiti', 'jamaica', 'trinidad', 'barbados', 'bahamas', 'belize', 'guyana',
  'suriname', 'french guiana', 'us', 'usa', 'united states', 'america',
  'north america', 'south america', 'central america', 'caribbean', 'pacific',
  'atlantic', 'arctic', 'antarctic', 'ocean', 'sea', 'lake', 'river', 'mountain',
  'desert', 'forest', 'jungle', 'savanna', 'tundra', 'grassland', 'wetland',
  'marsh', 'swamp', 'bog', 'fen', 'moor', 'heath', 'prairie', 'steppe',
  'pampas', 'llanos', 'cerrado', 'caatinga', 'pantanal', 'mata atlantica',
  'amazon', 'amazonia', 'amazon rainforest', 'amazon basin', 'amazon river',
  'nile', 'nile river', 'nile valley', 'nile delta', 'nile basin', 'nile region',
  'congo', 'congo river', 'congo basin', 'congo rainforest', 'congo region',
  'mississippi', 'mississippi river', 'mississippi delta', 'mississippi valley',
  'mississippi basin', 'mississippi region', 'mississippi state', 'mississippi',
  'missouri', 'missouri river', 'missouri valley', 'missouri basin',
  'missouri region', 'missouri state', 'missouri', 'ohio', 'ohio river',
  'ohio valley', 'ohio basin', 'ohio region', 'ohio state', 'ohio', 'tennessee',
  'tennessee river', 'tennessee valley', 'tennessee basin', 'tennessee region',
  'tennessee state', 'tennessee', 'arkansas', 'arkansas river', 'arkansas valley',
  'arkansas basin', 'arkansas region', 'arkansas state', 'arkansas', 'colorado',
  'colorado river', 'colorado valley', 'colorado basin', 'colorado region',
  'colorado state', 'colorado', 'rio grande', 'rio grande valley', 'rio grande basin',
  'rio grande region', 'rio grande', 'columbia', 'columbia river', 'columbia valley',
  'columbia basin', 'columbia region', 'columbia state', 'columbia', 'snake',
  'snake river', 'snake valley', 'snake basin', 'snake region', 'snake state',
  'snake', 'fraser', 'fraser river', 'fraser valley', 'fraser basin', 'fraser region',
  'fraser', 'mackenzie', 'mackenzie river', 'mackenzie valley', 'mackenzie basin',
  'mackenzie region', 'mackenzie', 'yukon', 'yukon river', 'yukon valley',
  'yukon basin', 'yukon region', 'yukon territory', 'yukon', 'st. lawrence',
  'st. lawrence river', 'st. lawrence valley', 'st. lawrence basin', 'st. lawrence region',
  'st. lawrence', 'hudson', 'hudson river', 'hudson valley', 'hudson basin',
  'hudson region', 'hudson bay', 'hudson', 'saint lawrence', 'saint lawrence river',
  'saint lawrence valley', 'saint lawrence basin', 'saint lawrence region',
  'saint lawrence', 'saint', 'lawrence', 'lawrence river', 'lawrence valley',
  'lawrence basin', 'lawrence region', 'lawrence', 'seine', 'seine river',
  'seine valley', 'seine basin', 'seine region', 'seine', 'rhine', 'rhine river',
  'rhine valley', 'rhine basin', 'rhine region', 'rhine', 'danube', 'danube river',
  'danube valley', 'danube basin', 'danube region', 'danube', 'volga', 'volga river',
  'volga valley', 'volga basin', 'volga region', 'volga', 'ural', 'ural river',
  'ural valley', 'ural basin', 'ural region', 'ural mountains', 'ural', 'dnieper',
  'dnieper river', 'dnieper valley', 'dnieper basin', 'dnieper region', 'dnieper',
  'don', 'don river', 'don valley', 'don basin', 'don region', 'don', 'kuban',
  'kuban river', 'kuban valley', 'kuban basin', 'kuban region', 'kuban', 'pechora',
  'pechora river', 'pechora valley', 'pechora basin', 'pechora region', 'pechora',
  'northern dvina', 'northern dvina river', 'northern dvina valley', 'northern dvina basin',
  'northern dvina region', 'northern dvina', 'dvina', 'dvina river', 'dvina valley',
  'dvina basin', 'dvina region', 'dvina', 'neva', 'neva river', 'neva valley',
  'neva basin', 'neva region', 'neva', 'thames', 'thames river', 'thames valley',
  'thames basin', 'thames region', 'thames', 'severn', 'severn river', 'severn valley',
  'severn basin', 'severn region', 'severn', 'trent', 'trent river', 'trent valley',
  'trent basin', 'trent region', 'trent', 'great ouse', 'great ouse river',
  'great ouse valley', 'great ouse basin', 'great ouse region', 'great ouse', 'ouse',
  'ouse river', 'ouse valley', 'ouse basin', 'ouse region', 'ouse', 'wye', 'wye river',
  'wye valley', 'wye basin', 'wye region', 'wye', 'tay', 'tay river', 'tay valley',
  'tay basin', 'tay region', 'tay', 'forth', 'forth river', 'forth valley',
  'forth basin', 'forth region', 'forth', 'clyde', 'clyde river', 'clyde valley',
  'clyde basin', 'clyde region', 'clyde', 'tweed', 'tweed river', 'tweed valley',
  'tweed basin', 'tweed region', 'tweed', 'tyne', 'tyne river', 'tyne valley',
  'tyne basin', 'tyne region', 'tyne', 'tees', 'tees river', 'tees valley',
  'tees basin', 'tees region', 'tees', 'wear', 'wear river', 'wear valley',
  'wear basin', 'wear region', 'wear', 'humber', 'humber river', 'humber valley',
  'humber basin', 'humber region', 'humber estuary', 'humber', 'mersey', 'mersey river',
  'mersey valley', 'mersey basin', 'mersey region', 'mersey estuary', 'mersey',
  'dee', 'dee river', 'dee valley', 'dee basin', 'dee region', 'dee', 'ribble',
  'ribble river', 'ribble valley', 'ribble basin', 'ribble region', 'ribble',
  'lune', 'lune river', 'lune valley', 'lune basin', 'lune region', 'lune',
  'eden', 'eden river', 'eden valley', 'eden basin', 'eden region', 'eden',
  'derwent', 'derwent river', 'derwent valley', 'derwent basin', 'derwent region',
  'derwent', 'ouse', 'ouse river', 'ouse valley', 'ouse basin', 'ouse region',
  'ouse', 'wharfe', 'wharfe river', 'wharfe valley', 'wharfe basin', 'wharfe region',
  'wharfe', 'aire', 'aire river', 'aire valley', 'aire basin', 'aire region',
  'aire', 'calder', 'calder river', 'calder valley', 'calder basin', 'calder region',
  'calder', 'don', 'don river', 'don valley', 'don basin', 'don region', 'don',
  'rother', 'rother river', 'rother valley', 'rother basin', 'rother region',
  'rother', 'medway', 'medway river', 'medway valley', 'medway basin', 'medway region',
  'medway', 'stour', 'stour river', 'stour valley', 'stour basin', 'stour region',
  'stour', 'avon', 'avon river', 'avon valley', 'avon basin', 'avon region',
  'avon', 'frome', 'frome river', 'frome valley', 'frome basin', 'frome region',
  'frome', 'parrett', 'parrett river', 'parrett valley', 'parrett basin',
  'parrett region', 'parrett', 'exe', 'exe river', 'exe valley', 'exe basin',
  'exe region', 'exe', 'dart', 'dart river', 'dart valley', 'dart basin',
  'dart region', 'dart', 'tamar', 'tamar river', 'tamar valley', 'tamar basin',
  'tamar region', 'tamar', 'fowey', 'fowey river', 'fowey valley', 'fowey basin',
  'fowey region', 'fowey', 'fal', 'fal river', 'fal valley', 'fal basin',
  'fal region', 'fal', 'helford', 'helf'
]

// Check if a value-add tag is generic (not unique to a specific VC)
function isGenericTag(tag: string): boolean {
  const normalized = tag.toLowerCase().trim()
  
  // Check against generic list
  if (GENERIC_VALUE_ADD_TAGS.includes(normalized)) {
    return true
  }
  
  // Check for generic patterns
  const genericPatterns = [
    /^(fintech|payments|enterprise|saas|b2b|b2c|ai|ml|deep tech|infrastructure)/i,
    /(mentorship|network|connections|guidance|support|resources)$/i,
    /^(partnerships|strategic|operational|hands-on|market access)/i,
    /(customer|talent|recruiting|hiring|marketing|sales|business development)/i,
    /(product|engineering|technical|founders|multi_stage|global)$/i,
  ]
  
  for (const pattern of genericPatterns) {
    if (pattern.test(normalized)) {
      return true
    }
  }
  
  // If it's a sector name (too generic), it's not unique
  const commonSectors = ['fintech', 'payments', 'enterprise', 'saas', 'b2b', 'b2c', 
    'ai/ml', 'ai', 'ml', 'deep tech', 'infrastructure', 'enterprise software', 
    'software', 'consumer', 'healthcare', 'healthtech', 'edtech', 'climatetech',
    'biotech', 'life sciences', 'web3', 'crypto', 'defi', 'gaming', 'esports']
  
  if (commonSectors.includes(normalized)) {
    return true
  }
  
  return false
}

// Check if description is truly unique and not filler
function isTrulyUniqueDescription(description: string | null | undefined, firmName: string): boolean {
  if (!description || description.trim().length < 80) return false
  
  const desc = description.toLowerCase()
  const firm = firmName.toLowerCase()
  
  // Must contain firm name
  if (!desc.includes(firm)) return false
  
  // Must have specific details (portfolio, notable investments, or specific numbers)
  const hasPortfolio = desc.includes('portfolio') || desc.includes('notable') || desc.includes('backed') || desc.includes('invested')
  const hasNumbers = /\d+/.test(description)
  const hasSpecificDetails = desc.includes('known for') || desc.includes('specializes') || desc.includes('focuses') || desc.length > 150
  
  // Must not be generic
  const isGeneric = /^(leading|premier|top-tier|established|well-known|prominent|successful|reputable|venture capital firm|investment firm|vc firm)/i.test(description)
  
  return !isGeneric && (hasPortfolio || hasNumbers || hasSpecificDetails) && desc.length >= 80
}

// Check if VC has unique value-add tags (firm-specific)
function hasUniqueTags(valueAddTags: string[], firmName: string): boolean {
  if (valueAddTags.length === 0) return false
  
  const firm = firmName.toLowerCase()
  const uniqueTags = valueAddTags.filter(tag => {
    const normalized = tag.toLowerCase()
    // Check if tag contains firm name or is firm-specific
    if (normalized.includes(firm) || normalized.includes(firm.replace(/\s+/g, ''))) {
      return true
    }
    // Check if it's a unique program/service (like "YC Network", "Demo Day")
    const uniquePatterns = [
      /network$/i,
      /day$/i,
      /program$/i,
      /fellowship$/i,
      /accelerator$/i,
      /incubator$/i,
      /lab$/i,
      /studio$/i,
      /fund$/i,
      /capital$/i,
      /ventures$/i,
      /partners$/i,
      /group$/i,
      /collective$/i,
      /alliance$/i,
      /guild$/i,
      /club$/i,
      /society$/i,
      /association$/i,
      /foundation$/i,
      /institute$/i,
      /academy$/i,
      /school$/i,
      /university$/i,
      /college$/i,
      /center$/i,
      /centre$/i,
      /hub$/i,
      /space$/i,
      /house$/i,
      /garage$/i,
      /workshop$/i,
      /studio$/i,
      /lab$/i,
      /factory$/i,
      /forge$/i,
      /forge$/i,
      /forge$/i,
    ]
    
    for (const pattern of uniquePatterns) {
      if (pattern.test(normalized) && normalized.length > 5) {
        return true
      }
    }
    
    return false
  })
  
  // Must have at least one unique tag
  return uniqueTags.length > 0
}

async function main() {
  console.log('🔍 Aggressively cleaning VCs - removing fillers and generic tags...\n')
  
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
    console.log('AGGRESSIVE CLEANUP STARTING...\n')
    
    let removedCount = 0
    let cleanedTagsCount = 0
    let keptCount = 0
    
    const removedVCs: string[] = []
    const cleanedTagsVCs: string[] = []
    
    for (const vc of allVCs) {
      const currentDescription = vc.thesis || vc.bio || ''
      const valueAddTags = parseJSON<string[]>(vc.valueAddTags, [])
      
      // Check if description is truly unique
      const hasUniqueDescription = isTrulyUniqueDescription(currentDescription, vc.firmName)
      
      // Check if has unique tags
      const hasUniqueTagsValue = hasUniqueTags(valueAddTags, vc.firmName)
      
      // Filter out generic tags
      const uniqueTags = valueAddTags.filter(tag => !isGenericTag(tag))
      const hasGenericTags = valueAddTags.some(tag => isGenericTag(tag))
      
      // If VC doesn't have unique description AND doesn't have unique tags, remove it
      if (!hasUniqueDescription && !hasUniqueTagsValue) {
        await prisma.investor.delete({
          where: { id: vc.id },
        })
        removedCount++
        removedVCs.push(vc.firmName)
        console.log(`❌ REMOVED: ${vc.firmName} (no unique description or tags)`)
        console.log(`   Description: ${currentDescription.substring(0, 60)}${currentDescription.length > 60 ? '...' : ''}`)
        console.log(`   Tags: ${valueAddTags.join(', ')}`)
        console.log('')
        continue
      }
      
      // If has generic tags, clean them
      if (hasGenericTags) {
        await prisma.investor.update({
          where: { id: vc.id },
          data: {
            valueAddTags: JSON.stringify(uniqueTags),
          },
        })
        cleanedTagsCount++
        cleanedTagsVCs.push(vc.firmName)
        console.log(`🧹 CLEANED TAGS: ${vc.firmName}`)
        console.log(`   Removed: ${valueAddTags.filter(tag => isGenericTag(tag)).join(', ')}`)
        console.log(`   Kept: ${uniqueTags.join(', ') || 'none'}`)
        console.log('')
      } else {
        keptCount++
      }
    }
    
    console.log('\n' + '='.repeat(80))
    console.log('📊 FINAL SUMMARY')
    console.log('='.repeat(80))
    console.log(`Total VCs analyzed: ${allVCs.length}`)
    console.log(`❌ Removed (no unique description or tags): ${removedCount}`)
    console.log(`🧹 Cleaned tags (removed generic): ${cleanedTagsCount}`)
    console.log(`✅ Kept (already unique): ${keptCount}`)
    console.log(`\nRemaining VCs: ${allVCs.length - removedCount}`)
    console.log('='.repeat(80))
    
    if (removedVCs.length > 0) {
      console.log('\n❌ REMOVED VCs:')
      removedVCs.slice(0, 50).forEach(name => console.log(`   - ${name}`))
      if (removedVCs.length > 50) {
        console.log(`   ... and ${removedVCs.length - 50} more`)
      }
    }
    
    if (cleanedTagsVCs.length > 0) {
      console.log('\n🧹 CLEANED TAGS VCs:')
      cleanedTagsVCs.slice(0, 50).forEach(name => console.log(`   - ${name}`))
      if (cleanedTagsVCs.length > 50) {
        console.log(`   ... and ${cleanedTagsVCs.length - 50} more`)
      }
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

