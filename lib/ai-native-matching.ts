/**
 * ===============================================================================
 * AI-NATIVE MATCHING SYSTEM v2 — Surgical Funnel + Live Enrichment
 * ===============================================================================
 *
 * FinalScore = (IntelligentScore × 0.4) + (VectorScore × 0.3) + (EnrichmentScore × 0.3)
 *
 * Phase 1 — Hard Filter:  Exclude VCs whose stages don't include the founder's stage
 * Phase 2 — Vector Search: FAISS top-15 by semantic similarity
 * Phase 3 — Live Enrichment: Exa web search + GPT-4o-mini summary (parallel)
 * Phase 4 — Re-Scoring:  Conflict penalty (−50), weighted formula, sort top 10
 */

import { Investor } from "@prisma/client"
import { db } from "./db"
import { intelligentMatchVCs, EnhancedMatchResult } from "./intelligent-matching"
import { rankVCsForPitch, generatePitchEmbedding, RankedVC } from "./embeddings"
import { getComprehensiveFounderContext, ComprehensiveFounderContext } from "./founder-context"
import { ResumeFeatures, getAIClient } from "./ai"
import { getModelName } from "./openrouter"
import { parseJSON } from "./utils"
import { logger } from "./logger"
import { getLiveInvestorPulse, ExaSnippet } from "./exa-service"
import { generateVCSummary, detectConflict, VCSummary, ConflictResult } from "./enrichment-evaluator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LivePulse {
  summary: VCSummary
  recentDeals: ExaSnippet[]
  conflict: ConflictResult
  fromCache: boolean
  signalStrength: number
}

export interface AINativeMatchResult extends EnhancedMatchResult {
  investor: Investor
  intelligentScore: number
  vectorSimilarity: number
  enrichmentScore: number
  combinedScore: number
  scoreBreakdown: {
    intelligent: { score: number; weight: number; reasons: string[] }
    vector: { score: number; weight: number; explanation: string }
    enrichment: { score: number; weight: number; conflictPenalty: number }
    ycTrends?: { adjustment: number; insights: string[] }
  }
  livePulse: LivePulse | null
  founderContext: ComprehensiveFounderContext | null
  pitchContext?: {
    transcript?: string
    analysis?: any
    features?: any
  }
  /** Optional outreach hints when intelligent layer provides them */
  whyApply?: string
  bestApproach?: string
  timing?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Detect VC affiliations and founder patterns from transcript using AI
 */
async function detectVCAffiliations(
  transcript: string,
  founderContext: ComprehensiveFounderContext | null
): Promise<{
  vcAffiliations: string[]
  universitySignals: string[]
  acceleratorSignals: string[]
  founderPatterns: string[]
  confidence: number
}> {
  if (!transcript || transcript.length < 50) {
    return { vcAffiliations: [], universitySignals: [], acceleratorSignals: [], founderPatterns: [], confidence: 0 }
  }

  try {
    const client = getAIClient()

    const completion = await client.chat.completions.create({
      model: getModelName('gpt-4o'),
      messages: [
        {
          role: "system",
          content: "Expert VC pattern recognition system. Detect affiliations, universities, and founder patterns from pitch transcripts. Return valid JSON.",
        },
        {
          role: "user",
          content: `Analyze this pitch transcript and detect:
1. VC/Accelerator affiliations (YC, Techstars, 500 Global, etc.)
2. University signals (Stanford, MIT, Berkeley, Harvard, etc.)
3. Founder patterns (student founder, technical founder, repeat founder, etc.)

Transcript:
${transcript.substring(0, 5000)}

Founder Profile Context:
${founderContext ? `
- Education: ${founderContext.education || 'Not specified'}
- University: ${founderContext.universityAffiliation || 'Not specified'}
- Is Student: ${founderContext.isStudent}
- Stage: ${founderContext.stage}
- Sectors: ${founderContext.sectors.join(', ')}
` : 'No profile context available'}

Return JSON: {"vcAffiliations":[],"universitySignals":[],"acceleratorSignals":[],"founderPatterns":[],"confidence":0}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    return {
      vcAffiliations: result.vcAffiliations || [],
      universitySignals: result.universitySignals || [],
      acceleratorSignals: result.acceleratorSignals || [],
      founderPatterns: result.founderPatterns || [],
      confidence: result.confidence || 0,
    }
  } catch (error: any) {
    logger.warn('[AI-NATIVE] VC affiliation detection failed:', error?.message)
    return { vcAffiliations: [], universitySignals: [], acceleratorSignals: [], founderPatterns: [], confidence: 0 }
  }
}

function buildComprehensivePitchContext(
  founder: any,
  pitchAnalysis?: any,
  transcript?: string,
  resumeFeatures?: ResumeFeatures,
  founderContext?: ComprehensiveFounderContext | null,
  detectedPatterns?: { vcAffiliations: string[]; universitySignals: string[]; acceleratorSignals: string[]; founderPatterns: string[] }
): any {
  const sectors = parseJSON<string[]>(founder.sectors || '[]', [])
  const valueAddNeeds = parseJSON<string[]>(founder.valueAddNeeds || '[]', [])
  const ethicsTags = parseJSON<string[]>(founder.ethicsTags || '[]', [])
  const personalityTags = parseJSON<string[]>(founder.personalityTags || '[]', [])

  return {
    companyName: founder.startupName || 'Unknown',
    oneLineSummary: pitchAnalysis?.oneLineSummary || founder.bio?.substring(0, 200) || '',
    stage: founder.stage,
    sectorPrimary: sectors[0] || '',
    sectorSecondary: sectors.slice(1),
    problemStatement: pitchAnalysis?.problemStatement || founder.bio?.substring(0, 500) || transcript?.substring(0, 500) || '',
    solutionDescription: pitchAnalysis?.solutionDescription || founder.businessModel || '',
    targetCustomer: { customerType: pitchAnalysis?.targetCustomer || '', buyerRole: '', companySize: '' },
    geography: { hqLocation: founder.location, markets: [] },
    businessModel: founder.businessModel || pitchAnalysis?.businessModel || '',
    traction: {
      revenue: founder.revenue || pitchAnalysis?.tractionMetrics?.revenue || '',
      users: founder.users || pitchAnalysis?.tractionMetrics?.users || '',
      growthSignal: founder.growthRate || pitchAnalysis?.tractionMetrics?.growth || '',
      mrr: pitchAnalysis?.tractionMetrics?.mrr,
      arr: pitchAnalysis?.tractionMetrics?.arr,
    },
    keyTechnologies: resumeFeatures?.skills?.programming || [],
    competitiveMoat: valueAddNeeds,
    founderBackground: {
      education: founder.education || founderContext?.education || '',
      university: founderContext?.universityAffiliation || '',
      isStudent: founderContext?.isStudent || false,
      age: founder.age || founderContext?.age,
      techBackground: founderContext?.techBackground || false,
      isImmigrant: founderContext?.isImmigrant || false,
      isUnderrepresented: founderContext?.isUnderrepresented || false,
      isVeteran: founderContext?.isVeteran || false,
      willingToDropOut: founder.willingToDropOut || false,
    },
    preferences: {
      valueAddNeeds, ethicsTags, personalityTags,
      geoPreference: founderContext?.geoPreference || '',
      decisionSpeedDays: founderContext?.decisionSpeedDays || '',
      targetOwnershipMax: founderContext?.targetOwnershipMax || '',
      fundTypePreference: founderContext?.fundTypePreference || '',
      leadPreference: founderContext?.leadPreference || '',
    },
    detectedPatterns: detectedPatterns || { vcAffiliations: [], universitySignals: [], acceleratorSignals: [], founderPatterns: [] },
    keywords: [
      ...sectors, founder.stage, founder.location,
      ...(resumeFeatures?.skills?.programming || []),
      ...(resumeFeatures?.skills?.ml || []),
      ...(founderContext?.universityAffiliation ? [founderContext.universityAffiliation] : []),
      ...(detectedPatterns?.vcAffiliations || []),
      ...(detectedPatterns?.universitySignals || []),
      ...(detectedPatterns?.founderPatterns || []),
    ],
    transcript: transcript?.substring(0, 3000),
    teamSize: founder.teamSize,
    fundingNeed: founder.fundingNeed,
    profileRichness: {
      bio: founder.bio || founderContext?.bio || '',
      linkedinUrl: founderContext?.linkedinUrl || '',
      websiteUrl: founderContext?.websiteUrl || '',
      prevFunding: founderContext?.prevFunding || '',
      prevFundingAmount: founderContext?.prevFundingAmount || '',
      cofounders: founderContext?.cofounders || '',
      hoursPerWeek: founderContext?.hoursPerWeek || '',
    },
  }
}

/**
 * Build a comprehensive founder dossier for the enrichment evaluator (Exa + LLM).
 *
 * Structured with clear headers so models can parse distinct signals:
 *   STARTUP / SUMMARY / FOUNDER / TRACTION / ASK
 */
function buildPitchText(
  founder: any,
  pitchAnalysis?: any,
  transcript?: string,
  founderContext?: ComprehensiveFounderContext | null,
): string {
  const sectors = parseJSON<string[]>(founder.sectors || '[]', [])
  const safe = (v: unknown) => (v != null && v !== '' ? String(v) : null)

  // --- STARTUP (core identity) ---
  const startupLines = [
    safe(founder.startupName),
    `Stage: ${founder.stage || 'Unknown'}`,
    sectors.length > 0 && `Sectors: ${sectors.join(', ')}`,
    safe(founder.businessModel) && `Model: ${founder.businessModel}`,
    safe(founder.location || founderContext?.location) &&
      `Location: ${founder.location || founderContext?.location}`,
  ].filter(Boolean)

  // --- SUMMARY (the hook — up to 1000 chars) ---
  const summaryBody =
    pitchAnalysis?.oneLineSummary ||
    founder.bio?.substring(0, 1000) ||
    transcript?.substring(0, 1000) ||
    ''
  const summaryLines = [summaryBody]
  if (pitchAnalysis?.oneLineSummary && transcript) {
    summaryLines.push(transcript.substring(0, 800))
  }

  // --- FOUNDER (pedigree & background) ---
  const founderLines: string[] = []
  const education = safe(founder.education || founderContext?.education)
  if (education) founderLines.push(`Education: ${education}`)
  const university = safe(founderContext?.universityAffiliation)
  if (university && university !== education) founderLines.push(`University: ${university}`)
  if (founderContext?.isStudent) founderLines.push('Currently a student founder')
  if (founderContext?.techBackground) founderLines.push('Technical background')
  if (founderContext?.isImmigrant) founderLines.push('Immigrant founder')
  if (founderContext?.isVeteran) founderLines.push('Veteran founder')
  if (founderContext?.isUnderrepresented) founderLines.push('Underrepresented founder')
  const cofounders = safe(founderContext?.cofounders)
  if (cofounders) founderLines.push(`Co-founders: ${cofounders}`)
  const prevFunding = safe(founderContext?.prevFunding)
  if (prevFunding && prevFunding !== 'none') {
    const amt = safe(founderContext?.prevFundingAmount)
    founderLines.push(`Previous funding: ${prevFunding}${amt ? ` ($${amt})` : ''}`)
  }

  // --- TRACTION (proof) ---
  const tractionLines: string[] = []
  const revenue = safe(founder.revenue || pitchAnalysis?.tractionMetrics?.revenue)
  if (revenue) tractionLines.push(`Revenue: ${revenue}`)
  const users = safe(founder.users || pitchAnalysis?.tractionMetrics?.users)
  if (users) tractionLines.push(`Users: ${users}`)
  const growth = safe(founder.growthRate || pitchAnalysis?.tractionMetrics?.growth)
  if (growth) tractionLines.push(`Growth: ${growth}`)
  const mrr = safe(pitchAnalysis?.tractionMetrics?.mrr)
  if (mrr) tractionLines.push(`MRR: ${mrr}`)
  const teamSize = safe(founder.teamSize || founderContext?.teamSize)
  if (teamSize) tractionLines.push(`Team size: ${teamSize}`)

  // --- ASK (what they need) ---
  const askLines: string[] = []
  const fundingNeed = founder.fundingNeed || founderContext?.fundingNeed
  if (fundingNeed) askLines.push(`Raising: $${fundingNeed}K`)
  const valueAddNeeds = parseJSON<string[]>(founder.valueAddNeeds || '[]', [])
  if (valueAddNeeds.length > 0) askLines.push(`Looking for: ${valueAddNeeds.join(', ')}`)

  // --- Assemble with clear headers ---
  const sections: string[] = []
  sections.push(`STARTUP: ${startupLines.join('. ')}`)
  sections.push(`SUMMARY: ${summaryLines.join(' ')}`)
  if (founderLines.length > 0) sections.push(`FOUNDER: ${founderLines.join('. ')}`)
  if (tractionLines.length > 0) sections.push(`TRACTION: ${tractionLines.join('. ')}`)
  if (askLines.length > 0) sections.push(`ASK: ${askLines.join('. ')}`)

  return sections.join('\n')
}

// ---------------------------------------------------------------------------
// Stage normalisation — maps founder stages to VC stage labels stored in DB
// ---------------------------------------------------------------------------

const STAGE_EXPANSION: Record<string, string[]> = {
  idea: ['pre-seed', 'seed', 'angel', 'pre_seed', 'preseed', 'idea'],
  mvp: ['pre-seed', 'seed', 'pre_seed', 'preseed', 'mvp'],
  revenue: ['seed', 'pre-seed', 'pre_seed', 'preseed', 'revenue'],
  seed: ['seed', 'pre-seed', 'pre_seed', 'preseed'],
  seriesA: ['seed', 'seriesA', 'series_a', 'series-a', 'series a'],
}

/**
 * Build Prisma WHERE conditions for stage filtering.
 * Because stages is a JSON string in SQLite (e.g. '["pre-seed","seed"]'),
 * we use `contains: '"seed"'` (with quotes) to get exact element matches
 * without false positives ('"seed"' won't match inside '"pre-seed"').
 */
function buildStageWhereConditions(founderStage: string) {
  const acceptable = STAGE_EXPANSION[founderStage] || [founderStage]
  return acceptable.map(stage => ({ stages: { contains: `"${stage}"` } }))
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Surgical Funnel matching pipeline.
 *
 * Phase 1 — Hard filter (Prisma WHERE): stage, visibility, check size
 * Phase 2 — FAISS top-15
 * Phase 3 — Live enrichment (Exa + GPT-4o-mini)
 * Phase 4 — Re-score with conflict penalty, weighted formula, return top 10
 */
export async function aiNativeMatchVCs(
  founder: any,
  _investors: Investor[],  // kept for backward compat; Phase 1 queries DB directly
  options: {
    pitchAnalysis?: any
    transcript?: string
    resumeFeatures?: ResumeFeatures
    useFAISS?: boolean
  } = {}
): Promise<AINativeMatchResult[]> {
  const { pitchAnalysis, transcript, resumeFeatures, useFAISS = true } = options
  const founderStage = (founder.stage || 'seed').toLowerCase()
  const fundingNeed = founder.fundingNeed || 0  // in thousands

  // -----------------------------------------------------------------------
  // Founder context & pattern detection (parallel)
  // -----------------------------------------------------------------------

  let founderContext: ComprehensiveFounderContext | null = null
  try {
    founderContext = await getComprehensiveFounderContext(founder.email)
    logger.log(`[AI-NATIVE] Loaded founder context: ${!!founderContext}`)
  } catch (err: any) {
    logger.warn('[AI-NATIVE] Founder context failed:', err?.message)
  }

  let detectedPatterns = {
    vcAffiliations: [] as string[],
    universitySignals: [] as string[],
    acceleratorSignals: [] as string[],
    founderPatterns: [] as string[],
    confidence: 0,
  }
  if (transcript && transcript.length > 50) {
    try {
      detectedPatterns = await detectVCAffiliations(transcript, founderContext)
      logger.log('[AI-NATIVE] Detected patterns:', detectedPatterns)
    } catch (err: any) {
      logger.warn('[AI-NATIVE] Pattern detection failed:', err?.message)
    }
  }

  // Build pitch context for embedding
  const pitchContext = buildComprehensivePitchContext(
    founder, pitchAnalysis, transcript, resumeFeatures, founderContext, detectedPatterns,
  )

  // -----------------------------------------------------------------------
  // PHASE 1 — Hard Filters (Prisma WHERE — rows that fail never reach the UI)
  //
  //  HARD FILTER 1  │ Stage       │ VC's stages JSON must contain at least
  //                 │             │ one stage the founder qualifies for.
  //                 │             │ A seed-stage founder will NEVER see a
  //                 │             │ Series-C-only VC.
  //  ─────────────────────────────────────────────────────────────────────
  //  HARD FILTER 2  │ Visibility  │ isPublic = true AND discoverable = true.
  //                 │             │ Hidden / unlisted profiles are excluded.
  //  ─────────────────────────────────────────────────────────────────────
  //  HARD FILTER 3a │ Check Size  │ Exclude when the VC's MINIMUM check
  //                 │ (too small) │ is more than 5× the founder's raise.
  //  ─────────────────────────────────────────────────────────────────────
  //  HARD FILTER 3b │ Check Size  │ Exclude when the founder's raise is
  //                 │ (too big)   │ more than 2× the VC's MAXIMUM check.
  //                 │             │ VCs with 0/null check sizes are NOT
  //                 │             │ excluded — unknown data is not a
  //                 │             │ reason to block.
  // -----------------------------------------------------------------------

  const stageConditions = buildStageWhereConditions(founderStage)

  const checkSizeExclusions: any[] = []
  if (fundingNeed > 0) {
    // 3a: VC's minimum is way above founder's raise
    checkSizeExclusions.push({
      AND: [
        { checkSizeMin: { gt: 0 } },
        { checkSizeMin: { gt: fundingNeed * 5 } },
      ],
    })
    // 3b: Founder needs more than 2× the VC's maximum check
    checkSizeExclusions.push({
      AND: [
        { checkSizeMax: { gt: 0 } },
        { checkSizeMax: { lt: Math.round(fundingNeed / 2) } },
      ],
    })
  }

  let stageFiltered: Investor[]
  try {
    stageFiltered = await db.investor.findMany({
      where: {
        // HARD FILTER 2 — Visibility
        isPublic: true,
        discoverable: true,
        // HARD FILTER 1 — Stage
        OR: stageConditions,
        // HARD FILTER 3 — Check size (exclude bad fits)
        NOT: checkSizeExclusions.length > 0
          ? { OR: checkSizeExclusions }
          : undefined,
      },
    })
    logger.log(`[AI-NATIVE] Phase 1 — Hard filters (Prisma WHERE): ${stageFiltered.length} VCs passed (stage=${founderStage}, fundingNeed=${fundingNeed}K)`)
    logger.log(`[AI-NATIVE]   Filter breakdown: stage=${stageConditions.length} stage variants, visibility=public+discoverable, checkSize=${checkSizeExclusions.length > 0 ? 'active' : 'skipped (no fundingNeed)'}`)
  } catch (dbErr: any) {
    logger.error('[AI-NATIVE] Prisma hard-filter query failed, falling back to passed-in investors:', dbErr?.message)
    stageFiltered = _investors
  }

  if (stageFiltered.length === 0) {
    logger.warn('[AI-NATIVE] No VCs passed hard filters — falling back to visibility-only query')
    stageFiltered = await db.investor.findMany({
      where: { isPublic: true, discoverable: true },
    })
  }

  // -----------------------------------------------------------------------
  // PHASE 2 — Vector Search: FAISS top-15 from stage-filtered set
  // -----------------------------------------------------------------------

  const stageFilteredIds = new Set(stageFiltered.map(vc => vc.id))
  let vectorMatches: RankedVC[] = []

  try {
    const pitchEmbedding = await generatePitchEmbedding(pitchContext)

    if (useFAISS) {
      try {
        // Ask FAISS for more than 20 so we can intersect with stage-filtered set
        const faissResults = await rankVCsForPitch(pitchEmbedding, [], 50, true)
        vectorMatches = faissResults.filter(r => stageFilteredIds.has(r.id)).slice(0, 15)
        logger.log(`[AI-NATIVE] Phase 2 — FAISS: ${faissResults.length} results, ${vectorMatches.length} after stage filter`)
      } catch (faissErr: any) {
        logger.warn('[AI-NATIVE] FAISS failed, falling back to stage-filtered set:', faissErr?.message)
      }
    }
  } catch (embErr: any) {
    logger.warn('[AI-NATIVE] Embedding generation failed:', embErr?.message)
  }

  const topIds = new Set(vectorMatches.map(v => v.id))
  let candidateInvestors: Investor[]

  if (topIds.size >= 5) {
    candidateInvestors = stageFiltered.filter(vc => topIds.has(vc.id))
  } else {
    logger.log('[AI-NATIVE] FAISS returned <5, using top 15 stage-filtered VCs')
    candidateInvestors = stageFiltered.slice(0, 15)
  }

  // -----------------------------------------------------------------------
  // Intelligent matching (rule-based) — run on candidates
  // -----------------------------------------------------------------------

  const resumeLikeFeatures: ResumeFeatures = resumeFeatures || {
    basics: {},
    education: founderContext?.education ? [{ school: founderContext.education, degree: '', field: '' }] : [],
    experience: [],
    skills: { programming: [], ml: [], gtm: [], domain: [] },
    traction: {
      revenue: founder.revenue || founderContext?.revenue,
      users: founder.users || founderContext?.users,
      growth: founder.growthRate || founderContext?.growthRate,
    },
  }

  const enrichedFounderData = {
    ...founder,
    sectors: parseJSON<string[]>(founder.sectors || '[]', []),
    age: founder.age || founderContext?.age,
    revenue: founder.revenue || founderContext?.revenue,
    users: founder.users || founderContext?.users,
    growthRate: founder.growthRate || founderContext?.growthRate,
    teamSize: founder.teamSize || founderContext?.teamSize,
    education: founder.education || founderContext?.education || '',
    universityAffiliation: founder.universityAffiliation || founderContext?.universityAffiliation || '',
    isStudent: founder.isStudent || founderContext?.isStudent || false,
    willingToDropOut: founder.willingToDropOut || founderContext?.willingToDropOut || false,
    isImmigrant: founderContext?.isImmigrant || false,
    isUnderrepresented: founderContext?.isUnderrepresented || false,
    isVeteran: founderContext?.isVeteran || false,
    techBackground: founderContext?.techBackground || false,
    valueAddNeeds: parseJSON<string[]>(founder.valueAddNeeds || '[]', []),
    ethicsTags: parseJSON<string[]>(founder.ethicsTags || '[]', []),
    personalityTags: parseJSON<string[]>(founder.personalityTags || '[]', []),
    bio: founder.bio || founderContext?.bio || '',
    prevFunding: founderContext?.prevFunding || '',
    prevFundingAmount: founderContext?.prevFundingAmount || '',
    detectedVCAffiliations: detectedPatterns.vcAffiliations,
    detectedUniversities: detectedPatterns.universitySignals,
    detectedFounderPatterns: detectedPatterns.founderPatterns,
  }

  let intelligentMatches: (EnhancedMatchResult & { investor: Investor })[] = []
  try {
    intelligentMatches = await intelligentMatchVCs(resumeLikeFeatures, enrichedFounderData, candidateInvestors)
    logger.log(`[AI-NATIVE] Intelligent matching: ${intelligentMatches.length} scored`)
  } catch (err: any) {
    logger.error('[AI-NATIVE] Intelligent matching failed:', err)
  }

  // -----------------------------------------------------------------------
  // PHASE 3 — Live Enrichment (Exa + GPT-4o-mini) — parallel for all candidates
  // -----------------------------------------------------------------------

  const pitchText = buildPitchText(founder, pitchAnalysis, transcript, founderContext)
  const primarySector = parseJSON<string[]>(founder.sectors || '[]', [])[0] || 'technology'

  logger.log(`[AI-NATIVE] Phase 3 — Enriching ${candidateInvestors.length} VCs via Exa (batched, 5/sec)...`)

  const EXA_BATCH_SIZE = 5
  const EXA_BATCH_DELAY_MS = 1200

  const enrichmentMap = new Map<string, LivePulse>()

  for (let i = 0; i < candidateInvestors.length; i += EXA_BATCH_SIZE) {
    const batch = candidateInvestors.slice(i, i + EXA_BATCH_SIZE)

    if (i > 0) {
      await new Promise(r => setTimeout(r, EXA_BATCH_DELAY_MS))
    }

    const batchResults = await Promise.allSettled(
      batch.map(async (vc): Promise<{ id: string; pulse: LivePulse }> => {
        try {
          const pulse = await getLiveInvestorPulse(vc.firmName, primarySector, vc.id, vc.fundType || 'Venture Capital')

          const vcFundType = vc.fundType || 'Venture Capital'
          const [summary, conflict] = await Promise.all([
            generateVCSummary(vc.firmName, pulse.recentDeals, pulse.thoughtLeadership, pitchText, vcFundType),
            detectConflict(vc.firmName, pulse.recentDeals, pitchText, vcFundType),
          ])

          return {
            id: vc.id,
            pulse: { summary, recentDeals: pulse.recentDeals, conflict, fromCache: pulse.fromCache, signalStrength: pulse.signalStrength },
          }
        } catch (err: any) {
          logger.warn(`[AI-NATIVE] Enrichment failed for ${vc.firmName}:`, err?.message)
          return {
            id: vc.id,
            pulse: {
              summary: {
                recentPortfolio: `Could not retrieve recent portfolio for ${vc.firmName}.`,
                currentHeat: 'Enrichment data unavailable.',
                founderAlignment: 'Enrichment data unavailable.',
              },
              recentDeals: [],
              conflict: { isConflict: false, competitorNames: [], reasoning: 'Enrichment unavailable.' },
              fromCache: false,
              signalStrength: 0,
            },
          }
        }
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        enrichmentMap.set(result.value.id, result.value.pulse)
      }
    }

    logger.log(`[AI-NATIVE] Exa batch ${Math.floor(i / EXA_BATCH_SIZE) + 1}/${Math.ceil(candidateInvestors.length / EXA_BATCH_SIZE)} complete`)
  }

  logger.log(`[AI-NATIVE] Phase 3 complete — ${enrichmentMap.size}/${candidateInvestors.length} enriched`)

  for (const vc of candidateInvestors) {
    const pulse = enrichmentMap.get(vc.id)
    if (pulse) {
      logger.log(`[AI-NATIVE] 📋 ${vc.firmName} | Signal: ${pulse.signalStrength} | Portfolio: ${pulse.summary.recentPortfolio} | Heat: ${pulse.summary.currentHeat} | Alignment: ${pulse.summary.founderAlignment}`)
    } else {
      logger.log(`[AI-NATIVE] 📋 ${vc.firmName} | No enrichment data`)
    }
  }

  // -----------------------------------------------------------------------
  // PHASE 4 — Re-Scoring with weighted formula
  //
  // FinalScore = (IntelligentScore × 0.4) + (VectorScore × 0.3) + (EnrichmentScore × 0.3)
  //
  // EnrichmentScore starts at 50 (neutral) and adjusts:
  //   +25 if recent deals found
  //   +15 if thought leadership found
  //   +10 if summary indicates alignment with founder
  //   −50 if direct conflict detected
  // -----------------------------------------------------------------------

  const scoredMatches: AINativeMatchResult[] = candidateInvestors.map(investor => {
    const intelligentMatch = intelligentMatches.find(m => m?.investor?.id === investor.id)
    const intelligentScore = intelligentMatch?.score || 0

    const vectorMatch = vectorMatches.find(m => m?.id === investor.id)
    const vectorSimilarity = vectorMatch?.similarity ?? 0
    const vectorScore = Math.round(vectorSimilarity * 100)

    const pulse = enrichmentMap.get(investor.id) ?? null

    // --- Enrichment score ---
    let enrichmentScore = 50 // neutral baseline
    let conflictPenalty = 0

    if (pulse) {
      // Low signal = potentially inactive VC — strong penalty so they don't rank #1
      if (pulse.signalStrength === 0) {
        enrichmentScore -= 35
      } else if (pulse.signalStrength <= 1) {
        enrichmentScore -= 20
      }

      if (pulse.recentDeals.length > 0) enrichmentScore += 25
      if (pulse.summary.currentHeat && !pulse.summary.currentHeat.includes('unavailable')) enrichmentScore += 15
      if (pulse.summary.founderAlignment && !pulse.summary.founderAlignment.includes('unavailable')) enrichmentScore += 10
      if (pulse.conflict.isConflict) {
        conflictPenalty = 50
        enrichmentScore -= conflictPenalty
      }
    }

    enrichmentScore = Math.max(0, Math.min(100, enrichmentScore))

    const combinedScore = Math.round(
      intelligentScore * 0.4 +
      vectorScore * 0.3 +
      enrichmentScore * 0.3
    )

    const scoreBreakdown = {
      intelligent: {
        score: intelligentScore,
        weight: 0.4,
        reasons: intelligentMatch?.reasons || [],
      },
      vector: {
        score: vectorScore,
        weight: 0.3,
        explanation: vectorMatch
          ? `Semantic similarity: ${(vectorSimilarity * 100).toFixed(1)}%`
          : 'Vector similarity unavailable',
      },
      enrichment: {
        score: enrichmentScore,
        weight: 0.3,
        conflictPenalty,
      },
      ycTrends: intelligentMatch?.ycTrends ? {
        adjustment: intelligentMatch.ycTrends.scoreAdjustment || 0,
        insights: intelligentMatch.ycTrends.insights?.map(i => typeof i === 'string' ? i : i.description || '') || [],
      } : undefined,
    }

    return {
      investorId: investor.id,
      score: combinedScore,
      confidence: Math.min(95, Math.max(50, combinedScore)),
      reasons: [
        ...(intelligentMatch?.reasons || []),
        vectorMatch ? `Semantic similarity: ${(vectorSimilarity * 100).toFixed(1)}%` : '',
        pulse?.conflict.isConflict ? `⚠️ Portfolio conflict: ${pulse.conflict.competitorNames.join(', ')}` : '',
      ].filter(Boolean),
      suggestions: intelligentMatch?.suggestions || [],
      detailedReasons: intelligentMatch?.detailedReasons || [],
      strengths: intelligentMatch?.strengths || [],
      weaknesses: intelligentMatch?.weaknesses || [],
      investor,
      intelligentScore,
      vectorSimilarity,
      enrichmentScore,
      combinedScore,
      scoreBreakdown,
      livePulse: pulse,
      founderContext,
      pitchContext: transcript || pitchAnalysis ? {
        transcript: transcript?.substring(0, 1000) || '',
        analysis: pitchAnalysis || {},
        features: pitchContext || {},
      } : undefined,
    } as AINativeMatchResult
  })

  // -----------------------------------------------------------------------
  // Final Sort — top 10 by combinedScore
  // -----------------------------------------------------------------------

  scoredMatches.sort((a, b) => b.combinedScore - a.combinedScore)
  const top10 = scoredMatches.slice(0, 10)

  logger.log(`[AI-NATIVE] Final — Top 10 scores: ${top10.map(m => `${m.investor.firmName}=${m.combinedScore}`).join(', ')}`)

  return top10
}
