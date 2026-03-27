/**
 * ===============================================================================
 * SCORING PIPELINE — SHARED TYPES
 * ===============================================================================
 *
 * All types for the multi-pass scoring pipeline live here to avoid circular
 * imports. Modules in lib/scoring/ import from this file only.
 *
 * Types are added incrementally as each pipeline module is implemented:
 *   Step 1 (fact-extractor)   — FounderContext, VerifiedFacts, emptyFacts
 *   Step 2 (criterion-scorer) — CriterionAnswer, Criterion, CriterionResult, CriterionScoreResult
 *   Step 3 (adversarial)      — BullResult, BearResult, AdversarialConviction, AdversarialResult
 *   Step 4 (vagueness-audit)  — VaguenessPenalty, VaguenessBonus, VaguenessRating, VaguenessAuditResult
 *   Step 5 (tier-classifier)  — ReferenceAnchor, Tier, TierResult
 *   Step 6 (pipeline)         — FinalScoringResult (includes rubricCompatible shim)
 */

import type { ComprehensiveFounderContext } from "../founder-context"
import type { DeepMarketContext } from "../market-intelligence"

// ---------------------------------------------------------------------------
// Type aliases — keeps the pipeline API clean and decoupled from the DB layer
// ---------------------------------------------------------------------------

export type FounderContext = ComprehensiveFounderContext
export type MarketIntelligenceData = DeepMarketContext

// ---------------------------------------------------------------------------
// Step 1 — VerifiedFacts (output of fact-extractor)
// ---------------------------------------------------------------------------

export interface VerifiedFacts {
  traction: {
    stated: boolean
    exactQuote: string | null
    hasRevenue: boolean
    hasUsers: boolean
    hasGrowthRate: boolean
  }
  team: {
    stated: boolean
    domainExperienceQuote: string | null
    priorExitsQuote: string | null
    technicalDepthQuote: string | null
  }
  market: {
    sizeStated: boolean
    exactFigure: string | null
    competitorsNamed: string[]
    goliathsIdentified: string[]
  }
  product: {
    differentiatorStated: boolean
    techExplained: boolean
    wedgeCustomerNamed: boolean
  }
  businessModel: {
    revenueModelClear: boolean
    unitEconomicsStated: boolean
    pricingMentioned: boolean
  }
  redFlags: string[]
}

// ---------------------------------------------------------------------------
// Step 2 — Criterion scorer types
// ---------------------------------------------------------------------------

export type CriterionAnswer = 'YES' | 'PARTIAL' | 'NO'

export type CriterionCategory = 'market' | 'team' | 'traction' | 'product' | 'business_model' | 'vision' | 'cross_section' | 'penalty'

export interface Criterion {
  id: string
  question: string
  points: { YES: number; PARTIAL: number; NO: number }
  category: CriterionCategory
  evaluationHint: string
}

export interface CriterionResult {
  id: string
  answer: CriterionAnswer
  justification: string
  pointsAwarded: number
}

export interface CriterionScoreResult {
  criterionResults: CriterionResult[]
  rawScore: number
  /** 148: Market(30) + Team(30) + Traction(25 capped) + Product(28) + BizModel(20) + Vision(15) + Cross(20). */
  maxPossible: number
  /** Per-category subtotals plus a 'penalties' key (negative number). */
  scoreByCategory: Record<string, number>
  /** Total points deducted by penalty criteria (positive value). */
  penaltiesApplied: number
}

// ---------------------------------------------------------------------------
// Step 3 — Adversarial scorer types
// ---------------------------------------------------------------------------

export interface BullResult {
  /** The specific scenario in which this startup returns the fund. */
  fundReturnerCase: string
  /** Exactly 3 things that make this potentially exceptional. */
  keyInsights: string[]
  /** 0-100: how excited would you be to champion this deal internally? */
  bullScore: number
  /** 0-100: probability this becomes a $100M+ company. */
  winProbability: number
}

export interface BearResult {
  /** The most probable failure mode within 18 months. */
  likelyDeathScenario: string
  /** Which large incumbent kills this and specifically how. */
  incumbentThreat: string
  /** Specific concerns about the founding team. */
  founderRiskFlags: string[]
  /** 0-100: how risky is this? 100 = certain failure. */
  bearScore: number
  /** True if this is the kind of idea VCs regret passing on later. */
  gaveUpTooEarlyRisk: boolean
}

export type AdversarialConviction = 'HIGH' | 'MEDIUM' | 'LOW' | 'PASS'

export interface AdversarialResult {
  bullResult: BullResult
  bearResult: BearResult
  /** Math.round((bullScore + (100 - bearScore)) / 2) */
  blendedScore: number
  /** HIGH >70, MEDIUM 50-70, LOW 30-50, PASS <30 */
  conviction: AdversarialConviction
}

// ---------------------------------------------------------------------------
// Step 4 — Vagueness auditor result types
// ---------------------------------------------------------------------------

/** A single vagueness penalty match found in the raw pitch text. */
export interface VaguenessPenalty {
  /** The original pipe-separated pattern string from VAGUENESS_RULES. */
  rule: string
  penalty: number
  reason: string
  /** The exact substring that triggered this rule. */
  matchedText: string
}

/** A single positive-evidence bonus match found in the raw pitch text. */
export interface VaguenessBonus {
  /** The regex source string (for display). */
  pattern: string
  bonus: number
  reason: string
}

export type VaguenessRating = 'CLEAN' | 'MODERATE' | 'HEAVY' | 'RED_FLAG'

export interface VaguenessAuditResult {
  penaltiesFound: VaguenessPenalty[]
  bonusesFound: VaguenessBonus[]
  totalPenalty: number
  totalBonus: number
  /** totalBonus - totalPenalty (negative = more vague than specific) */
  netAdjustment: number
  /** CLEAN <10, MODERATE 10-25, HEAVY 25-40, RED_FLAG >40 (based on totalPenalty) */
  vaguenessRating: VaguenessRating
}

// ---------------------------------------------------------------------------
// Step 5 — Tier classifier types
// ---------------------------------------------------------------------------

export interface ReferenceAnchor {
  name: string
  score: number
  why: string
}

export type Tier = 'EXCEPTIONAL' | 'STRONG' | 'DEVELOPING' | 'EARLY' | 'PASS'

export interface TierResult {
  tier: Tier
  /** 1-100 position within the assigned tier. */
  tierPercentile: number
  /** tierFloor + Math.round((tierPercentile / 100) * tierRange) */
  calibratedScore: number
  /** The two reference anchors the model said this startup most resembles. */
  closestAnchors: [string, string]
  /** The model's explanation of why those two anchors were chosen. */
  anchorRationale: string
  /** calibratedScore - Math.round((criterionScore + adversarialScore) / 2) */
  adjustmentFromInputScores: number
}

// ---------------------------------------------------------------------------
// Step 5b — Category descriptions (Phase 4 of pipeline)
// ---------------------------------------------------------------------------

/**
 * Rich, Exa-grounded descriptions generated by the dedicated description pass.
 * Each category has a score (stage-adjusted), 3-4 data-backed bullets, and a
 * one-sentence summary. Replaces the old criterion-justification bullets.
 */
export interface CategoryDescriptions {
  market:     { score: number; bullets: string[]; summary: string }
  moat:       { score: number; bullets: string[]; summary: string }
  founderFit: { score: number; bullets: string[]; summary: string }
  momentum:   { score: number; bullets: string[]; summary: string }
  globalVerdict: string
}

// ---------------------------------------------------------------------------
// Step 6 — Pipeline output type
// ---------------------------------------------------------------------------

export interface FinalScoringResult {
  finalScore: number
  scoreBreakdown: {
    categoryDescContribution: number | null
    criterionContribution: number
    adversarialContribution: number
    tierContribution: number
    vaguenessAdjustment: number
    categoryDescAvg: number | null
    formulaUsed: 'full' | 'fallback'
  }
  tier: string
  conviction: AdversarialConviction

  /** All scores normalized to 0-100 for the UI dashboard. */
  categoryScores: {
    market: number
    team: number
    traction: number
    product: number
    businessModel: number
    vision: number
    crossSection: number
  }

  /** Fund-returner scenario from bull pass. */
  bullCase: string
  /** Incumbent threat narrative from bear pass. */
  bearCase: string
  likelyDeathScenario: string
  closestComps: [string, string]

  criterionDetails: CriterionResult[]
  vaguenessFlags: Array<{ text: string; penalty: number; reason: string }>
  evidenceBonuses: Array<{ text: string; bonus: number; reason: string }>
  redFlags: string[]

  /** Rich Exa-grounded descriptions generated by the dedicated description pass (Phase 4). */
  categoryDescriptions: CategoryDescriptions

  pipelineVersion: '2.0'
  scoringDurationMs: number
  passesCompleted: string[]

  /**
   * Backward-compatibility shim for the existing AnalysisDashboard component.
   * Now populated directly from categoryDescriptions — no more lossy criterion mappings.
   */
  rubricCompatible: {
    categories: {
      market:     { score: number; bullets: string[]; summary?: string }
      moat:       { score: number; bullets: string[]; summary?: string }
      founderFit: { score: number; bullets: string[]; summary?: string }
      momentum:   { score: number; bullets: string[]; summary?: string }
      /** null for IDEA type; set by route handler for VIDEO/DECK if needed. */
      execution:  { score: number; bullets: string[]; summary?: string } | null
    }
    globalVerdict: string
  }
}

// ---------------------------------------------------------------------------
/**
 * Conservative all-false/null VerifiedFacts used as the error fallback in
 * fact-extractor, criterion-scorer, and adversarial-scorer (see plan §6j).
 * Defined here so every module can import it without duplication.
 */
export function emptyFacts(): VerifiedFacts {
  return {
    traction: {
      stated: false,
      exactQuote: null,
      hasRevenue: false,
      hasUsers: false,
      hasGrowthRate: false,
    },
    team: {
      stated: false,
      domainExperienceQuote: null,
      priorExitsQuote: null,
      technicalDepthQuote: null,
    },
    market: {
      sizeStated: false,
      exactFigure: null,
      competitorsNamed: [],
      goliathsIdentified: [],
    },
    product: {
      differentiatorStated: false,
      techExplained: false,
      wedgeCustomerNamed: false,
    },
    businessModel: {
      revenueModelClear: false,
      unitEconomicsStated: false,
      pricingMentioned: false,
    },
    redFlags: [],
  }
}
