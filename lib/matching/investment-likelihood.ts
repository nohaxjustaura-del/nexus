/**
 * ===============================================================================
 * INVESTMENT LIKELIHOOD COMPUTER — VC MATCHING PIPELINE v3
 * ===============================================================================
 *
 * Pure TypeScript — zero LLM calls.
 *
 * Takes GateAnswers (YES/NO/UNCLEAR) produced by gate-reasoner.ts and derives:
 *   - Per-dimension InvestmentLabels
 *   - Per-dimension numeric scores
 *   - A weighted final InvestmentLikelihoodResult
 *   - Hard vetoes (competitor in portfolio, VC likely inactive)
 *   - Confidence level based on how many gates had definitive answers
 */

import type {
  DimensionLabels,
  DimensionScores,
  GateAnswers,
  GateResult,
  InvestmentLabel,
  InvestmentLikelihoodResult,
} from './types'

// ---------------------------------------------------------------------------
// PART 1 — Gate Answer Helpers
// ---------------------------------------------------------------------------

function isYes(gate: GateResult): boolean {
  return gate.answer === 'YES'
}

function isNo(gate: GateResult): boolean {
  return gate.answer === 'NO'
}

function isUnclear(gate: GateResult): boolean {
  return gate.answer === 'UNCLEAR'
}

/** Counts how many of the specified gate keys have a definitive answer (YES or NO). */
function countDefinitive(
  answers: GateAnswers,
  keys: (keyof GateAnswers)[],
): number {
  return keys.filter((k) => !isUnclear(answers[k])).length
}

// ---------------------------------------------------------------------------
// PART 2 — Dimension Label Derivers
// ---------------------------------------------------------------------------

function deriveThesisAlignment(g: GateAnswers): InvestmentLabel {
  const yesCount = [g.Q1, g.Q2, g.Q3].filter(isYes).length
  const unclearCount = [g.Q1, g.Q2, g.Q3].filter(isUnclear).length
  if (yesCount === 3) return 'HIGH'
  if (yesCount === 2) return 'MEDIUM-HIGH'
  if (yesCount === 1) return 'MEDIUM'
  if (unclearCount >= 2) return 'LOW-MEDIUM'   // sparse data, not confirmed bad
  return 'LOW'
}

function deriveFounderArchetype(g: GateAnswers): InvestmentLabel {
  // Q6 YES = they explicitly avoid this archetype = hard LOW
  if (isYes(g.Q6)) return 'LOW'
  const positiveYes = [g.Q4, g.Q5].filter(isYes).length
  const unclearCount = [g.Q4, g.Q5, g.Q6].filter(isUnclear).length
  if (positiveYes === 2) return 'HIGH'
  if (positiveYes === 1 && !isNo(g.Q6)) return 'MEDIUM-HIGH'
  if (positiveYes === 0 && unclearCount >= 2) return 'MEDIUM'   // unknown ≠ bad
  if (positiveYes === 0 && isNo(g.Q4) && isNo(g.Q5)) return 'LOW'
  return 'MEDIUM'
}

function deriveDeploymentLikelihood(g: GateAnswers): InvestmentLabel {
  // Q9 YES = inactivity signal = hard LOW
  if (isYes(g.Q9)) return 'LOW'
  const recentDeal = isYes(g.Q7)
  const newFund = isYes(g.Q8)
  if (recentDeal && newFund) return 'HIGH'
  if (recentDeal && !isNo(g.Q8)) return 'MEDIUM-HIGH'
  if (!recentDeal && newFund) return 'MEDIUM'
  if (isUnclear(g.Q7) && isUnclear(g.Q8)) return 'LOW-MEDIUM'  // no deployment data
  return 'LOW-MEDIUM'
}

function derivePortfolioGap(g: GateAnswers): InvestmentLabel {
  // Q10 YES = direct competitor = hard LOW (triggers veto downstream)
  if (isYes(g.Q10)) return 'LOW'
  const hasAdjacent = isYes(g.Q11)
  const hasGap = isYes(g.Q12)
  if (hasAdjacent && hasGap) return 'HIGH'
  if (hasGap && !hasAdjacent) return 'MEDIUM-HIGH'
  if (hasAdjacent && !hasGap) return 'MEDIUM'
  if (isUnclear(g.Q10) && isUnclear(g.Q11)) return 'MEDIUM'    // unknown ≠ conflict
  return 'LOW-MEDIUM'
}

// ---------------------------------------------------------------------------
// PART 3 — Label to Score Mapping
// ---------------------------------------------------------------------------

/**
 * Non-uniform scale intentionally avoids hard floor/ceiling clustering.
 * LOW → 10 (not 0) and HIGH → 95 (not 100) leaves headroom for the
 * weighted fusion formula to spread scores across the full range.
 */
const LABEL_TO_SCORE: Record<InvestmentLabel, number> = {
  'LOW':         10,
  'LOW-MEDIUM':  30,
  'MEDIUM':      50,
  'MEDIUM-HIGH': 75,
  'HIGH':        95,
}

// ---------------------------------------------------------------------------
// PART 4 — Confidence Computer
// ---------------------------------------------------------------------------

const ALL_GATE_KEYS: (keyof GateAnswers)[] = [
  'Q1', 'Q2', 'Q3',
  'Q4', 'Q5', 'Q6',
  'Q7', 'Q8', 'Q9',
  'Q10', 'Q11', 'Q12',
]

function computeConfidence(g: GateAnswers): 'HIGH' | 'MEDIUM' | 'LOW' {
  const definitive = countDefinitive(g, ALL_GATE_KEYS)
  if (definitive >= 8) return 'HIGH'
  if (definitive >= 5) return 'MEDIUM'
  return 'LOW'
}

// ---------------------------------------------------------------------------
// PART 5 — Main Likelihood Computer
// ---------------------------------------------------------------------------

/**
 * Derives an InvestmentLikelihoodResult from gate answers using only
 * TypeScript arithmetic — no LLM, no network calls.
 *
 * Evaluation order:
 *   1. Hard veto: competitor_in_portfolio  (Q10 = YES)
 *   2. Soft veto: vc_likely_inactive       (deploymentLikelihood = LOW)
 *   3. Weighted synthesis across all 4 dimensions
 */
export function computeInvestmentLikelihood(
  g: GateAnswers,
): InvestmentLikelihoodResult {
  const labels: DimensionLabels = {
    thesisAlignment:      deriveThesisAlignment(g),
    founderArchetype:     deriveFounderArchetype(g),
    deploymentLikelihood: deriveDeploymentLikelihood(g),
    portfolioGap:         derivePortfolioGap(g),
  }

  // ── Hard veto: direct competitor already in portfolio ────────────────────
  if (labels.portfolioGap === 'LOW' && isYes(g.Q10)) {
    return {
      label: 'LOW',
      score: 0,
      hardVeto: true,
      vetoReason: 'competitor_in_portfolio',
      dimensionLabels: labels,
      dimensionScores: {
        thesisAlignment: 0,
        founderArchetype: 0,
        deploymentLikelihood: 0,
        portfolioGap: 0,
      },
      gateAnswers: g,
      confidence: computeConfidence(g),
    }
  }

  // ── Soft veto: VC shows inactivity signals ────────────────────────────────
  if (labels.deploymentLikelihood === 'LOW') {
    const scores: DimensionScores = {
      thesisAlignment:      LABEL_TO_SCORE[labels.thesisAlignment],
      founderArchetype:     LABEL_TO_SCORE[labels.founderArchetype],
      deploymentLikelihood: LABEL_TO_SCORE['LOW'],
      portfolioGap:         LABEL_TO_SCORE[labels.portfolioGap],
    }
    return {
      label: 'LOW-MEDIUM',
      score: 20,
      hardVeto: false,
      vetoReason: 'vc_likely_inactive',
      dimensionLabels: labels,
      dimensionScores: scores,
      gateAnswers: g,
      confidence: computeConfidence(g),
    }
  }

  // ── Weighted synthesis ────────────────────────────────────────────────────
  const scores: DimensionScores = {
    thesisAlignment:      LABEL_TO_SCORE[labels.thesisAlignment],
    founderArchetype:     LABEL_TO_SCORE[labels.founderArchetype],
    deploymentLikelihood: LABEL_TO_SCORE[labels.deploymentLikelihood],
    portfolioGap:         LABEL_TO_SCORE[labels.portfolioGap],
  }

  // Weights: thesis fit is primary, archetype + deployment equally secondary,
  // portfolio gap contributes least (often sparse Exa data).
  const raw =
    scores.thesisAlignment      * 0.35 +
    scores.founderArchetype      * 0.25 +
    scores.deploymentLikelihood  * 0.25 +
    scores.portfolioGap          * 0.15

  const label: InvestmentLabel =
    raw >= 80 ? 'HIGH' :
    raw >= 60 ? 'MEDIUM-HIGH' :
    raw >= 40 ? 'MEDIUM' :
    raw >= 20 ? 'LOW-MEDIUM' : 'LOW'

  return {
    label,
    score: Math.round(raw),
    hardVeto: false,
    vetoReason: null,
    dimensionLabels: labels,
    dimensionScores: scores,
    gateAnswers: g,
    confidence: computeConfidence(g),
  }
}
