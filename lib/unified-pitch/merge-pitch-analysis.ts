import type { PitchAnalysisResult } from '@/lib/matching/matching-orchestrator'
import type { VideoPitchFeatures } from '@/lib/ai'
import type { StructuredQaAnswers } from './structured-qa'

type DeckFeatures = {
  strengths?: string[]
  sectorFit?: Record<string, number>
  tractionMetrics?: Record<string, unknown>
  marketAnalysis?: Record<string, unknown>
  teamAnalysis?: { strengths?: string[]; gaps?: string[] }
  productFit?: { pmfSignals?: string[]; differentiators?: string[] }
}

function qaToPartial(answers: StructuredQaAnswers): Partial<PitchAnalysisResult> {
  const tractionMetrics: PitchAnalysisResult['tractionMetrics'] = {}
  if (answers.traction) {
    const t = answers.traction.toLowerCase()
    const revenueMatch = t.match(/\$[\d,]+[KMB]?/i)
    if (revenueMatch) tractionMetrics.revenue = revenueMatch[0]
    const userMatch = t.match(/([\d,]+)\s*(users?|customers?|clients?)/i)
    if (userMatch) tractionMetrics.users = userMatch[1]
    const growthMatch = t.match(/(\d+%?\s*(?:month|MoM|week|WoW|growth))/i)
    if (growthMatch) tractionMetrics.growth = growthMatch[1]
  }

  return {
    problemStatement: answers.problem,
    targetCustomer: answers.targetCustomer,
    solutionDescription: answers.solution,
    businessModel: answers.businessModel,
    oneLineSummary:
      answers.solution?.slice(0, 280) || answers.problem?.slice(0, 280) || undefined,
    productFit: answers.defensibility
      ? { differentiators: [answers.defensibility] }
      : undefined,
    tractionMetrics: Object.keys(tractionMetrics).length > 0 ? tractionMetrics : undefined,
  }
}

/** strengths: union. problemStatement / oneLineSummary: video > deck > QA. sectorFit: max per key. */
export function mergePitchAnalysesForMatching(params: {
  videoAnalysis: VideoPitchFeatures | null
  deckFeatures: DeckFeatures | null
  qaAnswers: StructuredQaAnswers
  videoTranscript: string | null
}): PitchAnalysisResult {
  const { videoAnalysis, deckFeatures, qaAnswers, videoTranscript } = params
  const qaPart = qaToPartial(qaAnswers)

  let problemStatement: string | undefined
  if (videoTranscript && videoTranscript.trim().length >= 20) {
    problemStatement = videoTranscript.trim().slice(0, 650)
  } else if (deckFeatures?.strengths?.[0]) {
    problemStatement = deckFeatures.strengths[0]
  } else {
    problemStatement = qaPart.problemStatement
  }

  let oneLineSummary: string | undefined
  if (videoAnalysis?.strengths?.[0]) oneLineSummary = videoAnalysis.strengths[0]
  else if (deckFeatures?.strengths?.[0]) oneLineSummary = deckFeatures.strengths[0]
  else oneLineSummary = qaPart.oneLineSummary

  const tractionFromVideo = videoAnalysis?.tractionMetrics
  const tractionFromDeck = deckFeatures?.tractionMetrics
  const tractionMetrics: PitchAnalysisResult['tractionMetrics'] = {
    ...(tractionFromDeck as PitchAnalysisResult['tractionMetrics']),
    ...tractionFromVideo,
  }

  let solutionDescription = qaPart.solutionDescription
  if (!solutionDescription && videoAnalysis?.productFit?.differentiators?.[0]) {
    solutionDescription = videoAnalysis.productFit.differentiators[0]
  }
  if (!solutionDescription && deckFeatures?.productFit?.differentiators?.[0]) {
    solutionDescription = deckFeatures.productFit.differentiators[0]
  }

  let businessModel = qaPart.businessModel
  if (!businessModel && videoAnalysis?.strengths?.[1]) businessModel = videoAnalysis.strengths[1]

  const targetCustomer = qaPart.targetCustomer

  const videoDiffs = videoAnalysis?.productFit?.differentiators || []
  const deckDiffs = deckFeatures?.productFit?.differentiators || []
  const qaDiffs = qaPart.productFit?.differentiators || []
  const differentiators = [...new Set([...videoDiffs, ...deckDiffs, ...qaDiffs])]
  const productFit =
    differentiators.length > 0 ? { differentiators } : videoAnalysis?.productFit || deckFeatures?.productFit

  const sectorFitMerged: Record<string, number> = {}
  for (const o of [deckFeatures?.sectorFit, videoAnalysis?.sectorFit]) {
    if (!o || typeof o !== 'object') continue
    for (const [k, v] of Object.entries(o)) {
      const n = Number(v)
      if (!Number.isFinite(n)) continue
      sectorFitMerged[k] = Math.max(sectorFitMerged[k] ?? 0, n)
    }
  }

  // #region agent log
  if (typeof fetch !== 'undefined') {
    void fetch('http://127.0.0.1:7464/ingest/8942f439-d0f1-43ea-9e6d-5d7995eef824', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '368bf4' },
      body: JSON.stringify({
        sessionId: '368bf4',
        hypothesisId: 'H-sectorFit-merge',
        runId: 'pre-verify',
        location: 'merge-pitch-analysis.ts:mergePitchAnalysesForMatching',
        message: 'merged_sector_fit',
        data: {
          keyCount: Object.keys(sectorFitMerged).length,
          topKeys: Object.entries(sectorFitMerged)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([k, v]) => `${k}:${v}`),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }
  // #endregion

  return {
    oneLineSummary,
    problemStatement,
    solutionDescription,
    businessModel,
    targetCustomer,
    sectorFit: Object.keys(sectorFitMerged).length ? sectorFitMerged : undefined,
    tractionMetrics: Object.keys(tractionMetrics || {}).length ? tractionMetrics : undefined,
    productFit,
    uniqueness: qaAnswers.defensibility,
  }
}
