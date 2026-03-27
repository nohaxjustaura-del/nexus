/**
 * Embedding utilities for semantic matching between pitches and VCs
 * Uses Voyage AI embedding API (voyage-3)
 *
 * voyage-3: 1024 dimensions, 200M free tokens for new accounts.
 * Rate limits: 3 RPM, 10K TPM — callers must respect these.
 * API: POST https://api.voyageai.com/v1/embeddings
 */

import { parseJSON } from '@/lib/utils'

const EMBEDDING_MODEL = 'voyage-3'
const EMBEDDING_DIMENSIONS = 1024

function getApiKey(): string {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY is required for Smart Match embeddings. Get one at https://dash.voyageai.com/')
  }
  return apiKey
}

async function callEmbedAPI(text: string): Promise<number[]> {
  const apiKey = getApiKey()

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: [text],
      model: EMBEDDING_MODEL,
      input_type: 'document',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Voyage AI embedding error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return data.data[0].embedding as number[]
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
 * Generate embedding vector for a pitch using Voyage AI
 */
export async function generatePitchEmbedding(pitch: PitchFeatures): Promise<number[]> {
  const embeddingText = buildPitchEmbeddingText(pitch)
  return callEmbedAPI(embeddingText)
}

// ============================================================================
// VC EMBEDDING
// ============================================================================

interface VCProfile {
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
  const checkSize = vc.checkSizeMin && vc.checkSizeMax 
    ? `$${vc.checkSizeMin}K - $${vc.checkSizeMax}K`
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
          inv.checkSizeMin && inv.checkSizeMax
            ? `$${inv.checkSizeMin}K-$${inv.checkSizeMax}K`
            : undefined,
        fundType: inv.fundType,
      },
    })
  }
  return out
}

/**
 * Rank VCs using FAISS service (faster, uses pre-built index)
 * Falls back to in-memory cosine similarity if service unavailable
 */
export async function rankVCsWithFAISS(
  pitchEmbedding: number[],
  topK: number = 20
): Promise<RankedVC[]> {
  const faissServiceUrl = process.env.FAISS_SERVICE_URL || 'http://localhost:8001'
  
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
      throw new Error(`FAISS service returned ${response.status}`)
    }

    const results = await response.json()
    
    // Convert FAISS API response to RankedVC format
    return results.map((vc: any) => ({
      id: vc.id,
      firmName: vc.firm_name,
      similarity: vc.similarity,
      metadata: vc.metadata,
    }))
  } catch (error: any) {
    // Check if it's a dimension mismatch error
    if (error.message?.includes('dimension mismatch') || error.message?.includes('400')) {
      console.warn('[FAISS] Dimension mismatch - FAISS index was built with different embedding dimensions. Falling back to in-memory ranking.')
    } else {
      console.warn('[FAISS] Service unavailable, falling back to in-memory ranking:', error.message)
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
    } catch {
      /* Caller must pass vcEmbeddings for in-memory ranking, or this throws below. */
    }
  }

  // In-memory cosine similarity (requires vc rows with same embedding dimension as pitch)
  if (!vcEmbeddings || vcEmbeddings.length === 0) {
    throw new Error('No VC embeddings provided and FAISS service unavailable')
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

  // Return top K
  return scored.slice(0, topK)
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Generate embeddings for multiple texts in batch.
 * Voyage AI rate limits: 3 RPM, 10K TPM. We send batches of 3
 * with a 60-second pause between batches.
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = getApiKey()
  const BATCH_SIZE = 3
  const BATCH_DELAY_MS = 60_000

  const embeddings: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    if (i > 0) {
      console.log(`[EMBEDDINGS] Rate-limit pause (${BATCH_DELAY_MS / 1000}s) before batch ${Math.floor(i / BATCH_SIZE) + 1}...`)
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
    }

    const batch = texts.slice(i, i + BATCH_SIZE)

    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: batch,
        model: EMBEDDING_MODEL,
        input_type: 'document',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Voyage AI embedding error (${res.status}): ${err}`)
    }

    const data = await res.json()
    for (const item of data.data) {
      embeddings.push(item.embedding as number[])
    }

    console.log(`[EMBEDDINGS] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} done (${embeddings.length}/${texts.length})`)
  }

  return embeddings
}

/** Exported so scripts and other modules can access the configured dimensions */
export { EMBEDDING_DIMENSIONS }
