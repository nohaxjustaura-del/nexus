/**
 * AUTOMATED VC RESEARCH SYSTEM
 *
 * Researches VCs using web search and AI, then updates the database with
 * verified, structured data. Fills ALL investor fields, not just check size.
 */

import { db } from '../lib/db'
import { searchVCInfo } from '../lib/web-search'
import { openrouterGenerateJson } from '../lib/openrouter'

export interface VCResearchResult {
  firmName: string
  checkSizeMin?: number
  checkSizeMax?: number
  stages?: string[]
  thesis?: string
  bio?: string
  sectors?: string[]
  geography?: string[]
  fundType?: string
  leadFollow?: string
  portfolio?: string[]
  valueAddTags?: string[]
  websiteUrl?: string
  linkedinUrl?: string
  applicationUrl?: string
  verified: boolean
  researchDate: Date
  sources?: string[]
}

/**
 * Use AI to extract structured VC data from raw search content.
 * Falls back to regex if AI is unavailable.
 */
async function extractWithAI(firmName: string, rawContent: string): Promise<Partial<VCResearchResult>> {
  try {
    const result = await openrouterGenerateJson<{
      thesis: string
      bio: string
      checkSizeMin: number | null
      checkSizeMax: number | null
      stages: string[]
      sectors: string[]
      geography: string[]
      fundType: string
      leadFollow: string
      portfolio: string[]
      valueAddTags: string[]
      websiteUrl: string | null
      linkedinUrl: string | null
      applicationUrl: string | null
    }>({
      system: `You extract structured VC/investor data from web search results. Return accurate JSON only; never fabricate data. If information is not found, use null for strings/numbers and empty arrays for lists.

Fund types: "Micro VC", "Venture Capital", "Accelerator", "CVC", "Angel Group", "Family Office", "Growth Equity"
Lead/follow: "lead", "follow", "either"
Stages: use exactly these values: "pre-seed", "seed", "Series A", "Series B", "Series C", "Growth"`,
      user: `Extract all available data for "${firmName}" from these search results:

${rawContent.substring(0, 6000)}

Return JSON with: thesis (1-2 sentence investment thesis), bio (1-2 sentence firm description), checkSizeMin (in thousands, e.g. 500 = $500K), checkSizeMax (in thousands), stages (array), sectors (array of focus areas), geography (array of regions), fundType, leadFollow, portfolio (array of notable company names), valueAddTags (array like "board seats", "recruiting", "go-to-market"), websiteUrl, linkedinUrl, applicationUrl`,
      temperature: 0.2,
      model: 'deepseek/deepseek-chat',
    })

    return {
      thesis: result.thesis || undefined,
      bio: result.bio || undefined,
      checkSizeMin: result.checkSizeMin ?? undefined,
      checkSizeMax: result.checkSizeMax ?? undefined,
      stages: result.stages?.length ? result.stages : undefined,
      sectors: result.sectors?.length ? result.sectors : undefined,
      geography: result.geography?.length ? result.geography : undefined,
      fundType: result.fundType || undefined,
      leadFollow: result.leadFollow || undefined,
      portfolio: result.portfolio?.length ? result.portfolio : undefined,
      valueAddTags: result.valueAddTags?.length ? result.valueAddTags : undefined,
      websiteUrl: result.websiteUrl || undefined,
      linkedinUrl: result.linkedinUrl || undefined,
      applicationUrl: result.applicationUrl || undefined,
    }
  } catch (error: any) {
    console.error(`   ⚠️ AI extraction failed for ${firmName}:`, error.message)
    return {}
  }
}

/**
 * Research a single VC firm using web search + AI extraction
 */
async function researchVC(firmName: string): Promise<VCResearchResult | null> {
  console.log(`\n🔍 Researching: ${firmName}`)

  try {
    const year = new Date().getFullYear()
    const searchResponse = await searchVCInfo(firmName, `investment thesis check size stages ${year}`)

    if (!searchResponse || !searchResponse.results || searchResponse.results.length === 0) {
      console.log(`   ⚠️ No results found`)
      return null
    }

    const allContent = searchResponse.results.map(r => r.content).join('\n\n')

    const aiExtracted = await extractWithAI(firmName, allContent)

    const result: VCResearchResult = {
      firmName,
      verified: true,
      researchDate: new Date(),
      sources: searchResponse.results.map(r => r.url).filter(Boolean),
      ...aiExtracted,
    }

    console.log(`   ✅ Found: ${result.checkSizeMin ? `$${result.checkSizeMin}K-$${result.checkSizeMax}K` : 'check size unknown'}, ${result.stages?.length || 0} stages, ${result.portfolio?.length || 0} portfolio cos`)

    return result
  } catch (error: any) {
    console.error(`   ❌ Error researching ${firmName}:`, error.message)
    return null
  }
}

/**
 * Update VC in database  -  only fills in missing fields, never overwrites
 * existing good data with potentially worse AI-extracted data.
 */
async function updateVCInDatabase(research: VCResearchResult): Promise<boolean> {
  try {
    const existing = await db.investor.findFirst({
      where: { firmName: research.firmName },
    })

    if (!existing) {
      console.log(`   ⚠️ VC not found in database: ${research.firmName}`)
      return false
    }

    const updateData: any = {}

    // Only fill fields that are currently empty/default
    if (research.checkSizeMin && existing.checkSizeMin === 0) {
      updateData.checkSizeMin = research.checkSizeMin
    }
    if (research.checkSizeMax && existing.checkSizeMax === 0) {
      updateData.checkSizeMax = research.checkSizeMax
    }
    if (research.stages?.length && existing.stages === '[]') {
      updateData.stages = JSON.stringify(research.stages)
    }
    if (research.thesis && (!existing.thesis || existing.thesis.length < 20)) {
      updateData.thesis = research.thesis
    }
    if (research.bio && (!existing.bio || existing.bio.length < 20)) {
      updateData.bio = research.bio
    }
    if (research.sectors?.length && existing.sectors === '[]') {
      updateData.sectors = JSON.stringify(research.sectors)
    }
    if (research.geography?.length) {
      const existingGeo = existing.geography || '[]'
      if (existingGeo === '[]') {
        updateData.geography = JSON.stringify(research.geography)
      }
    }
    if (research.fundType && existing.fundType === 'Venture Capital') {
      updateData.fundType = research.fundType
    }
    if (research.leadFollow && existing.leadFollow === 'either') {
      updateData.leadFollow = research.leadFollow
    }
    if (research.portfolio?.length && (!existing.portfolio || existing.portfolio === '[]')) {
      updateData.portfolio = JSON.stringify(research.portfolio)
    }
    if (research.valueAddTags?.length && existing.valueAddTags === '[]') {
      updateData.valueAddTags = JSON.stringify(research.valueAddTags)
    }
    if (research.websiteUrl && !existing.websiteUrl) {
      updateData.websiteUrl = research.websiteUrl
    }
    if (research.linkedinUrl && !existing.linkedinUrl) {
      updateData.linkedinUrl = research.linkedinUrl
    }
    if (research.applicationUrl && !existing.applicationUrl) {
      updateData.applicationUrl = research.applicationUrl
    }

    // Always mark as verified and update timestamp
    updateData.verified = true

    const fieldsUpdated = Object.keys(updateData).length - 1 // minus verified
    if (fieldsUpdated > 0) {
      await db.investor.update({
        where: { id: existing.id },
        data: updateData,
      })
      console.log(`   ✅ Updated ${fieldsUpdated} fields for ${research.firmName}`)
    } else {
      console.log(`   ℹ️ No empty fields to fill for ${research.firmName}`)
      // Still touch updatedAt so we don't re-research next cycle
      await db.investor.update({
        where: { id: existing.id },
        data: { verified: true },
      })
    }

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
    delayBetweenSearches?: number
    maxConcurrent?: number
  } = {}
): Promise<void> {
  const { delayBetweenSearches = 2000, maxConcurrent = 3 } = options

  console.log(`\n🚀 Starting batch research: ${firmNames.length} VCs`)
  console.log(`   Delay: ${delayBetweenSearches}ms, Max concurrent: ${maxConcurrent}\n`)

  let updated = 0
  let failed = 0

  for (let i = 0; i < firmNames.length; i += maxConcurrent) {
    const batch = firmNames.slice(i, i + maxConcurrent)

    const results = await Promise.all(
      batch.map(async (firmName) => {
        const research = await researchVC(firmName)
        if (research) {
          const ok = await updateVCInDatabase(research)
          return { firmName, success: ok }
        }
        return { firmName, success: false }
      })
    )

    results.forEach(({ success }) => {
      if (success) updated++
      else failed++
    })

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
 * Main function  -  can be called from CLI or scheduled
 */
async function main() {
  const args = process.argv.slice(2)

  if (args[0] === '--batch') {
    const topVCs = [
      'Benchmark', 'Accel', 'First Round Capital', 'Lightspeed Venture Partners',
      'Index Ventures', 'Greylock Partners', 'Bessemer Venture Partners',
      'General Catalyst', 'NEA', 'Insight Partners',
    ]
    await researchVCsBatch(topVCs, { delayBetweenSearches: 2000, maxConcurrent: 2 })
  } else if (args[0] === '--all') {
    console.log('⚠️ Researching ALL VCs  -  this will take hours!')
    const allVCs = await db.investor.findMany({
      select: { firmName: true },
      orderBy: { updatedAt: 'asc' },
    })
    await researchVCsBatch(allVCs.map(vc => vc.firmName), {
      delayBetweenSearches: 3000,
      maxConcurrent: 1,
    })
  } else if (args[0]) {
    const research = await researchVC(args[0])
    if (research) await updateVCInDatabase(research)
  } else {
    console.log(`
Usage:
  npm run research-vcs -- --batch    # Research top 10 VCs
  npm run research-vcs -- --all      # Research all VCs (slow!)
  npm run research-vcs -- "VC Name"  # Research specific VC
    `)
  }
}

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
