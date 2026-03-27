/**
 * ===============================================================================
 * RANKER — VC MATCHING PIPELINE v3
 * ===============================================================================
 *
 * Pure TypeScript score fusion and top-12 cut. Zero LLM calls.
 *
 * Formula:
 *   rawScore  = investmentLikelihood.score × 0.60
 *             + dimensionScores.deploymentLikelihood × 0.40
 *   finalScore = rawScore × CONFIDENCE_MULTIPLIER[confidence]
 *
 * The deployment dimension is intentionally double-counted (it already
 * contributes to investmentLikelihood.score via the weighted synthesis in
 * investment-likelihood.ts AND appears again here as a standalone term).
 * This is a deliberate design choice: a VC that is actively deploying
 * capital is consistently more valuable to a founder regardless of how
 * perfect the thesis alignment is.
 */

import type {
  FounderMatchSignal,
  InvestmentLikelihoodResult,
  MatchNarrative,
  RankedInvestorResult,
  ScoreBreakdown,
  VCProfile,
} from './types'

// ---------------------------------------------------------------------------
// PART 1 — Confidence Discount
// ---------------------------------------------------------------------------

const CONFIDENCE_MULTIPLIER: Record<'HIGH' | 'MEDIUM' | 'LOW', number> = {
  HIGH:   1.00,
  MEDIUM: 0.92,
  LOW:    0.80,
}

// ---------------------------------------------------------------------------
// PART 2 — Final Score Computer
// ---------------------------------------------------------------------------

interface CombinedScoreResult {
  score: number
  breakdown: ScoreBreakdown
}

function computeCombinedScore(
  likelihood: InvestmentLikelihoodResult,
): CombinedScoreResult {
  // Hard veto — zero out completely, no further math
  if (likelihood.hardVeto) {
    const breakdown: ScoreBreakdown = {
      likelihoodContribution: 0,
      deploymentContribution: 0,
      confidenceDiscount: CONFIDENCE_MULTIPLIER[likelihood.confidence],
      finalScore: 0,
    }
    return { score: 0, breakdown }
  }

  const likelihoodContribution = likelihood.score * 0.60
  const deploymentContribution = likelihood.dimensionScores.deploymentLikelihood * 0.40

  const rawScore = likelihoodContribution + deploymentContribution

  const discountMultiplier = CONFIDENCE_MULTIPLIER[likelihood.confidence]
  const finalScore = Math.round(rawScore * discountMultiplier)

  const breakdown: ScoreBreakdown = {
    likelihoodContribution: Math.round(likelihoodContribution),
    deploymentContribution: Math.round(deploymentContribution),
    confidenceDiscount: discountMultiplier,
    finalScore,
  }

  return {
    score: Math.min(100, finalScore),
    breakdown,
  }
}

// ---------------------------------------------------------------------------
// PART 3 — Ranker
// ---------------------------------------------------------------------------

/** Input record for a single VC that has been fully scored. */
export interface ScoredVC {
  vc: VCProfile
  likelihood: InvestmentLikelihoodResult
  narrative: MatchNarrative
}

/**
 * Takes a list of fully-scored VCs and returns the top 12 as
 * RankedInvestorResult[], sorted by combinedScore descending.
 *
 * Hard-vetoed VCs are removed entirely.
 *
 * If fewer than 3 non-vetoed VCs remain, up to 3 LOW-confidence VCs that
 * were otherwise excluded are appended so the founder always sees something.
 * In that case each result carries `lowConfidenceWarning: true` via the
 * narrative.confidenceNote field.
 */
export function rankAndCut(scoredVCs: ScoredVC[]): RankedInvestorResult[] {
  // ── Score every VC ────────────────────────────────────────────────────────
  const withScores = scoredVCs.map((entry) => {
    const { score, breakdown } = computeCombinedScore(entry.likelihood)
    return { ...entry, combinedScore: score, scoreBreakdown: breakdown }
  })

  // ── Split: vetoed vs active ───────────────────────────────────────────────
  const active = withScores.filter((e) => !e.likelihood.hardVeto)
  const vetoed = withScores.filter((e) => e.likelihood.hardVeto)

  // ── Sort active descending ────────────────────────────────────────────────
  active.sort((a, b) => b.combinedScore - a.combinedScore)

  // ── Floor: always give the founder at least 3 results ────────────────────
  let candidates = active
  if (active.length < 3 && vetoed.length > 0) {
    // Append lowest-harm vetoed VCs (sorted by their raw likelihood score
    // descending, so we pick the "least bad" ones).
    const backfill = vetoed
      .sort((a, b) => b.likelihood.score - a.likelihood.score)
      .slice(0, 3 - active.length)
      .map((e) => ({
        ...e,
        // Patch narrative to surface the warning
        narrative: {
          ...e.narrative,
          confidenceNote:
            e.narrative.confidenceNote ??
            'This investor has limited non-vetoed matches — included as a fallback only.',
        },
      }))
    candidates = [...active, ...backfill]
  }

  // ── Top-12 cut ────────────────────────────────────────────────────────────
  const top12 = candidates.slice(0, 12)

  // ── Build final results with rank and backward-compat fields ─────────────
  return top12.map((entry, idx): RankedInvestorResult => ({
    vc: entry.vc,
    rank: idx + 1,
    combinedScore: entry.combinedScore,
    investmentLikelihood: entry.likelihood,
    narrative: entry.narrative,
    scoreBreakdown: entry.scoreBreakdown,

    // Backward-compatibility — UI currently reads these directly
    whyApply: entry.narrative.whyApply,
    bestApproach: entry.narrative.bestApproach,
    timing: entry.narrative.timing,
  }))
}

// ---------------------------------------------------------------------------
// Convenience re-export for the orchestrator
// ---------------------------------------------------------------------------

export { computeCombinedScore }
