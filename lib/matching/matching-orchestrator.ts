/**
 * ===============================================================================
 * MATCHING ORCHESTRATOR — VC MATCHING PIPELINE v3
 * ===============================================================================
 *
 * Master function that replaces aiNativeMatchVCs() from lib/ai-native-matching.ts.
 * Wires together all lib/matching/ modules into a single async pipeline.
 *
 * Pipeline summary:
 *   Step 1  — Build FounderMatchSignal (pure TS, no I/O)
 *   Step 2  — University program matching (pure TS, sync)
 *   Step 2b — Niche program matching: women, immigrant, veteran, LGBTQ+, underrepresented (pure TS, sync)
 *   Step 3  — Hard filter: Prisma WHERE clause (unchanged from v2)
 *   Step 4  — Pattern detection from transcript (Gemini, keywords only)
 *   Step 5  — FAISS vector search (top 20, up from 15)
 *   Step 6  — Rolling Exa + Gemini gate reasoning (max 5 concurrent Gemini)
 *   Step 7  — Narrative generation (OpenRouter matching/scoring model, e.g. DeepSeek; all VCs in parallel)
 *   Step 8  — Rank and cut (top 12, pure TS)
 *   Step 9  — Return MatchingPipelineResult
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
import { matchNichePrograms, filterOutNicheExclusivePrograms } from './niche-matcher'
import { fetchVCExaBundle } from './exa-enrichment'
import { reasonGates } from './gate-reasoner'
import { computeInvestmentLikelihood, type PitchStrengthSignal } from './investment-likelihood'
import { generateMatchNarrative } from './narrative-generator'
import { rankAndCut } from './ranker'
import { buildFounderIdentitySignals, inferStudentFromText } from './founder-identity-signals'
import { detectUniversityAffiliation } from '@/lib/founder-context'
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
  return [
    // VCs that explicitly list a matching stage
    ...acceptable.map((stage) => ({
      stages: { contains: `"${stage}"`, mode: 'insensitive' as const },
    })),
    // VCs with no stage data should pass through — empty means "unknown", not "none"
    { stages: { equals: '[]' } },
    { stages: { equals: '' } },
  ]
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
// Sector signal detection — regex-based, scans full pitch text
// ---------------------------------------------------------------------------

const GENERIC_KEYWORD = /^(idea|mvp|seed|pre-seed|preseed|usa|us|uk|ai|ml)$/i

const GENERIC_SECTOR_LABELS = new Set([
  'ai', 'saas', 'enterprise', 'consumer', 'smb', 'marketplace', 'platforms',
  'data', 'analytics', 'cloud', 'infrastructure', 'b2b',
])

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
    scoringSignals?.marketFit,
    scoringSignals?.bullCase,
    scoringSignals?.uniqueness ?? pitchAnalysis?.uniqueness,
    ...(scoringSignals?.subSectorTags ?? []),
    (scoringSignals?.strengths ?? []).join(' '),
    (scoringSignals?.riskFactors ?? []).join(' '),
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
  return out
}

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

// ---------------------------------------------------------------------------
// VC sector helpers
// ---------------------------------------------------------------------------

function parseVcSectorTokens(vc: VCProfile): string[] {
  try {
    const arr = JSON.parse(vc.sectors ?? '[]') as unknown[]
    if (!Array.isArray(arr)) return []
    return arr.map((x) => String(x).toLowerCase().trim()).filter(Boolean)
  } catch {
    return []
  }
}

function vcIsGamingHeavy(vc: VCProfile): boolean {
  return parseVcSectorTokens(vc).some(
    (t) =>
      /\b(gaming|esports)\b/.test(t) ||
      t.includes('interactive media') ||
      (/\bgames?\b/.test(t) && !/\bboard games\b/.test(t)),
  )
}

function vcSectorSynonymHit(synonym: string, sectorTokens: string[]): boolean {
  const s = synonym.toLowerCase()
  if (s === 'media') {
    return sectorTokens.some(
      (t) => t === 'media' || t === 'film & media' || t === 'film / media' ||
             t === 'film and media' || t === 'digital media' || t === 'new media' ||
             t.includes('content creat') || t.includes('creative'),
    )
  }
  if (s === 'creative tools' || s === 'creative software') {
    return sectorTokens.some((t) => t.includes('creative') || t.includes('design'))
  }
  if (s === 'healthcare' || s === 'health tech' || s === 'digital health') {
    return sectorTokens.some(
      (t) => t.includes('health') || t.includes('medical') || t.includes('clinical') ||
             t.includes('biotech') || t.includes('pharma'),
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
  } catch { /* ignore */ }
  vcText += ` ${vc.thesis ?? ''} ${vc.firmName ?? ''} ${vc.bio ?? ''}`
  const t = vcText.toLowerCase()

  // Derive standardized labels from VC text using the same SECTOR_SIGNALS regexes
  // so label-level comparison works even when raw text uses different vocabulary
  const vcLabels = new Set<string>()
  for (const { re, labels } of SECTOR_SIGNALS) {
    if (re.test(t)) {
      for (const l of labels) vcLabels.add(l.toLowerCase())
    }
  }
  for (const tok of vcSectorTokens) vcLabels.add(tok)

  let s = 0
  for (const p of phrases) {
    const q = p.toLowerCase().trim()
    if (q.length < 3) continue
    const isNiche = !GENERIC_SECTOR_LABELS.has(q)
    const weight = isNiche ? 2 : 1
    let hit = 0
    if (vcSectorTokens.some((tok) => tok === q)) hit = 10
    else if (q.length >= 4 && vcSectorTokens.some((tok) => tok.includes(q))) hit = 6
    else if (vcSectorTokens.some((tok) => tok.length >= 3 && q.includes(tok))) hit = 5
    else if (vcLabels.has(q)) hit = 8
    else if (t.includes(q)) hit = q.length >= 6 ? 5 : 3
    s += hit * weight
  }
  return s
}

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

function preTractionThesisFit01(vc: VCProfile): number {
  const blob = `${vc.thesis ?? ''} ${vc.bio ?? ''}`.toLowerCase()
  if (!blob.trim()) return 0
  const needles = [
    'pre-seed', 'preseed', 'pre seed', 'first check', 'first-check',
    'idea stage', 'pre-revenue', 'pre revenue', 'at inception',
    'first institutional', 'backing founders early', 'early-stage founder',
    'early stage founder', 'no revenue', '0 to 1', '0-1', 'student founder',
    'first-time founder', 'first time founder', 'pre-product', 'pre product',
    'inception',
  ]
  let hits = 0
  for (const n of needles) if (blob.includes(n)) hits += 1
  return Math.min(1, hits / 5)
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

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runMatchingPipeline(
  founder: ComprehensiveFounderContext,
  pitchAnalysis: PitchAnalysisResult | null,
  transcript: string | null,
  scoringSignals?: ScoringSignals,
  opts?: { rawPitchText?: string },
): Promise<MatchingPipelineResult> {
  const startTime = Date.now()

  // ── STEP 1 — Build FounderMatchSignal ──────────────────────────────────────

  const pitchBlob = [
    transcript ?? '',
    opts?.rawPitchText ?? '',
    pitchAnalysis?.oneLineSummary ?? '',
    pitchAnalysis?.solutionDescription ?? '',
    pitchAnalysis?.problemStatement ?? '',
  ].join('\n')

  // Detect university from pitch text if not already set in profile
  const pitchUniversity =
    founder.universityAffiliation ??
    detectUniversityAffiliation(founder.education, founder.bio, pitchBlob) ??
    null

  const isStudent =
    founder.isStudent ||
    (founder.age !== undefined && founder.age < 22) ||
    inferStudentFromText(pitchBlob)

  // Build identity tags and thesis affinity phrases from profile + pitch
  const { identityTags, thesisAffinityPhrases } = buildFounderIdentitySignals(
    { ...founder, isStudent, universityAffiliation: pitchUniversity ?? undefined },
    pitchBlob,
  )

  // Use the comprehensive regex-based sector detection on ALL text sources
  const sectorFocusPhrases = deriveSectorFocusPhrases(
    founder,
    pitchAnalysis,
    transcript,
    opts?.rawPitchText,
    scoringSignals,
  )
  const seenSectors = new Set(sectorFocusPhrases.map((s) => s.toLowerCase()))

  const founderSignal: FounderMatchSignal = {
    stage: founder.stage,
    sectors: founder.sectors,
    primarySector: sectorFocusPhrases[0] ?? founder.sectors[0] ?? '',
    sectorFocusPhrases,
    founderArchetype: deriveArchetype(founder),
    checkNeeded: founder.fundingNeed ?? 0,
    location: founder.location,
    university: pitchUniversity,
    isStudent,
    isRepeatFounder:
      (!!founder.prevFunding && founder.prevFunding !== 'none') ||
      (founder.bio ?? '').toLowerCase().includes('repeat founder'),
    tractionTier: deriveTractionTier(founder),
    keyStrengths: scoringSignals?.strengths ?? [],
    redFlags: scoringSignals?.riskFactors ?? [],
    pitchKeywords: [...new Set([...founder.sectors, founder.stage, ...sectorFocusPhrases])],
    companyThesisSummary: '',
    identityTags,
    thesisAffinityPhrases,
  }

  logger.integration(
    `[ORCHESTRATOR] Step 1 — FounderMatchSignal:\n` +
    `  stage=${founderSignal.stage} | archetype=${founderSignal.founderArchetype} | tractionTier=${founderSignal.tractionTier}\n` +
    `  university=${founderSignal.university ?? 'NONE'} | isStudent=${founderSignal.isStudent}\n` +
    `  sectors=[${founderSignal.sectors.join(', ')}]\n` +
    `  sectorFocusPhrases=[${founderSignal.sectorFocusPhrases.slice(0, 6).join(', ')}]\n` +
    `  identityTags=[${founderSignal.identityTags.join(', ') || 'none'}]\n` +
    `  thesisAffinityPhrases=[${founderSignal.thesisAffinityPhrases.slice(0, 5).join(', ') || 'none'}]\n` +
    `  companyThesis=${founderSignal.companyThesisSummary?.substring(0, 120) ?? 'NONE'}…\n` +
    `  profile.education=${founder.education ?? 'NONE'} | profile.universityAffiliation=${founder.universityAffiliation ?? 'NONE'}\n` +
    `  profile.location=${founder.location ?? 'NONE'} | profile.bio=${(founder.bio ?? '').substring(0, 80) || 'NONE'}`,
  )

  // ── STEP 2 — University program matching (sync, no await) ─────────────────
  const universityPrograms = matchUniversityPrograms(founderSignal)
  logger.integration(
    `[ORCHESTRATOR] Step 2 — University programs: ${universityPrograms.length} matches` +
    (universityPrograms.length > 0
      ? '\n  ' + universityPrograms.map((m) => `${m.program.name} (${m.program.university || 'open'}) [${m.urgency}]`).join('\n  ')
      : ' — no university detected or no matching programs'),
  )

  // ── STEP 2b — Niche program matching (sync, no await) ─────────────────────
  const nichePrograms = matchNichePrograms(founderSignal)
  logger.integration(
    `[ORCHESTRATOR] Step 2b — Niche programs: ${nichePrograms.length} matches` +
    (nichePrograms.length > 0
      ? '\n  ' + nichePrograms.map((m) => `${m.program.name} [${m.matchedTags.join(',')}] [${m.urgency}]`).join('\n  ')
      : ' — no identity tags or no matching niche programs'),
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

  // Debug: sample DB stages format to diagnose hard-filter misses
  try {
    const stagesSample = await db.investor.findMany({
      where: { isPublic: true },
      take: 5,
      select: { firmName: true, stages: true },
    })
    logger.integration(
      `[ORCHESTRATOR] Step 3 — DEBUG stages sample: ${stagesSample.map((v) => `${v.firmName}→"${v.stages}"`).join(' | ')}`,
    )
    const allPublic = await db.investor.count({ where: { isPublic: true } })
    const emptyStages = await db.investor.count({ where: { isPublic: true, stages: '[]' } })
    logger.integration(
      `[ORCHESTRATOR] Step 3 — DEBUG: ${allPublic} public VCs, ${emptyStages} with stages="[]" (${Math.round((emptyStages / allPublic) * 100)}% empty)`,
    )
  } catch { /* diagnostic only */ }

  let stageFiltered: Investor[]
  try {
    stageFiltered = await db.investor.findMany({
      where: {
        isPublic: true,
        OR: stageConditions,
        NOT: checkSizeExclusions.length > 0 ? { OR: checkSizeExclusions } : undefined,
      },
    })
    logger.integration(`[ORCHESTRATOR] Step 3 — Hard filter: ${stageFiltered.length} VCs passed (stage=${founderStage} fundingNeed=${fundingNeed})`)
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
  logger.integration(`[ORCHESTRATOR] Step 3 — After name quality filter: ${stageFiltered.length} VCs`)

  // Split out university-exclusive and niche-exclusive programs from the VC pool
  const { mainstream: afterUni } = filterOutUniversityPrograms(stageFiltered as VCProfile[])
  const { mainstream } = filterOutNicheExclusivePrograms(afterUni)
  logger.integration(`[ORCHESTRATOR] Step 3 — After university+niche filter: ${mainstream.length} mainstream VCs`)

  // ── STEP 4 — Pattern detection (keywords only, no score boosts) ────────────
  // Use transcript when available; fall back to rawPitchText for text-only pitches
  const textForKeywordLLM =
    transcript && transcript.length > 50
      ? transcript
      : opts?.rawPitchText && opts.rawPitchText.length > 40
        ? opts.rawPitchText
        : ''
  if (textForKeywordLLM) {
    try {
      const keywords = await extractPitchKeywords(textForKeywordLLM.slice(0, 12_000), founder)
      founderSignal.pitchKeywords = [
        ...new Set([...founderSignal.pitchKeywords, ...keywords]),
      ]
      logger.integration(`[ORCHESTRATOR] Step 4 — Extracted ${keywords.length} pitch keywords: [${keywords.slice(0, 12).join(', ')}]`)

      const STAGE_WORDS = new Set(['mvp', 'idea', 'seed', 'revenue', 'pre-seed', 'series', 'angel'])
      for (const kw of keywords) {
        const k = kw.toLowerCase().trim()
        if (k.length >= 3 && !seenSectors.has(k) && !STAGE_WORDS.has(k) && !GENERIC_KEYWORD.test(k)) {
          seenSectors.add(k)
          founderSignal.sectorFocusPhrases.push(kw)
        }
      }
    } catch (err: any) {
      logger.warn('[ORCHESTRATOR] Step 4 — Keyword extraction failed (non-critical):', err?.message)
    }
  }

  // Build the final company thesis summary AFTER keywords are extracted
  founderSignal.companyThesisSummary = buildCompanyThesisSummary(
    founder,
    pitchAnalysis,
    transcript,
    opts?.rawPitchText,
    founderSignal.pitchKeywords,
    founderSignal.sectorFocusPhrases,
  )

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
  let nicheInjectedIds: ReadonlySet<string> = new Set()

  if (pitchEmbeddingForInjection) {
    const allKeywords = [
      ...founderSignal.sectors,
      ...founderSignal.pitchKeywords,
      ...(scoringSignals?.subSectorTags ?? []),
      pitchAnalysis?.oneLineSummary ?? '',
      pitchAnalysis?.solutionDescription ?? '',
      pitchAnalysis?.problemStatement ?? '',
    ].map((k) => k.toLowerCase())

    const NICHE_SECTOR_SYNONYMS: Record<string, string[]> = {
      media:       ['media', 'entertainment', 'film', 'video', 'broadcast', 'ott', 'streaming', 'dubbing', 'localization', 'editing', 'post-production', 'digital media', 'content production'],
      social_media: [
        'social media', 'instagram', 'tiktok', 'snapchat', 'twitter', 'x.com',
        'reddit', 'facebook', 'linkedin', 'short-form video',
      ],
      creator_economy: [
        'creator economy', 'creator tools', 'influencer', 'content creator',
        'youtube', 'ugc', 'subscriber', 'patron', 'fan subscription',
        'creative tools', 'creative software', 'content creation',
      ],
      gaming:      ['gaming', 'esports', 'interactive media', 'game'],
      climatetech: ['climate', 'cleantech', 'sustainability', 'clean energy'],
      adtech:      ['adtech', 'ad tech', 'advertising tech', 'martech'],
      biotech:     ['biotech', 'life sciences', 'genomics', 'therapeutics', 'healthcare', 'health tech', 'digital health', 'telehealth', 'medtech', 'clinical', 'pharma', 'drug discovery'],
      fintech:     ['fintech', 'neobank', 'payments', 'lending', 'insurtech', 'wealthtech', 'banking', 'remittance'],
      spacetech:   ['spacetech', 'space tech', 'space-tech', 'aerospace', 'satellite', 'orbital', 'launch vehicle', 'defense tech'],
      edtech:      ['edtech', 'education tech', 'e-learning', 'learning management', 'tutoring', 'upskilling'],
      legaltech:   ['legaltech', 'legal tech', 'law tech', 'contract automation', 'legal ai', 'e-discovery'],
      proptech:    ['proptech', 'real estate tech', 'property tech', 'construction tech', 'smart building'],
      agritech:    ['agritech', 'agriculture tech', 'food tech', 'precision farming', 'agtech'],
      hardwaretech: ['hardware', 'semiconductor', 'chip', 'robotics', 'iot', 'embedded', 'sensors', 'deep tech'],
      sportstech:  ['sports tech', 'athlete', 'fitness tech', 'wearable', 'sports analytics'],
      cybersecurity: ['cybersecurity', 'cyber security', 'infosec', 'zero trust', 'identity', 'soc2', 'security software'],
      web3:        ['web3', 'blockchain', 'crypto', 'defi', 'nft', 'decentralized', 'smart contract', 'dao'],
      logistics:   ['logistics', 'supply chain', 'fulfillment', 'freight', 'fleet', 'shipping', 'warehouse'],
    }

    // keyword.includes(synonym) — NOT synonym.includes(keyword) — avoids false positives
    const activeSectorGroups = new Set<string>()
    for (const [group, synonyms] of Object.entries(NICHE_SECTOR_SYNONYMS)) {
      if (synonyms.some((s) => allKeywords.some((k) => k.includes(s)))) {
        activeSectorGroups.add(group)
      }
    }

    // Score and limit to top 1-2 groups so weak false groups don't widen synonym union
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

    if (activeSynonyms.length > 0) {
      const poolIds = new Set(candidatePool.map((v) => v.id))

      const sectorCandidates = (embeddingPool as VCProfile[]).filter((vc) => {
        if (poolIds.has(vc.id)) return false
        const sectorTokens = parseVcSectorTokens(vc)
        if (sectorTokens.length === 0) return false
        const synHit = activeSynonyms.some((syn) => vcSectorSynonymHit(syn, sectorTokens))
        if (!synHit) return false
        if (!pitchLooksGaming && topNicheGroups.includes('media') && vcIsGamingHeavy(vc)) return false
        return true
      })

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

  // ── Step 5c — Sector + thesis overlap: ensure obvious thesis fits are in the pool
  // Only use NICHE-specific phrases — generic labels (AI, SaaS, Consumer) would inject
  // generalist VCs (Y Combinator, Benchmark) that crowd out the specialist media/sector funds
  const idsBefore5c = new Set(candidatePool.map((v) => v.id))
  const thesisOverlapPhrases = [
    ...founderSignal.sectorFocusPhrases,
    ...founderSignal.thesisAffinityPhrases,
  ].filter((p) => !GENERIC_SECTOR_LABELS.has(p.toLowerCase().trim()))
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
  // Boost retrieval rank for niche-injected VCs — they were specifically identified
  // as sector-relevant but placed at the tail of the pool, getting the worst rank
  for (const id of nicheInjectedIds) {
    const current = retrievalRank01ByVcId.get(id) ?? 0
    retrievalRank01ByVcId.set(id, Math.min(1, current + 0.35))
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
      } catch { /* ignore */ }
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
    logger.integration(
      `[ORCHESTRATOR] Step 8 — sectorOverlap raw scores (top 12): ` +
      [...rawOv.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([id, raw]) => {
          const vc = narrativeResults.find((r) => r.vc.id === id)?.vc
          return `${vc?.firmName ?? id}=${raw}(${(raw / denom).toFixed(3)})`
        })
        .join(', '),
    )
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
  for (const r of ranked) {
    logger.integration(
      `[ORCHESTRATOR] Step 8 — #${r.rank} ${r.vc.firmName}: score=${r.combinedScore} ` +
      `(likelihood=${r.investmentLikelihood.label} conf=${r.investmentLikelihood.confidence} ` +
      `sim=${pitchSimilarity01ByVcId.get(r.vc.id)?.toFixed(3) ?? 'n/a'} ` +
      `sector=${sectorOverlap01ByVcId.get(r.vc.id)?.toFixed(3) ?? 'n/a'} ` +
      `preTraction=${preTractionThesis01ByVcId.get(r.vc.id)?.toFixed(3) ?? 'n/a'})`,
    )
  }

  // ── STEP 9 — Return MatchingPipelineResult ────────────────────────────────
  return {
    rankedInvestors: ranked,
    universityPrograms,
    nichePrograms,
    pipelineVersion: '3.0',
    durationMs: Date.now() - startTime,
    vcsScoredCount: results.size,
    hardVetoedCount: narrativeResults.filter((r) => r.likelihood.hardVeto).length,
    lowConfidenceCount: ranked.filter(
      (r) => r.investmentLikelihood.confidence === 'LOW',
    ).length,
  }
}
