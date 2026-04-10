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
 *
 * When Gemini gates are sparse (confidence LOW) many VCs collapse to the same
 * gate-only combinedScore. Optional `pitchSimilarity01ByVcId` and
 * `retrievalRank01ByVcId` blend pitch↔VC cosine and Step-5 pool order so
 * scores and ordering stay differentiated (see rankAndCut options).
 */

import type {
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

/** Optional retrieval signals when gate scores alone do not separate VCs. */
export interface RankAndCutOptions {
  /** Pitch↔VC cosine in [0, 1] (callers should clamp negatives to 0). */
  pitchSimilarity01ByVcId?: Map<string, number>
  /** 1 = best position in Step 5 candidate pool, 0 = worst (linear by index). */
  retrievalRank01ByVcId?: Map<string, number>
  /**
   * 0–1 overlap of VC sectors/thesis vs founder pitch-derived focus phrases.
   * Pulls obvious thesis fits (e.g. Media funds) above generic gate ties when confidence is LOW.
   */
  sectorOverlap01ByVcId?: Map<string, number>
  /**
   * When founder has little/no traction, thesis text that explicitly backs very
   * early founders (pre-seed, first check, pre-revenue) gets a small score lift.
   */
  preTractionThesis01ByVcId?: Map<string, number>
}

function blendPitchAndRetrievalIntoCombinedScore(
  gateScore: number,
  likelihood: InvestmentLikelihoodResult,
  sim01: number | undefined,
  retrieval01: number | undefined,
  distinctGateScores: number,
  sectorOverlap01: number | undefined,
  preTractionThesis01: number | undefined,
): number {
  if (likelihood.hardVeto) return gateScore

  let vectorWeight =
    likelihood.confidence === 'LOW' ? 0.48 :
    likelihood.confidence === 'MEDIUM' ? 0.22 :
    0.12

  if (likelihood.confidence === 'LOW' && distinctGateScores <= 1 && sim01 !== undefined) {
    vectorWeight = Math.min(0.68, vectorWeight + 0.18)
  }

  const sim =
    sim01 !== undefined && Number.isFinite(sim01) ? Math.max(0, Math.min(1, sim01)) : undefined

  let out = gateScore
  if (sim !== undefined) {
    out = gateScore * (1 - vectorWeight) + sim * 100 * vectorWeight
  }

  if (retrieval01 !== undefined && Number.isFinite(retrieval01)) {
    const r = Math.max(0, Math.min(1, retrieval01))
    out += likelihood.confidence === 'LOW' ? r * 6 : r * 2.5
  }

  if (sectorOverlap01 !== undefined && Number.isFinite(sectorOverlap01)) {
    const so = Math.max(0, Math.min(1, sectorOverlap01))
    out += likelihood.confidence === 'LOW' ? so * 18 : so * 10
  }

  if (preTractionThesis01 !== undefined && Number.isFinite(preTractionThesis01)) {
    const pt = Math.max(0, Math.min(1, preTractionThesis01))
    out += likelihood.confidence === 'LOW' ? pt * 12 : pt * 5
  }

  return Math.min(100, Math.round(out))
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
export function rankAndCut(scoredVCs: ScoredVC[], opts?: RankAndCutOptions): RankedInvestorResult[] {
  // ── Gate-only score, then blend pitch cosine + retrieval rank when provided ─
  const gateRows = scoredVCs.map((entry) => {
    const { score, breakdown } = computeCombinedScore(entry.likelihood)
    return { entry, gateScore: score, breakdown }
  })
  const distinctGateScores = new Set(gateRows.map((r) => r.gateScore)).size

  const withScores = gateRows.map(({ entry, gateScore, breakdown }) => {
    const sim01 = opts?.pitchSimilarity01ByVcId?.get(entry.vc.id)
    const retrieval01 = opts?.retrievalRank01ByVcId?.get(entry.vc.id)
    const sector01 = opts?.sectorOverlap01ByVcId?.get(entry.vc.id)
    const preTr = opts?.preTractionThesis01ByVcId?.get(entry.vc.id)
    const combinedScore = blendPitchAndRetrievalIntoCombinedScore(
      gateScore,
      entry.likelihood,
      sim01,
      retrieval01,
      distinctGateScores,
      sector01,
      preTr,
    )
    return {
      vc: entry.vc,
      likelihood: entry.likelihood,
      narrative: entry.narrative,
      combinedScore,
      scoreBreakdown: { ...breakdown, finalScore: combinedScore },
    }
  })

  // ── Split: vetoed vs active ───────────────────────────────────────────────
  const active = withScores.filter((e) => !e.likelihood.hardVeto)
  const vetoed = withScores.filter((e) => e.likelihood.hardVeto)

  // ── Sort active descending ────────────────────────────────────────────────
  active.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore
    const sa = opts?.pitchSimilarity01ByVcId?.get(a.vc.id) ?? -1
    const sb = opts?.pitchSimilarity01ByVcId?.get(b.vc.id) ?? -1
    if (sb !== sa) return sb - sa
    const oa = opts?.sectorOverlap01ByVcId?.get(a.vc.id) ?? -1
    const ob = opts?.sectorOverlap01ByVcId?.get(b.vc.id) ?? -1
    if (ob !== oa) return ob - oa
    const ra = opts?.retrievalRank01ByVcId?.get(a.vc.id) ?? -1
    const rb = opts?.retrievalRank01ByVcId?.get(b.vc.id) ?? -1
    if (rb !== ra) return rb - ra
    const pta = opts?.preTractionThesis01ByVcId?.get(a.vc.id) ?? -1
    const ptb = opts?.preTractionThesis01ByVcId?.get(b.vc.id) ?? -1
    return ptb - pta
  })

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
