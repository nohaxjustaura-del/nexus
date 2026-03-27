/**
 * ===============================================================================
 * VC MATCHING PIPELINE v3 — SHARED TYPES
 * ===============================================================================
 *
 * Single source of truth for all TypeScript types in the rebuilt VC matching
 * pipeline. No types are defined in any other lib/matching/ module — they all
 * import exclusively from this file.
 *
 * Type groups:
 *   Exa Layer          — EnrichedExaSnippet, VCExaBundle
 *   Gate Layer         — GateAnswer, GateResult, GateAnswers
 *   Dimension Layer    — InvestmentLabel, DimensionLabels, DimensionScores
 *   Likelihood Layer   — InvestmentLikelihoodResult
 *   University Layer   — UniversityProgram, UniversityProgramMatch
 *   Narrative Layer    — MatchNarrative
 *   Output Layer       — RankedInvestorResult, MatchingPipelineResult
 *   Input Layer        — FounderMatchSignal
 *   Aliases            — VCProfile (= Prisma Investor)
 */

import type { Investor } from '@prisma/client'

// ---------------------------------------------------------------------------
// Alias — keeps pipeline code readable without depending on Prisma names
// ---------------------------------------------------------------------------

/** The investor type used throughout the matching pipeline.
 *  Aliased from the Prisma-generated Investor model so lib/matching/ modules
 *  do not need to import @prisma/client directly. */
export type VCProfile = Investor

// ---------------------------------------------------------------------------
// Exa Layer
// ---------------------------------------------------------------------------

export interface EnrichedExaSnippet {
  title: string
  /** First 2 sentences of the page body. */
  snippet: string
  /** ISO date string from Exa, or null when unavailable. */
  publishedDate: string | null
  /** Months elapsed since publishedDate, computed at fetch time. null when date is unknown. */
  monthsAgo: number | null
  queryType: 'revealed_thesis' | 'stated_conviction' | 'founder_specific'
  url: string
}

export interface VCExaBundle {
  vcId: string
  vcName: string
  /** Query 1 results — what the VC has actually funded (revealed behavior). */
  revealedThesis: EnrichedExaSnippet[]
  /** Query 2 results — what the VC says they care about (stated conviction). */
  statedConviction: EnrichedExaSnippet[]
  /** Query 3 results — activity in this specific sector + stage. */
  founderSpecific: EnrichedExaSnippet[]
  fetchedAt: Date
  /** Sum of all three arrays' lengths. */
  totalSnippets: number
}

// ---------------------------------------------------------------------------
// Gate Question Layer
// ---------------------------------------------------------------------------

export type GateAnswer = 'YES' | 'NO' | 'UNCLEAR'

export interface GateResult {
  answer: GateAnswer
  /** One sentence citing a specific snippet tag (e.g. [R1], [T2]) or
   *  explaining what evidence is missing. Never fabricated. */
  evidence: string
}

export interface GateAnswers {
  // ── Thesis Alignment ──────────────────────────────────────────────────
  /** Does their revealed portfolio contain this sector in the last 6 months? */
  Q1: GateResult
  /** Does their stated thesis mention this sector or an adjacent one? */
  Q2: GateResult
  /** Is this founder's stage represented in their recent deals? */
  Q3: GateResult

  // ── Founder Archetype ─────────────────────────────────────────────────
  /** Have they backed this founder archetype before? */
  Q4: GateResult
  /** Does this founder's background match their most recent 3 investments? */
  Q5: GateResult
  /** Is there an explicit signal they avoid this archetype? */
  Q6: GateResult

  // ── Deployment ────────────────────────────────────────────────────────
  /** Is there evidence of a new investment in the last 3 months? */
  Q7: GateResult
  /** Is there evidence of a new fund announcement in the last 12 months? */
  Q8: GateResult
  /** Is there any inactivity signal (no deals in 6+ months, wind-down, etc.)? */
  Q9: GateResult

  // ── Portfolio Gap ─────────────────────────────────────────────────────
  /** Is there a direct competitor to this founder already in their portfolio? */
  Q10: GateResult
  /** Is there an adjacent company suggesting appetite for this space? */
  Q11: GateResult
  /** Does their portfolio show a clear gap this founder would fill? */
  Q12: GateResult
}

// ---------------------------------------------------------------------------
// Dimension Labels
// ---------------------------------------------------------------------------

export type InvestmentLabel = 'LOW' | 'LOW-MEDIUM' | 'MEDIUM' | 'MEDIUM-HIGH' | 'HIGH'

export interface DimensionLabels {
  thesisAlignment: InvestmentLabel
  founderArchetype: InvestmentLabel
  deploymentLikelihood: InvestmentLabel
  portfolioGap: InvestmentLabel
}

export interface DimensionScores {
  /** 0-100, derived deterministically from gate answers. */
  thesisAlignment: number
  founderArchetype: number
  deploymentLikelihood: number
  portfolioGap: number
}

// ---------------------------------------------------------------------------
// Investment Likelihood
// ---------------------------------------------------------------------------

export interface InvestmentLikelihoodResult {
  label: InvestmentLabel
  /** 0-100, computed in TypeScript only — no LLM assigns this number. */
  score: number
  hardVeto: boolean
  vetoReason: 'competitor_in_portfolio' | 'vc_likely_inactive' | null
  dimensionLabels: DimensionLabels
  dimensionScores: DimensionScores
  gateAnswers: GateAnswers
  /**
   * HIGH   = 8+ gates answered YES or NO (not UNCLEAR)
   * MEDIUM = 5–7 gates answered definitively
   * LOW    = fewer than 5 definitive answers (sparse Exa data)
   */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

// ---------------------------------------------------------------------------
// University Programs
// ---------------------------------------------------------------------------

export interface UniversityProgram {
  id: string
  name: string
  /** Canonical university name, e.g. "UC Berkeley". */
  university: string
  /** All acceptable name variants for matching against founder.university. */
  aliases: string[]
  eligibility: 'students_only' | 'alumni_included' | 'university_affiliated'
  type: 'accelerator' | 'fund' | 'angel_network' | 'grant' | 'fellowship'
  checkSize: { min: number | null; max: number | null }
  applicationUrl: string
  /** ISO date string "YYYY-MM-DD" or the literal string "rolling". */
  deadline: string
  /** One-sentence description of the program. */
  description: string
  /** Stages this program accepts. Empty array = all stages. */
  stageFocus: string[]
  /** Sectors this program focuses on. Empty array = all sectors. */
  sectorFocus: string[]
  /** If true, this is an open accelerator (e.g. YC) that appears in both
   *  the university programs UI section AND the main ranking pool. */
  isOpenAccelerator?: boolean
}

export interface UniversityProgramMatch {
  program: UniversityProgram
  /** Human-readable explanation of why this founder qualifies. */
  qualificationReason: string
  urgency: 'apply_now' | 'upcoming_deadline' | 'rolling'
}

// ---------------------------------------------------------------------------
// Narrative
// ---------------------------------------------------------------------------

export interface MatchNarrative {
  /** Evidence-cited rationale, 2-3 sentences. Names actual deals/thesis language. */
  whyApply: string
  /** Tactical outreach advice, 2-3 sentences. References their actual thesis. */
  bestApproach: string
  /** Deployment timing based on recency evidence, 1-2 sentences. */
  timing: string
  /** One direct sentence if hardVeto or inactivity. null otherwise. Never softened. */
  redFlag: string | null
  /** One sentence on missing data if confidence === 'LOW'. null otherwise. */
  confidenceNote: string | null
}

// ---------------------------------------------------------------------------
// Score Breakdown (used internally by ranker, exposed on RankedInvestorResult)
// ---------------------------------------------------------------------------

export interface ScoreBreakdown {
  /** investmentLikelihood.score × 0.60 */
  likelihoodContribution: number
  /** dimensionScores.deploymentLikelihood × 0.40 */
  deploymentContribution: number
  /** Confidence multiplier applied (1.00 / 0.92 / 0.80). */
  confidenceDiscount: number
  finalScore: number
}

// ---------------------------------------------------------------------------
// Final Ranked Result
// ---------------------------------------------------------------------------

export interface RankedInvestorResult {
  vc: VCProfile
  rank: number
  /** 0-100 final combined score after confidence discount. */
  combinedScore: number
  investmentLikelihood: InvestmentLikelihoodResult
  narrative: MatchNarrative
  scoreBreakdown: ScoreBreakdown
  // ── Backward-compatibility fields ──────────────────────────────────────
  // The UI currently reads these directly. They mirror the narrative fields.
  /** = narrative.whyApply */
  whyApply: string
  /** = narrative.bestApproach */
  bestApproach: string
  /** = narrative.timing */
  timing: string
}

// ---------------------------------------------------------------------------
// Pipeline Result (top-level output of runMatchingPipeline)
// ---------------------------------------------------------------------------

export interface MatchingPipelineResult {
  /** Top 12 investors, sorted descending by combinedScore. */
  rankedInvestors: RankedInvestorResult[]
  /** University-affiliated programs — separate track, never in rankedInvestors. */
  universityPrograms: UniversityProgramMatch[]
  pipelineVersion: '3.0'
  durationMs: number
  vcsScoredCount: number
  hardVetoedCount: number
  lowConfidenceCount: number
}

// ---------------------------------------------------------------------------
// Founder Signal (distilled input to every matching module)
// ---------------------------------------------------------------------------

export interface FounderMatchSignal {
  stage: string
  sectors: string[]
  /** First element of sectors, used as the primary query dimension. */
  primarySector: string
  founderArchetype:
    | 'technical'
    | 'domain-expert'
    | 'repeat-founder'
    | 'academic'
    | 'operator'
    | 'unknown'
  /** Fundraising target in thousands of dollars (matches Founder.fundingNeed). */
  checkNeeded: number
  location: string
  /** Canonical university name or null if unknown / no affiliation. */
  university: string | null
  isStudent: boolean
  isRepeatFounder: boolean
  /**
   * none        = no traction metrics present
   * early       = users only, no revenue
   * meaningful  = $1–$50K MRR or equivalent
   * strong      = $50K+ MRR or equivalent
   */
  tractionTier: 'none' | 'early' | 'meaningful' | 'strong'
  /** Positive signals extracted from VerifiedFacts or pitch analysis. */
  keyStrengths: string[]
  /** Concerns extracted from VerifiedFacts.redFlags or pitch analysis. */
  redFlags: string[]
  /** Key terms from the pitch for thesis keyword overlap in narratives. */
  pitchKeywords: string[]
}
