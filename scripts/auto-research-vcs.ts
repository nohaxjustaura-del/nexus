/**
 * AUTOMATED VC RESEARCH SYSTEM
 *
 * Researches VCs using web search and AI, then updates the database with
 * verified, structured data. Fills ALL investor fields, not just check size.
 */

import { db } from '../lib/db'
import { openrouterGenerateJson, hasOpenRouterKey, getVcExtractionModel } from '../lib/openrouter'
import { gatherVCFirmRetrievalContext, getVcResearchPipelineEnvStatus } from '../lib/vc-research-retrieval'

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

export type ResearchBatchMode = 'full' | 'thesis' | 'profile'

const contextSliceLen = () =>
  Math.min(28000, Math.max(8000, parseInt(process.env.VC_RESEARCH_CONTEXT_CHARS || '20000', 10) || 20000))

async function extractThesisOnly(
  firmName: string,
  rawContent: string,
): Promise<Pick<VCResearchResult, 'thesis'>> {
  try {
    const result = await openrouterGenerateJson<{ thesis: string | null }>({
      system: `You extract ONLY the investment thesis for this VC/investor from the text. Return JSON: { "thesis": string | null }. Be specific (themes, stage, sectors). If not stated, null.`,
      user: `Firm: "${firmName}"\n\n${rawContent.substring(0, contextSliceLen())}`,
      temperature: 0.15,
      model: getVcExtractionModel(),
      retryOnParseError: true,
    })
    return { thesis: result.thesis || undefined }
  } catch (e: any) {
    console.error(`   ⚠️ Thesis extraction failed for ${firmName}:`, e.message)
    return {}
  }
}

async function extractProfileFieldsOnly(
  firmName: string,
  rawContent: string,
): Promise<
  Omit<
    Partial<VCResearchResult>,
    'firmName' | 'verified' | 'researchDate' | 'sources' | 'thesis'
  >
> {
  try {
    const result = await openrouterGenerateJson<{
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
      system: `Extract structured VC profile data from Exa retrieval — do NOT include thesis. Return accurate JSON only.

Fund types: "Micro VC", "Venture Capital", "Accelerator", "CVC", "Angel Group", "Family Office", "Growth Equity"
Lead/follow: "lead", "follow", "either"
Stages: "pre-seed", "seed", "Series A", "Series B", "Series C", "Growth"`,
      user: `Firm: "${firmName}". Extract all available data except investment thesis:

${rawContent.substring(0, contextSliceLen())}`,
      temperature: 0.15,
      model: getVcExtractionModel(),
      retryOnParseError: true,
    })
    return {
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
  } catch (e: any) {
    console.error(`   ⚠️ Profile extraction failed for ${firmName}:`, e.message)
    return {}
  }
}

/**
 * OpenRouter-only structured extraction from merged dual-Exa retrieval.
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
      system: `You extract structured VC/investor data from Exa web retrieval (two query passes: fund profile and deals/fundraising). Rules:
- Return accurate JSON only. Do not invent fund sizes, portfolios, or URLs not supported by the text.
- Prefer facts repeated across sources; when sources conflict, prefer the fund's primary site / press / official bio.
- If unknown, use null for strings/numbers and [] for arrays.

Fund types: "Micro VC", "Venture Capital", "Accelerator", "CVC", "Angel Group", "Family Office", "Growth Equity"
Lead/follow: "lead", "follow", "either"
Stages: "pre-seed", "seed", "Series A", "Series B", "Series C", "Growth" only.`,
      user: `Extract all available data for "${firmName}" from this material:

${rawContent.substring(0, contextSliceLen())}

Return JSON with: thesis (2-3 sentences, specific themes and stage if present), bio (2-3 sentences: who they are, founding vintage or notable background if stated), checkSizeMin (thousands USD, e.g. 500 = $500K), checkSizeMax (thousands), stages, sectors, geography (country/region level), fundType, leadFollow, portfolio (company names only, max 25), valueAddTags, websiteUrl (official fund site if explicit), linkedinUrl (company/fund page if explicit), applicationUrl (pitch form or email contact page if explicit)`,
      temperature: 0.15,
      model: getVcExtractionModel(),
      retryOnParseError: true,
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
 * Research a single VC firm (dual-Exa + OpenRouter). Mode limits extraction/application.
 */
async function researchVC(
  firmName: string,
  mode: ResearchBatchMode = 'full',
): Promise<VCResearchResult | null> {
  const label = mode === 'full' ? 'Researching' : mode === 'thesis' ? 'Thesis refresh' : 'Profile refresh'
  console.log(`\n🔍 ${label}: ${firmName}`)

  try {
    if (!hasOpenRouterKey()) {
      console.error(`   ⚠️ OPENROUTER_API_KEY is required for VC extraction (Exa supplies text).`)
      return null
    }

    const pipe = getVcResearchPipelineEnvStatus()
    if (!pipe.exa) {
      console.warn(`   ⚠️ EXA_API_KEY missing — VC research retrieval will fail.`)
    }

    const snapshot = await gatherVCFirmRetrievalContext(firmName)
    if (!snapshot) {
      console.log(`   ⚠️ No retrieval context (check EXA_API_KEY and quotas)`)
      return null
    }

    console.log(
      `   📚 Context: Exa ${snapshot.exaTotalResults} result(s), ${snapshot.exaPassesWithHits}/2 passes, ${snapshot.mergedContext.length} chars`,
    )

    const base = {
      firmName,
      verified: true,
      researchDate: new Date(),
      sources: snapshot.sources,
    }

    if (mode === 'thesis') {
      const { thesis } = await extractThesisOnly(firmName, snapshot.mergedContext)
      console.log(`   ✅ Thesis: ${thesis ? `${thesis.slice(0, 80)}…` : 'none'}`)
      return { ...base, thesis }
    }

    if (mode === 'profile') {
      const fields = await extractProfileFieldsOnly(firmName, snapshot.mergedContext)
      console.log(
        `   ✅ Profile: checks ${fields.checkSizeMin != null ? 'yes' : 'no'}, ${fields.stages?.length || 0} stages, ${fields.portfolio?.length || 0} portfolio`,
      )
      return { ...base, ...fields }
    }

    const aiExtracted = await extractWithAI(firmName, snapshot.mergedContext)
    const result: VCResearchResult = { ...base, ...aiExtracted }
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
/** Apply only thesis (+ verified). */
export async function updateVCInDatabaseThesisOnly(research: VCResearchResult): Promise<boolean> {
  try {
    const existing = await db.investor.findFirst({
      where: { firmName: research.firmName },
    })
    if (!existing) {
      console.log(`   ⚠️ VC not found in database: ${research.firmName}`)
      return false
    }
    const updateData: Record<string, unknown> = { verified: true }
    if (research.thesis && (!existing.thesis || existing.thesis.length < 20)) {
      updateData.thesis = research.thesis
    }
    const fieldsUpdated = Object.keys(updateData).length > 1 ? 1 : 0
    if (fieldsUpdated > 0) {
      await db.investor.update({ where: { id: existing.id }, data: updateData })
      console.log(`   ✅ Updated thesis for ${research.firmName}`)
    } else {
      await db.investor.update({ where: { id: existing.id }, data: { verified: true } })
      console.log(`   ℹ️ No thesis slot to fill for ${research.firmName}`)
    }
    return true
  } catch (error: any) {
    console.error(`   ❌ Error updating database:`, error.message)
    return false
  }
}

/** Apply profile fields only — never touches thesis. */
export async function updateVCInDatabaseProfileOnly(research: VCResearchResult): Promise<boolean> {
  try {
    const existing = await db.investor.findFirst({
      where: { firmName: research.firmName },
    })
    if (!existing) {
      console.log(`   ⚠️ VC not found in database: ${research.firmName}`)
      return false
    }
    const updateData: any = {}

    if (research.checkSizeMin && existing.checkSizeMin === 0) {
      updateData.checkSizeMin = research.checkSizeMin
    }
    if (research.checkSizeMax && existing.checkSizeMax === 0) {
      updateData.checkSizeMax = research.checkSizeMax
    }
    if (research.stages?.length && existing.stages === '[]') {
      updateData.stages = JSON.stringify(research.stages)
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
    updateData.verified = true
    const fieldsUpdated = Object.keys(updateData).length - 1
    if (fieldsUpdated > 0) {
      await db.investor.update({ where: { id: existing.id }, data: updateData })
      console.log(`   ✅ Updated ${fieldsUpdated} profile fields for ${research.firmName}`)
    } else {
      await db.investor.update({ where: { id: existing.id }, data: { verified: true } })
      console.log(`   ℹ️ No empty profile fields for ${research.firmName}`)
    }
    return true
  } catch (error: any) {
    console.error(`   ❌ Error updating database:`, error.message)
    return false
  }
}

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
    mode?: ResearchBatchMode
  } = {}
): Promise<void> {
  const { delayBetweenSearches = 2000, maxConcurrent = 3, mode = 'full' } = options

  console.log(`\n🚀 Starting batch research: ${firmNames.length} VCs (mode=${mode})`)
  console.log(`   Delay: ${delayBetweenSearches}ms, Max concurrent: ${maxConcurrent}\n`)

  let updated = 0
  let failed = 0

  const apply = async (research: VCResearchResult) => {
    if (mode === 'thesis') return updateVCInDatabaseThesisOnly(research)
    if (mode === 'profile') return updateVCInDatabaseProfileOnly(research)
    return updateVCInDatabase(research)
  }

  for (let i = 0; i < firmNames.length; i += maxConcurrent) {
    const batch = firmNames.slice(i, i + maxConcurrent)

    const results = await Promise.all(
      batch.map(async (firmName) => {
        const research = await researchVC(firmName, mode)
        if (research) {
          const ok = await apply(research)
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
  if (firmNames.length > 0) {
    console.log(`   📈 Success rate: ${((updated / firmNames.length) * 100).toFixed(1)}%`)
  }
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
