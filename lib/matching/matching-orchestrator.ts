/**
 * ===============================================================================
 * MATCHING ORCHESTRATOR — VC MATCHING PIPELINE v3
 * ===============================================================================
 *
 * Master function that replaces aiNativeMatchVCs() from lib/ai-native-matching.ts.
 * Wires together all lib/matching/ modules into a single async pipeline.
 *
 * Pipeline summary:
 *   Step 1 — Build FounderMatchSignal (pure TS, no I/O)
 *   Step 2 — University program matching (pure TS, sync)
 *   Step 3 — Hard filter: Prisma WHERE clause (unchanged from v2)
 *   Step 4 — Pattern detection from transcript (Gemini, keywords only)
 *   Step 5 — FAISS vector search (top 20, up from 15)
 *   Step 6 — Rolling Exa + Gemini gate reasoning (max 5 concurrent Gemini)
 *   Step 7 — Narrative generation (GPT-4o-mini, all VCs in parallel)
 *   Step 8 — Rank and cut (top 12, pure TS)
 *   Step 9 — Return MatchingPipelineResult
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getAIClient } from '@/lib/ai'
import { getModelName } from '@/lib/openrouter'
import { parseJSON } from '@/lib/utils'
import {
  generatePitchEmbedding,
  investorsToRankableEmbeddings,
  rankVCsForPitch,
} from '@/lib/embeddings'
import type { ComprehensiveFounderContext } from '@/lib/founder-context'
import type { Investor } from '@prisma/client'

import { matchUniversityPrograms, filterOutUniversityPrograms } from './university-matcher'
import { fetchVCExaBundle, createExaClient } from './exa-enrichment'
import { reasonGates } from './gate-reasoner'
import { computeInvestmentLikelihood } from './investment-likelihood'
import { generateMatchNarrative } from './narrative-generator'
import { rankAndCut } from './ranker'
import type {
  FounderMatchSignal,
  InvestmentLikelihoodResult,
  MatchingPipelineResult,
  VCExaBundle,
  VCProfile,
} from './types'

/** Avoid repeating the long embedding-coverage warning on every analysis in dev. */
let loggedLowEmbeddingCoverage = false

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** Minimal shape of pitch analysis objects passed from route handlers. */
export interface PitchAnalysisResult {
  oneLineSummary?: string
  problemStatement?: string
  solutionDescription?: string
  businessModel?: string
  targetCustomer?: string
  tractionMetrics?: {
    revenue?: string | number
    users?: string | number
    growth?: string
    mrr?: string | number
    arr?: string | number
  }
  productFit?: { differentiators?: string[] }
  uniqueness?: string
}

// ---------------------------------------------------------------------------
// Stage normalisation (unchanged from ai-native-matching.ts)
// ---------------------------------------------------------------------------

const STAGE_EXPANSION: Record<string, string[]> = {
  idea:    ['pre-seed', 'seed', 'angel', 'pre_seed', 'preseed', 'idea'],
  mvp:     ['pre-seed', 'seed', 'pre_seed', 'preseed', 'mvp'],
  revenue: ['seed', 'pre-seed', 'pre_seed', 'preseed', 'revenue'],
  seed:    ['seed', 'pre-seed', 'pre_seed', 'preseed'],
  seriesA: ['seed', 'seriesA', 'series_a', 'series-a', 'series a'],
}

function buildStageWhereConditions(founderStage: string) {
  const acceptable = STAGE_EXPANSION[founderStage] ?? [founderStage]
  return acceptable.map((stage) => ({ stages: { contains: `"${stage}"` } }))
}

// ---------------------------------------------------------------------------
// Step 1 helpers — FounderMatchSignal derivation
// ---------------------------------------------------------------------------

function deriveArchetype(founder: ComprehensiveFounderContext): FounderMatchSignal['founderArchetype'] {
  // Technical: engineering or AI/ML background (pre-computed field)
  if (founder.techBackground) return 'technical'

  // Repeat founder: has prior funding or bio mentions prior exit
  const prevFunding = founder.prevFunding ?? ''
  const bio = (founder.bio ?? '').toLowerCase()
  if ((prevFunding && prevFunding !== 'none') ||
      bio.includes('repeat founder') ||
      bio.includes('serial entrepreneur') ||
      bio.includes('prior exit') ||
      bio.includes('second company')) {
    return 'repeat-founder'
  }

  // Academic: current student or academic research background
  const isStudent = founder.isStudent ||
    (founder.age !== undefined && founder.age < 22) ||
    bio.includes('phd') || bio.includes('professor') || bio.includes('researcher')
  if (isStudent) return 'academic'

  // Domain expert: explicit domain expertise language in bio
  if (bio.includes('domain expert') ||
      bio.includes('industry expert') ||
      bio.includes('years in') ||
      bio.includes('decade') ||
      bio.includes('former') && bio.includes('executive')) {
    return 'domain-expert'
  }

  // Default
  return 'operator'
}

function deriveTractionTier(founder: ComprehensiveFounderContext): FounderMatchSignal['tractionTier'] {
  const revenue = founder.revenue ?? 0
  const users = founder.users ?? 0
  if (revenue > 50_000) return 'strong'
  if (revenue > 1_000 || users > 100) return 'meaningful'
  if (users > 0) return 'early'
  return 'none'
}

// ---------------------------------------------------------------------------
// Step 4 helper — pattern detection (unchanged logic, keywords only)
// ---------------------------------------------------------------------------

async function extractPitchKeywords(
  transcript: string,
  founder: ComprehensiveFounderContext,
): Promise<string[]> {
  try {
    const client = getAIClient()
    const completion = await client.chat.completions.create({
      model: getModelName('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: 'Extract VC/accelerator affiliations, universities, and key founder patterns from a pitch transcript. Return valid JSON.',
        },
        {
          role: 'user',
          content: `Analyze this transcript and extract keywords for VC matching context.
Transcript: ${transcript.substring(0, 5000)}
Founder: stage=${founder.stage}, sectors=${founder.sectors.join(', ')}
Return JSON: {"keywords": ["keyword1", "keyword2"]}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(completion.choices[0]?.message?.content ?? '{}')
    return Array.isArray(result.keywords) ? result.keywords : []
  } catch (err: any) {
    logger.warn('[ORCHESTRATOR] Keyword extraction failed (non-critical):', err?.message)
    return []
  }
}

// ---------------------------------------------------------------------------
// Step 5 helper — build pitch context for FAISS embedding
// ---------------------------------------------------------------------------

function buildPitchContext(
  founder: ComprehensiveFounderContext,
  pitchAnalysis: PitchAnalysisResult | null,
  transcript: string | null,
  pitchKeywords: string[],
): Record<string, unknown> {
  return {
    companyName: founder.startupName ?? 'Unknown',
    oneLineSummary: pitchAnalysis?.oneLineSummary ?? founder.bio?.substring(0, 200) ?? '',
    stage: founder.stage,
    sectorPrimary: founder.sectors[0] ?? '',
    sectorSecondary: founder.sectors.slice(1),
    problemStatement:
      pitchAnalysis?.problemStatement ??
      founder.bio?.substring(0, 500) ??
      transcript?.substring(0, 500) ??
      '',
    solutionDescription:
      pitchAnalysis?.solutionDescription ?? founder.businessModel ?? '',
    targetCustomer: {
      customerType: pitchAnalysis?.targetCustomer ?? '',
      buyerRole: '',
      companySize: '',
    },
    geography: { hqLocation: founder.location, markets: [] },
    businessModel: pitchAnalysis?.businessModel ?? founder.businessModel ?? '',
    traction: {
      revenue: String(founder.revenue ?? pitchAnalysis?.tractionMetrics?.revenue ?? ''),
      users: String(founder.users ?? pitchAnalysis?.tractionMetrics?.users ?? ''),
      growthSignal: founder.growthRate ?? String(pitchAnalysis?.tractionMetrics?.growth ?? ''),
    },
    keyTechnologies: [],
    // BUG FIX (v2 used valueAddNeeds here, causing poor moat representation):
    // Now uses actual differentiators from pitch analysis
    competitiveMoat: [
      pitchAnalysis?.productFit?.differentiators?.[0] ??
      pitchAnalysis?.uniqueness ??
      '(Not specified)',
    ],
    keywords: [...founder.sectors, founder.stage, founder.location, ...pitchKeywords],
    // Extended fields read via (pitch as any) inside buildPitchEmbeddingText
    founderBackground: {
      education: founder.education ?? '',
      university: founder.universityAffiliation ?? '',
      isStudent: founder.isStudent,
      age: founder.age,
      techBackground: founder.techBackground,
      isImmigrant: founder.isImmigrant,
      isUnderrepresented: founder.isUnderrepresented,
      isVeteran: founder.isVeteran,
      willingToDropOut: founder.willingToDropOut,
    },
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runMatchingPipeline(
  founder: ComprehensiveFounderContext,
  pitchAnalysis: PitchAnalysisResult | null,
  transcript: string | null,
): Promise<MatchingPipelineResult> {
  const startTime = Date.now()

  // ── STEP 1 — Build FounderMatchSignal ──────────────────────────────────────
  const founderSignal: FounderMatchSignal = {
    stage: founder.stage,
    sectors: founder.sectors,
    primarySector: founder.sectors[0] ?? '',
    founderArchetype: deriveArchetype(founder),
    checkNeeded: founder.fundingNeed ?? 0,
    location: founder.location,
    university: founder.universityAffiliation ?? founder.education ?? null,
    isStudent: founder.isStudent || (founder.age !== undefined && founder.age < 22),
    isRepeatFounder:
      (!!founder.prevFunding && founder.prevFunding !== 'none') ||
      (founder.bio ?? '').toLowerCase().includes('repeat founder'),
    tractionTier: deriveTractionTier(founder),
    keyStrengths: [],
    redFlags: [],
    pitchKeywords: [...founder.sectors, founder.stage],
  }

  // ── STEP 2 — University program matching (sync, no await) ─────────────────
  const universityPrograms = matchUniversityPrograms(founderSignal)
  logger.log(`[ORCHESTRATOR] Step 2 — University programs: ${universityPrograms.length} matches`)

  // ── STEP 3 — Hard filter Prisma query (unchanged from v2) ─────────────────
  const founderStage = founder.stage.toLowerCase()
  const fundingNeed = founder.fundingNeed ?? 0
  const stageConditions = buildStageWhereConditions(founderStage)

  const checkSizeExclusions: any[] = []
  if (fundingNeed > 0) {
    checkSizeExclusions.push({
      AND: [{ checkSizeMin: { gt: 0 } }, { checkSizeMin: { gt: fundingNeed * 5 } }],
    })
    checkSizeExclusions.push({
      AND: [{ checkSizeMax: { gt: 0 } }, { checkSizeMax: { lt: Math.round(fundingNeed / 2) } }],
    })
  }

  let stageFiltered: Investor[]
  try {
    stageFiltered = await db.investor.findMany({
      where: {
        isPublic: true,
        discoverable: true,
        OR: stageConditions,
        NOT: checkSizeExclusions.length > 0 ? { OR: checkSizeExclusions } : undefined,
      },
    })
    logger.log(`[ORCHESTRATOR] Step 3 — Hard filter: ${stageFiltered.length} VCs passed`)
  } catch (dbErr: any) {
    logger.error('[ORCHESTRATOR] Prisma hard-filter failed, falling back to visibility-only:', dbErr?.message)
    stageFiltered = await db.investor.findMany({ where: { isPublic: true, discoverable: true } })
  }

  if (stageFiltered.length === 0) {
    logger.warn('[ORCHESTRATOR] No VCs passed hard filter — relaxing to visibility-only')
    stageFiltered = await db.investor.findMany({ where: { isPublic: true, discoverable: true } })
  }

  // Split out university-exclusive programs so they never appear in the VC pool
  const { mainstream } = filterOutUniversityPrograms(stageFiltered as VCProfile[])
  logger.log(`[ORCHESTRATOR] Step 3 — After university filter: ${mainstream.length} mainstream VCs`)

  // ── STEP 4 — Pattern detection (keywords only, no score boosts) ────────────
  if (transcript && transcript.length > 50) {
    try {
      const keywords = await extractPitchKeywords(transcript, founder)
      founderSignal.pitchKeywords = [
        ...new Set([...founderSignal.pitchKeywords, ...keywords]),
      ]
      logger.log(`[ORCHESTRATOR] Step 4 — Extracted ${keywords.length} pitch keywords`)
    } catch (err: any) {
      logger.warn('[ORCHESTRATOR] Step 4 — Keyword extraction failed (non-critical):', err?.message)
    }
  }

  // ── STEP 5 — FAISS vector search (top 20) ─────────────────────────────────
  // Build a full Postgres lookup map (all public+discoverable VCs) for FAISS
  // intersection. The stage hard-filter is too restrictive for FAISS matching:
  // FAISS semantic search already handles relevance, so we only need to confirm
  // the VC exists in our database — not that it passed the stage filter.
  let allPublicVCs: Investor[]
  try {
    allPublicVCs = await db.investor.findMany({ where: { isPublic: true, discoverable: true } })
  } catch {
    allPublicVCs = stageFiltered
  }
  const allVCsByName = new Map(allPublicVCs.map((vc) => [(vc.firmName ?? '').toLowerCase(), vc]))

  let candidatePool: VCProfile[] = []

  const intersectRankedWithDb = (
    ranked: Awaited<ReturnType<typeof rankVCsForPitch>>,
  ): VCProfile[] => {
    const matched: VCProfile[] = []
    for (const r of ranked) {
      const m = allVCsByName.get((r.firmName ?? '').toLowerCase())
      if (m && matched.length < 20) matched.push(m as VCProfile)
    }
    return matched
  }

  try {
    const pitchCtx = buildPitchContext(founder, pitchAnalysis, transcript, founderSignal.pitchKeywords)
    const pitchEmbedding = await generatePitchEmbedding(pitchCtx as any)
    const fallbackRows = investorsToRankableEmbeddings(mainstream, pitchEmbedding.length)

    async function rankAndIntersect(
      mode: 'faiss' | 'memory',
    ): Promise<VCProfile[] | null> {
      try {
        const ranked =
          mode === 'faiss'
            ? await rankVCsForPitch(pitchEmbedding, [], 50, true)
            : await rankVCsForPitch(pitchEmbedding, fallbackRows, 50, false)
        const matched = intersectRankedWithDb(ranked)
        logger.log(
          `[ORCHESTRATOR] Step 5 — ${mode === 'faiss' ? 'FAISS' : 'in-memory'}: ` +
            `${ranked.length} → ${matched.length} after DB name filter`,
        )
        return matched.length >= 5 ? matched : null
      } catch (e: any) {
        if (mode === 'faiss') {
          const msg = String(e?.message ?? e)
          // Dimension / skip messages are already surfaced from lib/embeddings (FAISS).
          if (!/dimension mismatch|FAISS skipped:/i.test(msg)) {
            logger.warn('[ORCHESTRATOR] FAISS service error:', msg)
          }
        } else {
          logger.warn('[ORCHESTRATOR] In-memory vector rank error:', e?.message ?? e)
        }
        return null
      }
    }

    let picked = await rankAndIntersect('faiss')
    if (!picked && fallbackRows.length >= 5) {
      logger.log(
        `[ORCHESTRATOR] Step 5 — Falling back to in-memory cosine rank ` +
          `(${fallbackRows.length} VCs with ${pitchEmbedding.length}-dim embeddings in DB)`,
      )
      picked = await rankAndIntersect('memory')
    }

    if (picked) {
      candidatePool = picked
    } else {
      if (fallbackRows.length < 5) {
        if (!loggedLowEmbeddingCoverage) {
          loggedLowEmbeddingCoverage = true
          logger.warn(
            `[ORCHESTRATOR] Only ${fallbackRows.length} investors have embeddings matching current pitch model ` +
              `(${pitchEmbedding.length} dims). Start the FAISS service (faiss-service/README) and/or run ` +
              `VC embedding generation so more rows have vectors. Using top 20 mainstream VCs.`,
          )
        }
      } else {
        logger.warn(
          '[ORCHESTRATOR] Vector ranking yielded fewer than 5 DB matches — using top 20 mainstream VCs',
        )
      }
      candidatePool = mainstream.slice(0, 20)
    }
  } catch (embErr: any) {
    logger.warn('[ORCHESTRATOR] Pitch embedding failed — using top 20 mainstream VCs:', embErr?.message)
    candidatePool = mainstream.slice(0, 20)
  }

  logger.log(`[ORCHESTRATOR] Step 5 — Candidate pool: ${candidatePool.length} VCs`)

  // ── STEP 6 — Rolling Exa + Gemini gate reasoning ──────────────────────────
  //
  // As soon as a VC's Exa bundle is ready, Gemini starts immediately.
  // We do not wait for the full batch to finish before starting Gemini.
  // MAX_CONCURRENT_GEMINI caps simultaneous gate reasoning calls.

  const exaClient = createExaClient()

  const results = new Map<string, {
    bundle: VCExaBundle
    likelihood: InvestmentLikelihoodResult
  }>()

  let activeGeminiCalls = 0
  const MAX_CONCURRENT_GEMINI = 5

  async function processVC(vc: VCProfile): Promise<void> {
    // 1. Fetch Exa bundle
    const bundle = await fetchVCExaBundle(vc, founderSignal, exaClient)

    // 2. Wait if the Gemini concurrency ceiling is hit
    while (activeGeminiCalls >= MAX_CONCURRENT_GEMINI) {
      await new Promise<void>((resolve) => setTimeout(resolve, 200))
    }

    // 3. Start Gemini gate reasoning immediately (no batching delay here)
    activeGeminiCalls++
    try {
      const gateAnswers = await reasonGates(vc, bundle, founderSignal)
      const likelihood = computeInvestmentLikelihood(gateAnswers)
      results.set(vc.id, { bundle, likelihood })
      logger.log(
        `[ORCHESTRATOR] Step 6 — ${vc.firmName}: ${likelihood.label} (conf=${likelihood.confidence})`,
      )
    } finally {
      activeGeminiCalls--
    }
  }

  // Process VCs in Exa-rate-limited batches of 3
  // (3 VCs × 3 Exa queries = 9 queries/batch, safely under 10 QPS)
  const EXA_BATCH_SIZE = 3
  const EXA_BATCH_DELAY_MS = 1_200

  for (let i = 0; i < candidatePool.length; i += EXA_BATCH_SIZE) {
    const batch = candidatePool.slice(i, i + EXA_BATCH_SIZE)
    await Promise.all(batch.map(processVC))
    if (i + EXA_BATCH_SIZE < candidatePool.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, EXA_BATCH_DELAY_MS))
    }
  }

  logger.log(`[ORCHESTRATOR] Step 6 complete — ${results.size} VCs scored`)

  // ── STEP 7 — Narrative generation (all VCs in parallel) ───────────────────
  const narrativePromises = Array.from(results.entries()).map(([vcId, data]) => {
    const vc = candidatePool.find((v) => v.id === vcId)
    if (!vc) return null
    return generateMatchNarrative(vc, data.likelihood, data.bundle, founderSignal).then(
      (narrative) => ({ vc, likelihood: data.likelihood, narrative }),
    )
  }).filter(Boolean) as Promise<{ vc: VCProfile; likelihood: InvestmentLikelihoodResult; narrative: Awaited<ReturnType<typeof generateMatchNarrative>> }>[]

  const narrativeResults = await Promise.all(narrativePromises)
  logger.log(`[ORCHESTRATOR] Step 7 complete — ${narrativeResults.length} narratives generated`)

  // ── STEP 8 — Rank and cut ─────────────────────────────────────────────────
  const ranked = rankAndCut(narrativeResults)
  logger.log(`[ORCHESTRATOR] Step 8 — Top ${ranked.length} investors ranked`)

  // ── STEP 9 — Return MatchingPipelineResult ────────────────────────────────
  return {
    rankedInvestors: ranked,
    universityPrograms,
    pipelineVersion: '3.0',
    durationMs: Date.now() - startTime,
    vcsScoredCount: results.size,
    hardVetoedCount: narrativeResults.filter((r) => r.likelihood.hardVeto).length,
    lowConfidenceCount: ranked.filter(
      (r) => r.investmentLikelihood.confidence === 'LOW',
    ).length,
  }
}
