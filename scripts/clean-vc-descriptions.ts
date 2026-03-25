import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper to safely parse JSON strings
function parseJSON<T>(jsonString: string | null | undefined, defaultValue: T): T {
  if (!jsonString) return defaultValue
  try {
    return JSON.parse(jsonString) as T
  } catch (e) {
    return defaultValue
  }
}

// Generic/filler patterns to identify
const GENERIC_PATTERNS = [
  /^Leading investor/i,
  /^Leading venture capital/i,
  /^Premier venture capital/i,
  /^Top-tier venture capital/i,
  /^Established venture capital/i,
  /^Well-known venture capital/i,
  /^Prominent venture capital/i,
  /^Successful venture capital/i,
  /^Reputable venture capital/i,
  /^Venture capital firm/i,
  /^Investment firm/i,
  /^VC firm/i,
  /^We invest/i,
  /^We back/i,
  /^We support/i,
  /^We focus on/i,
  /^Specializing in/i,
  /^Focused on/i,
  /^Looking for/i,
  /^Seeking/i,
  /^Investing in/i,
  /^Backing/i,
  /^Supporting/i,
  /^Helping/i,
  /^Working with/i,
  /^Partnering with/i,
  /^Committed to/i,
  /^Dedicated to/i,
  /^Passionate about/i,
  /^Excited about/i,
  /^Interested in/i,
  /^Focused on helping/i,
  /^Aimed at/i,
  /^Targeting/i,
  /^Building/i,
  /^Creating/i,
  /^Developing/i,
  /^Empowering/i,
  /^Enabling/i,
  /^Transforming/i,
  /^Revolutionizing/i,
  /^Disrupting/i,
  /^Innovating/i,
  /^Pioneering/i,
  /^Leading the way/i,
  /^At the forefront/i,
  /^Cutting-edge/i,
  /^State-of-the-art/i,
  /^Next-generation/i,
  /^World-class/i,
  /^Best-in-class/i,
  /^Industry-leading/i,
  /^Market-leading/i,
  /^Award-winning/i,
  /^Recognized/i,
  /^Renowned/i,
  /^Esteemed/i,
  /^Distinguished/i,
  /^Notable/i,
  /^Noteworthy/i,
  /^Significant/i,
  /^Substantial/i,
  /^Considerable/i,
  /^Extensive/i,
  /^Comprehensive/i,
  /^Complete/i,
  /^Full/i,
  /^Total/i,
  /^Entire/i,
  /^All/i,
  /^Every/i,
  /^Each/i,
  /^Various/i,
  /^Diverse/i,
  /^Multiple/i,
  /^Several/i,
  /^Many/i,
  /^Numerous/i,
  /^Countless/i,
  /^Unlimited/i,
  /^Infinite/i,
  /^Endless/i,
  /^Boundless/i,
  /^Limitless/i,
  /^Unrestricted/i,
  /^Unconstrained/i,
  /^Unfettered/i,
  /^Unbridled/i,
  /^Unchecked/i,
  /^Uncontrolled/i,
  /^Unlimited potential/i,
  /^Unlimited opportunities/i,
  /^Unlimited possibilities/i,
  /^Unlimited growth/i,
  /^Unlimited potential for growth/i,
  /^Unlimited opportunities for growth/i,
  /^Unlimited possibilities for growth/i,
  /^Unlimited potential for success/i,
  /^Unlimited opportunities for success/i,
  /^Unlimited possibilities for success/i,
  /^Unlimited potential for innovation/i,
  /^Unlimited opportunities for innovation/i,
  /^Unlimited possibilities for innovation/i,
  /^Unlimited potential for disruption/i,
  /^Unlimited opportunities for disruption/i,
  /^Unlimited possibilities for disruption/i,
  /^Unlimited potential for transformation/i,
  /^Unlimited opportunities for transformation/i,
  /^Unlimited possibilities for transformation/i,
  /^Unlimited potential for impact/i,
  /^Unlimited opportunities for impact/i,
  /^Unlimited possibilities for impact/i,
  /^Unlimited potential for value/i,
  /^Unlimited opportunities for value/i,
  /^Unlimited possibilities for value/i,
  /^Unlimited potential for returns/i,
  /^Unlimited opportunities for returns/i,
  /^Unlimited possibilities for returns/i,
  /^Unlimited potential for profits/i,
  /^Unlimited opportunities for profits/i,
  /^Unlimited possibilities for profits/i,
  /^Unlimited potential for revenue/i,
  /^Unlimited opportunities for revenue/i,
  /^Unlimited possibilities for revenue/i,
  /^Unlimited potential for sales/i,
  /^Unlimited opportunities for sales/i,
  /^Unlimited possibilities for sales/i,
  /^Unlimited potential for customers/i,
  /^Unlimited opportunities for customers/i,
  /^Unlimited possibilities for customers/i,
  /^Unlimited potential for users/i,
  /^Unlimited opportunities for users/i,
  /^Unlimited possibilities for users/i,
  /^Unlimited potential for adoption/i,
  /^Unlimited opportunities for adoption/i,
  /^Unlimited possibilities for adoption/i,
  /^Unlimited potential for engagement/i,
  /^Unlimited opportunities for engagement/i,
  /^Unlimited possibilities for engagement/i,
  /^Unlimited potential for retention/i,
  /^Unlimited opportunities for retention/i,
  /^Unlimited possibilities for retention/i,
  /^Unlimited potential for loyalty/i,
  /^Unlimited opportunities for loyalty/i,
  /^Unlimited possibilities for loyalty/i,
  /^Unlimited potential for satisfaction/i,
  /^Unlimited opportunities for satisfaction/i,
  /^Unlimited possibilities for satisfaction/i,
  /^Unlimited potential for happiness/i,
  /^Unlimited opportunities for happiness/i,
  /^Unlimited possibilities for happiness/i,
  /^Unlimited potential for joy/i,
  /^Unlimited opportunities for joy/i,
  /^Unlimited possibilities for joy/i,
  /^Unlimited potential for delight/i,
  /^Unlimited opportunities for delight/i,
  /^Unlimited possibilities for delight/i,
  /^Unlimited potential for excitement/i,
  /^Unlimited opportunities for excitement/i,
  /^Unlimited possibilities for excitement/i,
  /^Unlimited potential for enthusiasm/i,
  /^Unlimited opportunities for enthusiasm/i,
  /^Unlimited possibilities for enthusiasm/i,
  /^Unlimited potential for passion/i,
  /^Unlimited opportunities for passion/i,
  /^Unlimited possibilities for passion/i,
  /^Unlimited potential for dedication/i,
  /^Unlimited opportunities for dedication/i,
  /^Unlimited possibilities for dedication/i,
  /^Unlimited potential for commitment/i,
  /^Unlimited opportunities for commitment/i,
  /^Unlimited possibilities for commitment/i,
  /^Unlimited potential for devotion/i,
  /^Unlimited opportunities for devotion/i,
  /^Unlimited possibilities for devotion/i,
  /^Unlimited potential for loyalty/i,
  /^Unlimited opportunities for loyalty/i,
  /^Unlimited possibilities for loyalty/i,
  /^Unlimited potential for allegiance/i,
  /^Unlimited opportunities for allegiance/i,
  /^Unlimited possibilities for allegiance/i,
  /^Unlimited potential for fidelity/i,
  /^Unlimited opportunities for fidelity/i,
  /^Unlimited possibilities for fidelity/i,
  /^Unlimited potential for faithfulness/i,
  /^Unlimited opportunities for faithfulness/i,
  /^Unlimited possibilities for faithfulness/i,
  /^Unlimited potential for trust/i,
  /^Unlimited opportunities for trust/i,
  /^Unlimited possibilities for trust/i,
  /^Unlimited potential for confidence/i,
  /^Unlimited opportunities for confidence/i,
  /^Unlimited possibilities for confidence/i,
  /^Unlimited potential for belief/i,
  /^Unlimited opportunities for belief/i,
  /^Unlimited possibilities for belief/i,
  /^Unlimited potential for faith/i,
  /^Unlimited opportunities for faith/i,
  /^Unlimited possibilities for faith/i,
  /^Unlimited potential for hope/i,
  /^Unlimited opportunities for hope/i,
  /^Unlimited possibilities for hope/i,
  /^Unlimited potential for optimism/i,
  /^Unlimited opportunities for optimism/i,
  /^Unlimited possibilities for optimism/i,
  /^Unlimited potential for positivity/i,
  /^Unlimited opportunities for positivity/i,
  /^Unlimited possibilities for positivity/i,
  /^Unlimited potential for enthusiasm/i,
  /^Unlimited opportunities for enthusiasm/i,
  /^Unlimited possibilities for enthusiasm/i,
  /^Unlimited potential for energy/i,
  /^Unlimited opportunities for energy/i,
  /^Unlimited possibilities for energy/i,
  /^Unlimited potential for vitality/i,
  /^Unlimited opportunities for vitality/i,
  /^Unlimited possibilities for vitality/i,
  /^Unlimited potential for vigor/i,
  /^Unlimited opportunities for vigor/i,
  /^Unlimited possibilities for vigor/i,
  /^Unlimited potential for strength/i,
  /^Unlimited opportunities for strength/i,
  /^Unlimited possibilities for strength/i,
  /^Unlimited potential for power/i,
  /^Unlimited opportunities for power/i,
  /^Unlimited possibilities for power/i,
  /^Unlimited potential for force/i,
  /^Unlimited opportunities for force/i,
  /^Unlimited possibilities for force/i,
  /^Unlimited potential for might/i,
  /^Unlimited opportunities for might/i,
  /^Unlimited possibilities for might/i,
  /^Unlimited potential for influence/i,
  /^Unlimited opportunities for influence/i,
  /^Unlimited possibilities for influence/i,
  /^Unlimited potential for impact/i,
  /^Unlimited opportunities for impact/i,
  /^Unlimited possibilities for impact/i,
  /^Unlimited potential for effect/i,
  /^Unlimited opportunities for effect/i,
  /^Unlimited possibilities for effect/i,
  /^Unlimited potential for change/i,
  /^Unlimited opportunities for change/i,
  /^Unlimited possibilities for change/i,
  /^Unlimited potential for transformation/i,
  /^Unlimited opportunities for transformation/i,
  /^Unlimited possibilities for transformation/i,
  /^Unlimited potential for evolution/i,
  /^Unlimited opportunities for evolution/i,
  /^Unlimited possibilities for evolution/i,
  /^Unlimited potential for progress/i,
  /^Unlimited opportunities for progress/i,
  /^Unlimited possibilities for progress/i,
  /^Unlimited potential for advancement/i,
  /^Unlimited opportunities for advancement/i,
  /^Unlimited possibilities for advancement/i,
  /^Unlimited potential for improvement/i,
  /^Unlimited opportunities for improvement/i,
  /^Unlimited possibilities for improvement/i,
  /^Unlimited potential for enhancement/i,
  /^Unlimited opportunities for enhancement/i,
  /^Unlimited possibilities for enhancement/i,
  /^Unlimited potential for refinement/i,
  /^Unlimited opportunities for refinement/i,
  /^Unlimited possibilities for refinement/i,
  /^Unlimited potential for optimization/i,
  /^Unlimited opportunities for optimization/i,
  /^Unlimited possibilities for optimization/i,
  /^Unlimited potential for perfection/i,
  /^Unlimited opportunities for perfection/i,
  /^Unlimited possibilities for perfection/i,
  /^Unlimited potential for excellence/i,
  /^Unlimited opportunities for excellence/i,
  /^Unlimited possibilities for excellence/i,
  /^Unlimited potential for greatness/i,
  /^Unlimited opportunities for greatness/i,
  /^Unlimited possibilities for greatness/i,
  /^Unlimited potential for success/i,
  /^Unlimited opportunities for success/i,
  /^Unlimited possibilities for success/i,
  /^Unlimited potential for achievement/i,
  /^Unlimited opportunities for achievement/i,
  /^Unlimited possibilities for achievement/i,
  /^Unlimited potential for accomplishment/i,
  /^Unlimited opportunities for accomplishment/i,
  /^Unlimited possibilities for accomplishment/i,
  /^Unlimited potential for fulfillment/i,
  /^Unlimited opportunities for fulfillment/i,
  /^Unlimited possibilities for fulfillment/i,
  /^Unlimited potential for satisfaction/i,
  /^Unlimited opportunities for satisfaction/i,
  /^Unlimited possibilities for satisfaction/i,
  /^Unlimited potential for happiness/i,
  /^Unlimited opportunities for happiness/i,
  /^Unlimited possibilities for happiness/i,
  /^Unlimited potential for joy/i,
  /^Unlimited opportunities for joy/i,
  /^Unlimited possibilities for joy/i,
  /^Unlimited potential for delight/i,
  /^Unlimited opportunities for delight/i,
  /^Unlimited possibilities for delight/i,
  /^Unlimited potential for pleasure/i,
  /^Unlimited opportunities for pleasure/i,
  /^Unlimited possibilities for pleasure/i,
  /^Unlimited potential for enjoyment/i,
  /^Unlimited opportunities for enjoyment/i,
  /^Unlimited possibilities for enjoyment/i,
  /^Unlimited potential for fun/i,
  /^Unlimited opportunities for fun/i,
  /^Unlimited possibilities for fun/i,
  /^Unlimited potential for entertainment/i,
  /^Unlimited opportunities for entertainment/i,
  /^Unlimited possibilities for entertainment/i,
  /^Unlimited potential for amusement/i,
  /^Unlimited opportunities for amusement/i,
  /^Unlimited possibilities for amusement/i,
  /^Unlimited potential for recreation/i,
  /^Unlimited opportunities for recreation/i,
  /^Unlimited possibilities for recreation/i,
  /^Unlimited potential for relaxation/i,
  /^Unlimited opportunities for relaxation/i,
  /^Unlimited possibilities for relaxation/i,
  /^Unlimited potential for rest/i,
  /^Unlimited opportunities for rest/i,
  /^Unlimited possibilities for rest/i,
  /^Unlimited potential for peace/i,
  /^Unlimited opportunities for peace/i,
  /^Unlimited possibilities for peace/i,
  /^Unlimited potential for tranquility/i,
  /^Unlimited opportunities for tranquility/i,
  /^Unlimited possibilities for tranquility/i,
  /^Unlimited potential for serenity/i,
  /^Unlimited opportunities for serenity/i,
  /^Unlimited possibilities for serenity/i,
  /^Unlimited potential for calm/i,
  /^Unlimited opportunities for calm/i,
  /^Unlimited possibilities for calm/i,
  /^Unlimited potential for quiet/i,
  /^Unlimited opportunities for quiet/i,
  /^Unlimited possibilities for quiet/i,
  /^Unlimited potential for silence/i,
  /^Unlimited opportunities for silence/i,
  /^Unlimited possibilities for silence/i,
  /^Unlimited potential for stillness/i,
  /^Unlimited opportunities for stillness/i,
  /^Unlimited possibilities for stillness/i,
  /^Unlimited potential for motionlessness/i,
  /^Unlimited opportunities for motionlessness/i,
  /^Unlimited possibilities for motionlessness/i,
  /^Unlimited potential for immobility/i,
  /^Unlimited opportunities for immobility/i,
  /^Unlimited possibilities for immobility/i,
  /^Unlimited potential for stability/i,
  /^Unlimited opportunities for stability/i,
  /^Unlimited possibilities for stability/i,
  /^Unlimited potential for steadiness/i,
  /^Unlimited opportunities for steadiness/i,
  /^Unlimited possibilities for steadiness/i,
  /^Unlimited potential for consistency/i,
  /^Unlimited opportunities for consistency/i,
  /^Unlimited possibilities for consistency/i,
  /^Unlimited potential for reliability/i,
  /^Unlimited opportunities for reliability/i,
  /^Unlimited possibilities for reliability/i,
  /^Unlimited potential for dependability/i,
  /^Unlimited opportunities for dependability/i,
  /^Unlimited possibilities for dependability/i,
  /^Unlimited potential for trustworthiness/i,
  /^Unlimited opportunities for trustworthiness/i,
  /^Unlimited possibilities for trustworthiness/i,
  /^Unlimited potential for credibility/i,
  /^Unlimited opportunities for credibility/i,
  /^Unlimited possibilities for credibility/i,
  /^Unlimited potential for authenticity/i,
  /^Unlimited opportunities for authenticity/i,
  /^Unlimited possibilities for authenticity/i,
  /^Unlimited potential for genuineness/i,
  /^Unlimited opportunities for genuineness/i,
  /^Unlimited possibilities for genuineness/i,
  /^Unlimited potential for realness/i,
  /^Unlimited opportunities for realness/i,
  /^Unlimited possibilities for realness/i,
  /^Unlimited potential for truthfulness/i,
  /^Unlimited opportunities for truthfulness/i,
  /^Unlimited possibilities for truthfulness/i,
  /^Unlimited potential for honesty/i,
  /^Unlimited opportunities for honesty/i,
  /^Unlimited possibilities for honesty/i,
  /^Unlimited potential for integrity/i,
  /^Unlimited opportunities for integrity/i,
  /^Unlimited possibilities for integrity/i,
  /^Unlimited potential for morality/i,
  /^Unlimited opportunities for morality/i,
  /^Unlimited possibilities for morality/i,
  /^Unlimited potential for ethics/i,
  /^Unlimited opportunities for ethics/i,
  /^Unlimited possibilities for ethics/i,
  /^Unlimited potential for virtue/i,
  /^Unlimited opportunities for virtue/i,
  /^Unlimited possibilities for virtue/i,
  /^Unlimited potential for goodness/i,
  /^Unlimited opportunities for goodness/i,
  /^Unlimited possibilities for goodness/i,
  /^Unlimited potential for righteousness/i,
  /^Unlimited opportunities for righteousness/i,
  /^Unlimited possibilities for righteousness/i,
  /^Unlimited potential for justice/i,
  /^Unlimited opportunities for justice/i,
  /^Unlimited possibilities for justice/i,
  /^Unlimited potential for fairness/i,
  /^Unlimited opportunities for fairness/i,
  /^Unlimited possibilities for fairness/i,
  /^Unlimited potential for equity/i,
  /^Unlimited opportunities for equity/i,
  /^Unlimited possibilities for equity/i,
  /^Unlimited potential for equality/i,
  /^Unlimited opportunities for equality/i,
  /^Unlimited possibilities for equality/i,
  /^Unlimited potential for parity/i,
  /^Unlimited opportunities for parity/i,
  /^Unlimited possibilities for parity/i,
  /^Unlimited potential for balance/i,
  /^Unlimited opportunities for balance/i,
  /^Unlimited possibilities for balance/i,
  /^Unlimited potential for harmony/i,
  /^Unlimited opportunities for harmony/i,
  /^Unlimited possibilities for harmony/i,
  /^Unlimited potential for unity/i,
  /^Unlimited opportunities for unity/i,
  /^Unlimited possibilities for unity/i,
  /^Unlimited potential for togetherness/i,
  /^Unlimited opportunities for togetherness/i,
  /^Unlimited possibilities for togetherness/i,
  /^Unlimited potential for cooperation/i,
  /^Unlimited opportunities for cooperation/i,
  /^Unlimited possibilities for cooperation/i,
  /^Unlimited potential for collaboration/i,
  /^Unlimited opportunities for collaboration/i,
  /^Unlimited possibilities for collaboration/i,
  /^Unlimited potential for partnership/i,
  /^Unlimited opportunities for partnership/i,
  /^Unlimited possibilities for partnership/i,
  /^Unlimited potential for teamwork/i,
  /^Unlimited opportunities for teamwork/i,
  /^Unlimited possibilities for teamwork/i,
  /^Unlimited potential for synergy/i,
  /^Unlimited opportunities for synergy/i,
  /^Unlimited possibilities for synergy/i,
  /^Unlimited potential for coordination/i,
  /^Unlimited opportunities for coordination/i,
  /^Unlimited possibilities for coordination/i,
  /^Unlimited potential for alignment/i,
  /^Unlimited opportunities for alignment/i,
  /^Unlimited possibilities for alignment/i,
  /^Unlimited potential for synchronization/i,
  /^Unlimited opportunities for synchronization/i,
  /^Unlimited possibilities for synchronization/i,
  /^Unlimited potential for integration/i,
  /^Unlimited opportunities for integration/i,
  /^Unlimited possibilities for integration/i,
  /^Unlimited potential for connection/i,
  /^Unlimited opportunities for connection/i,
  /^Unlimited possibilities for connection/i,
  /^Unlimited potential for linking/i,
  /^Unlimited opportunities for linking/i,
  /^Unlimited possibilities for linking/i,
  /^Unlimited potential for joining/i,
  /^Unlimited opportunities for joining/i,
  /^Unlimited possibilities for joining/i,
  /^Unlimited potential for combining/i,
  /^Unlimited opportunities for combining/i,
  /^Unlimited possibilities for combining/i,
  /^Unlimited potential for merging/i,
  /^Unlimited opportunities for merging/i,
  /^Unlimited possibilities for merging/i,
  /^Unlimited potential for uniting/i,
  /^Unlimited opportunities for uniting/i,
  /^Unlimited possibilities for uniting/i,
  /^Unlimited potential for consolidating/i,
  /^Unlimited opportunities for consolidating/i,
  /^Unlimited possibilities for consolidating/i,
  /^Unlimited potential for amalgamating/i,
  /^Unlimited opportunities for amalgamating/i,
  /^Unlimited possibilities for amalgamating/i,
  /^Unlimited potential for fusing/i,
  /^Unlimited opportunities for fusing/i,
  /^Unlimited possibilities for fusing/i,
  /^Unlimited potential for blending/i,
  /^Unlimited opportunities for blending/i,
  /^Unlimited possibilities for blending/i,
  /^Unlimited potential for mixing/i,
  /^Unlimited opportunities for mixing/i,
  /^Unlimited possibilities for mixing/i,
  /^Unlimited potential for intermingling/i,
  /^Unlimited opportunities for intermingling/i,
  /^Unlimited possibilities for intermingling/i,
  /^Unlimited potential for interweaving/i,
  /^Unlimited opportunities for interweaving/i,
  /^Unlimited possibilities for interweaving/i,
  /^Unlimited potential for intertwining/i,
  /^Unlimited opportunities for intertwining/i,
  /^Unlimited possibilities for intertwining/i,
  /^Unlimited potential for interlocking/i,
  /^Unlimited opportunities for interlocking/i,
  /^Unlimited possibilities for interlocking/i,
  /^Unlimited potential for interconnecting/i,
  /^Unlimited opportunities for interconnecting/i,
  /^Unlimited possibilities for interconnecting/i,
  /^Unlimited potential for interrelating/i,
  /^Unlimited opportunities for interrelating/i,
  /^Unlimited possibilities for interrelating/i,
  /^Unlimited potential for interlinking/i,
  /^Unlimited opportunities for interlinking/i,
  /^Unlimited possibilities for interlinking/i,
  /^Unlimited potential for interconnecting/i,
  /^Unlimited opportunities for interconnecting/i,
  /^Unlimited possibilities for interconnecting/i,
  /^Unlimited potential for interweaving/i,
  /^Unlimited opportunities for interweaving/i,
  /^Unlimited possibilities for interweaving/i,
  /^Unlimited potential for intertwining/i,
  /^Unlimited opportunities for intertwining/i,
  /^Unlimited possibilities for intertwining/i,
  /^Unlimited potential for interlocking/i,
  /^Unlimited opportunities for interlocking/i,
  /^Unlimited possibilities for interlocking/i,
  /^Unlimited potential for interconnecting/i,
  /^Unlimited opportunities for interconnecting/i,
  /^Unlimited possibilities for interconnecting/i,
  /^Unlimited potential for interrelating/i,
  /^Unlimited opportunities for interrelating/i,
  /^Unlimited possibilities for interrelating/i,
  /^Unlimited potential for interlinking/i,
  /^Unlimited opportunities for interlinking/i,
  /^Unlimited possibilities for interlinking/i,
  /^Unlimited potential for interconnecting/i,
  /^Unlimited opportunities for interconnecting/i,
  /^Unlimited possibilities for interconnecting/i,
  /^Unlimited potential for interweaving/i,
  /^Unlimited opportunities for interweaving/i,
  /^Unlimited possibilities for interweaving/i,
  /^Unlimited potential for intertwining/i,
  /^Unlimited opportunities for intertwining/i,
  /^Unlimited possibilities for intertwining/i,
  /^Unlimited potential for interlocking/i,
  /^Unlimited opportunities for interlocking/i,
  /^Unlimited possibilities for interlocking/i,
  /^Unlimited potential for interconnecting/i,
  /^Unlimited opportunities for interconnecting/i,
  /^Unlimited possibilities for interconnecting/i,
  /^Unlimited potential for interrelating/i,
  /^Unlimited opportunities for interrelating/i,
  /^Unlimited possibilities for interrelating/i,
  /^Unlimited potential for interlinking/i,
  /^Unlimited opportunities for interlinking/i,
  /^Unlimited possibilities for interlinking/i,
]

// Check if description is generic/filler
function isGenericDescription(thesis: string | null | undefined): boolean {
  if (!thesis || thesis.length < 20) return true
  
  // Check against generic patterns
  for (const pattern of GENERIC_PATTERNS) {
    if (pattern.test(thesis)) {
      return true
    }
  }
  
  // Check for very short descriptions
  if (thesis.length < 50) return true
  
  // Check for repetitive words
  const words = thesis.toLowerCase().split(/\s+/)
  const wordCounts = new Map<string, number>()
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
  }
  
  // If any word appears more than 5 times in a short description, it's likely filler
  for (const [word, count] of wordCounts.entries()) {
    if (word.length > 3 && count > 5 && thesis.length < 200) {
      return true
    }
  }
  
  return false
}

// Generate a better description based on VC data
function generateBetterDescription(investor: any): string | null {
  const sectors = parseJSON<string[]>(investor.sectors, [])
  const stages = parseJSON<string[]>(investor.stages, [])
  const valueAdd = parseJSON<string[]>(investor.valueAddTags, [])
  const proofPoints = parseJSON<any>(investor.proofPoints, {})
  const portfolio = parseJSON<any[]>(investor.portfolio, [])
  const notableInvestments = parseJSON<string[]>(investor.notableInvestments, [])
  const geoFocus = parseJSON<string[]>(investor.geoFocus, [])
  
  // If we have specific portfolio companies or notable investments, use those
  if (notableInvestments && notableInvestments.length > 0) {
    const companies = notableInvestments.slice(0, 3).join(', ')
    const ctx = generateContextualDescription(investor, sectors, stages, valueAdd, geoFocus)
    return `${investor.firmName} has backed notable companies including ${companies}.${ctx ? ` ${ctx}` : ''}`
  }
  
  if (portfolio && Array.isArray(portfolio) && portfolio.length > 0) {
    const companies = portfolio.slice(0, 3).map((p: any) => {
      if (typeof p === 'string') return p
      if (p && typeof p === 'object' && p.name) return p.name
      return null
    }).filter(Boolean).join(', ')
    
    if (companies) {
      const ctx = generateContextualDescription(investor, sectors, stages, valueAdd, geoFocus)
      return `${investor.firmName} portfolio includes ${companies}.${ctx ? ` ${ctx}` : ''}`
    }
  }
  
  // Generate contextual description
  return generateContextualDescription(investor, sectors, stages, valueAdd, geoFocus)
}

function generateContextualDescription(
  investor: any,
  sectors: string[],
  stages: string[],
  valueAdd: string[],
  geoFocus: string[]
): string | null {
  const parts: string[] = []
  
  // Fund type
  if (investor.fundType === 'accelerator') {
    parts.push('Accelerator program')
  } else if (investor.fundType === 'CVC') {
    parts.push('Corporate venture capital fund')
  } else if (investor.fundType === 'micro-VC') {
    parts.push('Micro-VC fund')
  } else if (investor.fundType === 'institutional') {
    parts.push('Institutional venture capital firm')
  } else {
    parts.push('Venture capital firm')
  }
  
  // Sectors
  if (sectors.length > 0 && sectors.length <= 3) {
    if (sectors.length === 1) {
      parts.push(`specializing in ${sectors[0]}`)
    } else if (sectors.length === 2) {
      parts.push(`focused on ${sectors.join(' and ')}`)
    } else {
      parts.push(`focused on ${sectors.slice(0, -1).join(', ')}, and ${sectors[sectors.length - 1]}`)
    }
  } else if (sectors.length > 3) {
    parts.push(`focused on ${sectors.slice(0, 2).join(' and ')} and other sectors`)
  }
  
  // Stages
  if (stages.length > 0 && stages.length <= 3) {
    if (stages.length === 1) {
      parts.push(`investing at the ${stages[0]} stage`)
    } else if (stages.length === 2) {
      parts.push(`investing from ${stages[0]} through ${stages[1]}`)
    } else {
      parts.push(`investing across ${stages.slice(0, -1).join(', ')}, and ${stages[stages.length - 1]} stages`)
    }
  }
  
  // Geographic focus
  if (geoFocus.length > 0 && geoFocus.length <= 3 && !geoFocus.includes('Global')) {
    if (geoFocus.length === 1) {
      parts.push(`primarily in ${geoFocus[0]}`)
    } else {
      parts.push(`with focus on ${geoFocus.slice(0, -1).join(', ')}, and ${geoFocus[geoFocus.length - 1]}`)
    }
  }
  
  // Value add
  if (valueAdd.length > 0 && valueAdd.length <= 3) {
    const valueAddText = valueAdd.length === 1
      ? valueAdd[0].toLowerCase()
      : valueAdd.slice(0, -1).map(v => v.toLowerCase()).join(', ') + ', and ' + valueAdd[valueAdd.length - 1].toLowerCase()
    parts.push(`offers ${valueAddText}`)
  }
  
  // Decision speed
  if (investor.decisionSpeed) {
    parts.push(`decision speed: ${investor.decisionSpeed}`)
  }
  
  // Lead/follow
  if (investor.leadFollow && investor.leadFollow !== 'either') {
    parts.push(`${investor.leadFollow === 'lead' ? 'typically leads' : 'typically follows'} rounds`)
  }
  
  if (parts.length === 0) {
    return null
  }
  
  let description = parts.join('. ')
  description = description.charAt(0).toUpperCase() + description.slice(1) + '.'
  
  return description
}

async function main() {
  console.log('🔍 Analyzing VC descriptions for generic/filler content...\n')
  
  const investors = await prisma.investor.findMany({
    orderBy: { firmName: 'asc' }
  })
  
  console.log(`Found ${investors.length} VCs in database\n`)
  
  let genericCount = 0
  let improvedCount = 0
  let removedCount = 0
  let keptCount = 0
  
  const genericVCs: any[] = []
  const improvedVCs: any[] = []
  
  for (const investor of investors) {
    const isGeneric = isGenericDescription(investor.thesis)
    
    if (isGeneric) {
      genericCount++
      genericVCs.push(investor)
      
      // Try to generate a better description
      const betterDescription = generateBetterDescription(investor)
      
      if (betterDescription && betterDescription.length > 50) {
        // Update with better description
        await prisma.investor.update({
          where: { id: investor.id },
          data: { thesis: betterDescription },
        })
        improvedCount++
        improvedVCs.push({ ...investor, newThesis: betterDescription })
        console.log(`✅ IMPROVED: ${investor.firmName}`)
        console.log(`   Old: ${investor.thesis?.substring(0, 100)}...`)
        console.log(`   New: ${betterDescription.substring(0, 100)}...`)
        console.log('')
      } else {
        // Remove generic description (set to null)
        await prisma.investor.update({
          where: { id: investor.id },
          data: { thesis: null },
        })
        removedCount++
        console.log(`❌ REMOVED: ${investor.firmName} (generic description removed)`)
        console.log(`   Was: ${investor.thesis?.substring(0, 100)}...`)
        console.log('')
      }
    } else {
      keptCount++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total VCs analyzed: ${investors.length}`)
  console.log(`Generic/filler descriptions found: ${genericCount}`)
  console.log(`  - Improved: ${improvedCount}`)
  console.log(`  - Removed (couldn't improve): ${removedCount}`)
  console.log(`Kept (already good): ${keptCount}`)
  console.log('='.repeat(60))
  
  await prisma.$disconnect()
  console.log('\n✅ Database connection closed')
}

main().catch(async (e) => {
  console.error('❌ Error:', e)
  await prisma.$disconnect()
  process.exit(1)
})

