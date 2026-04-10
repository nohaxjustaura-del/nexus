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
 *   Step 7 — Narrative generation (OpenRouter matching/scoring model, e.g. DeepSeek; all VCs in parallel)
 *   Step 8 — Rank and cut (top 12, pure TS)
 *   Step 9 — Return MatchingPipelineResult
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getAIClient } from '@/lib/ai'
import { getModelName } from '@/lib/openrouter'
import { parseJSON } from '@/lib/utils'
import {
  cosineSimilarity,
  countInvestorEmbeddingFilters,
  generatePitchEmbedding,
  investorsToRankableEmbeddings,
  rankVCsForPitch,
} from '@/lib/embeddings'
import type { ComprehensiveFounderContext } from '@/lib/founder-context'
import type { Investor } from '@prisma/client'

import { matchUniversityPrograms, filterOutUniversityPrograms } from './university-matcher'
import { fetchVCExaBundle } from './exa-enrichment'
import { reasonGates } from './gate-reasoner'
import { computeInvestmentLikelihood, type PitchStrengthSignal } from './investment-likelihood'
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

/** Scoring signals passed into the matching pipeline for enriched embeddings and adjusted ranking. */
export interface ScoringSignals {
  tier?: string
  conviction?: string
  bullCase?: string
  categoryScores?: Record<string, number>
  strengths?: string[]
  uniqueness?: string
  marketFit?: string
  subSectorTags?: string[]
  riskFactors?: string[]
}

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
    competitiveMoat: [
      pitchAnalysis?.productFit?.differentiators?.[0] ??
      pitchAnalysis?.uniqueness ??
      '(Not specified)',
    ],
    keywords: [...founder.sectors, founder.stage, founder.location, ...pitchKeywords],
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

function buildAnalysisEnrichment(scoring?: ScoringSignals): import('@/lib/embeddings').AnalysisEnrichment | undefined {
  if (!scoring) return undefined
  return {
    strengths: scoring.strengths,
    uniqueness: scoring.uniqueness,
    marketFit: scoring.marketFit,
    subSectorTags: scoring.subSectorTags,
    riskFactors: scoring.riskFactors,
    tier: scoring.tier,
    conviction: scoring.conviction,
    bullCase: scoring.bullCase,
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runMatchingPipeline(
  founder: ComprehensiveFounderContext,
  pitchAnalysis: PitchAnalysisResult | null,
  transcript: string | null,
  scoringSignals?: ScoringSignals,
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
        OR: stageConditions,
        NOT: checkSizeExclusions.length > 0 ? { OR: checkSizeExclusions } : undefined,
      },
    })
    logger.log(`[ORCHESTRATOR] Step 3 — Hard filter: ${stageFiltered.length} VCs passed`)
  } catch (dbErr: any) {
    logger.error('[ORCHESTRATOR] Prisma hard-filter failed, falling back to visibility-only:', dbErr?.message)
    stageFiltered = await db.investor.findMany({ where: { isPublic: true } })
  }

  if (stageFiltered.length === 0) {
    logger.warn('[ORCHESTRATOR] No VCs passed hard filter — relaxing to visibility-only')
    stageFiltered = await db.investor.findMany({ where: { isPublic: true } })
  }

  const JUNK_VC_NAME = /^(https?:\/\/|www\.|unknown$|test |placeholder|our ai|unlocking ai)/i
  stageFiltered = stageFiltered.filter((vc) => {
    const n = (vc.firmName ?? '').trim()
    return n.length >= 3 && n.length <= 80 && !JUNK_VC_NAME.test(n)
  })
  logger.log(`[ORCHESTRATOR] Step 3 — After name quality filter: ${stageFiltered.length} VCs`)

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
  logger.integration(
    `[ORCHESTRATOR] Step 5 — Voyage pitch embedding → FAISS ${(process.env.FAISS_SERVICE_URL || 'http://localhost:8001').replace(/\/$/, '')}/rank or in-memory cosine; narratives via VC LLM (OpenRouter/Ollama).`,
  )
  // Build a full Postgres lookup map (all public VCs, same corpus as Discover) for FAISS
  // intersection. The stage hard-filter is too restrictive for FAISS matching:
  // FAISS semantic search already handles relevance, so we only need to confirm
  // the VC exists in our database — not that it passed the stage filter.
  let allPublicVCs: Investor[]
  try {
    allPublicVCs = await db.investor.findMany({ where: { isPublic: true } })
  } catch {
    allPublicVCs = stageFiltered
  }
  const allVCsByName = new Map(allPublicVCs.map((vc) => [(vc.firmName ?? '').toLowerCase(), vc]))
  // Stage hard-filter narrows `mainstream` (~hundreds–low thousands). Step 5 semantic search should
  // see every public investor embedding (matches FAISS index / DB), not only stage-matched rows.
  const { mainstream: embeddingPool } = filterOutUniversityPrograms(allPublicVCs as VCProfile[])

  let candidatePool: VCProfile[] = []
  let pitchEmbeddingForInjection: number[] | null = null

  const intersectRankedWithDb = (
    ranked: Awaited<ReturnType<typeof rankVCsForPitch>>,
  ): {
    matched: VCProfile[]
    dbNameHits: number
    noDbRow: number
  } => {
    const matched: VCProfile[] = []
    let dbNameHits = 0
    let noDbRow = 0
    for (const r of ranked) {
      const m = allVCsByName.get((r.firmName ?? '').toLowerCase())
      if (m) {
        dbNameHits++
        if (matched.length < 20) matched.push(m as VCProfile)
      } else {
        noDbRow++
      }
    }
    return { matched, dbNameHits, noDbRow }
  }

  try {
    const pitchCtx = buildPitchContext(founder, pitchAnalysis, transcript, founderSignal.pitchKeywords)
    const enrichment = buildAnalysisEnrichment(scoringSignals)
    const pitchEmbedding = await generatePitchEmbedding(pitchCtx as any, enrichment)
    pitchEmbeddingForInjection = pitchEmbedding

    // Tier-adjusted FAISS retrieval: high-quality pitches get a wider net to find niche fits
    const tierTopK =
      scoringSignals?.tier === 'EXCEPTIONAL' ? 60 :
      scoringSignals?.tier === 'STRONG' ? 55 :
      50
    if (tierTopK !== 50) {
      logger.integration(`[ORCHESTRATOR] Step 5 — tier-adjusted FAISS top_k: ${tierTopK} (tier: ${scoringSignals?.tier})`)
    }

    const embFilter = countInvestorEmbeddingFilters(embeddingPool, pitchEmbedding.length)
    const fallbackRows = investorsToRankableEmbeddings(embeddingPool, pitchEmbedding.length)
    logger.integration(
      `[FAISS] embedding pool: pitch_dim=${pitchEmbedding.length} rankable=${embFilter.rankable}/${embFilter.input} ` +
        `(missing=${embFilter.missingEmbedding} parse_err=${embFilter.parseError} wrong_dim=${embFilter.wrongDimension}) ` +
        `| DB public rows=${allPublicVCs.length} for name intersection | stage-filtered=${mainstream.length}`,
    )

    async function rankAndIntersect(
      mode: 'faiss' | 'memory',
    ): Promise<VCProfile[] | null> {
      try {
        const ranked =
          mode === 'faiss'
            ? await rankVCsForPitch(pitchEmbedding, [], tierTopK, true)
            : await rankVCsForPitch(pitchEmbedding, fallbackRows, tierTopK, false)
        const { matched, dbNameHits, noDbRow } = intersectRankedWithDb(ranked)
        logger.integration(
          `[FAISS] Step5 ${mode === 'faiss' ? 'HTTP' : 'memory'}: neighbors=${ranked.length} ` +
            `db_hits=${dbNameHits} no_row=${noDbRow} → pool≤20=${matched.length}`,
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
      logger.integration(
        `[FAISS] fallback: HTTP/FAISS path <5 pool VCs → in-memory cosine (${fallbackRows.length} rankable rows, ${pitchEmbedding.length}-dim)`,
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

  // ── STEP 5b — Sector injection: guarantee niche-sector VCs are evaluated ────
  //
  // Cosine similarity naturally surfaces SaaS/enterprise VCs because those terms
  // dominate most pitch descriptions. Niche VCs (media, gaming, climate, etc.)
  // get buried even when they are the best fit.
  //
  // Rules:
  //   1. Only trigger for NICHE groups — broad groups (AI, SaaS) already surface
  //      via cosine without help.
  //   2. A VC qualifies only if the matching synonym appears in its SECTORS array
  //      (primary focus), not merely its thesis text — avoids generic VCs that
  //      mention "media" or "AI" in passing.
  //   3. Candidates are ranked by cosine similarity to the pitch embedding so the
  //      BEST sector-matched VCs fill the injection slots.
  //   4. Up to 5 slots; displaces the tail of the cosine pool.
  if (pitchEmbeddingForInjection) {
    const allKeywords = [
      ...founderSignal.sectors,
      ...founderSignal.pitchKeywords,
    ].map((k) => k.toLowerCase())

    // Only NICHE groups that don't naturally surface via cosine similarity
    const NICHE_SECTOR_SYNONYMS: Record<string, string[]> = {
      media:       ['media', 'entertainment', 'film', 'video', 'broadcast', 'ott', 'streaming', 'dubbing', 'localization'],
      gaming:      ['gaming', 'esports', 'interactive media', 'game'],
      climatetech: ['climate', 'cleantech', 'sustainability', 'clean energy'],
      adtech:      ['adtech', 'ad tech', 'advertising tech', 'martech'],
      biotech:     ['biotech', 'life sciences', 'genomics', 'therapeutics'],
      spacetech:   ['space', 'aerospace', 'satellite', 'defense tech'],
    }

    const activeSectorGroups = new Set<string>()
    for (const [group, synonyms] of Object.entries(NICHE_SECTOR_SYNONYMS)) {
      if (synonyms.some((s) => allKeywords.some((k) => k.includes(s) || s.includes(k)))) {
        activeSectorGroups.add(group)
      }
    }

    logger.integration(
      `[ORCHESTRATOR] Step 5b — keywords=[${allKeywords.slice(0, 8).join(', ')}] niche_groups=[${[...activeSectorGroups].join(',') || 'none'}]`,
    )

    if (activeSectorGroups.size > 0) {
      const activeSynonyms = [...activeSectorGroups].flatMap((g) => NICHE_SECTOR_SYNONYMS[g] ?? [])
      const poolIds = new Set(candidatePool.map((v) => v.id))

      // Only match against PRIMARY sectors array — not thesis or firm name
      const sectorCandidates = (embeddingPool as VCProfile[]).filter((vc) => {
        if (poolIds.has(vc.id)) return false
        let vcSectors: string[] = []
        try { vcSectors = JSON.parse(vc.sectors ?? '[]') } catch { /* ignore */ }
        const sectorsLower = vcSectors.map((s) => s.toLowerCase()).join(' ')
        return activeSynonyms.some((s) => sectorsLower.includes(s))
      })

      // Rank by cosine similarity to pitch so best matches fill slots
      const pitchEmb = pitchEmbeddingForInjection
      const ranked = sectorCandidates
        .map((vc) => {
          let sim = 0
          try {
            const vcEmb = JSON.parse(vc.embedding ?? '[]') as number[]
            if (vcEmb.length === pitchEmb.length) sim = cosineSimilarity(pitchEmb, vcEmb)
          } catch { /* ignore */ }
          return { vc, sim }
        })
        .sort((a, b) => b.sim - a.sim)

      const inject = ranked.slice(0, 5).map((r) => r.vc)
      if (inject.length > 0) {
        candidatePool = [...candidatePool.slice(0, 20 - inject.length), ...inject]
        logger.integration(
          `[ORCHESTRATOR] Step 5b — Injected ${inject.length} niche VCs: ${inject.map((v) => `${v.firmName}(${ranked.find((r) => r.vc.id === v.id)?.sim.toFixed(3)})`).join(', ')}`,
        )
      } else {
        logger.integration(`[ORCHESTRATOR] Step 5b — No niche VCs found for groups=[${[...activeSectorGroups].join(',')}]`)
      }
    }
  }

  logger.integration(`[ORCHESTRATOR] Step 5 — Candidate pool: ${candidatePool.length} VCs`)

  // ── STEP 6 — Rolling Exa + Gemini gate reasoning ──────────────────────────
  //
  // As soon as a VC's Exa bundle is ready, Gemini starts immediately.
  // We do not wait for the full batch to finish before starting Gemini.
  // MAX_CONCURRENT_GEMINI caps simultaneous gate reasoning calls.

  const MAX_CONCURRENT_GEMINI = 5
  logger.integration(
    `[EXA] Step 6 — ${candidatePool.length} VCs (3 Exa searches each, batched) + Gemini gates (max ${MAX_CONCURRENT_GEMINI} concurrent)`,
  )

  const results = new Map<string, {
    bundle: VCExaBundle
    likelihood: InvestmentLikelihoodResult
  }>()

  let activeGeminiCalls = 0

  async function processVC(vc: VCProfile): Promise<void> {
    // 1. Fetch Exa bundle
    const bundle = await fetchVCExaBundle(vc, founderSignal)

    // 2. Wait if the Gemini concurrency ceiling is hit
    while (activeGeminiCalls >= MAX_CONCURRENT_GEMINI) {
      await new Promise<void>((resolve) => setTimeout(resolve, 200))
    }

    // 3. Start Gemini gate reasoning immediately (no batching delay here)
    activeGeminiCalls++
    try {
      const gateAnswers = await reasonGates(vc, bundle, founderSignal)
      const pitchStrength: PitchStrengthSignal | undefined = scoringSignals
        ? {
            tier: scoringSignals.tier,
            conviction: scoringSignals.conviction,
            marketScore: scoringSignals.categoryScores?.market,
          }
        : undefined
      const likelihood = computeInvestmentLikelihood(gateAnswers, pitchStrength)
      results.set(vc.id, { bundle, likelihood })
      logger.integration(
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

  logger.integration(`[ORCHESTRATOR] Step 6 complete — ${results.size} VCs scored (Exa + Gemini)`)

  // ── STEP 7 — Narrative generation (all VCs in parallel) ───────────────────
  logger.integration(
    `[OPENROUTER] Step 7 — ${results.size} match narratives in parallel (VC LLM / openrouterGenerateJson)`,
  )
  const narrativePromises = Array.from(results.entries()).map(([vcId, data]) => {
    const vc = candidatePool.find((v) => v.id === vcId)
    if (!vc) return null
    return generateMatchNarrative(vc, data.likelihood, data.bundle, founderSignal).then(
      (narrative) => ({ vc, likelihood: data.likelihood, narrative }),
    )
  }).filter(Boolean) as Promise<{ vc: VCProfile; likelihood: InvestmentLikelihoodResult; narrative: Awaited<ReturnType<typeof generateMatchNarrative>> }>[]

  const narrativeResults = await Promise.all(narrativePromises)
  logger.integration(`[ORCHESTRATOR] Step 7 complete — ${narrativeResults.length} narratives (LLM + fallbacks)`)

  // ── STEP 8 — Rank and cut ─────────────────────────────────────────────────
  const ranked = rankAndCut(narrativeResults)
  logger.integration(`[ORCHESTRATOR] Step 8 — Top ${ranked.length} investors ranked`)

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
