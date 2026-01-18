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
}

/**
 * Generate unique, high-signal summary (2-3 sentences)
 * Structure: Identity + Behavior + Unique Value
 */
export function generateInvestorSummary(investor: InvestorData): string {
  const stages = parseJSON<string[]>(investor.stages, [])
  const sectors = parseJSON<string[]>(investor.sectors, [])
  const geo = parseJSON<string[]>(investor.geography || investor.geoFocus, [])
  const valueAdd = parseJSON<string[]>(investor.valueAddTags, [])
  const notableInvestments = parseJSON<string[]>(investor.notableInvestments, [])
  const portfolio = parseJSON<any[]>(investor.portfolio, [])

  const sentences: string[] = []

  // SENTENCE 1: Identity + wedge
  let identity = `${investor.firmName} is `
  
  // Type
  if (investor.fundType === 'CVC' || investor.fundType === 'corporate') {
    identity += 'a corporate venture arm'
  } else if (investor.fundType === 'accelerator') {
    identity += 'an accelerator program'
  } else if (investor.fundType === 'micro-VC') {
    identity += 'a micro-VC fund'
  } else {
    identity += 'a venture capital firm'
  }

  // Sector wedge (max 2)
  if (sectors.length > 0) {
    const cleanSectors = dedupeAndClean(sectors).slice(0, 2)
    identity += ` investing in ${cleanSectors.join(' and ')}`
  }

  // Stage range
  if (stages.length > 0) {
    const cleanStages = stages.map(normalizeStage).slice(0, 3)
    if (cleanStages.length === 1) {
      identity += ` at ${cleanStages[0]}`
    } else {
      identity += ` from ${cleanStages[0]} through ${cleanStages[cleanStages.length - 1]}`
    }
  }

  sentences.push(identity + '.')

  // SENTENCE 2: Behavior (check size + geo + lead)
  const behaviors: string[] = []
  
  if (investor.checkSizeMin && investor.checkSizeMax) {
    behaviors.push(`writes ${formatCheckSize(investor.checkSizeMin, investor.checkSizeMax)} checks`)
  }

  if (geo.length > 0) {
    const geoStr = geo.slice(0, 2).join(' and ')
    behaviors.push(`focuses on ${geoStr}`)
  }

  if (investor.leadFollow === 'lead') {
    behaviors.push('typically leads rounds')
  } else if (investor.leadFollow === 'follow') {
    behaviors.push('typically follows')
  }

  if (behaviors.length > 0) {
    sentences.push('Typically ' + behaviors.join(', ') + '.')
  }

  // SENTENCE 3: Unique value
  if (investor.fundType === 'CVC' || investor.fundType === 'corporate') {
    sentences.push('Best fit when strategic partnership or distribution matters.')
  } else if (investor.personalityType === 'hands-on') {
    sentences.push('Known for hands-on operational support.')
  } else if (investor.personalityType === 'mentor') {
    sentences.push('Offers deep mentorship for first-time founders.')
  } else if (valueAdd.length > 0 && valueAdd[0]) {
    const uniqueValue = valueAdd[0].toLowerCase()
    if (uniqueValue.includes('oss') || uniqueValue.includes('open source')) {
      sentences.push('Strong open-source community connections.')
    } else if (uniqueValue.includes('recruiting')) {
      sentences.push('Helps with early team building and recruiting.')
    } else if (uniqueValue.includes('technical')) {
      sentences.push('Deep technical expertise and network.')
    }
  } else if (notableInvestments.length > 0) {
    sentences.push(`Portfolio includes ${notableInvestments[0]}.`)
  } else if (portfolio.length > 0 && portfolio[0]) {
    const companyName = typeof portfolio[0] === 'string' ? portfolio[0] : portfolio[0].name || portfolio[0].company
    if (companyName) {
      sentences.push(`Backed ${companyName}.`)
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

