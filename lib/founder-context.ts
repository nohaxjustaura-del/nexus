/**
 * ===============================================================================
 * FOUNDER CONTEXT BUILDER - Complete Profile for AI Analysis
 * ===============================================================================
 * 
 * Pulls ALL founder data from multiple sources for maximum AI accuracy:
 * - Founder table (profile, startup, traction)
 * - FounderContact (additional contact info)
 * - FounderPrefs (preferences, diversity, background)
 * - User table (onboarding data, AI analysis history)
 * 
 * This ensures the AI has COMPLETE context for matching
 */

import { Founder } from '@prisma/client'
import { parseJSON } from './utils'
import { db } from './db' // Use singleton instance instead of creating new PrismaClient
import { computeFounderProfileCompletenessPercentAnalytical } from './founder-profile-completeness'
import { detectUniversityFromRegistry } from './matching/university-detection-registry'

export interface ComprehensiveFounderContext {
  // Core identity
  id: string
  email: string
  name: string
  age?: number
  gender?: string
  education?: string
  
  // Background & demographics
  isStudent: boolean
  willingToDropOut: boolean
  isImmigrant: boolean
  isUnderrepresented: boolean
  isVeteran: boolean
  universityAffiliation?: string
  
  // Startup basics
  startupName?: string
  stage: string
  sectors: string[]
  businessModel?: string
  location: string
  fundingNeed: number
  
  // Traction (critical for matching)
  revenue?: number
  users?: number
  growthRate?: string
  teamSize?: number
  
  // Profile richness
  bio?: string
  linkedinUrl?: string
  twitterUrl?: string
  websiteUrl?: string
  demoUrl?: string
  pitchDeckUrl?: string
  
  // Preferences (for better matching)
  ethicsTags: string[]
  personalityTags: string[]
  valueAddNeeds: string[]
  geoPreference?: string
  decisionSpeedDays?: string
  targetOwnershipMax?: string
  fundTypePreference?: string
  leadPreference?: string
  
  // Additional context
  phone?: string
  cofounders?: string
  hoursPerWeek?: string
  prevFunding?: string
  prevFundingAmount?: string
  
  // AI analysis history (learn from past)
  lastAiAnalysis?: any
  lastAnalysisDate?: Date
  
  // Computed fields
  profileCompleteness: number
  experienceLevel: 'early' | 'mid' | 'experienced'
  techBackground: boolean
  hasStrongTraction: boolean
}

/**
 * Get comprehensive founder context for AI analysis
 * Pulls from all database tables to build complete picture
 */
// 🚀 OPTIMIZED: Use caching to avoid repeated DB queries
const founderContextCache = new Map<string, { data: ComprehensiveFounderContext; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Infer canonical school name from education + bio (onboarding often only fills education).
 * Order: more specific patterns first. Used for university-affiliated accelerators (e.g. Brown B-Lab).
 */
export function detectUniversityAffiliation(
  education?: string | null,
  bio?: string | null,
  /** Deck, transcript, or idea text — same detection as profile so matching sees school from pitch. */
  extraPitchText?: string | null,
): string | undefined {
  const t = `${education ?? ''}\n${bio ?? ''}\n${extraPitchText ?? ''}`.toLowerCase()
  if (!t.trim()) return undefined
  return detectUniversityFromRegistry(t)
}

export async function getComprehensiveFounderContext(
  email: string
): Promise<ComprehensiveFounderContext | null> {
  try {
    // Check cache first
    const cached = founderContextCache.get(email)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    
    // 🚀 OPTIMIZED: Parallel queries instead of sequential
    const [founder, contact, prefs, user] = await Promise.all([
      db.founder.findUnique({ where: { email } }),
      db.founderContact.findUnique({ where: { email } }),
      db.founderPrefs.findUnique({ where: { email } }),
      db.user.findUnique({ where: { email } }),
    ])
    
    if (!founder) {
      return null
    }
    
    // Parse JSON fields safely
    const sectors = parseJSON<string[]>(founder.sectors, [])
    const ethicsTags = parseJSON<string[]>(founder.ethicsTags, [])
    const personalityTags = parseJSON<string[]>(founder.personalityTags, [])
    const valueAddNeeds = parseJSON<string[]>(founder.valueAddNeeds, [])
    const lastAiAnalysis = user?.lastAiAnalysis ? parseJSON(user.lastAiAnalysis, null) : null
    
    // Determine experience level
    let experienceLevel: 'early' | 'mid' | 'experienced' = 'early'
    if (founder.age && founder.age > 30) experienceLevel = 'mid'
    if (founder.revenue && founder.revenue > 50000) experienceLevel = 'experienced'
    if (founder.teamSize && founder.teamSize > 10) experienceLevel = 'experienced'
    
    // 🆕 ENHANCE: Detect student status from prefs + education text (Founder has no isStudent column)
    const eduLow = (founder.education ?? '').toLowerCase()
    const bioLow = (founder.bio ?? '').toLowerCase()
    const isStudentFromEducation =
      !!(founder.education && (
        eduLow.includes('student') ||
        eduLow.includes('studying') ||
        eduLow.includes('enrolled') ||
        (eduLow.includes('berkeley') && !eduLow.includes('alumni')) ||
        (eduLow.includes('brown') && !eduLow.includes('alumni') && /(student|undergraduate|graduate|class of)/.test(eduLow)) ||
        (bioLow.includes('brown') && /(student|undergraduate|class of)/.test(bioLow))
      ))
    const isStudent = prefs?.isStudent || isStudentFromEducation
    
    // Detect tech background
    const techBackground = 
      founder.education?.toLowerCase().includes('computer') ||
      founder.education?.toLowerCase().includes('engineering') ||
      founder.education?.toLowerCase().includes('cs') ||
      founder.bio?.toLowerCase().includes('developer') ||
      founder.bio?.toLowerCase().includes('engineer') ||
      sectors.some(s => 
        s.toLowerCase().includes('devtools') ||
        s.toLowerCase().includes('ai') ||
        s.toLowerCase().includes('ml') ||
        s.toLowerCase().includes('saas')
      ) ||
      false
    
    // Canonical school for accelerators / incubators (never use LinkedIn URL here).
    const universityAffiliationResolved =
      detectUniversityAffiliation(founder.education, founder.bio) ?? undefined

    // Detect strong traction
    const hasStrongTraction = 
      (founder.revenue && founder.revenue > 10000) ||
      (founder.users && founder.users > 1000) ||
      founder.stage === 'revenue' ||
      founder.stage === 'seed' ||
      founder.stage === 'seriesA'
    
    const result = {
      // Core
      id: founder.id,
      email: founder.email,
      name: founder.name,
      age: founder.age || undefined,
      gender: founder.gender || undefined,
      education: founder.education || undefined,
      
      // Background
      isStudent,
      willingToDropOut: founder.willingToDropOut,
      isImmigrant: prefs?.isImmigrant || false,
      isUnderrepresented: prefs?.isUnderrepresented || false,
      isVeteran: prefs?.isVeteran || false,
      universityAffiliation: universityAffiliationResolved,
      
      // Startup
      startupName: founder.startupName || undefined,
      stage: founder.stage,
      sectors,
      businessModel: founder.businessModel || undefined,
      location: founder.location,
      fundingNeed: founder.fundingNeed,
      
      // Traction
      revenue: founder.revenue || undefined,
      users: founder.users || undefined,
      growthRate: founder.growthRate || undefined,
      teamSize: founder.teamSize || undefined,
      
      // Profile
      bio: founder.bio || undefined,
      linkedinUrl: founder.linkedinUrl || contact?.linkedin || undefined,
      twitterUrl: founder.twitterUrl || undefined,
      websiteUrl: founder.websiteUrl || contact?.website || undefined,
      demoUrl: founder.demoUrl || undefined,
      pitchDeckUrl: founder.pitchDeck || undefined,
      
      // Preferences
      ethicsTags,
      personalityTags,
      valueAddNeeds,
      geoPreference: prefs?.geoPreference || undefined,
      decisionSpeedDays: prefs?.decisionSpeedDays || undefined,
      targetOwnershipMax: prefs?.targetOwnershipMax || undefined,
      fundTypePreference: prefs?.fundTypePreference || undefined,
      leadPreference: prefs?.leadPreference || undefined,
      
      // Additional
      phone: contact?.phone || undefined,
      cofounders: contact?.cofounders || undefined,
      hoursPerWeek: contact?.hoursPerWeek || undefined,
      prevFunding: contact?.prevFunding || undefined,
      prevFundingAmount: contact?.prevFundingAmount || undefined,
      
      // AI history
      lastAiAnalysis,
      lastAnalysisDate: user?.lastAnalysisDate || undefined,
      
      // Computed (DB column is often stale; derive from actual fields + contact LinkedIn)
      profileCompleteness: computeFounderProfileCompletenessPercentAnalytical({
        name: founder.name,
        startupName: founder.startupName,
        bio: founder.bio,
        stage: founder.stage,
        sectors,
        location: founder.location,
        fundingNeed: founder.fundingNeed,
        pitchDeck: founder.pitchDeck,
        videoPitchUrl: founder.videoPitchUrl,
        linkedinUrl: founder.linkedinUrl,
        linkedin: contact?.linkedin,
      }),
      experienceLevel,
      techBackground,
      hasStrongTraction,
    }
    
    // 🚀 OPTIMIZED: Cache the result
    founderContextCache.set(email, { data: result, timestamp: Date.now() })
    
    // Clean old cache entries (prevent memory leaks)
    if (founderContextCache.size > 100) {
      const now = Date.now()
      for (const [key, value] of founderContextCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          founderContextCache.delete(key)
        }
      }
    }
    
    return result
  } catch (error) {
    console.error('[FOUNDER-CONTEXT] Error fetching founder context:', error)
    return null
  }
}

/**
 * Build a rich prompt context for AI from founder data
 * This creates a detailed narrative the AI can understand
 */
export function buildAIPromptContext(context: ComprehensiveFounderContext): string {
  const parts: string[] = []
  
  // 1. Founder background
  parts.push(`**FOUNDER PROFILE:**`)
  parts.push(`Name: ${context.name}`)
  if (context.age) parts.push(`Age: ${context.age}`)
  if (context.education) parts.push(`Education: ${context.education}`)
  if (context.gender) parts.push(`Gender: ${context.gender}`)
  
  // 2. Background signals
  const signals: string[] = []
  if (context.isStudent) signals.push('Current student')
  if (context.willingToDropOut) signals.push('Willing to drop out')
  if (context.isImmigrant) signals.push('Immigrant founder')
  if (context.isUnderrepresented) signals.push('Underrepresented background')
  if (context.isVeteran) signals.push('Veteran')
  if (context.techBackground) signals.push('Technical background')
  if (signals.length > 0) {
    parts.push(`Background: ${signals.join(', ')}`)
  }
  
  // 3. Startup details
  parts.push(`\n**STARTUP:**`)
  if (context.startupName) parts.push(`Name: ${context.startupName}`)
  parts.push(`Stage: ${context.stage}`)
  parts.push(`Sectors: ${context.sectors.join(', ')}`)
  if (context.businessModel) parts.push(`Business Model: ${context.businessModel}`)
  parts.push(`Location: ${context.location}`)
  parts.push(`Funding Need: $${context.fundingNeed}K`)
  
  // 4. Traction (critical!)
  parts.push(`\n**TRACTION:**`)
  if (context.revenue) {
    parts.push(`Revenue: $${context.revenue.toLocaleString()}/month`)
  } else {
    parts.push(`Revenue: Pre-revenue`)
  }
  if (context.users) {
    parts.push(`Users: ${context.users.toLocaleString()}`)
  }
  if (context.growthRate) {
    parts.push(`Growth: ${context.growthRate}`)
  }
  if (context.teamSize) {
    parts.push(`Team Size: ${context.teamSize}`)
  }
  
  // 5. Experience & credibility
  parts.push(`\n**EXPERIENCE:**`)
  parts.push(`Experience Level: ${context.experienceLevel}`)
  parts.push(`Profile Completeness: ${context.profileCompleteness}%`)
  if (context.prevFunding) {
    parts.push(`Previous Funding: ${context.prevFunding} (${context.prevFundingAmount || 'amount not specified'})`)
  }
  
  // 6. Preferences
  if (context.valueAddNeeds.length > 0) {
    parts.push(`\n**LOOKING FOR:**`)
    parts.push(`Value-Add Needs: ${context.valueAddNeeds.join(', ')}`)
  }
  if (context.geoPreference) {
    parts.push(`Geographic Preference: ${context.geoPreference}`)
  }
  if (context.leadPreference) {
    parts.push(`Lead Preference: ${context.leadPreference}`)
  }
  
  // 7. Bio for color
  if (context.bio) {
    parts.push(`\n**BIO:**`)
    parts.push(context.bio.substring(0, 500))
  }
  
  return parts.join('\n')
}

/**
 * Generate match context object for intelligent matching
 */
export function buildMatchContext(context: ComprehensiveFounderContext) {
  return {
    isTechnical: context.techBackground,
    isStudent: context.isStudent,
    hasOpenSource: false, // Could parse from LinkedIn/GitHub
    hasTraction: context.hasStrongTraction,
    experienceLevel: context.experienceLevel,
    primarySector: context.sectors[0] || 'Technology',
    checkSize: context.fundingNeed,
    needsSpeed: context.decisionSpeedDays === 'ASAP' || context.stage === 'idea',
    isImmigrant: context.isImmigrant,
    isUnderrepresented: context.isUnderrepresented,
    isVeteran: context.isVeteran,
    willingToDropOut: context.willingToDropOut,
  }
}
