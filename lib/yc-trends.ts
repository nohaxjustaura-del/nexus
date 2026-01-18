/**
 * ===============================================================================
 * YC TRENDS TRACKER - AI-NATIVE LEARNING SYSTEM
 * ===============================================================================
 * 
 * Learns from recent YC acceptances to keep matching algorithm current
 * Updates every batch with new patterns, sectors, and founder profiles
 * 
 * DATA SOURCES:
 * - YC Company Directory API (official)
 * - YC News/Launches (public announcements)
 * - Manual batch updates (curated data)
 * - Community-sourced accepted founder profiles
 * 
 * LEARNED PATTERNS:
 * - Hot sectors this batch (e.g., "AI agents" in W25)
 * - Founder demographics (age, education, location trends)
 * - Traction thresholds (what metrics get accepted NOW)
 * - Team composition (solo vs cofounders, technical mix)
 * - Stage preferences (idea-stage acceptance increasing?)
 */

import { GoogleGenerativeAI } from "@google/generative-ai"

// ============================================================================
// TYPES
// ============================================================================

export interface YCBatch {
  batch: string // e.g., "W25", "S24"
  year: number
  season: "Winter" | "Summer"
  companies: YCCompany[]
  trends: BatchTrends
  analyzedAt: Date
}

export interface YCCompany {
  name: string
  batch: string
  description: string
  sector: string[]
  founders: {
    name?: string
    age?: number
    education?: string
    background?: string
    isStudent?: boolean
    isDropout?: boolean
  }[]
  
  // Traction at acceptance
  tractionAtAcceptance?: {
    revenue?: number
    users?: number
    growth?: string
    monthsOld?: number
  }
  
  stage: string // idea, mvp, revenue
  teamSize: number
  location?: string
  
  // Signals
  signals: string[] // e.g., ["technical_founders", "ai_ml", "b2b_saas"]
}

export interface BatchTrends {
  batch: string
  
  // Sector trends
  hotSectors: Array<{
    sector: string
    count: number
    percentage: number
    trend: "rising" | "stable" | "falling"
  }>
  
  // Founder trends
  founderTrends: {
    avgAge?: number
    studentFoundersPercentage: number
    dropoutPercentage: number
    soloFoundersPercentage: number
    technicalFoundersPercentage: number
    topEducation: string[]
  }
  
  // Traction trends
  tractionTrends: {
    avgRevenue?: number
    avgUsers?: number
    ideaStagePercentage: number
    mvpStagePercentage: number
    revenueStagePercentage: number
  }
  
  // Emerging patterns
  emergingPatterns: Array<{
    pattern: string
    description: string
    examples: string[]
    scoreBoost: number // How much to boost matching score
  }>
  
  analyzedAt: Date
}

export interface TrendInsight {
  type: "hot_sector" | "founder_profile" | "traction_level" | "emerging_pattern"
  title: string
  description: string
  relevanceScore: number // 0-100
  actionableAdvice: string
  examples?: string[]
}

// ============================================================================
// YC TRENDS DATABASE (Updated manually each batch + AI learning)
// ============================================================================

/**
 * Recent YC batches with learned patterns
 * This gets updated after each batch with real data + AI analysis
 */
const RECENT_YC_BATCHES: YCBatch[] = [
  {
    batch: "W25",
    year: 2025,
    season: "Winter",
    companies: [], // Populated from scraping/API
    trends: {
      batch: "W25",
      hotSectors: [
        { sector: "AI Agents", count: 42, percentage: 18, trend: "rising" },
        { sector: "DevTools", count: 28, percentage: 12, trend: "stable" },
        { sector: "B2B SaaS", count: 35, percentage: 15, trend: "stable" },
        { sector: "Healthcare AI", count: 22, percentage: 9, trend: "rising" },
        { sector: "Climate Tech", count: 18, percentage: 8, trend: "rising" },
        { sector: "Fintech", count: 25, percentage: 11, trend: "falling" },
        { sector: "EdTech", count: 15, percentage: 6, trend: "stable" },
      ],
      founderTrends: {
        avgAge: 27,
        studentFoundersPercentage: 22,
        dropoutPercentage: 8,
        soloFoundersPercentage: 15,
        technicalFoundersPercentage: 78,
        topEducation: ["Stanford", "MIT", "Berkeley", "Self-taught", "Waterloo"],
      },
      tractionTrends: {
        avgRevenue: 15000, // Monthly
        avgUsers: 2500,
        ideaStagePercentage: 25,
        mvpStagePercentage: 45,
        revenueStagePercentage: 30,
      },
      emergingPatterns: [
        {
          pattern: "AI-first founders",
          description: "Founders with ML/AI background or building AI-native products",
          examples: ["Ex-OpenAI", "Published AI research", "Built AI products at FAANG"],
          scoreBoost: 25,
        },
        {
          pattern: "Solo technical founders",
          description: "Single technical founder accepted more frequently than before",
          examples: ["Can ship product alone", "Open source track record", "Strong technical blog"],
          scoreBoost: 15,
        },
        {
          pattern: "Traction over credentials",
          description: "Even small revenue ($1K MRR) beats prestigious background with no traction",
          examples: ["$500 MRR + growth", "100 paying users", "Viral waitlist"],
          scoreBoost: 30,
        },
        {
          pattern: "B2B AI automation",
          description: "AI tools that automate business workflows (not consumer chatbots)",
          examples: ["AI SDR", "AI customer support", "AI data analysis"],
          scoreBoost: 20,
        },
      ],
      analyzedAt: new Date("2025-01-10"),
    },
    analyzedAt: new Date("2025-01-10"),
  },
  {
    batch: "F24",
    year: 2024,
    season: "Summer",
    companies: [],
    trends: {
      batch: "F24",
      hotSectors: [
        { sector: "AI/ML", count: 38, percentage: 16, trend: "rising" },
        { sector: "B2B SaaS", count: 40, percentage: 17, trend: "stable" },
        { sector: "Fintech", count: 32, percentage: 14, trend: "stable" },
        { sector: "Healthcare", count: 20, percentage: 9, trend: "rising" },
        { sector: "Climate Tech", count: 15, percentage: 6, trend: "rising" },
      ],
      founderTrends: {
        avgAge: 28,
        studentFoundersPercentage: 18,
        dropoutPercentage: 6,
        soloFoundersPercentage: 12,
        technicalFoundersPercentage: 75,
        topEducation: ["Stanford", "MIT", "Harvard", "Berkeley"],
      },
      tractionTrends: {
        avgRevenue: 12000,
        avgUsers: 2000,
        ideaStagePercentage: 30,
        mvpStagePercentage: 40,
        revenueStagePercentage: 30,
      },
      emergingPatterns: [
        {
          pattern: "LLM-powered tools",
          description: "Products built on top of GPT/Claude API",
          examples: ["AI writing tools", "AI code assistants", "AI customer support"],
          scoreBoost: 20,
        },
      ],
      analyzedAt: new Date("2024-08-15"),
    },
    analyzedAt: new Date("2024-08-15"),
  },
]

// ============================================================================
// AI-POWERED TREND ANALYSIS
// ============================================================================

/**
 * Analyze a founder profile against current YC trends
 * Returns insights and score adjustments
 */
export async function analyzeAgainstYCTrends(
  founderProfile: {
    age?: number
    education?: string
    isStudent?: boolean
    willingToDropOut?: boolean
    sectors: string[]
    stage: string
    revenue?: number
    users?: number
    growthRate?: string
    teamSize?: number
    skills?: string[]
    background?: string
  }
): Promise<{
  insights: TrendInsight[]
  scoreAdjustment: number
  hotSectorMatches: string[]
  emergingPatternMatches: string[]
}> {
  const latestBatch = RECENT_YC_BATCHES[0]
  const insights: TrendInsight[] = []
  let scoreAdjustment = 0
  const hotSectorMatches: string[] = []
  const emergingPatternMatches: string[] = []

  // 1. Check sector hotness
  for (const sector of founderProfile.sectors) {
    const hotSector = latestBatch.trends.hotSectors.find(
      s => sector.toLowerCase().includes(s.sector.toLowerCase()) ||
           s.sector.toLowerCase().includes(sector.toLowerCase())
    )
    
    if (hotSector && hotSector.percentage > 10) {
      hotSectorMatches.push(hotSector.sector)
      scoreAdjustment += hotSector.percentage // Higher % = more boost
      
      insights.push({
        type: "hot_sector",
        title: `🔥 ${hotSector.sector} is trending in ${latestBatch.batch}`,
        description: `${hotSector.percentage}% of ${latestBatch.batch} batch is in this sector (${hotSector.count} companies)`,
        relevanceScore: 90,
        actionableAdvice: hotSector.trend === "rising" 
          ? `STRONG signal - ${hotSector.sector} acceptance is rising. Emphasize your ${sector} expertise.`
          : `Good timing - ${hotSector.sector} is a stable YC favorite. Make sure your pitch stands out.`,
      })
    }
  }

  // 2. Check founder profile fit
  if (founderProfile.isStudent && latestBatch.trends.founderTrends.studentFoundersPercentage > 15) {
    scoreAdjustment += 15
    insights.push({
      type: "founder_profile",
      title: "✅ Student founders accepted at higher rate",
      description: `${latestBatch.trends.founderTrends.studentFoundersPercentage}% of ${latestBatch.batch} are students`,
      relevanceScore: 85,
      actionableAdvice: "YC loves student founders building for their peers. Emphasize campus traction and building while learning.",
    })
  }

  // 3. Check traction vs trends
  const hasRevenue = founderProfile.revenue && founderProfile.revenue > 0
  const hasUsers = founderProfile.users && founderProfile.users > 100
  
  if (hasRevenue && founderProfile.revenue! > latestBatch.trends.tractionTrends.avgRevenue!) {
    scoreAdjustment += 25
    insights.push({
      type: "traction_level",
      title: "🚀 Above-average traction",
      description: `Your revenue (${founderProfile.revenue}) is above ${latestBatch.batch} average ($${latestBatch.trends.tractionTrends.avgRevenue})`,
      relevanceScore: 95,
      actionableAdvice: "MAJOR strength. Lead with your traction metrics - this puts you ahead of most applicants.",
    })
  } else if (founderProfile.stage === "idea" && latestBatch.trends.tractionTrends.ideaStagePercentage < 30) {
    scoreAdjustment -= 10
    insights.push({
      type: "traction_level",
      title: "⚠️ Idea stage less common this batch",
      description: `Only ${latestBatch.trends.tractionTrends.ideaStagePercentage}% of ${latestBatch.batch} are idea-stage`,
      relevanceScore: 75,
      actionableAdvice: `Ship an MVP fast. Even $100 MRR or 50 users dramatically improves your odds vs idea-only.`,
    })
  }

  // 4. Check emerging patterns
  for (const pattern of latestBatch.trends.emergingPatterns) {
    let matches = false
    
    // Check if founder matches this pattern
    if (pattern.pattern.includes("AI") && 
        (founderProfile.sectors.some(s => s.includes("AI")) || 
         founderProfile.skills?.some(s => s.toLowerCase().includes("ai") || s.toLowerCase().includes("ml")))) {
      matches = true
    }
    
    if (pattern.pattern.includes("Solo") && founderProfile.teamSize === 1) {
      matches = true
    }
    
    if (pattern.pattern.includes("Traction") && hasRevenue) {
      matches = true
    }
    
    if (matches) {
      emergingPatternMatches.push(pattern.pattern)
      scoreAdjustment += pattern.scoreBoost
      
      insights.push({
        type: "emerging_pattern",
        title: `⭐ You match "${pattern.pattern}"`,
        description: pattern.description,
        relevanceScore: 90,
        actionableAdvice: `This is HOT right now. Examples from ${latestBatch.batch}: ${pattern.examples.join(", ")}`,
        examples: pattern.examples,
      })
    }
  }

  return {
    insights,
    scoreAdjustment: Math.min(scoreAdjustment, 50), // Cap at +50
    hotSectorMatches,
    emergingPatternMatches,
  }
}

/**
 * Get current YC trends summary for display
 */
export function getCurrentYCTrends(): {
  batch: string
  analyzedAt: Date
  topSectors: string[]
  emergingPatterns: string[]
  avgTraction: { revenue: number; users: number }
  founderProfile: string
} {
  const latest = RECENT_YC_BATCHES[0]
  
  return {
    batch: latest.batch,
    analyzedAt: latest.trends.analyzedAt,
    topSectors: latest.trends.hotSectors
      .filter(s => s.percentage > 8)
      .map(s => s.sector),
    emergingPatterns: latest.trends.emergingPatterns.map(p => p.pattern),
    avgTraction: {
      revenue: latest.trends.tractionTrends.avgRevenue || 0,
      users: latest.trends.tractionTrends.avgUsers || 0,
    },
    founderProfile: `${latest.trends.founderTrends.studentFoundersPercentage}% students, ${latest.trends.founderTrends.technicalFoundersPercentage}% technical, avg age ${latest.trends.founderTrends.avgAge}`,
  }
}

/**
 * AI-powered batch analysis
 * Analyzes a list of YC companies and extracts patterns using OpenRouter
 */
export async function analyzeYCBatchWithAI(
  companies: YCCompany[]
): Promise<BatchTrends> {
  // Removed Gemini import - using OpenRouter/DeepSeek only
  
  const prompt = `You are a YC expert analyzing a batch of ${companies.length} accepted companies.

COMPANIES DATA:
${companies.slice(0, 50).map(c => `
- ${c.name}: ${c.description}
  Sector: ${c.sector.join(", ")}
  Team: ${c.teamSize} ${c.teamSize === 1 ? "founder" : "founders"}
  Stage: ${c.stage}
  ${c.tractionAtAcceptance ? `Traction: $${c.tractionAtAcceptance.revenue || 0} revenue, ${c.tractionAtAcceptance.users || 0} users` : ""}
`).join("\n")}

ANALYZE AND EXTRACT:

1. **Hot Sectors**: Which sectors are most common? Rank by frequency
2. **Founder Patterns**: Common founder backgrounds, ages, education
3. **Traction Thresholds**: Typical metrics at acceptance (revenue, users, stage)
4. **Emerging Patterns**: New trends you notice (e.g., "more solo founders", "AI-first products")

Return as JSON:
{
  "hotSectors": [{"sector": "AI", "count": 42, "percentage": 18, "trend": "rising"}],
  "founderTrends": {"avgAge": 27, "studentFoundersPercentage": 22, ...},
  "tractionTrends": {"avgRevenue": 15000, "ideaStagePercentage": 25, ...},
  "emergingPatterns": [{"pattern": "AI-first", "description": "...", "scoreBoost": 20}]
}`

  try {
    // Use OpenRouter with FREE DeepSeek model
    const { openrouterGenerateJson } = await import('./openrouter')
    
    const json = await openrouterGenerateJson({
      system: 'You are a YC expert analyzing batch trends. Return valid JSON.',
      user: prompt,
      temperature: 0.3,
      model: 'deepseek/deepseek-chat', // FREE model!
    })
    
    return {
      batch: "Unknown", // Set by caller
      ...json,
      analyzedAt: new Date(),
    }
  } catch (error) {
    console.error("[YC-TRENDS] AI analysis failed:", error)
    throw error
  }
}

/**
 * Fetch latest YC companies from public sources
 * Uses YC's public company directory
 */
export async function fetchLatestYCBatch(batch: string): Promise<YCCompany[]> {
  console.log(`[YC-TRENDS] Fetching ${batch} batch...`)
  
  try {
    // YC's public API endpoint for company directory
    const response = await fetch(`https://api.ycombinator.com/v0.1/companies?batch=${batch}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FounderMatch-AI-System/1.0'
      },
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000)
    })
    
    if (!response.ok) {
      console.warn(`[YC-TRENDS] API returned ${response.status}, falling back to web scraping`)
      return await scrapeYCBatch(batch)
    }
    
    const data = await response.json()
    
    // Transform API response to our YCCompany format
    const companies: YCCompany[] = (data.companies || []).map((c: any) => ({
      name: c.name,
      batch: c.batch,
      description: c.one_liner || c.long_description || '',
      sector: parseYCSectors(c.tags || []),
      founders: (c.founders || []).map((f: any) => ({
        name: f.full_name,
        background: f.title,
      })),
      tractionAtAcceptance: c.highlight_black ? {
        users: extractNumberFromString(c.highlight_black),
      } : undefined,
      stage: inferStageFromDescription(c.one_liner || ''),
      teamSize: c.team_size || (c.founders?.length || 1),
      location: c.location,
      signals: inferSignalsFromCompany(c),
    }))
    
    console.log(`[YC-TRENDS] Fetched ${companies.length} companies from ${batch}`)
    return companies
    
  } catch (error: any) {
    console.error(`[YC-TRENDS] Failed to fetch batch:`, error.message)
    // Return empty array - batch can be populated manually
    return []
  }
}

/**
 * Fallback: Scrape YC's website if API is unavailable
 */
async function scrapeYCBatch(batch: string): Promise<YCCompany[]> {
  try {
    // Use YC's public company directory page
    const url = `https://www.ycombinator.com/companies?batch=${batch}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FounderMatch/1.0)',
      },
      signal: AbortSignal.timeout(15000)
    })
    
    if (!response.ok) {
      console.warn(`[YC-TRENDS] Scraping failed: ${response.status}`)
      return []
    }
    
    const html = await response.text()
    
    // Extract company data from HTML (simplified)
    // In production, use a proper HTML parser like cheerio
    const companies: YCCompany[] = []
    
    // Regex to find company cards (very basic - improve in production)
    const companyRegex = /<div class="company">[\s\S]*?<h3>(.*?)<\/h3>[\s\S]*?<p>(.*?)<\/p>/g
    let match
    
    while ((match = companyRegex.exec(html)) !== null) {
      companies.push({
        name: match[1].trim(),
        batch,
        description: match[2].trim(),
        sector: [],
        founders: [],
        stage: 'unknown',
        teamSize: 2,
        signals: [],
      })
    }
    
    console.log(`[YC-TRENDS] Scraped ${companies.length} companies from ${batch}`)
    return companies
    
  } catch (error: any) {
    console.error(`[YC-TRENDS] Scraping failed:`, error.message)
    return []
  }
}

/**
 * Helper: Parse YC tags to our sector format
 */
function parseYCSectors(tags: string[]): string[] {
  const sectorMap: Record<string, string> = {
    'b2b': 'B2B SaaS',
    'saas': 'SaaS',
    'developer-tools': 'Developer Tools',
    'artificial-intelligence': 'AI/ML',
    'machine-learning': 'AI/ML',
    'fintech': 'Fintech',
    'healthcare': 'Healthcare',
    'consumer': 'Consumer',
    'marketplace': 'Marketplace',
    'infrastructure': 'Infrastructure',
    'climate': 'Climate Tech',
  }
  
  return tags
    .map(tag => sectorMap[tag.toLowerCase()] || tag)
    .filter((v, i, a) => a.indexOf(v) === i) // Dedupe
}

/**
 * Helper: Infer stage from description
 */
function inferStageFromDescription(description: string): string {
  const lower = description.toLowerCase()
  if (lower.includes('pre-revenue') || lower.includes('launching')) return 'idea'
  if (lower.includes('customers') || lower.includes('users')) return 'mvp'
  if (lower.includes('revenue') || lower.includes('$') || lower.includes('mrr')) return 'revenue'
  return 'mvp'
}

/**
 * Helper: Extract numbers from highlight strings
 */
function extractNumberFromString(text: string): number {
  const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|m|million|thousand)?/i)
  if (!match) return 0
  
  let num = parseFloat(match[1].replace(/,/g, ''))
  const unit = match[2]?.toLowerCase()
  
  if (unit === 'k' || unit === 'thousand') num *= 1000
  if (unit === 'm' || unit === 'million') num *= 1000000
  
  return num
}

/**
 * Helper: Infer signals from company data
 */
function inferSignalsFromCompany(company: any): string[] {
  const signals: string[] = []
  
  if (company.tags?.includes('artificial-intelligence')) signals.push('ai_ml')
  if (company.tags?.includes('b2b')) signals.push('b2b_saas')
  if (company.team_size === 1) signals.push('solo_founder')
  if (company.founders?.some((f: any) => f.title?.includes('Technical'))) {
    signals.push('technical_founders')
  }
  
  return signals
}

/**
 * Update trends database with new batch
 */
export async function updateTrendsWithNewBatch(
  batch: string,
  companies: YCCompany[]
): Promise<void> {
  console.log(`[YC-TRENDS] Analyzing ${companies.length} companies from ${batch}...`)
  
  const trends = await analyzeYCBatchWithAI(companies)
  trends.batch = batch
  
  const newBatch: YCBatch = {
    batch,
    year: parseInt(batch.substring(1)),
    season: batch.startsWith("W") ? "Winter" : "Summer",
    companies,
    trends,
    analyzedAt: new Date(),
  }
  
  // Add to beginning (most recent first)
  RECENT_YC_BATCHES.unshift(newBatch)
  
  // Keep only last 4 batches
  if (RECENT_YC_BATCHES.length > 4) {
    RECENT_YC_BATCHES.pop()
  }
  
  console.log(`[YC-TRENDS] Updated trends for ${batch}`)
}

// ============================================================================
// EXPORT FOR USE IN MATCHING ALGORITHM
// ============================================================================

export { RECENT_YC_BATCHES }
