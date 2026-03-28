import { db } from '@/lib/db'

export type LoadedFounderAnalysis = {
  id: string
  type: 'unified-pitch' | 'video-pitch' | 'pitch-deck' | 'pitch-idea'
  createdAt: Date
  fileName?: string
  url?: string
  result: Record<string, unknown>
}

function parseResult(json: string | null): Record<string, unknown> | null {
  if (!json) return null
  try {
    const o = JSON.parse(json) as unknown
    return o != null && typeof o === 'object' ? (o as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * Load one analysis row for a founder by primary id (video pitch, pitch deck, or pitch idea).
 */
export async function loadFounderAnalysisById(
  founderId: string,
  analysisId: string,
): Promise<LoadedFounderAnalysis | null> {
  const vp = await db.videoPitch
    .findFirst({
      where: { id: analysisId, founderId, analysisResult: { not: null } },
    })
    .catch(() => null)
  if (vp?.analysisResult) {
    const result = parseResult(vp.analysisResult)
    if (!result) return null
    const isUnified = result.pitchType === 'UNIFIED'
    return {
      id: vp.id,
      type: isUnified ? 'unified-pitch' : 'video-pitch',
      createdAt: vp.createdAt,
      fileName: vp.fileName || undefined,
      result,
    }
  }

  const pd = await db.pitchDeckAnalysis
    .findFirst({
      where: { id: analysisId, founderId, analysisResult: { not: null } },
    })
    .catch(() => null)
  if (pd?.analysisResult) {
    const result = parseResult(pd.analysisResult)
    if (!result) return null
    return {
      id: pd.id,
      type: 'pitch-deck',
      createdAt: pd.createdAt,
      fileName: pd.fileName || undefined,
      url: pd.fileUrl || undefined,
      result,
    }
  }

  const pi = await (db as any).pitchIdeaAnalysis
    .findFirst({
      where: { id: analysisId, founderId, analysisResult: { not: null } },
    })
    .catch(() => null)
  if (pi?.analysisResult) {
    let result = parseResult(pi.analysisResult)
    if (!result) return null
    let smart: unknown[] | null = null
    if (pi.smartMatchResults) {
      try {
        const parsed = JSON.parse(pi.smartMatchResults)
        smart = Array.isArray(parsed) ? parsed : null
      } catch {
        smart = null
      }
    }
    if (smart && smart.length > 0) {
      result = {
        ...result,
        matchedVCs: smart,
        matches: result.matches ?? smart,
      }
    }
    return {
      id: pi.id,
      type: 'pitch-idea',
      createdAt: pi.createdAt,
      fileName:
        typeof pi.ideaText === 'string'
          ? pi.ideaText.substring(0, 80) + (pi.ideaText.length > 80 ? '…' : '')
          : undefined,
      result,
    }
  }

  return null
}
