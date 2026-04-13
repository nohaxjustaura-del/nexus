/**
 * Normalizes `runMatchingPipeline` ranked rows to the legacy API shape expected by
 * clients and DB persistence (`investor`, `score`, `confidence`, etc.).
 */
export function adaptRankedInvestorForApi(r: Record<string, unknown>): Record<string, unknown> {
  const inv =
    r.investmentLikelihood != null && typeof r.investmentLikelihood === 'object'
      ? (r.investmentLikelihood as { confidence?: string })
      : undefined
  const conf = inv?.confidence
  return {
    ...r,
    investor: r.vc,
    score: r.combinedScore,
    intelligentScore: r.combinedScore,
    vectorSimilarity: 0,
    confidence: conf === 'HIGH' ? 0.95 : conf === 'MEDIUM' ? 0.8 : 0.6,
    reasons: [],
    suggestions: [],
    detailedReasons: [],
    livePulse: null,
  }
}
