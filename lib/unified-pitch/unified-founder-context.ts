import type { ComprehensiveFounderContext } from '@/lib/founder-context'
import type { VideoPitchFeatures } from '@/lib/ai'
import { inferStudentFromText } from '@/lib/matching/founder-identity-signals'
import type { StructuredQaAnswers } from './structured-qa'
import { flattenStructuredQaForValidation } from './structured-qa'

/** Pull numeric traction from structured Q&A (overrides stale profile when present). */
function parseTractionFromQa(tractionRaw: string | undefined): { revenue?: number; users?: number } {
  if (!tractionRaw?.trim()) return {}
  const t = tractionRaw
  const out: { revenue?: number; users?: number } = {}
  const moneyMatches = t.match(/\$[\d,]+(?:\.\d+)?\s*[kKmM]?/gi)
  if (moneyMatches?.length) {
    const s = moneyMatches[moneyMatches.length - 1]!.trim().toLowerCase()
    const mult = s.includes('k') ? 1000 : s.includes('m') ? 1_000_000 : 1
    const n = parseFloat(s.replace(/[$,kKmM\s]/gi, ''))
    if (Number.isFinite(n) && n > 0) out.revenue = Math.round(n * mult)
  }
  const paying = t.match(/(\d[\d,]*)\s+paying\s+customers?/i)
  if (paying) {
    out.users = parseInt(paying[1]!.replace(/,/g, ''), 10)
    return out
  }
  const signups = t.match(/(\d[\d,]*)\s+signups?/i)
  if (signups) out.users = parseInt(signups[1]!.replace(/,/g, ''), 10)
  return out
}

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

  const fromQa = parseTractionFromQa(qaAnswers.traction)
  const revenue = fromQa.revenue !== undefined ? fromQa.revenue : base.revenue
  const users = fromQa.users !== undefined ? fromQa.users : base.users

  const studentTextBlob = [videoTranscript, qaFlat].filter(Boolean).join('\n\n')
  const isStudent =
    base.isStudent || (studentTextBlob.trim().length > 0 && inferStudentFromText(studentTextBlob))

  return {
    ...base,
    startupName,
    bio,
    sectors,
    stage,
    revenue,
    users,
    isStudent,
  }
}
