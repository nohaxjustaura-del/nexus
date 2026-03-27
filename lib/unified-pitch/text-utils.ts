const SENTENCE_END = /[.!?]\s+/g

export function normalizePitchText(raw: string): string {
  if (!raw) return ''
  let s = raw.replace(/\r\n/g, '\n')
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
  s = s.replace(/[ \t]+/g, ' ')
  s = s.replace(/\n{3,}/g, '\n\n')
  return s.trim()
}

export function truncateIntelligent(text: string, maxLen: number): string {
  const t = text.trim()
  if (t.length <= maxLen) return t
  const slice = t.slice(0, maxLen)
  const lastPara = slice.lastIndexOf('\n\n')
  if (lastPara > maxLen * 0.5) return slice.slice(0, lastPara).trim()

  let best = -1
  let m: RegExpExecArray | null
  const re = new RegExp(SENTENCE_END.source, 'g')
  while ((m = re.exec(slice)) !== null) {
    if (m.index + m[0].length <= maxLen) best = m.index + m[0].length
  }
  if (best > maxLen * 0.45) return slice.slice(0, best).trim()

  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace > maxLen * 0.6) return slice.slice(0, lastSpace).trim()
  return slice.trim()
}

export type SectionKey = 'qa' | 'deck' | 'video'

/**
 * Per-section 5k, total 15k. Headers: STRUCTURED Q&A:, PITCH DECK:, VIDEO TRANSCRIPT:
 */
export function capSectionsForCombinedPitch(sections: Record<SectionKey, string>): {
  qa: string
  deck: string
  video: string
  combined: string
} {
  const PER = 5000
  const TOTAL = 15000

  let qa = sections.qa ? truncateIntelligent(normalizePitchText(sections.qa), PER) : ''
  let deck = sections.deck ? truncateIntelligent(normalizePitchText(sections.deck), PER) : ''
  let video = sections.video ? truncateIntelligent(normalizePitchText(sections.video), PER) : ''

  const build = () => {
    const parts: string[] = []
    if (qa) {
      parts.push('STRUCTURED Q&A:')
      parts.push(qa)
    }
    if (deck) {
      if (parts.length) parts.push('')
      parts.push('PITCH DECK:')
      parts.push(deck)
    }
    if (video) {
      if (parts.length) parts.push('')
      parts.push('VIDEO TRANSCRIPT:')
      parts.push(video)
    }
    return parts.join('\n')
  }

  let combined = build()
  let guard = 0
  while (combined.length > TOTAL && guard++ < 80) {
    const lengths = (
      [
        { key: 'qa' as const, len: qa.length },
        { key: 'deck' as const, len: deck.length },
        { key: 'video' as const, len: video.length },
      ] as const
    )
      .map((x) => ({ key: x.key, len: x.len }))
      .filter((x): x is { key: SectionKey; len: number } => x.len > 0)
    if (lengths.length === 0) break
    lengths.sort((a, b) => b.len - a.len)
    const victim = lengths[0].key
    const over = combined.length - TOTAL
    const target = Math.max(80, lengths[0].len - over - 2)
    const prevLen = victim === 'qa' ? qa.length : victim === 'deck' ? deck.length : video.length
    if (victim === 'qa') qa = truncateIntelligent(qa, target)
    else if (victim === 'deck') deck = truncateIntelligent(deck, target)
    else video = truncateIntelligent(video, target)
    const newLen = victim === 'qa' ? qa.length : victim === 'deck' ? deck.length : video.length
    if (newLen >= prevLen) {
      if (victim === 'qa') qa = qa.slice(0, Math.max(0, Math.floor(qa.length * 0.85)))
      else if (victim === 'deck') deck = deck.slice(0, Math.max(0, Math.floor(deck.length * 0.85)))
      else video = video.slice(0, Math.max(0, Math.floor(video.length * 0.85)))
    }
    combined = build()
  }

  return { qa, deck, video, combined }
}
