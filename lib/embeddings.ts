/**
 * Embedding utilities for semantic matching between pitches and VCs
 * Uses Voyage AI `voyage-3` (1024 dimensions). Pitch and VC vectors must share this model/dim.
 *
 * Legacy rows in DB may store 3072-dim vectors from another provider — they cannot be converted
 * to Voyage space; run `npm run generate-vc-embeddings` to replace them with 1024-d Voyage vectors.
 *
 * Rate limits: default ~21s between request starts (3 RPM free tier). For paid tiers set
 * VOYAGE_TARGET_RPM=2000 (or VOYAGE_MIN_REQUEST_INTERVAL_MS=30). Use 0 to disable spacing (watch TPM/429).
 */

import './load-env'
import { parseJSON, fmtCheckRange } from '@/lib/utils'
import { logger } from '@/lib/logger'

const EMBEDDING_MODEL = 'voyage-3'
const EMBEDDING_DIMENSIONS = 1024

function resolveVoyageMinIntervalMs(): number {
  const rawInterval = process.env.VOYAGE_MIN_REQUEST_INTERVAL_MS
  if (rawInterval !== undefined && String(rawInterval).trim() !== '') {
    const n = Number(rawInterval)
    if (Number.isFinite(n) && n >= 0) {
      return n
    }
  }
  const rawRpm = process.env.VOYAGE_TARGET_RPM
  if (rawRpm !== undefined && String(rawRpm).trim() !== '') {
    const rpm = Number(rawRpm)
    if (Number.isFinite(rpm) && rpm > 0) {
      return Math.max(0, Math.ceil(60_000 / rpm))
    }
  }
  return 21_000
}

/** Minimum delay between Voyage embedding HTTP requests (same for single + batch calls). */
export const VOYAGE_EMBEDDINGS_MIN_INTERVAL_MS = resolveVoyageMinIntervalMs()

const VOYAGE_429_MAX_ATTEMPTS = 5

/** Min time between embedding HTTP request starts (global per process). */
let voyageEmbeddingNextStartAt = 0
let voyageEmbeddingScheduleChain: Promise<void> = Promise.resolve()

async function awaitVoyageEmbeddingRequestSlot(): Promise<void> {
  const minMs = VOYAGE_EMBEDDINGS_MIN_INTERVAL_MS
  if (minMs <= 0) return

  const run = voyageEmbeddingScheduleChain.then(async () => {
    const now = Date.now()
    const wait = Math.max(0, voyageEmbeddingNextStartAt - now)
    if (wait > 0) {
      await new Promise<void>(r => setTimeout(r, wait))
    }
    voyageEmbeddingNextStartAt = Date.now() + minMs
  })
  voyageEmbeddingScheduleChain = run.catch(() => {})
  await run
}

function getVoyageApiKey(): string {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY is required for Smart Match embeddings. Get one at https://dash.voyageai.com/')
  }
  return apiKey
}

/**
 * Single embeddings POST with 429 retries (billing / TPM / RPM bursts).
 */
async function postVoyageEmbeddings(body: Record<string, unknown>): Promise<Response> {
  const apiKey = getVoyageApiKey()
  let last429Body = ''

  for (let attempt = 0; attempt < VOYAGE_429_MAX_ATTEMPTS; attempt++) {
    await awaitVoyageEmbeddingRequestSlot()
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (res.status === 429) {
      last429Body = await res.text()
      if (attempt >= VOYAGE_429_MAX_ATTEMPTS - 1) {
        break
      }
      const retryAfter = res.headers.get('retry-after')
      const retrySec = retryAfter ? parseInt(retryAfter, 10) : NaN
      const waitMs =
        Number.isFinite(retrySec) && retrySec > 0 ? retrySec * 1000 : 65_000
      console.warn(
        `[Voyage] Rate limited (429), waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 2}/${VOYAGE_429_MAX_ATTEMPTS}...`,
      )
      await new Promise(r => setTimeout(r, waitMs))
      continue
    }

    return res
  }

  throw new Error(`Voyage AI embedding error (429): ${last429Body}`)
}

async function callEmbedAPI(text: string): Promise<number[]> {
  const res = await postVoyageEmbeddings({
    input: [text],
    model: EMBEDDING_MODEL,
    input_type: 'document',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage AI embedding error (${res.status}): ${err}`)
  }

  const data = await res.json()
  const embedding = data.data[0].embedding as number[]
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Voyage embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS} (${EMBEDDING_MODEL}), got ${
        Array.isArray(embedding) ? embedding.length : typeof embedding
      }.`,
    )
  }
  return embedding
}

// ============================================================================
// PITCH EMBEDDING
// ============================================================================

interface PitchFeatures {
  companyName?: string
  oneLineSummary?: string
  stage?: string
  sectorPrimary?: string
  sectorSecondary?: string[]
  problemStatement?: string
  solutionDescription?: string
  targetCustomer?: {
    customerType?: string
    buyerRole?: string
    companySize?: string
  }
  geography?: {
    hqLocation?: string
    markets?: string[]
  }
  businessModel?: string
  traction?: {
    revenue?: string
    users?: string
    growthSignal?: string
  }
  keyTechnologies?: string[]
  competitiveMoat?: string[]
  keywords?: string[]
}

/**
 * Build high-signal embedding text from pitch features
 */
export function buildPitchEmbeddingText(pitch: PitchFeatures): string {
  const safe = (value: any, defaultValue = 'Not mentioned'): string => {
    if (value === null || value === undefined || value === '') return defaultValue
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }

  const sections: string[] = []

  // PITCH OVERVIEW
  sections.push(
    `PITCH OVERVIEW
Company: ${safe(pitch.companyName)}
One-line summary: ${safe(pitch.oneLineSummary)}
Stage: ${safe(pitch.stage)}
Primary sector: ${safe(pitch.sectorPrimary)}
Secondary sectors: ${safe(pitch.sectorSecondary)}`
  )

  // PROBLEM
  sections.push(`PROBLEM
${safe(pitch.problemStatement)}`)

  // SOLUTION
  sections.push(`SOLUTION
${safe(pitch.solutionDescription)}`)

  // CUSTOMER
  const tc = pitch.targetCustomer || {}
  sections.push(
    `CUSTOMER
Customer type: ${safe(tc.customerType)}
Buyer role: ${safe(tc.buyerRole)}
Company size: ${safe(tc.companySize)}`
  )

  // MARKET & GEOGRAPHY
  const geo = pitch.geography || {}
  sections.push(
    `MARKET & GEOGRAPHY
HQ location: ${safe(geo.hqLocation)}
Markets: ${safe(geo.markets)}`
  )

  // BUSINESS MODEL
  sections.push(`BUSINESS MODEL
${safe(pitch.businessModel)}`)

  // TRACTION
  const traction = pitch.traction || {}
  sections.push(
    `TRACTION
Revenue: ${safe(traction.revenue)}
Users or customers: ${safe(traction.users)}
Growth signal: ${safe(traction.growthSignal)}`
  )

  // TECHNOLOGY & MOAT
  sections.push(
    `TECHNOLOGY & MOAT
Key technologies: ${safe(pitch.keyTechnologies)}
Competitive moat: ${safe(pitch.competitiveMoat)}`
  )

  // 🆕 ENHANCE: Founder background (from onboarding/profile)
  const fb = (pitch as any).founderBackground || {}
  if (fb.education || fb.university || fb.isStudent) {
    sections.push(
      `FOUNDER BACKGROUND
Education: ${safe(fb.education)}
University: ${safe(fb.university)}
Student status: ${fb.isStudent ? 'Current student' : 'Not a student'}
Age: ${fb.age || 'Not specified'}
Tech background: ${fb.techBackground ? 'Yes' : 'No'}
Experience level: ${safe(fb.experienceLevel)}
Immigrant founder: ${fb.isImmigrant ? 'Yes' : 'No'}
Underrepresented: ${fb.isUnderrepresented ? 'Yes' : 'No'}
Veteran: ${fb.isVeteran ? 'Yes' : 'No'}
Willing to drop out: ${fb.willingToDropOut ? 'Yes' : 'No'}`
    )
  }

  // 🆕 ENHANCE: Detected patterns (VC affiliations, universities)
  const patterns = (pitch as any).detectedPatterns || {}
  if (patterns.vcAffiliations?.length > 0 || patterns.universitySignals?.length > 0 || patterns.founderPatterns?.length > 0) {
    sections.push(
      `DETECTED PATTERNS
VC Affiliations: ${safe(patterns.vcAffiliations)}
Universities: ${safe(patterns.universitySignals)}
Accelerators: ${safe(patterns.acceleratorSignals)}
Founder Patterns: ${safe(patterns.founderPatterns)}`
    )
  }

  // 🆕 ENHANCE: Preferences (from onboarding)
  const prefs = (pitch as any).preferences || {}
  if (prefs.valueAddNeeds?.length > 0 || prefs.ethicsTags?.length > 0) {
    sections.push(
      `FOUNDER PREFERENCES
Value-add needs: ${safe(prefs.valueAddNeeds)}
Ethics tags: ${safe(prefs.ethicsTags)}
Personality tags: ${safe(prefs.personalityTags)}
Geo preference: ${safe(prefs.geoPreference)}
Decision speed: ${safe(prefs.decisionSpeedDays)}
Fund type preference: ${safe(prefs.fundTypePreference)}`
    )
  }

  // KEYWORDS (now includes detected patterns)
  sections.push(`KEYWORDS
${safe(pitch.keywords)}`)

  return sections.join('\n\n')
}

/**
 * Enriched embedding text that includes AI analysis outputs for better
 * niche-fit VC matching. Falls back to standard embedding text for any
 * missing analysis fields.
 */
export interface AnalysisEnrichment {
  strengths?: string[]
  uniqueness?: string
  marketFit?: string
  subSectorTags?: string[]
  riskFactors?: string[]
  tier?: string
  conviction?: string
  bullCase?: string
  moatType?: string
}

export function buildEnrichedPitchEmbeddingText(
  pitch: PitchFeatures,
  analysis: AnalysisEnrichment,
): string {
  const base = buildPitchEmbeddingText(pitch)

  const safe = (value: any, defaultValue = ''): string => {
    if (value === null || value === undefined || value === '') return defaultValue
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }

  const enrichmentSections: string[] = []

  if (analysis.subSectorTags?.length) {
    enrichmentSections.push(`NICHE POSITIONING
Sub-sector tags: ${analysis.subSectorTags.join(', ')}`)
  }

  if (analysis.uniqueness || analysis.moatType) {
    enrichmentSections.push(`COMPETITIVE ADVANTAGE
Moat type: ${safe(analysis.moatType, 'Not classified')}
Unique positioning: ${safe(analysis.uniqueness, 'Not identified')}`)
  }

  if (analysis.strengths?.length) {
    enrichmentSections.push(`KEY STRENGTHS (AI-identified)
${analysis.strengths.slice(0, 3).join('\n')}`)
  }

  if (analysis.marketFit) {
    enrichmentSections.push(`MARKET FIT ASSESSMENT
${analysis.marketFit}`)
  }

  if (analysis.bullCase) {
    enrichmentSections.push(`INVESTMENT THESIS
${analysis.bullCase}`)
  }

  if (analysis.tier || analysis.conviction) {
    enrichmentSections.push(`QUALITY SIGNAL
Tier: ${safe(analysis.tier, 'Not classified')}
Conviction: ${safe(analysis.conviction, 'Not assessed')}`)
  }

  if (enrichmentSections.length === 0) return base

  return `${base}\n\n${enrichmentSections.join('\n\n')}`
}

/**
 * Generate embedding vector for a pitch using Voyage AI
 */
export async function generatePitchEmbedding(
  pitch: PitchFeatures,
  analysis?: AnalysisEnrichment,
): Promise<number[]> {
  const embeddingText = analysis
    ? buildEnrichedPitchEmbeddingText(pitch, analysis)
    : buildPitchEmbeddingText(pitch)
  return callEmbedAPI(embeddingText)
}

// ============================================================================
// VC EMBEDDING
// ============================================================================

export interface VCProfile {
  firmName: string
  fundType?: string
  stages?: string[]
  sectors?: string[]
  geography?: string[]
  checkSizeMin?: number
  checkSizeMax?: number
  leadFollow?: string
  thesis?: string
  valueAddTags?: string[]
  portfolio?: string[]
  notableInvestments?: string[]
}

/**
 * Build high-signal embedding text from VC profile
 */
export function buildVCEmbeddingText(vc: VCProfile): string {
  const safe = (value: any, defaultValue = 'Not specified'): string => {
    if (value === null || value === undefined || value === '') return defaultValue
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }

  const sections: string[] = []

  // FIRM OVERVIEW
  sections.push(
    `FIRM OVERVIEW
Name: ${safe(vc.firmName)}
Type: ${safe(vc.fundType)}
Investment stages: ${safe(vc.stages)}
Primary sectors: ${safe(vc.sectors)}
Geography focus: ${safe(vc.geography)}`
  )

  // INVESTMENT CRITERIA
  const checkSize = vc.checkSizeMin || vc.checkSizeMax
    ? fmtCheckRange(vc.checkSizeMin, vc.checkSizeMax)
    : 'Not specified'
  
  sections.push(
    `INVESTMENT CRITERIA
Check size: ${checkSize}
Lead or follow: ${safe(vc.leadFollow)}
Investment thesis: ${safe(vc.thesis)}`
  )

  // VALUE ADD
  sections.push(
    `VALUE ADD
Specializations: ${safe(vc.valueAddTags)}`
  )

  // PORTFOLIO
  if (vc.portfolio && vc.portfolio.length > 0) {
    sections.push(`PORTFOLIO COMPANIES
${vc.portfolio.slice(0, 20).join(', ')}`)
  }

  if (vc.notableInvestments && vc.notableInvestments.length > 0) {
    sections.push(`NOTABLE INVESTMENTS
${vc.notableInvestments.slice(0, 10).join(', ')}`)
  }

  return sections.join('\n\n')
}

/**
 * Generate embedding vector for a VC using Voyage AI
 */
export async function generateVCEmbedding(vc: VCProfile): Promise<number[]> {
  const embeddingText = buildVCEmbeddingText(vc)
  return callEmbedAPI(embeddingText)
}

// ============================================================================
// SIMILARITY CALCULATION
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (normA * normB)
}

/**
 * Rank VCs by similarity to a pitch
 */
export interface RankedVC {
  id: string
  firmName: string
  similarity: number
  metadata: {
    stages?: string[]
    sectors?: string[]
    geography?: string[]
    checkSize?: string
    fundType?: string
  }
}

/** One row of VC vectors for in-memory cosine ranking (same model/dim as pitch embedding). */
export type VcEmbeddingRow = {
  id: string
  firmName: string
  embedding: number[]
  metadata: Record<string, unknown>
}

/**
 * Parse stored Investor.embedding JSON into rows usable by rankVCsForPitch(..., useFAISS: false).
 * Skips rows with missing JSON, wrong length vs current pitch model, or parse errors.
 */
export function investorsToRankableEmbeddings(
  investors: Array<{
    id: string
    firmName: string | null
    embedding: string | null
    stages: string
    sectors: string
    geography: string
    geoFocus: string
    checkSizeMin: number
    checkSizeMax: number
    fundType: string
  }>,
  pitchEmbeddingLength: number,
): VcEmbeddingRow[] {
  const out: VcEmbeddingRow[] = []
  for (const inv of investors) {
    if (!inv.embedding?.trim()) continue
    let emb: number[]
    try {
      emb = JSON.parse(inv.embedding as string)
    } catch {
      continue
    }
    if (!Array.isArray(emb) || emb.length !== pitchEmbeddingLength) continue
    out.push({
      id: inv.id,
      firmName: inv.firmName ?? '',
      embedding: emb,
      metadata: {
        stages: parseJSON<string[]>(inv.stages, []),
        sectors: parseJSON<string[]>(inv.sectors, []),
        geography: parseJSON<string[]>(inv.geography || inv.geoFocus, []),
        checkSize:
          inv.checkSizeMin || inv.checkSizeMax
            ? fmtCheckRange(inv.checkSizeMin, inv.checkSizeMax)
            : undefined,
        fundType: inv.fundType,
      },
    })
  }
  return out
}

/** Same inclusion rules as investorsToRankableEmbeddings — for logging funnel counts only. */
export function countInvestorEmbeddingFilters(
  investors: Parameters<typeof investorsToRankableEmbeddings>[0],
  pitchEmbeddingLength: number,
): {
  input: number
  rankable: number
  missingEmbedding: number
  parseError: number
  wrongDimension: number
} {
  let missingEmbedding = 0
  let parseError = 0
  let wrongDimension = 0
  for (const inv of investors) {
    if (!inv.embedding?.trim()) {
      missingEmbedding++
      continue
    }
    let emb: number[]
    try {
      emb = JSON.parse(inv.embedding as string)
    } catch {
      parseError++
      continue
    }
    if (!Array.isArray(emb) || emb.length !== pitchEmbeddingLength) {
      wrongDimension++
      continue
    }
  }
  const input = investors.length
  return {
    input,
    rankable: input - missingEmbedding - parseError - wrongDimension,
    missingEmbedding,
    parseError,
    wrongDimension,
  }
}

/** After a dimension mismatch from the FAISS service, skip HTTP calls until process restart. */
let faissSkipDueToDimensionMismatch = false
let faissDimensionMismatchLogged = false

/** Dev / rebuild workflow: keep calling FAISS after mismatch so a rebuilt index works without restarting Next. */
function faissRetryOnDimensionMismatch(): boolean {
  const v = process.env.FAISS_RETRY_ON_DIMENSION_MISMATCH
  return v === '1' || v === 'true'
}

/**
 * Rank VCs using FAISS service (faster, uses pre-built index)
 * Falls back to in-memory cosine similarity if service unavailable
 */
export async function rankVCsWithFAISS(
  pitchEmbedding: number[],
  topK: number = 20
): Promise<RankedVC[]> {
  if (faissRetryOnDimensionMismatch()) {
    faissSkipDueToDimensionMismatch = false
  }
  if (faissSkipDueToDimensionMismatch) {
    throw new Error('FAISS skipped: index/pitch embedding dimensions do not match (see faiss-service logs)')
  }

  const faissServiceUrl = (process.env.FAISS_SERVICE_URL || 'http://localhost:8001').replace(/\/$/, '')
  logger.integration('[FAISS] POST /rank', { url: `${faissServiceUrl}/rank`, top_k: topK, pitch_dim: pitchEmbedding.length })

  try {
    const response = await fetch(`${faissServiceUrl}/rank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pitch_embedding: pitchEmbedding,
        top_k: topK,
      }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { detail?: string } | null
      const detail =
        typeof body?.detail === 'string'
          ? body.detail
          : body
            ? JSON.stringify(body)
            : `HTTP ${response.status}`

      if (
        response.status === 400 &&
        /dimension mismatch|Embedding dimension mismatch/i.test(detail)
      ) {
        if (!faissRetryOnDimensionMismatch()) {
          faissSkipDueToDimensionMismatch = true
        }
        if (!faissDimensionMismatchLogged) {
          faissDimensionMismatchLogged = true
          logger.warn(
            faissRetryOnDimensionMismatch()
              ? '[FAISS] Index embedding size does not match the current pitch model. Regenerate the index; ' +
                  'retrying every request (FAISS_RETRY_ON_DIMENSION_MISMATCH). Do not use in production.'
              : '[FAISS] Index embedding size does not match the current pitch model. ' +
                  'Regenerate the index (see faiss-service/README or npm run rebuild-faiss-index). ' +
                  'Skipping further FAISS HTTP calls until server restart.',
          )
        }
      }

      throw new Error(detail)
    }

    const results = await response.json()

    logger.integration(
      `[FAISS] /rank ok: neighbors_returned=${Array.isArray(results) ? results.length : 0}`,
      { pitch_dim: pitchEmbedding.length, requested_top_k: topK },
    )

    // Convert FAISS API response to RankedVC format
    return results.map((vc: any) => ({
      id: vc.id,
      firmName: vc.firm_name,
      similarity: vc.similarity,
      metadata: vc.metadata,
    }))
  } catch (error: any) {
    if (!faissSkipDueToDimensionMismatch) {
      if (error.message?.includes('dimension mismatch') || error.message?.includes('400')) {
        logger.warn('[FAISS] Request failed; falling back to in-memory ranking:', error.message)
      } else {
        logger.warn('[FAISS] Service unavailable, falling back to in-memory ranking:', error.message)
      }
    }
    throw error // Re-throw so caller can fall back
  }
}

export async function rankVCsForPitch(
  pitchEmbedding: number[],
  vcEmbeddings: Array<{ id: string; firmName: string; embedding: number[]; metadata: any }>,
  topK: number = 20,
  useFAISS: boolean = true
): Promise<RankedVC[]> {
  // Try FAISS service first if enabled
  if (useFAISS && (!vcEmbeddings || vcEmbeddings.length === 0)) {
    try {
      return await rankVCsWithFAISS(pitchEmbedding, topK)
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : String(e)
      throw new Error(
        `FAISS /rank failed (orchestrator may still use in-memory DB embeddings): ${detail}`,
      )
    }
  }

  // In-memory cosine similarity (requires vc rows with same embedding dimension as pitch)
  if (!vcEmbeddings || vcEmbeddings.length === 0) {
    throw new Error('No VC embeddings provided and FAISS path was not used')
  }

  // Calculate similarities
  const scored = vcEmbeddings.map(vc => ({
    id: vc.id,
    firmName: vc.firmName,
    similarity: cosineSimilarity(pitchEmbedding, vc.embedding),
    metadata: vc.metadata,
  }))

  // Sort by similarity (descending)
  scored.sort((a, b) => b.similarity - a.similarity)

  const top = scored.slice(0, topK)
  logger.integration(
    `[FAISS] in-memory cosine: scored ${vcEmbeddings.length} VC rows → top_${topK}=${top.length}`,
    { pitch_dim: pitchEmbedding.length },
  )
  return top
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Generate embeddings for multiple texts in batch.
 * Spacing between HTTP calls is enforced inside postVoyageEmbeddings via VOYAGE_TARGET_RPM /
 * VOYAGE_MIN_REQUEST_INTERVAL_MS. Each request may include up to BATCH_SIZE strings (default 3).
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 3

  const embeddings: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)

    const res = await postVoyageEmbeddings({
      input: batch,
      model: EMBEDDING_MODEL,
      input_type: 'document',
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Voyage AI embedding error (${res.status}): ${err}`)
    }

    const data = await res.json()
    const items = [...(data.data as { embedding: number[]; index?: number }[])].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0),
    )
    for (const item of items) {
      const emb = item.embedding
      if (!Array.isArray(emb) || emb.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Voyage batch embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS} (${EMBEDDING_MODEL}), got ${
            Array.isArray(emb) ? emb.length : typeof emb
          }`,
        )
      }
      embeddings.push(emb)
    }

    console.log(`[EMBEDDINGS] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} done (${embeddings.length}/${texts.length})`)
  }

  return embeddings
}

/** Exported so scripts and other modules stay aligned with the live API config */
export { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL }
