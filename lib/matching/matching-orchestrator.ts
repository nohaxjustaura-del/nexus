/**
 * ===============================================================================
 * MATCHING ORCHESTRATOR — VC MATCHING PIPELINE v3
 * ===============================================================================
 *
 * Master function that replaces aiNativeMatchVCs() from lib/ai-native-matching.ts.
 * Wires together all lib/matching/ modules into a single async pipeline.
 *
 * Pipeline summary:
 *   Step 1 — Build FounderMatchSignal (onboarding + pitch text for university resolution)
 *   Step 3 — Hard filter (Prisma)
 *   Step 4 — Pitch keyword LLM; Step 4b — university/accelerator programs (after keywords)
 *   Step 5 — FAISS + 5b niche injection + 5c thesis overlap
 *   Step 6–8 — Exa/Gemini, narratives, rank+cut (incl. pre-traction thesis boost when traction is none/early)
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
import { detectUniversityAffiliation } from '@/lib/founder-context'
import { buildFounderIdentitySignals } from './founder-identity-signals'
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
  UniversityProgramMatch,
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
  /** Deck/video model output: sector → 0–100 fit; merged into matching for all modalities. */
  sectorFit?: Record<string, number>
  tractionMetrics?: {
    revenue?: string | number
    users?: string | number
    growth?: string
    mrr?: string | number
    arr?: string | number
  }
  productFit?: { differentiators?: string[] }
  uniqueness?: string
  /** Rich idea / unified analysis (same signals often passed later as ScoringSignals). */
  marketFit?: string
  subSectorTags?: string[]
  riskFactors?: string[]
  strengths?: string[]
  reasoning?: string
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

const GENERIC_KEYWORD = /^(idea|mvp|seed|pre-seed|preseed|usa|us|uk|ai|ml)$/i

/** Single blob for gates/Exa: product reality + themes (cap ~800 chars). */
function buildCompanyThesisSummary(
  founder: ComprehensiveFounderContext,
  pitchAnalysis: PitchAnalysisResult | null,
  transcript: string | null | undefined,
  rawPitchText: string | null | undefined,
  pitchKeywords: string[],
  sectorFocusPhrases: string[],
): string {
  const parts: string[] = []
  if (founder.startupName?.trim()) parts.push(`Company: ${founder.startupName.trim()}.`)
  if (pitchAnalysis?.oneLineSummary?.trim()) parts.push(pitchAnalysis.oneLineSummary.trim())
  if (pitchAnalysis?.problemStatement?.trim()) {
    parts.push(pitchAnalysis.problemStatement.trim().slice(0, 420))
  }
  if (pitchAnalysis?.solutionDescription?.trim()) {
    parts.push(pitchAnalysis.solutionDescription.trim().slice(0, 420))
  }
  if (pitchAnalysis?.businessModel?.trim()) {
    parts.push(`Model: ${pitchAnalysis.businessModel.trim().slice(0, 200)}`)
  }
  const rawBlob = [transcript, rawPitchText].filter(Boolean).join('\n').trim()
  if (rawBlob.length > 80) {
    parts.push(rawBlob.slice(0, 380).trim())
  }
  const themeSet = new Set<string>()
  for (const x of [...sectorFocusPhrases, ...pitchKeywords]) {
    const k = String(x).trim()
    if (k.length < 3 || GENERIC_KEYWORD.test(k)) continue
    themeSet.add(k)
    if (themeSet.size >= 14) break
  }
  if (themeSet.size) parts.push(`Themes: ${[...themeSet].join(', ')}`)
  let s = parts.join(' ').replace(/\s+/g, ' ').trim()
  if (s.length > 800) s = `${s.slice(0, 797)}...`
  return s
}

/**
 * Broad lexical signals → thesis buckets used everywhere (gates, Exa, overlap, ranker).
 * Keep in sync with typical VC sector tags in the investor DB.
 */
const SECTOR_SIGNALS: Array<{ re: RegExp; labels: string[] }> = [
  { re: /\b(video|videos|editing|editor|premiere|capcut|descript|footage|b-roll|b roll)\b/, labels: ['Media', 'video'] },
  { re: /\b(creator|influencer|youtube|tiktok|short[- ]form|podcast|streamer)\b/, labels: ['creator economy', 'Consumer'] },
  { re: /\b(streaming|ott|broadcast|film|entertainment|studio|animation)\b/, labels: ['Media'] },
  { re: /\b(gaming|esports|game studio|multiplayer)\b/, labels: ['Gaming'] },
  { re: /\b(adtech|programmatic|dsp|ssp|ad network|monetization)\b/, labels: ['AdTech', 'Marketing'] },
  { re: /\b(martech|crm|email marketing|growth marketing|attribution)\b/, labels: ['MarTech', 'SaaS'] },
  { re: /\b(saas|b2b software|subscription software|workflow|vertical saas)\b/, labels: ['SaaS'] },
  { re: /\b(marketplace|two-sided|platform business|network effects)\b/, labels: ['Marketplace', 'Platforms'] },
  { re: /\b(e-?commerce|d2c|dtc|retail tech|shopify)\b/, labels: ['E-commerce', 'Consumer'] },
  { re: /\b(fintech|payments|banking|lending|underwriting|treasury|defi)\b/, labels: ['Fintech'] },
  { re: /\b(insurtech|insurance tech|claims|underwriting ai)\b/, labels: ['InsurTech', 'Fintech'] },
  { re: /\b(proptech|real estate tech|mortgage|leasing|construction tech)\b/, labels: ['PropTech'] },
  { re: /\b(legal tech|contracts|compliance software|e-discovery)\b/, labels: ['LegalTech', 'Enterprise'] },
  { re: /\b(govtech|government|public sector|federal|municipal)\b/, labels: ['GovTech'] },
  { re: /\b(cyber|security|infosec|zero trust|iam|identity|soc2)\b/, labels: ['Cybersecurity'] },
  { re: /\b(fraud|kyc|aml|risk scoring)\b/, labels: ['Fintech', 'Security'] },
  { re: /\b(devtools|developer tools|sdk|observability|logging|apm|gitops|cicd)\b/, labels: ['DevTools', 'Infrastructure'] },
  { re: /\b(data warehouse|etl|data analytics|business intelligence|metrics stack)\b/, labels: ['Data', 'Analytics'] },
  { re: /\b(database|nosql|vector db|graph database)\b/, labels: ['Data', 'Infrastructure'] },
  { re: /\b(cloud infra|kubernetes|k8s|serverless|edge computing)\b/, labels: ['Cloud', 'Infrastructure'] },
  { re: /\b(ai|ml|llm|genai|machine learning|neural|model training)\b/, labels: ['AI'] },
  { re: /\b(robotics|autonomous|drone|uav|warehouse robot)\b/, labels: ['Robotics', 'Hardware'] },
  { re: /\b(semiconductor|chip design|asic|fpga|hardware)\b/, labels: ['Semiconductor', 'Hardware'] },
  { re: /\b(aerospace|aviation|satellite|space tech|launch)\b/, labels: ['Aerospace', 'Defense'] },
  { re: /\b(defense|dual-use|national security|dod)\b/, labels: ['Defense'] },
  { re: /\b(healthcare|health tech|clinical|ehr|telehealth|digital health)\b/, labels: ['Healthcare'] },
  { re: /\b(biotech|therapeutic|drug discovery|genomics|pharma)\b/, labels: ['Biotech', 'Healthcare'] },
  { re: /\b(medical device|diagnostic|fda)\b/, labels: ['MedTech', 'Healthcare'] },
  { re: /\b(climate|cleantech|carbon|renewable|solar|battery|grid)\b/, labels: ['Climate'] },
  { re: /\b(agtech|agriculture|farm|crop|livestock)\b/, labels: ['AgTech'] },
  { re: /\b(logistics|supply chain|fulfillment|freight|fleet|shipping)\b/, labels: ['Logistics'] },
  { re: /\b(mobility|autonomous vehicle|ev charging|rideshare)\b/, labels: ['Mobility'] },
  { re: /\b(edtech|learning|lms|course|certification|upskill)\b/, labels: ['EdTech'] },
  { re: /\b(hr tech|hiring|recruiting|payroll|workforce|benefits)\b/, labels: ['HR Tech', 'Enterprise'] },
  { re: /\b(travel|hospitality|hotel|booking)\b/, labels: ['Travel', 'Consumer'] },
  { re: /\b(food tech|cpg|restaurant tech|ghost kitchen)\b/, labels: ['Food', 'Consumer'] },
  { re: /\b(fitness|wellness|mental health|therapy app)\b/, labels: ['Wellness', 'Consumer'] },
  { re: /\b(sports tech|fan engagement|stadium)\b/, labels: ['Sports', 'Consumer'] },
  { re: /\b(fashion|beauty|cosmetics|apparel)\b/, labels: ['Consumer', 'Retail'] },
  { re: /\b(web3|blockchain|crypto|wallet|nft)\b/, labels: ['Web3'] },
  { re: /\b(enterprise|b2b|fortune 500|procurement)\b/, labels: ['Enterprise'] },
  { re: /\b(smb|small business|main street)\b/, labels: ['SMB'] },
  { re: /\b(manufacturing|industrial|factory|iot|industry 4)\b/, labels: ['Industrial'] },
  { re: /\b(energy|oil|gas|utility|power plant)\b/, labels: ['Energy'] },
  { re: /\b(nonprofit|ngo|impact investing|esg)\b/, labels: ['Impact'] },
]

/**
 * Infer sector / product themes from pitch prose + structured sectorFit so gates and Exa
 * are not stuck on the founder profile's first sector alone (any vertical).
 */
function deriveSectorFocusPhrases(
  founder: ComprehensiveFounderContext,
  pitchAnalysis: PitchAnalysisResult | null,
  transcript: string | null,
  rawPitchText: string | null | undefined,
  scoringSignals?: ScoringSignals,
): string[] {
  const derived: string[] = []
  const diffLines = pitchAnalysis?.productFit?.differentiators?.join(' ') ?? ''
  const blob = [
    transcript,
    rawPitchText,
    pitchAnalysis?.oneLineSummary,
    pitchAnalysis?.problemStatement,
    pitchAnalysis?.solutionDescription,
    pitchAnalysis?.businessModel,
    pitchAnalysis?.targetCustomer,
    diffLines,
    founder.startupName,
    founder.businessModel,
    (founder.bio ?? '').slice(0, 400),
    scoringSignals?.marketFit ?? pitchAnalysis?.marketFit,
    scoringSignals?.bullCase ?? pitchAnalysis?.reasoning,
    scoringSignals?.uniqueness ?? pitchAnalysis?.uniqueness,
    ...(scoringSignals?.subSectorTags?.length
      ? scoringSignals.subSectorTags
      : pitchAnalysis?.subSectorTags ?? []),
    (scoringSignals?.strengths?.length
      ? scoringSignals.strengths
      : pitchAnalysis?.strengths ?? []
    ).join(' '),
    (pitchAnalysis?.riskFactors ?? scoringSignals?.riskFactors ?? []).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  for (const { re, labels } of SECTOR_SIGNALS) {
    if (re.test(blob)) derived.push(...labels)
  }

  const sf = pitchAnalysis?.sectorFit
  if (sf && typeof sf === 'object') {
    const top = Object.entries(sf)
      .map(([k, v]) => ({ k: k.trim(), v: Number(v) }))
      .filter((x) => x.k.length > 1 && Number.isFinite(x.v) && x.v >= 40)
      .sort((a, b) => b.v - a.v)
      .slice(0, 8)
      .map((x) => x.k)
    derived.push(...top)
  }

  const fromProfile = (founder.sectors ?? []).map((s) => s.trim()).filter(Boolean)
  const merged = [...derived, ...fromProfile]
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of merged) {
    const k = s.toLowerCase()
    if (k.length < 2 || seen.has(k)) continue
    seen.add(k)
    out.push(s)
    if (out.length >= 16) break
  }

  // #region agent log
  void fetch('http://127.0.0.1:7464/ingest/8942f439-d0f1-43ea-9e6d-5d7995eef824', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '368bf4' },
    body: JSON.stringify({
      sessionId: '368bf4',
      hypothesisId: 'H-sector-breadth',
      runId: 'pre-verify',
      location: 'matching-orchestrator.ts:deriveSectorFocusPhrases',
      message: 'sector_focus_derivation',
      data: {
        phraseCount: out.length,
        blobLen: blob.length,
        sectorFitKeyCount: sf && typeof sf === 'object' ? Object.keys(sf).length : 0,
        sample: out.slice(0, 10),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  return out
}

function parseVcSectorTokens(vc: VCProfile): string[] {
  try {
    const arr = JSON.parse(vc.sectors ?? '[]') as unknown[]
    if (!Array.isArray(arr)) return []
    return arr.map((x) => String(x).toLowerCase().trim()).filter(Boolean)
  } catch {
    return []
  }
}

/** Gaming / metaverse funds often tag "Interactive Media"; do not treat as plain "Media" for video SaaS. */
function vcIsGamingHeavy(vc: VCProfile): boolean {
  return parseVcSectorTokens(vc).some(
    (t) =>
      /\b(gaming|esports)\b/.test(t) ||
      t.includes('interactive media') ||
      (/\bgames?\b/.test(t) && !/\bboard games\b/.test(t)),
  )
}

/**
 * Match Step 5b synonym to VC sector tags. Plain "media" only hits exact token "media"
 * so "Interactive Media" does not pull BITKRAFT-style funds for Vyra-style pitches.
 */
function vcSectorSynonymHit(synonym: string, sectorTokens: string[]): boolean {
  const s = synonym.toLowerCase()
  if (s === 'media') {
    return sectorTokens.some(
      (t) => t === 'media' || t === 'film & media' || t === 'film / media' || t === 'film and media',
    )
  }
  return sectorTokens.some((t) => t.includes(s))
}

function scoreNicheKeywordGroup(synonyms: string[], keywords: string[]): number {
  let score = 0
  for (const syn of synonyms) {
    const s = syn.toLowerCase()
    for (const k of keywords) {
      if (k.includes(s)) score += Math.min(8, 2 + Math.floor(s.length / 3))
    }
  }
  return score
}

function scoreVcSectorThesisOverlap(vc: VCProfile, phrases: string[]): number {
  const vcSectorTokens = parseVcSectorTokens(vc)
  let vcText = ''
  try {
    const arr = JSON.parse(vc.sectors ?? '[]') as string[]
    if (Array.isArray(arr)) vcText += arr.join(' ')
  } catch {
    /* ignore */
  }
  vcText += ` ${vc.thesis ?? ''} ${vc.firmName ?? ''}`
  const t = vcText.toLowerCase()
  let s = 0
  for (const p of phrases) {
    const q = p.toLowerCase().trim()
    if (q.length < 3) continue
    let hit = 0
    if (vcSectorTokens.some((tok) => tok === q)) hit = 10
    else if (q.length >= 4 && vcSectorTokens.some((tok) => tok.includes(q))) hit = 6
    else if (t.includes(q)) hit = q.length >= 6 ? 5 : 3
    s += hit
  }
  return s
}

/**
 * Pull high-overlap VCs from the full embedding universe into the pool (e.g. betaworks + Media).
 * When making room, drops **non-protected** rows from the tail first so Step 5b niche injections
 * are not wiped by a blind `slice(0, n)`.
 */
function injectSectorThesisOverlap(
  pool: VCProfile[],
  universe: VCProfile[],
  phrases: string[],
  maxAdd: number,
  protectedIds?: ReadonlySet<string>,
): VCProfile[] {
  if (phrases.length === 0 || maxAdd <= 0) return pool
  const inPool = new Set(pool.map((v) => v.id))
  const scored = universe
    .filter((v) => !inPool.has(v.id))
    .map((vc) => ({ vc, s: scoreVcSectorThesisOverlap(vc, phrases) }))
    .filter((x) => x.s >= 5)
    .sort((a, b) => b.s - a.s)
  const add = scored.slice(0, maxAdd).map((x) => x.vc)
  if (add.length === 0) return pool

  const prot = protectedIds ?? new Set<string>()
  const needDrop = add.length
  const dropIdx = new Set<number>()
  let remaining = needDrop

  for (let i = pool.length - 1; i >= 0 && remaining > 0; i--) {
    if (!prot.has(pool[i].id)) {
      dropIdx.add(i)
      remaining--
    }
  }
  for (let i = pool.length - 1; i >= 0 && remaining > 0; i--) {
    if (prot.has(pool[i].id) && !dropIdx.has(i)) {
      dropIdx.add(i)
      remaining--
    }
  }

  const kept = pool.filter((_, i) => !dropIdx.has(i))
  return [...kept, ...add]
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
          content:
            'You label pitches for venture investor matching. Return ONLY valid JSON with a "keywords" array of 12–24 short strings (2–4 words each): industry vertical(s), sub-sectors, buyer type (B2B/B2C/enterprise/SMB), product category, tech stack or modality, geography if stated, regulatory domain if relevant, and phrases a VC thesis would use. Include sector nouns (e.g. Fintech, Climate, DevTools, Healthcare). Avoid generic hype words.',
        },
        {
          role: 'user',
          content: `Extract investment-relevant themes for VC thesis alignment and web search context.
Pitch text: ${transcript.substring(0, 12_000)}
Founder profile: stage=${founder.stage}, sectors=${founder.sectors.join(', ')}, startup=${founder.startupName ?? 'n/a'}
Return JSON: {"keywords": ["...", "..."]}`,
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

/** Optional text passed from API routes so matching sees the real pitch, not only profile sectors. */
export interface MatchingPipelineHints {
  rawPitchText?: string | null
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
    keywords: [
      ...founder.sectors,
      founder.stage,
      founder.location,
      ...pitchKeywords,
      ...(pitchAnalysis?.oneLineSummary ? [String(pitchAnalysis.oneLineSummary).slice(0, 160)] : []),
    ],
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

/** Thesis/bio language that indicates comfort investing before strong traction. */
function preTractionThesisFit01(vc: VCProfile): number {
  const blob = `${vc.thesis ?? ''} ${vc.bio ?? ''}`.toLowerCase()
  if (!blob.trim()) return 0
  const needles = [
    'pre-seed',
    'preseed',
    'pre seed',
    'first check',
    'first-check',
    'idea stage',
    'pre-revenue',
    'pre revenue',
    'at inception',
    'first institutional',
    'backing founders early',
    'early-stage founder',
    'early stage founder',
    'no revenue',
    '0 to 1',
    '0-1',
    'student founder',
    'first-time founder',
    'first time founder',
    'pre-product',
    'pre product',
    'inception',
  ]
  let hits = 0
  for (const n of needles) if (blob.includes(n)) hits += 1
  return Math.min(1, hits / 5)
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runMatchingPipeline(
  founder: ComprehensiveFounderContext,
  pitchAnalysis: PitchAnalysisResult | null,
  transcript: string | null,
  scoringSignals?: ScoringSignals,
  hints?: MatchingPipelineHints,
): Promise<MatchingPipelineResult> {
  const startTime = Date.now()

  // ── STEP 1 — Build FounderMatchSignal ──────────────────────────────────────
  const sectorFocusPhrases = deriveSectorFocusPhrases(
    founder,
    pitchAnalysis,
    transcript,
    hints?.rawPitchText,
    scoringSignals,
  )
  const primarySector = sectorFocusPhrases[0] ?? founder.sectors[0] ?? ''
  const textForUniversityDetect = [
    hints?.rawPitchText,
    transcript,
    pitchAnalysis?.oneLineSummary,
    pitchAnalysis?.problemStatement,
    pitchAnalysis?.solutionDescription,
  ]
    .filter(Boolean)
    .join('\n')
  const identitySignals = buildFounderIdentitySignals(founder, textForUniversityDetect)
  const universityResolved =
    detectUniversityAffiliation(founder.education, founder.bio, textForUniversityDetect) ??
    founder.universityAffiliation ??
    (founder.education && !/^https?:\/\//i.test(founder.education.trim())
      ? founder.education.trim()
      : null)

  const founderSignal: FounderMatchSignal = {
    stage: founder.stage,
    sectors: founder.sectors,
    primarySector,
    sectorFocusPhrases,
    founderArchetype: deriveArchetype(founder),
    checkNeeded: founder.fundingNeed ?? 0,
    location: founder.location,
    university: universityResolved,
    isStudent:
      founder.isStudent ||
      (founder.age !== undefined && founder.age < 22) ||
      identitySignals.identityTags.includes('student'),
    isRepeatFounder:
      (!!founder.prevFunding && founder.prevFunding !== 'none') ||
      (founder.bio ?? '').toLowerCase().includes('repeat founder'),
    tractionTier: deriveTractionTier(founder),
    keyStrengths: [],
    redFlags: [],
    pitchKeywords: [...new Set([...founder.sectors, founder.stage, ...sectorFocusPhrases])],
    companyThesisSummary: '',
    identityTags: identitySignals.identityTags,
    thesisAffinityPhrases: identitySignals.thesisAffinityPhrases,
  }

  logger.integration(
    `[ORCHESTRATOR] Step 1b — identity tags=[${identitySignals.identityTags.join(', ') || 'none'}] thesisAffinity=[${identitySignals.thesisAffinityPhrases.slice(0, 8).join(', ') || 'none'}]`,
  )

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
  const textForKeywordLLM =
    transcript && transcript.length > 50
      ? transcript
      : hints?.rawPitchText && hints.rawPitchText.length > 40
        ? hints.rawPitchText
        : ''
  if (textForKeywordLLM) {
    try {
      const keywords = await extractPitchKeywords(textForKeywordLLM.slice(0, 12_000), founder)
      founderSignal.pitchKeywords = [
        ...new Set([...founderSignal.pitchKeywords, ...keywords]),
      ]
      logger.log(`[ORCHESTRATOR] Step 4 — Extracted ${keywords.length} pitch keywords`)
    } catch (err: any) {
      logger.warn('[ORCHESTRATOR] Step 4 — Keyword extraction failed (non-critical):', err?.message)
    }
  }

  founderSignal.companyThesisSummary = buildCompanyThesisSummary(
    founder,
    pitchAnalysis,
    transcript,
    hints?.rawPitchText,
    founderSignal.pitchKeywords,
    founderSignal.sectorFocusPhrases,
  )

  // After LLM keywords — program sector filters see pitch themes (Media, video, …).
  const universityPrograms: UniversityProgramMatch[] = matchUniversityPrograms(founderSignal)
  logger.log(
    `[ORCHESTRATOR] Step 4b — University programs: ${universityPrograms.length} (uni=${founderSignal.university ?? 'none'}, student=${founderSignal.isStudent})`,
  )

  // #region agent log
  void fetch('http://127.0.0.1:7464/ingest/8942f439-d0f1-43ea-9e6d-5d7995eef824', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '368bf4' },
    body: JSON.stringify({
      sessionId: '368bf4',
      hypothesisId: 'H-founder-context',
      runId: 'signals',
      location: 'matching-orchestrator.ts:Step4b',
      message: 'university_and_traction_signals',
      data: {
        university: founderSignal.university,
        tractionTier: founderSignal.tractionTier,
        stage: founderSignal.stage,
        programCount: universityPrograms.length,
        programSample: universityPrograms.slice(0, 5).map((p) => p.program.name),
        sectorFocusHead: founderSignal.sectorFocusPhrases.slice(0, 8),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

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
  let nicheInjectedIds: ReadonlySet<string> = new Set()

  if (pitchEmbeddingForInjection) {
    const allKeywords = [
      ...founderSignal.sectors,
      ...founderSignal.pitchKeywords,
    ].map((k) => k.toLowerCase())

    // Only NICHE groups that don't naturally surface via cosine similarity
    const NICHE_SECTOR_SYNONYMS: Record<string, string[]> = {
      media:       ['media', 'entertainment', 'film', 'video', 'broadcast', 'ott', 'streaming', 'dubbing', 'localization'],
      social_media: [
        'social media',
        'instagram',
        'tiktok',
        'snapchat',
        'twitter',
        'x.com',
        'reddit',
        'facebook',
        'linkedin',
        'short-form video',
      ],
      creator_economy: [
        'creator economy',
        'creator tools',
        'influencer',
        'content creator',
        'youtube',
        'ugc',
        'subscriber',
        'patron',
        'fan subscription',
      ],
      gaming:      ['gaming', 'esports', 'interactive media', 'game'],
      climatetech: ['climate', 'cleantech', 'sustainability', 'clean energy'],
      adtech:      ['adtech', 'ad tech', 'advertising tech', 'martech'],
      biotech:     ['biotech', 'life sciences', 'genomics', 'therapeutics'],
      // Never use bare "space" — it false-triggers on "workspace" (logs: media+spacetech for Vyra).
      spacetech:   ['spacetech', 'space tech', 'space-tech', 'aerospace', 'satellite', 'orbital', 'launch vehicle', 'defense tech'],
    }

    // Only treat a keyword as matching a synonym when the keyword CONTAINS the synonym.
    // Do NOT use synonym.includes(keyword): e.g. "media" must not activate gaming via
    // synonym "interactive media" (substring false positive in production logs).
    const activeSectorGroups = new Set<string>()
    for (const [group, synonyms] of Object.entries(NICHE_SECTOR_SYNONYMS)) {
      if (synonyms.some((s) => allKeywords.some((k) => k.includes(s)))) {
        activeSectorGroups.add(group)
      }
    }

    // Rank groups by keyword evidence; only blend the top 1–2 so weak false groups
    // (e.g. spacetech from typos) do not widen synonym union and drown Media thesis funds.
    const scoredNicheGroups = [...activeSectorGroups]
      .map((g) => ({ g, score: scoreNicheKeywordGroup(NICHE_SECTOR_SYNONYMS[g] ?? [], allKeywords) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)

    const topNicheGroups: string[] = []
    if (scoredNicheGroups.length > 0) {
      topNicheGroups.push(scoredNicheGroups[0].g)
      if (scoredNicheGroups.length > 1) {
        const first = scoredNicheGroups[0].score
        const second = scoredNicheGroups[1]
        if (second.score >= Math.max(2, first * 0.25)) topNicheGroups.push(second.g)
      }
    }

    const activeSynonyms = [...new Set(topNicheGroups.flatMap((g) => NICHE_SECTOR_SYNONYMS[g] ?? []))]
    const pitchLooksGaming = allKeywords.some((k) =>
      /\b(gaming|esports|game dev|game studio|mmorpg|mmo|player vs player|pvp)\b/i.test(k),
    )

    logger.integration(
      `[ORCHESTRATOR] Step 5b — keywords=[${allKeywords.slice(0, 8).join(', ')}] niche_active=[${[...activeSectorGroups].join(',') || 'none'}] niche_top=[${topNicheGroups.join(',') || 'none'}]`,
    )

    // #region agent log
    void fetch('http://127.0.0.1:7464/ingest/8942f439-d0f1-43ea-9e6d-5d7995eef824', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '368bf4' },
      body: JSON.stringify({
        sessionId: '368bf4',
        hypothesisId: 'H-niche-pool',
        runId: 'post-niche-fix',
        location: 'matching-orchestrator.ts:Step5b',
        message: 'niche_injection_context',
        data: {
          topNicheGroups,
          scoredNicheGroups: scoredNicheGroups.slice(0, 4),
          pitchLooksGaming,
          synonymCount: activeSynonyms.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    if (activeSynonyms.length > 0) {
      const poolIds = new Set(candidatePool.map((v) => v.id))

      // Only match against PRIMARY sectors array — not thesis or firm name
      const sectorCandidates = (embeddingPool as VCProfile[]).filter((vc) => {
        if (poolIds.has(vc.id)) return false
        const sectorTokens = parseVcSectorTokens(vc)
        if (sectorTokens.length === 0) return false
        const synHit = activeSynonyms.some((syn) => vcSectorSynonymHit(syn, sectorTokens))
        if (!synHit) return false
        if (!pitchLooksGaming && topNicheGroups.includes('media') && vcIsGamingHeavy(vc)) return false
        return true
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
        nicheInjectedIds = new Set(inject.map((v) => v.id))
        candidatePool = [...candidatePool.slice(0, 20 - inject.length), ...inject]
        logger.integration(
          `[ORCHESTRATOR] Step 5b — Injected ${inject.length} niche VCs: ${inject.map((v) => `${v.firmName}(${ranked.find((r) => r.vc.id === v.id)?.sim.toFixed(3)})`).join(', ')}`,
        )
      } else {
        logger.integration(`[ORCHESTRATOR] Step 5b — No niche VCs found for top=[${topNicheGroups.join(',') || 'none'}]`)
      }
    }
  }

  // ── Step 5c — Sector + thesis overlap: ensure obvious thesis fits (e.g. Media VC for a video product)
  // are in the Exa/Gemini pool even if pure embedding rank buried them behind generic SaaS funds.
  const idsBefore5c = new Set(candidatePool.map((v) => v.id))
  const thesisOverlapPhrases = [
    ...founderSignal.sectorFocusPhrases,
    ...founderSignal.thesisAffinityPhrases,
  ]
  candidatePool = injectSectorThesisOverlap(
    candidatePool,
    embeddingPool as VCProfile[],
    thesisOverlapPhrases,
    7,
    nicheInjectedIds,
  )
  const injected5c = candidatePool.filter((v) => !idsBefore5c.has(v.id))
  if (injected5c.length > 0) {
    logger.integration(
      `[ORCHESTRATOR] Step 5c — Sector/thesis overlap: +${injected5c.length} → ${injected5c.map((v) => v.firmName).join(', ')}`,
    )
  }

  logger.integration(`[ORCHESTRATOR] Step 5 — Candidate pool: ${candidatePool.length} VCs`)
  logger.integration(
    `[ORCHESTRATOR] Step 5 — Pool order (pre-Exa): ${candidatePool.map((v) => v.firmName).join(' | ')}`,
  )

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
      const preferThesisFromPitch = (founderSignal.companyThesisSummary?.length ?? 0) >= 80
      const pitchStrength: PitchStrengthSignal | undefined =
        scoringSignals || preferThesisFromPitch
          ? {
              ...(scoringSignals
                ? {
                    tier: scoringSignals.tier,
                    conviction: scoringSignals.conviction,
                    marketScore: scoringSignals.categoryScores?.market,
                  }
                : {}),
              ...(preferThesisFromPitch ? { preferThesisFromPitch: true } : {}),
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

  // ── STEP 8 — Rank and cut (blend pitch cosine + pool order when gates are sparse) ─
  const pitchSimilarity01ByVcId = new Map<string, number>()
  const retrievalRank01ByVcId = new Map<string, number>()
  const nPool = candidatePool.length
  if (nPool > 0) {
    candidatePool.forEach((vc, i) => {
      retrievalRank01ByVcId.set(vc.id, nPool <= 1 ? 1 : (nPool - 1 - i) / (nPool - 1))
    })
  }
  if (pitchEmbeddingForInjection) {
    const pe = pitchEmbeddingForInjection
    for (const { vc } of narrativeResults) {
      try {
        const emb = JSON.parse(vc.embedding ?? '[]') as number[]
        if (emb.length === pe.length) {
          const c = cosineSimilarity(pe, emb)
          pitchSimilarity01ByVcId.set(vc.id, Math.max(0, Math.min(1, c)))
        }
      } catch {
        /* ignore */
      }
    }
  }

  const sectorOverlap01ByVcId = new Map<string, number>()
  const focusPhrases = [
    ...founderSignal.sectorFocusPhrases,
    ...founderSignal.thesisAffinityPhrases,
  ]
  if (focusPhrases.length > 0) {
    let maxOv = 0
    const rawOv = new Map<string, number>()
    for (const { vc } of narrativeResults) {
      const s = scoreVcSectorThesisOverlap(vc, focusPhrases)
      rawOv.set(vc.id, s)
      if (s > maxOv) maxOv = s
    }
    const denom = maxOv > 0 ? maxOv : 1
    for (const { vc } of narrativeResults) {
      sectorOverlap01ByVcId.set(vc.id, Math.min(1, (rawOv.get(vc.id) ?? 0) / denom))
    }
  }

  const preTractionThesis01ByVcId = new Map<string, number>()
  if (founderSignal.tractionTier === 'none' || founderSignal.tractionTier === 'early') {
    const scale = founderSignal.tractionTier === 'early' ? 0.55 : 1
    for (const { vc } of narrativeResults) {
      preTractionThesis01ByVcId.set(vc.id, preTractionThesisFit01(vc) * scale)
    }
  }

  const ranked = rankAndCut(narrativeResults, {
    pitchSimilarity01ByVcId,
    retrievalRank01ByVcId,
    sectorOverlap01ByVcId,
    preTractionThesis01ByVcId,
  })
  logger.integration(`[ORCHESTRATOR] Step 8 — Top ${ranked.length} investors ranked`)
  logger.integration(
    `[ORCHESTRATOR] Step 8 — Ranked firms: ${ranked.map((r) => r.vc.firmName).join(' | ')}`,
  )

  // #region agent log
  {
    const head = ranked.slice(0, 12).map((r) => ({
      firm: r.vc.firmName,
      combinedScore: r.combinedScore,
      lScore: r.investmentLikelihood.score,
      conf: r.investmentLikelihood.confidence,
      deployDim: r.investmentLikelihood.dimensionScores.deploymentLikelihood,
      pitchSim: pitchSimilarity01ByVcId.get(r.vc.id),
      poolRank01: retrievalRank01ByVcId.get(r.vc.id),
      sectorOv: sectorOverlap01ByVcId.get(r.vc.id),
      preTraction: preTractionThesis01ByVcId.get(r.vc.id),
    }))
    const distinct = new Set(ranked.map((r) => r.combinedScore)).size
    void fetch('http://127.0.0.1:7464/ingest/8942f439-d0f1-43ea-9e6d-5d7995eef824', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '368bf4' },
      body: JSON.stringify({
        sessionId: '368bf4',
        runId: 'post-vector-blend',
        hypothesisId: 'verify-blend',
        location: 'matching-orchestrator.ts:Step8',
        message: 'ranked VC combined scores (post rankAndCut)',
        data: { distinctCombinedScores: distinct, head },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }
  // #endregion

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
