/**
 * ===============================================================================
 * ULTRA-SPECIFIC AI MATCH RATIONALE GENERATOR
 * ===============================================================================
 * 
 * Generates HYPER-PERSONALIZED "Why This Match?" bullets by:
 * 1. Deep-analyzing the pitch text (keywords, domain, problem space)
 * 2. Using ALL founder signup data (student status, university, location, traction)
 * 3. Connecting to VC's recent investments, batch trends, portfolio patterns
 * 
 * Example outputs:
 * - "Dorm Room Fund backed 3 AI-native SMB tools in W25 - your expense automation 
 *    fits their recent pattern. As a student founder, you're exactly their target."
 * - "Berkeley SkyDeck just accelerated 2 fintech startups from Cal students last batch.
 *    Your SMB finance tool + Berkeley affiliation = perfect fit."
 * 
 * Uses Gemini 2.5 Flash for deep contextual analysis
 */

import { logger } from './logger'
import { getCurrentYCTrends, RECENT_YC_BATCHES } from './yc-trends'
import { hasOpenRouterKey, openrouterGenerateText } from './openrouter'

export interface MatchRationaleInput {
  // Founder context (COMPREHENSIVE)
  pitchIdea: string
  founderName?: string
  founderAge?: number | null
  founderEducation?: string
  founderStage: string
  founderSectors: string[]
  fundingNeed: number
  isStudent?: boolean
  hasTraction?: boolean
  location?: string
  bio?: string
  
  // VC context (DETAILED)
  vcName: string
  vcFirmName: string
  vcStages: string[]
  vcSectors: string[]
  vcCheckMin: number
  vcCheckMax: number
  vcThesis?: string
  vcPortfolio?: string[] // Recent investments
  vcBatch?: string // e.g., "W25"
  vcSpecialFocus?: string // e.g., "student founders", "Berkeley", "AI-native"
  
  // Match score
  matchScore: number
  matchReasons: string[]
}

/**
 * 🚀 ULTRA-SPECIFIC AI MATCH RATIONALE
 * 
 * Generates the FIRST BULLET that is hyper-personalized and uses:
 * - Deep pitch analysis (keywords, domain, problem)
 * - All founder signup data (student, university, location)
 * - VC's recent investments, batch trends, portfolio patterns
 * 
 * This is the "spot-on" insight that makes the match feel magical
 */
export async function generateMatchRationale(input: MatchRationaleInput): Promise<string> {
  // Fallback if no OpenRouter
  if (!hasOpenRouterKey()) {
    logger.warn('[AI-MATCH-RATIONALE] No OpenRouter key, using fallback')
    return fallbackRationale(input)
  }

  try {
    // 🆕 Extract specific insights from pitch (keywords, domain, problem space)
    const pitchKeywords = extractPitchKeywords(input.pitchIdea, input.founderSectors)
    const pitchDomain = detectPitchDomain(input.pitchIdea, input.founderSectors)
    
    // 🆕 Get current YC/VC trends
    const currentTrends = getCurrentYCTrends()
    
    // 🆕 Build hyper-specific context
    const specificContext = buildSpecificContext(input, pitchKeywords, pitchDomain, currentTrends)
    
    const prompt = `You are an expert VC matching analyst with deep knowledge of recent investments, batch trends, and founder-VC fit patterns.

Generate ONE hyper-specific, insight-driven bullet point explaining why this VC is a great match for this founder.

REQUIREMENTS:
1. BE SPECIFIC: Mention recent investments, batch trends, or portfolio patterns (if provided)
2. CONNECT THE DOTS: Link the founder's exact pitch/background to the VC's focus
3. USE FOUNDER DATA: Reference student status, university, location, or unique background
4. MAKE IT FEEL INSIGHTFUL: Should feel like insider knowledge, not generic matching
5. Keep it 1-2 sentences, conversational, under 80 words

FOUNDER DETAILS:
- Pitch: "${input.pitchIdea.substring(0, 400)}"
- Pitch Domain: ${pitchDomain}
- Key Themes: ${pitchKeywords.join(', ')}
- Stage: ${input.founderStage}
- Sectors: ${input.founderSectors.join(', ')}
- Seeking: $${input.fundingNeed}K
${input.isStudent ? `- STUDENT FOUNDER` : ''}
${input.founderEducation ? `- Education: ${input.founderEducation}` : ''}
${input.location ? `- Location: ${input.location}` : ''}
${input.hasTraction ? `- HAS TRACTION (revenue/users)` : ''}
${input.bio ? `- Background: ${input.bio.substring(0, 150)}` : ''}

VC DETAILS:
- ${input.vcFirmName}
- Focus: ${input.vcSectors.join(', ')} at ${input.vcStages.join('/')} stage
- Check: $${input.vcCheckMin}K-$${input.vcCheckMax}K
${input.vcThesis ? `- Thesis: ${input.vcThesis.substring(0, 250)}` : ''}
${input.vcSpecialFocus ? `- Special Focus: ${input.vcSpecialFocus}` : ''}
${input.vcPortfolio && input.vcPortfolio.length > 0 ? `- Recent Investments: ${input.vcPortfolio.slice(0, 5).join(', ')}` : ''}
${input.vcBatch ? `- Active in Batch: ${input.vcBatch}` : ''}

RECENT TRENDS (${currentTrends.batch}):
- Hot sectors: ${currentTrends.topSectors.slice(0, 5).join(', ')}
- Emerging patterns: ${currentTrends.emergingPatterns.slice(0, 3).join(', ')}

SPECIFIC CONTEXT:
${specificContext}

MATCH SCORE: ${input.matchScore}/100

EXAMPLES OF GREAT RATIONALES:
✅ "Dorm Room Fund just backed 3 AI-native SMB tools in W25 (like Expensify alternatives) - your expense automation fits their recent pattern perfectly. As a student founder, you're exactly their target demographic."

✅ "Berkeley SkyDeck accelerated 2 fintech startups from Cal students last batch. Your SMB finance tool + Berkeley affiliation = perfect fit for their university-focused program."

✅ "DevTools Ventures invested in 5 'workflow automation' tools in 2024 (similar to your receipt tracking concept). Your pre-seed stage + $500K ask aligns with their typical first check."

✅ "1517 Fund specializes in dropout/student founders solving 'unsexy' problems (logistics, finance, ops). Your expense tracking for small businesses + student status = their sweet spot."

NOW GENERATE ONE HYPER-SPECIFIC BULLET (NO GENERIC FLUFF):
`

    const rationale = await openrouterGenerateText(prompt, {
      temperature: 0.8, // Higher temp for more creative connections
      maxTokens: 200,
      model: 'meta-llama/llama-3.3-70b-instruct', // Fast and high-quality model
    })

    // Clean up formatting
    let cleaned = rationale.trim().replace(/^["']|["']$/g, '')
    
    // Remove bullet prefixes if AI added them
    cleaned = cleaned.replace(/^[•\-*✅]\s*/, '')
    
    // Validate output (prevent "undefined" or empty strings)
    if (!cleaned || cleaned.length < 10 || cleaned.toLowerCase() === 'undefined') {
      logger.warn('[AI-MATCH-RATIONALE] Generated rationale was invalid, using fallback')
      return fallbackRationale(input)
    }
    
    return cleaned
  } catch (error: any) {
    logger.error('[AI-MATCH-RATIONALE] Ultra-specific generation failed:', error.message)
    return fallbackRationale(input)
  }
}

/**
 * Extract key themes from pitch text
 */
function extractPitchKeywords(pitch: string, _sectors?: string[]): string[] {
  const keywords: string[] = []
  const lowerPitch = pitch.toLowerCase()
  
  // Domain indicators
  if (lowerPitch.includes('ai') || lowerPitch.includes('automation') || lowerPitch.includes('ml')) {
    keywords.push('AI-native')
  }
  if (lowerPitch.includes('b2b') || lowerPitch.includes('business') || lowerPitch.includes('enterprise')) {
    keywords.push('B2B')
  }
  if (lowerPitch.includes('consumer') || lowerPitch.includes('app') || lowerPitch.includes('social')) {
    keywords.push('Consumer')
  }
  if (lowerPitch.includes('saas') || lowerPitch.includes('software')) {
    keywords.push('SaaS')
  }
  if (lowerPitch.includes('marketplace') || lowerPitch.includes('platform')) {
    keywords.push('Marketplace/Platform')
  }
  if (lowerPitch.includes('fintech') || lowerPitch.includes('payment') || lowerPitch.includes('finance')) {
    keywords.push('Fintech')
  }
  if (lowerPitch.includes('health') || lowerPitch.includes('medical') || lowerPitch.includes('bio')) {
    keywords.push('Healthcare')
  }
  if (lowerPitch.includes('dev') || lowerPitch.includes('developer') || lowerPitch.includes('api')) {
    keywords.push('DevTools')
  }
  if (lowerPitch.includes('small business') || lowerPitch.includes('smb') || lowerPitch.includes('local')) {
    keywords.push('SMB-focused')
  }
  if (lowerPitch.includes('workflow') || lowerPitch.includes('automat') || lowerPitch.includes('tool')) {
    keywords.push('Workflow automation')
  }
  
  return keywords.length > 0 ? keywords : ['General tech']
}

/**
 * Detect primary domain from pitch + sectors
 */
function detectPitchDomain(pitch: string, sectors: string[]): string {
  const lowerPitch = pitch.toLowerCase()
  
  // Check sectors first
  if (sectors.length > 0) {
    const primary = sectors[0]
    if (primary.toLowerCase().includes('ai') || primary.toLowerCase().includes('ml')) {
      return 'AI/ML tools'
    }
    if (primary.toLowerCase().includes('fintech') || primary.toLowerCase().includes('finance')) {
      return 'Fintech/Payments'
    }
    if (primary.toLowerCase().includes('dev') || primary.toLowerCase().includes('infrastructure')) {
      return 'Developer tools'
    }
    if (primary.toLowerCase().includes('health')) {
      return 'Healthcare tech'
    }
    if (primary.toLowerCase().includes('consumer')) {
      return 'Consumer app'
    }
  }
  
  // Fallback to pitch analysis
  if (lowerPitch.includes('expense') || lowerPitch.includes('accounting') || lowerPitch.includes('receipt')) {
    return 'SMB finance/operations'
  }
  if (lowerPitch.includes('developer') || lowerPitch.includes('api') || lowerPitch.includes('infra')) {
    return 'Developer tools/infrastructure'
  }
  if (lowerPitch.includes('ai') || lowerPitch.includes('automation') || lowerPitch.includes('machine learning')) {
    return 'AI-powered automation'
  }
  
  return 'Technology'
}

/**
 * Build specific context for AI to use
 */
function buildSpecificContext(
  input: MatchRationaleInput,
  keywords: string[],
  domain: string,
  trends: ReturnType<typeof getCurrentYCTrends>
): string {
  const context: string[] = []
  
  // Student-specific insights
  if (input.isStudent) {
    if (input.vcFirmName.match(/Dorm Room|Student|Neo|1517/i)) {
      context.push(`✓ ${input.vcFirmName} SPECIALIZES in student founders - this is their core focus`)
    }
    if (input.founderEducation?.match(/Berkeley|Stanford|MIT|Harvard|Waterloo/i)) {
      const uni = input.founderEducation.match(/(Berkeley|Stanford|MIT|Harvard|Waterloo)/i)?.[0]
      if (input.vcFirmName.toLowerCase().includes(uni?.toLowerCase() || '')) {
        context.push(`✓ ${input.vcFirmName} has strong ${uni} ties - university match`)
      }
      if (input.vcFirmName.match(/SkyDeck/i) && uni === 'Berkeley') {
        context.push(`✓ Berkeley SkyDeck = perfect match for Cal students`)
      }
    }
  }
  
  // Trend alignment
  const hotSectorMatch = trends.topSectors.find(s => 
    keywords.some(k => k.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(k.toLowerCase()))
  )
  if (hotSectorMatch) {
    context.push(`✓ ${hotSectorMatch} is hot in ${trends.batch} - strong timing`)
  }
  
  // Stage alignment
  if (input.founderStage === 'pre-seed' && input.vcStages.includes('Pre-Seed')) {
    context.push(`✓ Both at pre-seed stage - perfect timing`)
  }
  
  // Check size fit
  if (input.fundingNeed >= input.vcCheckMin && input.fundingNeed <= input.vcCheckMax) {
    context.push(`✓ $${input.fundingNeed}K fits their ${input.vcCheckMin}-${input.vcCheckMax}K check range`)
  }
  
  // Sector-specific insights
  if (domain.includes('AI') || keywords.includes('AI-native')) {
    const aiTrend = trends.emergingPatterns.find(p => p.toLowerCase().includes('ai'))
    if (aiTrend) {
      context.push(`✓ AI-native products are trending - "${aiTrend}" pattern`)
    }
  }
  
  if (domain.includes('SMB') || keywords.includes('SMB-focused')) {
    context.push(`✓ SMB tooling is evergreen - VCs love "boring" but profitable solutions`)
  }
  
  return context.length > 0 ? context.join('\n') : 'Standard VC match based on stage/sector fit'
}

/**
 * Fallback rationale (template-based) when AI is unavailable
 * Now with more specific, contextual logic
 */
function fallbackRationale(input: MatchRationaleInput): string {
  const parts: string[] = []
  
  // 1. Special focus matches (most specific)
  if (input.isStudent) {
    if (input.vcFirmName.match(/Dorm Room|Student/i)) {
      parts.push(`${input.vcFirmName} specializes in student founders at the ${input.founderStage} stage - you're their core demographic.`)
      return parts.join(' ')
    }
    if (input.vcFirmName.match(/1517/i)) {
      parts.push(`${input.vcFirmName} backs student founders and dropouts building unsexy but profitable businesses. Your ${input.founderSectors[0] || 'tech'} focus fits their thesis.`)
      return parts.join(' ')
    }
    if (input.vcFirmName.match(/Neo/i)) {
      parts.push(`${input.vcFirmName} runs a fellowship for exceptional student founders. Your technical background + ${input.founderStage} stage = strong fit.`)
      return parts.join(' ')
    }
    if (input.vcFirmName.match(/SkyDeck/i) && input.founderEducation?.includes('Berkeley')) {
      parts.push(`${input.vcFirmName} is Berkeley's official accelerator - perfect match for Cal students building ${input.founderSectors[0] || 'tech'} products.`)
      return parts.join(' ')
    }
  }
  
  // 2. Stage + sector alignment
  const stageMatch = input.vcStages.some(s => s.toLowerCase().includes(input.founderStage.toLowerCase()))
  const sectorOverlap = input.vcSectors.filter(vs => 
    input.founderSectors.some(fs => vs.toLowerCase().includes(fs.toLowerCase()) || fs.toLowerCase().includes(vs.toLowerCase()))
  )
  
  if (stageMatch && sectorOverlap.length > 0) {
    parts.push(`${input.vcFirmName} invests in ${input.founderStage} stage ${sectorOverlap[0]} startups.`)
  } else if (stageMatch) {
    parts.push(`${input.vcFirmName} focuses on ${input.founderStage} stage companies in your space.`)
  } else {
    parts.push(`${input.vcFirmName} invests in ${input.vcSectors[0] || 'technology'} startups.`)
  }
  
  // 3. Check size fit
  if (input.fundingNeed >= input.vcCheckMin && input.fundingNeed <= input.vcCheckMax) {
    parts.push(`Your $${input.fundingNeed}K need fits their $${input.vcCheckMin}K-${input.vcCheckMax}K check range.`)
  } else if (input.fundingNeed < input.vcCheckMin) {
    parts.push(`Consider raising more - they typically write $${input.vcCheckMin}K+ checks.`)
  } else {
    parts.push(`Note: You're seeking $${input.fundingNeed}K but they cap at $${input.vcCheckMax}K.`)
  }
  
  // 4. Add traction note if applicable
  if (input.hasTraction) {
    parts.push(`Your traction strengthens this match.`)
  }
  
  return parts.join(' ')
}

/**
 * Generate rationale for multiple matches in batch (more efficient)
 */
export async function generateBatchMatchRationale(
  inputs: MatchRationaleInput[]
): Promise<string[]> {
  if (!hasOpenRouterKey()) {
    logger.warn('[AI-MATCH-RATIONALE] No OpenRouter key, using fallback for all matches')
    return inputs.map(input => fallbackRationale(input))
  }
  
  logger.log(`[AI-MATCH-RATIONALE] Generating ${inputs.length} rationales in parallel...`)
  
  // Process in parallel (Gemini is fast enough)
  const promises = inputs.map(async (input, index) => {
    try {
      const rationale = await generateMatchRationale(input)
      
      // Extra validation
      if (!rationale || rationale === 'undefined' || rationale.length < 10) {
        logger.warn(`[AI-MATCH-RATIONALE] Match ${index + 1} returned invalid rationale, using fallback`)
        return fallbackRationale(input)
      }
      
      return rationale
    } catch (error: any) {
      logger.error(`[AI-MATCH-RATIONALE] Match ${index + 1} failed:`, error.message)
      return fallbackRationale(input)
    }
  })
  
  const results = await Promise.all(promises)
  logger.log(`[AI-MATCH-RATIONALE] Successfully generated ${results.length} rationales`)
  
  return results
}
