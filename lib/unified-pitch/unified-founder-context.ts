import type { ComprehensiveFounderContext } from '@/lib/founder-context'
import type { VideoPitchFeatures } from '@/lib/ai'
import type { StructuredQaAnswers } from './structured-qa'
import { flattenStructuredQaForValidation } from './structured-qa'

type DeckFeatures = {
  strengths?: string[]
  sectorFit?: Record<string, number>
}

/**
 * Overlay pitch-derived profile fields: video transcript > deck > Q&A > DB.
 */
export function buildUnifiedFounderContext(
  base: ComprehensiveFounderContext,
  opts: {
    videoTranscript: string | null
    videoAnalysis: VideoPitchFeatures | null
    deckFeatures: DeckFeatures | null
    qaAnswers: StructuredQaAnswers
  },
): ComprehensiveFounderContext {
  const { videoTranscript, videoAnalysis, deckFeatures, qaAnswers } = opts
  let startupName = base.startupName
  let bio = base.bio
  let sectors = [...(base.sectors || [])]
  let stage = base.stage

  const qaFlat = flattenStructuredQaForValidation(qaAnswers)

  if (videoTranscript && videoTranscript.trim().length >= 20) {
    const t = videoTranscript.trim()
    const namePatterns = [
      /(?:CEO|CTO|founder|co-?founder)\s+(?:of|at)\s+([A-Z][A-Za-z0-9]+)/i,
      /(?:we(?:'re| are)\s+(?:building|creating|launching))\s+([A-Z][A-Za-z0-9]+)/i,
      /([A-Z][A-Za-z0-9]+)\s+is\s+(?:the|a|an)\s+(?:platform|app|tool|product|company|startup|service|solution)/i,
    ]
    for (const pat of namePatterns) {
      const m = t.match(pat)
      if (m && m[1] && m[1].length > 1 && m[1].toLowerCase() !== 'the') {
        startupName = m[1]
        break
      }
    }
    bio = t.slice(0, 500)
    const tl = t.toLowerCase()
    if (tl.includes('revenue') || tl.includes('paying customer') || tl.includes('mrr')) stage = 'revenue'
    else if (tl.includes('signed') || tl.includes('pilot') || tl.includes('beta')) stage = 'pre-seed'
    else if (tl.includes('prototype') || tl.includes('mvp')) stage = 'pre-seed'
    const vsf = videoAnalysis?.sectorFit
    if (vsf && Object.keys(vsf).length) {
      const top = Object.keys(vsf).filter((k) => vsf[k] > 40)
      if (top.length) sectors = top
    }
  } else if (deckFeatures?.sectorFit && Object.keys(deckFeatures.sectorFit).length > 0) {
    const sf = deckFeatures.sectorFit
    const top = Object.keys(sf).filter((k) => sf[k] > 35)
    if (top.length) sectors = top
    if (deckFeatures.strengths?.[0]) bio = deckFeatures.strengths.slice(0, 3).join(' — ').slice(0, 500)
  } else if (qaFlat.length >= 20) {
    bio = qaFlat.slice(0, 500)
  }

  return {
    ...base,
    startupName,
    bio,
    sectors,
    stage,
  }
}
