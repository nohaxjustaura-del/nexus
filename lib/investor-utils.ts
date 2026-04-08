/**
 * Investor data normalization and formatting utilities
 * Ensures consistent, clean display across the platform
 */

import { parseJSON } from './utils'

// ============================================================================
// NORMALIZATION UTILITIES
// ============================================================================

/**
 * Format currency range cleanly
 * $2000K → $2M, range: $2–20M
 */
export function formatCheckSize(min: number, max: number): string {
  const formatAmount = (amount: number): string => {
    if (amount >= 1000) {
      return `$${Math.round(amount / 1000)}M`
    }
    return `$${amount}k`
  }

  if (!min && !max) return ''
  if (!max) return `${formatAmount(min)}+`
  if (!min) return `up to ${formatAmount(max)}`
  
  return `${formatAmount(min)}–${formatAmount(max)}`
}

/**
 * Normalize stage names to consistent format
 */
export function normalizeStage(stage: string): string {
  const stageMap: Record<string, string> = {
    'preseed': 'Pre-seed',
    'pre-seed': 'Pre-seed',
    'pre_seed': 'Pre-seed',
    'seed': 'Seed',
    'seriesa': 'Series A',
    'series_a': 'Series A',
    'series-a': 'Series A',
    'seriesb': 'Series B',
    'series_b': 'Series B',
    'series-b': 'Series B',
    'seriesc': 'Series C',
    'series_c': 'Series C',
    'series-c': 'Series C',
    'seriesc+': 'Series C+',
    'series_c+': 'Series C+',
  }

  const normalized = stageMap[stage.toLowerCase().replace(/\s+/g, '')]
  return normalized || stage.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/**
 * Normalize sector names to Title Case, remove underscores
 */
export function normalizeSector(sector: string): string {
  return sector
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Dedupe and clean tags/sectors
 */
export function dedupeAndClean(items: string[]): string[] {
  const seen = new Set<string>()
  const cleaned: string[] = []

  for (const item of items) {
    const normalized = item.toLowerCase().trim()
    if (!seen.has(normalized) && normalized.length > 0) {
      seen.add(normalized)
      cleaned.push(normalizeSector(item))
    }
  }

  return cleaned
}

/**
 * Get intro preference label
 */
export function getIntroPreference(investor: any): string {
  // Check if they have application URL
  if (investor.applicationUrl) return 'Form'
  
  // Check personality or notes for hints
  if (investor.personalityType === 'hands-on' || investor.personalityType === 'mentor') {
    return 'Warm intro preferred'
  }
  
  // Check if email is available
  if (investor.email) return 'Email'
  
  return 'Unknown'
}

/**
 * Get decision speed label
 */
export function getDecisionSpeed(speed: string | null | undefined): string {
  if (!speed) return 'Unknown'
  
  const lower = speed.toLowerCase()
  if (lower.includes('fast') || lower.includes('quick') || lower.includes('1-2 week')) return 'Fast'
  if (lower.includes('slow') || lower.includes('4+ week')) return 'Slow'
  if (lower.includes('typical') || lower.includes('2-3 week')) return 'Typical'
  
  return speed
}

// ============================================================================
// DESCRIPTION GENERATION
// ============================================================================

interface InvestorData {
  firmName: string
  fundType?: string
  stages?: string
  sectors?: string
  checkSizeMin?: number
  checkSizeMax?: number
  geography?: string
  geoFocus?: string
  leadFollow?: string
  valueAddTags?: string
  personalityType?: string
  decisionSpeed?: string
  notableInvestments?: string
  portfolio?: string
  /** Sector/stage-specific requirements from enrichment */
  proofPoints?: string | null
  /** Investment thesis — preferred source for summary when substantive */
  thesis?: string | null
  /** Short bio when thesis is thin */
  bio?: string | null
  /** Human-readable AUM / fund size when stored */
  fundSize?: string | null
}

function resolveCheckRange(inv: InvestorData & { checkMin?: number; checkMax?: number }): {
  min: number | undefined
  max: number | undefined
} {
  const min = inv.checkSizeMin ?? inv.checkMin
  const max = inv.checkSizeMax ?? inv.checkMax
  return { min, max }
}

/** Thesis long enough and not obvious boilerplate — use as summary lead */
function isUsableThesisForSummary(t: string | null | undefined): boolean {
  if (!t || typeof t !== 'string') return false
  const s = t.trim()
  if (s.length < 45) return false
  const lower = s.toLowerCase()
  if (lower.includes('leading investor') && s.length < 120) return false
  if (/^#{1,3}\s|^>\s|^===/.test(s)) return false
  return true
}

/** First ~1–2 sentences or char-bounded excerpt for UI */
function excerptThesisText(thesis: string, maxChars: number): string {
  const s = thesis.trim()
  if (s.length <= maxChars) return s
  const chunks = s.split(/(?<=[.!?])\s+/).filter(Boolean)
  let acc = ''
  for (const c of chunks) {
    const next = acc ? `${acc} ${c}` : c
    if (next.length <= maxChars) acc = next
    else break
  }
  if (acc.length >= 80) return acc.endsWith('.') ? acc : `${acc}.`
  const cut = s.slice(0, maxChars - 1).trim()
  const lastSpace = cut.lastIndexOf(' ')
  if (lastSpace > 60) return `${cut.slice(0, lastSpace)}…`
  return `${cut}…`
}

function formatValueAddSnippets(tags: string[], maxTags: number): string {
  const t = dedupeAndClean(tags)
    .slice(0, maxTags)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
  if (t.length === 0) return ''
  if (t.length === 1) return t[0]!
  return `${t.slice(0, -1).join(', ')} and ${t[t.length - 1]}`
}

/** One readable sentence from proofPoints JSON (arrays or key/value). */
function formatProofPointsForSummary(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return ''
  const parsed = parseJSON<unknown>(raw, null)
  if (parsed == null) return ''
  if (Array.isArray(parsed)) {
    const items = parsed
      .map((x) => (typeof x === 'string' ? x.trim() : String(x)))
      .filter((s) => s.length > 2)
      .slice(0, 4)
    if (items.length === 0) return ''
    return `Looks for ${items.join('; ')}.`
  }
  if (typeof parsed === 'object') {
    const entries = Object.entries(parsed as Record<string, unknown>)
      .map(([k, v]) => {
        if (Array.isArray(v)) {
          const joined = v.map((x) => String(x)).filter(Boolean).join(', ')
          return joined ? `${k}: ${joined}` : ''
        }
        if (v != null && String(v).trim()) return `${k}: ${String(v).trim()}`
        return ''
      })
      .filter(Boolean)
      .slice(0, 4)
    if (entries.length === 0) return ''
    return `Looks for ${entries.join('; ')}.`
  }
  return ''
}

/**
 * Truncate a summary for discover card previews (single line clamp friendly).
 */
export function truncateInvestorSummaryForCard(summary: string, maxChars: number): string {
  const s = summary.trim()
  if (s.length <= maxChars) return s
  const cut = s.slice(0, maxChars - 1)
  const last = cut.lastIndexOf(' ')
  if (last > maxChars * 0.55) return `${cut.slice(0, last)}…`
  return `${cut}…`
}

/**
 * Generate high-signal summary (2–4 sentences).
 * Prefers thesis, then bio; otherwise structured identity + checks + geo + value-add + portfolio.
 */
export function generateInvestorSummary(investor: InvestorData): string {
  const stages = parseJSON<string[]>(investor.stages, [])
  const sectors = parseJSON<string[]>(investor.sectors, [])
  const geo = parseJSON<string[]>(investor.geography || investor.geoFocus, [])
  const valueAdd = parseJSON<string[]>(investor.valueAddTags, [])
  const notableInvestments = parseJSON<string[]>(investor.notableInvestments, [])
  const portfolio = parseJSON<any[]>(investor.portfolio, [])
  const { min: checkMin, max: checkMax } = resolveCheckRange(investor)

  const thesis = investor.thesis?.trim()
  if (isUsableThesisForSummary(thesis)) {
    const core = excerptThesisText(thesis!, 520)
    const facts: string[] = []
    if (checkMin && checkMax) {
      facts.push(`${formatCheckSize(checkMin, checkMax)} checks`)
    }
    if (investor.fundSize?.trim()) {
      facts.push(`fund size ${investor.fundSize.trim()}`)
    }
    if (geo.length > 0) {
      facts.push(geo.slice(0, 2).join(' & '))
    }
    if (investor.leadFollow === 'lead') facts.push('often leads')
    else if (investor.leadFollow === 'follow') facts.push('often follows')
    if (investor.decisionSpeed?.trim() && investor.decisionSpeed.length < 100) {
      facts.push(`decisions: ${investor.decisionSpeed.trim()}`)
    }
    const tail = facts.length ? ` (${facts.join(' · ')})` : ''
    const merged = `${core}${tail}`
    return merged.endsWith('.') || merged.endsWith(')') ? merged : `${merged}.`
  }

  // Short thesis still beats pure template — pair excerpt with hard facts
  if (thesis && thesis.length >= 22 && !isUsableThesisForSummary(thesis)) {
    const core = excerptThesisText(thesis, 280)
    const facts: string[] = []
    if (checkMin && checkMax) facts.push(`${formatCheckSize(checkMin, checkMax)} checks`)
    if (investor.fundSize?.trim()) facts.push(`fund size ${investor.fundSize.trim()}`)
    if (geo.length > 0) facts.push(geo.slice(0, 2).join(' & '))
    if (investor.leadFollow === 'lead') facts.push('often leads')
    else if (investor.leadFollow === 'follow') facts.push('often follows')
    const proofLine = formatProofPointsForSummary(investor.proofPoints ?? undefined)
    const parts = [core]
    if (proofLine) parts.push(proofLine)
    const tail = facts.length ? ` (${facts.join(' · ')})` : ''
    const merged = `${parts.join(' ')}${tail}`
    return merged.endsWith('.') || merged.endsWith(')') ? merged : `${merged}.`
  }

  const bio = investor.bio?.trim()
  if (bio && bio.length >= 55 && bio.length < 900) {
    const bioExcerpt = bio.length > 320 ? `${bio.slice(0, 317).trim()}…` : bio
    const bits: string[] = []
    if (checkMin && checkMax) bits.push(`${formatCheckSize(checkMin, checkMax)} checks`)
    if (sectors.length > 0) bits.push(dedupeAndClean(sectors).slice(0, 2).join(' & '))
    const tail = bits.length ? ` ${bits.join(' · ')}.` : ''
    return `${bioExcerpt}${tail}`.trim()
  }

  const sentences: string[] = []

  let identity = `${investor.firmName} is `

  if (investor.fundType === 'CVC' || investor.fundType === 'corporate') {
    identity += 'a corporate venture arm'
  } else if (investor.fundType === 'accelerator') {
    identity += 'an accelerator program'
  } else if (investor.fundType === 'micro-VC') {
    identity += 'a micro-VC fund'
  } else {
    identity += 'a venture capital firm'
  }

  if (sectors.length > 0) {
    const cleanSectors = dedupeAndClean(sectors).slice(0, 2)
    identity += ` focused on ${cleanSectors.join(' and ')}`
  }

  if (stages.length > 0) {
    const cleanStages = stages.map(normalizeStage).slice(0, 3)
    if (cleanStages.length === 1) {
      identity += ` at ${cleanStages[0]}`
    } else {
      identity += ` from ${cleanStages[0]} through ${cleanStages[cleanStages.length - 1]}`
    }
  }

  if (investor.fundSize?.trim()) {
    identity += ` (${investor.fundSize.trim()})`
  }

  sentences.push(identity + '.')

  const behaviors: string[] = []

  if (checkMin && checkMax) {
    behaviors.push(`writes ${formatCheckSize(checkMin, checkMax)} checks`)
  }

  if (geo.length > 0) {
    behaviors.push(`geography: ${geo.slice(0, 3).join(', ')}`)
  }

  if (investor.leadFollow === 'lead') {
    behaviors.push('typically leads rounds')
  } else if (investor.leadFollow === 'follow') {
    behaviors.push('typically follows')
  }

  if (investor.decisionSpeed?.trim()) {
    behaviors.push(`decision cadence: ${investor.decisionSpeed.trim()}`)
  }

  if (behaviors.length > 0) {
    sentences.push(behaviors.slice(0, 4).join('; ') + '.')
  }

  if (investor.fundType === 'CVC' || investor.fundType === 'corporate') {
    sentences.push('Strong fit when strategic partnership or distribution materially accelerates the business.')
  } else if (investor.personalityType === 'hands-on') {
    sentences.push('Known for hands-on operational support.')
  } else if (investor.personalityType === 'mentor') {
    sentences.push('Known for deep mentorship with first-time founders.')
  }

  const proofSentence = formatProofPointsForSummary(investor.proofPoints ?? undefined)
  if (proofSentence) {
    sentences.push(proofSentence)
  }

  const vaPhrase = formatValueAddSnippets(valueAdd, 2)
  if (vaPhrase) {
    sentences.push(`Emphasizes ${vaPhrase}.`)
  } else if (notableInvestments.length > 0) {
    const names = notableInvestments.slice(0, 3).join(', ')
    sentences.push(`Notable portfolio names include ${names}.`)
  } else if (portfolio.length > 0 && portfolio[0]) {
    const companyName =
      typeof portfolio[0] === 'string' ? portfolio[0] : portfolio[0].name || portfolio[0].company
    if (companyName) {
      sentences.push(`Backed companies such as ${companyName}.`)
    }
  }

  return sentences.join(' ')
}

/**
 * Generate "Best fit if..." bullets
 */
export function generateFitBullets(investor: InvestorData): string[] {
  const bullets: string[] = []
  const stages = parseJSON<string[]>(investor.stages, [])
  const sectors = parseJSON<string[]>(investor.sectors, [])
  const geo = parseJSON<string[]>(investor.geography || investor.geoFocus, [])

  // Stage-based fit
  if (stages.length > 0) {
    const stageStr = stages.map(normalizeStage).slice(0, 2).join(' or ')
    if (sectors.length > 0) {
      bullets.push(`You're ${stageStr} in ${dedupeAndClean(sectors).slice(0, 2).join('/')}`)
    } else {
      bullets.push(`You're at ${stageStr} stage`)
    }
  }

  // Corporate VC specific
  if (investor.fundType === 'CVC' || investor.fundType === 'corporate') {
    bullets.push('Strategic partnership or distribution can materially accelerate growth')
    bullets.push('You can articulate clear business alignment and value exchange')
  } else {
    // Check size implies traction
    if (investor.checkSizeMin && investor.checkSizeMin >= 500) {
      bullets.push('You have measurable traction and revenue')
    } else if (investor.checkSizeMin && investor.checkSizeMin < 500) {
      bullets.push('You have early product-market fit signals')
    }

    // Geo fit
    if (geo.length > 0) {
      bullets.push(`${geo[0]}-focused go-to-market`)
    }
  }

  return bullets.slice(0, 3)
}

/**
 * Generate "They usually avoid..." bullets
 */
export function generateAvoidBullets(investor: InvestorData): string[] {
  const bullets: string[] = []
  const stages = parseJSON<string[]>(investor.stages, [])

  // Stage-based avoids
  const hasPreseed = stages.some(s => s.toLowerCase().includes('preseed') || s.toLowerCase().includes('pre-seed'))
  const hasSeed = stages.some(s => s.toLowerCase().includes('seed') && !s.toLowerCase().includes('pre'))
  const hasSeriesA = stages.some(s => s.toLowerCase().includes('series'))

  if (hasSeriesA && !hasSeed) {
    bullets.push('Pre-product or idea stage')
    bullets.push('Companies without proven revenue model')
  } else if (hasSeed && !hasPreseed) {
    bullets.push('Idea stage without product')
  }

  // Corporate VC specific
  if (investor.fundType === 'CVC' || investor.fundType === 'corporate') {
    bullets.push('Companies without clear strategic alignment')
  }

  // Check size implies expectations
  if (investor.checkSizeMin && investor.checkSizeMin >= 1000) {
    bullets.push('Early-stage companies without significant traction')
  }

  return bullets.slice(0, 2)
}

/**
 * Check if description is too generic (blandness detection)
 */
export function isBlandDescription(text: string): boolean {
  const blandPhrases = [
    'focused on',
    'invests in',
    'additional interest',
    'leading investor',
    'venture capital firm',
    'early-stage companies',
  ]

  const lowerText = text.toLowerCase()
  const blandCount = blandPhrases.filter(phrase => lowerText.includes(phrase)).length

  // If more than 2 bland phrases, it's too generic
  if (blandCount > 2) return true

  // If less than 50 words and no specific details, it's bland
  const wordCount = text.split(/\s+/).length
  const hasSpecifics = /\$\d+[kKmM]|\d+%|Series [ABC]|pre-seed|seed/i.test(text)
  
  if (wordCount < 50 && !hasSpecifics) return true

  return false
}

/**
 * Calculate similarity between two descriptions (simple)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/))
  const words2 = new Set(text2.toLowerCase().split(/\s+/))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}

