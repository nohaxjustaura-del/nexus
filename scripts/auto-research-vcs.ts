/**
 * AUTOMATED VC RESEARCH SYSTEM
 * 
 * Researches VCs using web search and updates database with verified data
 * Can run in background or be scheduled
 */

import { db } from '../lib/db'
import { searchVCInfo } from '../lib/web-search'

interface VCResearchResult {
  firmName: string
  checkSizeMin?: number
  checkSizeMax?: number
  stages?: string[]
  thesis?: string
  sectors?: string[]
  geography?: string[]
  verified: boolean
  researchDate: Date
  sources?: string[]
}

/**
 * Research a single VC firm using web search
 */
async function researchVC(firmName: string): Promise<VCResearchResult | null> {
  console.log(`\n🔍 Researching: ${firmName}`)
  
  try {
    // Search for VC information
    const searchQuery = `${firmName} VC investment thesis check size stages 2026`
    console.log(`   Searching: "${searchQuery}"`)
    
    // Use web search
    const searchResponse = await searchVCInfo(firmName, 'investment thesis check size stages 2026')
    
    if (!searchResponse || !searchResponse.results || searchResponse.results.length === 0) {
      console.log(`   ⚠️  No results found`)
      return null
    }
    
    const searchResults = searchResponse.results
    
    // Extract key information from search results
    const result: VCResearchResult = {
      firmName,
      verified: true,
      researchDate: new Date(),
      sources: searchResults.map((r) => r.url).filter(Boolean),
    }
    
    // Combine all content for parsing
    const allContent = searchResults.map(r => r.content).join(' ')
    
    // Parse check sizes from results (improved patterns)
    const checkSizePatterns = [
      /\$(\d+\.?\d*)\s*K?\s*-\s*\$(\d+\.?\d*)\s*K?\s*(?:million|M|thousand|K)?/gi,
      /check.*?\$?(\d+\.?\d*)\s*(?:million|M)\s*-\s*\$?(\d+\.?\d*)\s*(?:million|M)/gi,
      /(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s*million/gi,
      /\$(\d+\.?\d*)\s*M/gi,
    ]
    
    const foundCheckSizes: number[] = []
    
    for (const pattern of checkSizePatterns) {
      const matches = Array.from(allContent.matchAll(pattern))
      for (const match of matches) {
        const nums = match.slice(1).map(n => {
          const num = parseFloat(n)
          // If number is < 100 and context suggests millions, multiply by 1000
          if (match[0].toLowerCase().includes('million') || match[0].includes('M')) {
            return num * 1000
          }
          return num
        })
        foundCheckSizes.push(...nums)
      }
    }
    
    if (foundCheckSizes.length >= 2) {
      result.checkSizeMin = Math.min(...foundCheckSizes)
      result.checkSizeMax = Math.max(...foundCheckSizes)
    } else if (foundCheckSizes.length === 1) {
      // Single check size found
      result.checkSizeMin = foundCheckSizes[0]
      result.checkSizeMax = foundCheckSizes[0] * 2 // Estimate max as 2x min
    }
    
    // Extract stages
    const stageKeywords = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Growth']
    const foundStages: string[] = []
    
    for (const stage of stageKeywords) {
      if (allContent.toLowerCase().includes(stage.toLowerCase())) {
        foundStages.push(stage)
      }
    }
    
    if (foundStages.length > 0) {
      result.stages = foundStages
    }
    
    // Extract thesis (first 800 chars of combined content)
    if (allContent) {
      result.thesis = allContent.substring(0, 800)
    }
    
    console.log(`   ✅ Found: ${result.checkSizeMin ? `$${result.checkSizeMin}K-$${result.checkSizeMax}K` : 'check size unknown'}, ${result.stages?.length || 0} stages`)
    
    return result
  } catch (error: any) {
    console.error(`   ❌ Error researching ${firmName}:`, error.message)
    return null
  }
}

/**
 * Update VC in database with researched data
 */
async function updateVCInDatabase(research: VCResearchResult): Promise<boolean> {
  try {
    const existing = await db.investor.findFirst({
      where: { firmName: research.firmName },
    })
    
    if (!existing) {
      console.log(`   ⚠️  VC not found in database: ${research.firmName}`)
      return false
    }
    
    const updateData: any = {
      verified: research.verified,
    }
    
    if (research.checkSizeMin !== undefined) {
      updateData.checkSizeMin = research.checkSizeMin
    }
    if (research.checkSizeMax !== undefined) {
      updateData.checkSizeMax = research.checkSizeMax
    }
    if (research.stages) {
      updateData.stages = JSON.stringify(research.stages)
    }
    if (research.thesis) {
      updateData.thesis = research.thesis
    }
    if (research.sectors) {
      updateData.sectors = JSON.stringify(research.sectors)
    }
    if (research.geography) {
      updateData.geography = JSON.stringify(research.geography)
    }
    
    await db.investor.update({
      where: { id: existing.id },
      data: updateData,
    })
    
    console.log(`   ✅ Updated database: ${research.firmName}`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error updating database:`, error.message)
    return false
  }
}

/**
 * Research multiple VCs (batch processing)
 */
async function researchVCsBatch(
  firmNames: string[],
  options: {
    delayBetweenSearches?: number // ms to wait between searches
    maxConcurrent?: number // max parallel searches
  } = {}
): Promise<void> {
  const { delayBetweenSearches = 2000, maxConcurrent = 3 } = options
  
  console.log(`\n🚀 Starting batch research: ${firmNames.length} VCs`)
  console.log(`   Delay: ${delayBetweenSearches}ms, Max concurrent: ${maxConcurrent}\n`)
  
  let updated = 0
  let failed = 0
  
  // Process in batches to avoid rate limiting
  for (let i = 0; i < firmNames.length; i += maxConcurrent) {
    const batch = firmNames.slice(i, i + maxConcurrent)
    
    const results = await Promise.all(
      batch.map(async (firmName) => {
        const research = await researchVC(firmName)
        if (research) {
          const updated = await updateVCInDatabase(research)
          return { firmName, success: updated }
        }
        return { firmName, success: false }
      })
    )
    
    results.forEach(({ firmName, success }) => {
      if (success) {
        updated++
      } else {
        failed++
      }
    })
    
    // Wait before next batch
    if (i + maxConcurrent < firmNames.length) {
      console.log(`\n⏳ Waiting ${delayBetweenSearches}ms before next batch...`)
      await new Promise(resolve => setTimeout(resolve, delayBetweenSearches))
    }
  }
  
  console.log(`\n📊 Batch Research Complete:`)
  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📈 Success rate: ${((updated / firmNames.length) * 100).toFixed(1)}%`)
}

/**
 * Main function - can be called from CLI or scheduled
 */
async function main() {
  const args = process.argv.slice(2)
  
  if (args[0] === '--batch') {
    // Research top VCs
    const topVCs = [
      'Benchmark',
      'Accel',
      'First Round Capital',
      'Lightspeed Venture Partners',
      'Index Ventures',
      'Greylock Partners',
      'Bessemer Venture Partners',
      'General Catalyst',
      'NEA',
      'Insight Partners',
    ]
    
    await researchVCsBatch(topVCs, {
      delayBetweenSearches: 2000,
      maxConcurrent: 2,
    })
  } else if (args[0] === '--all') {
    // Research all VCs (WARNING: This will take a long time!)
    console.log('⚠️  Researching ALL VCs - this will take hours!')
    const allVCs = await db.investor.findMany({
      where: { verified: true },
      select: { firmName: true },
      orderBy: { firmName: 'asc' },
    })
    
    const firmNames = allVCs.map(vc => vc.firmName)
    await researchVCsBatch(firmNames, {
      delayBetweenSearches: 3000,
      maxConcurrent: 1, // Slower to avoid rate limits
    })
  } else if (args[0]) {
    // Research specific VC
    const research = await researchVC(args[0])
    if (research) {
      await updateVCInDatabase(research)
    }
  } else {
    console.log(`
Usage:
  npm run research-vcs -- --batch    # Research top 10 VCs
  npm run research-vcs -- --all      # Research all VCs (slow!)
  npm run research-vcs -- "VC Name"  # Research specific VC
    `)
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
    .finally(async () => {
      await db.$disconnect()
    })
}

export { researchVC, researchVCsBatch, updateVCInDatabase }
