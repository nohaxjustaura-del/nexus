import { db } from '@/lib/db'

interface AnalysisData {
  strengths?: string[]
  weaknesses?: string[]
  sectorFit?: Record<string, number>
  tractionMetrics?: { revenue?: string | number; users?: string | number; growth?: string; mrr?: string | number; arr?: string | number }
  marketAnalysis?: string | { strengths?: string[]; gaps?: string[] }
  teamAnalysis?: string | { strengths?: string[]; gaps?: string[] }
  productFit?: { differentiators?: string[] }
  redFlags?: string[]
}

interface ScoringResult {
  finalScore?: number
  tier?: string
  conviction?: string
  categoryScores?: {
    market?: number
    team?: number
    traction?: number
    product?: number
    businessModel?: number
    vision?: number
    crossSection?: number
  }
  rubricCompatible?: {
    categories?: {
      market?: { score?: number }
      moat?: { score?: number }
      founderFit?: { score?: number }
      momentum?: { score?: number }
    }
  }
  bullCase?: string
  bearCase?: string
  scoreBreakdown?: Record<string, unknown>
  redFlags?: string[]
}

function toSummaryText(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'string') return val.slice(0, 2000)
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>
    const parts: string[] = []
    if (Array.isArray(obj.strengths)) parts.push(...obj.strengths.map(String))
    if (Array.isArray(obj.gaps)) parts.push(...obj.gaps.map((g: unknown) => `Gap: ${g}`))
    return parts.length > 0 ? parts.join('; ').slice(0, 2000) : null
  }
  return null
}

function buildExecutiveSummary(
  strengths: string[] | undefined,
  marketAnalysis: string | null,
  founderStage: string | undefined,
  fundingNeed: number | undefined,
): string {
  const parts: string[] = []
  if (strengths?.length) parts.push(strengths[0])
  if (marketAnalysis) {
    const firstSentence = marketAnalysis.split(/[.!?]\s/)[0]
    if (firstSentence && firstSentence.length > 10) parts.push(firstSentence + '.')
  }
  if (founderStage && fundingNeed) {
    parts.push(`Seeking $${fundingNeed}K at ${founderStage} stage.`)
  }
  return parts.join(' ').slice(0, 500) || 'Analysis available.'
}

/** Venture key: trimmed founder startup name; empty string = unnamed (single such row per founder). */
export function ventureKeyFromFounderStartupName(name: string | null | undefined): string {
  return (name ?? '').trim()
}

/** Non-empty startup name from multipart `ventureName` field (client sends current saved profile name). */
export function ventureNameOverrideFromFormData(formData: FormData): string | undefined {
  const raw = formData.get('ventureName')
  if (typeof raw !== 'string') return undefined
  const t = raw.trim()
  return t.length > 0 ? t : undefined
}

export type UpsertFounderAnalysisSummaryOptions = {
  /**
   * Startup/company name for this analysis run (usually from the client at submit time).
   * When set, this wins over a second `Founder.startupName` read inside the upsert so
   * renames create a new `(founderId, summaryStartupName)` row instead of collapsing into one bucket.
   */
  ventureNameOverride?: string | null
}

export async function upsertFounderAnalysisSummary(
  founderId: string,
  analysisData: AnalysisData,
  scoringResult: ScoringResult | null,
  analysisType: string,
  sourceAnalysisId: string,
  options?: UpsertFounderAnalysisSummaryOptions,
) {
  const overallScore = scoringResult?.finalScore ?? 0
  const cs = scoringResult?.categoryScores
  const rc = scoringResult?.rubricCompatible?.categories
  const marketText = toSummaryText(analysisData.marketAnalysis)
  const teamText = toSummaryText(analysisData.teamAnalysis)

  let founder: { stage?: string | null; fundingNeed?: number | null; startupName?: string | null } | null = null
  try {
    founder = await db.founder.findUnique({
      where: { id: founderId },
      select: { stage: true, fundingNeed: true, startupName: true },
    })
  } catch {
    /* proceed without */
  }

  const executiveSummary = buildExecutiveSummary(
    analysisData.strengths,
    marketText,
    founder?.stage ?? undefined,
    founder?.fundingNeed ?? undefined,
  )

  const data = {
    overallScore,
    tier: scoringResult?.tier ?? null,
    conviction: scoringResult?.conviction ?? null,
    marketScore: cs?.market ?? null,
    teamScore: cs?.team ?? null,
    tractionScore: cs?.traction ?? null,
    productScore: cs?.product ?? null,
    businessModelScore: cs?.businessModel ?? null,
    visionScore: cs?.vision ?? null,
    crossSectionScore: cs?.crossSection ?? null,
    rubricMarketHeat: rc?.market?.score ?? null,
    rubricMoat: rc?.moat?.score ?? null,
    rubricFounderFit: rc?.founderFit?.score ?? null,
    rubricMomentum: rc?.momentum?.score ?? null,
    strengths: analysisData.strengths ? JSON.stringify(analysisData.strengths.slice(0, 5)) : null,
    weaknesses: analysisData.weaknesses ? JSON.stringify(analysisData.weaknesses.slice(0, 3)) : null,
    marketAnalysis: marketText,
    teamAnalysis: teamText,
    productFit: analysisData.productFit ? JSON.stringify(analysisData.productFit) : null,
    sectorFit: analysisData.sectorFit ? JSON.stringify(analysisData.sectorFit) : null,
    tractionMetrics: analysisData.tractionMetrics ? JSON.stringify(analysisData.tractionMetrics) : null,
    executiveSummary,
    redFlags: (scoringResult?.redFlags || analysisData.redFlags) ? JSON.stringify((scoringResult?.redFlags || analysisData.redFlags)!.slice(0, 5)) : null,
    bullCase: scoringResult?.bullCase?.slice(0, 1000) ?? null,
    bearCase: scoringResult?.bearCase?.slice(0, 1000) ?? null,
    analysisType,
    sourceAnalysisId,
    scoreBreakdown: scoringResult?.scoreBreakdown ? JSON.stringify(scoringResult.scoreBreakdown) : null,
  }

  const overrideTrimmed =
    typeof options?.ventureNameOverride === 'string' ? options.ventureNameOverride.trim() : ''
  const nameForBucket =
    overrideTrimmed.length > 0 ? overrideTrimmed : founder?.startupName ?? null
  const ventureKey = ventureKeyFromFounderStartupName(nameForBucket)

  try {
    const existing = await db.founderAnalysisSummary.findUnique({
      where: {
        founderId_summaryStartupName: {
          founderId,
          summaryStartupName: ventureKey,
        },
      },
      select: { id: true, overallScore: true, analysisCount: true },
    })

    if (!existing) {
      await db.founderAnalysisSummary.create({
        data: {
          founderId,
          summaryStartupName: ventureKey,
          ...data,
        },
      })
      return
    }

    const keepExisting = existing.overallScore > overallScore
    if (keepExisting) {
      await db.founderAnalysisSummary.update({
        where: {
          founderId_summaryStartupName: {
            founderId,
            summaryStartupName: ventureKey,
          },
        },
        data: {
          analysisCount: { increment: 1 },
        },
      })
      return
    }

    await db.founderAnalysisSummary.update({
      where: {
        founderId_summaryStartupName: {
          founderId,
          summaryStartupName: ventureKey,
        },
      },
      data: {
        ...data,
        analysisCount: { increment: 1 },
      },
    })
  } catch (err) {
    console.error('[upsertFounderAnalysisSummary] Failed:', err)
  }
}
