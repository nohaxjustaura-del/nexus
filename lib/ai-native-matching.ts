/**
 * ===============================================================================
 * AI-NATIVE MATCHING SYSTEM - Combines Intelligent Matching + FAISS Vector Similarity
 * ===============================================================================
 * 
 * This system combines:
 * 1. Rule-based intelligent matching (stage, sector, traction signals)
 * 2. FAISS vector similarity (semantic understanding via embeddings)
 * 3. Comprehensive founder context (profile, pitch, video, resume)
 * 4. YC trends analysis (real-time market signals)
 * 
 * Scores are SYMBOLIC and TRANSPARENT - every point has evidence
 */

import { Investor } from "@prisma/client"
import { intelligentMatchVCs, EnhancedMatchResult } from "./intelligent-matching"
import { rankVCsForPitch, generatePitchEmbedding, RankedVC } from "./embeddings"
import { getComprehensiveFounderContext, buildAIPromptContext, ComprehensiveFounderContext } from "./founder-context"
import { ResumeFeatures } from "./ai"
import { parseJSON } from "./utils"
import { logger } from "./logger"

export interface AINativeMatchResult extends EnhancedMatchResult {
  investor: Investor
  // Combined scores
  intelligentScore: number // Rule-based score (0-100)
  vectorSimilarity: number // FAISS/cosine similarity (0-1, converted to 0-100)
  combinedScore: number // Weighted combination
  scoreBreakdown: {
    intelligent: { score: number; weight: number; reasons: string[] }
    vector: { score: number; weight: number; explanation: string }
    ycTrends?: { adjustment: number; insights: string[] }
  }
  // Rich context
  founderContext: ComprehensiveFounderContext | null
  pitchContext?: {
    transcript?: string
    analysis?: any
    features?: any
  }
}

/**
 * Detect VC affiliations and founder patterns from transcript using AI
 */
async function detectVCAffiliations(
  transcript: string,
  founderContext: ComprehensiveFounderContext | null
): Promise<{
  vcAffiliations: string[]
  universitySignals: string[]
  acceleratorSignals: string[]
  founderPatterns: string[]
  confidence: number
}> {
  if (!transcript || transcript.length < 50) {
    return {
      vcAffiliations: [],
      universitySignals: [],
      acceleratorSignals: [],
      founderPatterns: [],
      confidence: 0,
    }
  }

  try {
    const client = getAIClient()
    
    const detectionPrompt = `You are an expert VC pattern recognition system trained on 15,000+ founder profiles from YC, Sequoia, a16z, and 200+ VCs.

Analyze this pitch transcript and detect:
1. VC/Accelerator affiliations (YC, Techstars, 500 Global, etc.)
2. University signals (Stanford, MIT, Berkeley, Harvard, etc.)
3. Founder patterns (student founder, technical founder, repeat founder, etc.)
4. Previous funding signals (raised from X, backed by Y, etc.)

Transcript:
${transcript.substring(0, 5000)}

Founder Profile Context:
${founderContext ? `
- Education: ${founderContext.education || 'Not specified'}
- University: ${founderContext.universityAffiliation || 'Not specified'}
- Is Student: ${founderContext.isStudent}
- Age: ${founderContext.age || 'Not specified'}
- Location: ${founderContext.location}
- Stage: ${founderContext.stage}
- Sectors: ${founderContext.sectors.join(', ')}
- Previous Funding: ${founderContext.prevFunding || 'None'}
` : 'No profile context available'}

Return JSON with:
{
  "vcAffiliations": ["YC", "Techstars", etc.] - detected VC/accelerator affiliations
  "universitySignals": ["Stanford", "MIT", etc.] - universities mentioned or implied
  "acceleratorSignals": ["YC", "Techstars", etc.] - accelerator programs mentioned
  "founderPatterns": ["student founder", "technical founder", "repeat founder", "YC alumni", "Stanford student", etc.]
  "confidence": 0-100 - how confident you are in the detections
}

Be thorough - look for:
- Direct mentions: "YC", "Y Combinator", "Techstars", "Stanford", "MIT"
- Indirect signals: "batch", "cohort", "accelerator", "raised from", "backed by"
- Pattern matches: "building while in school" = student founder, "ex-Google" = technical founder
- University patterns: mentions of campus, dorm, college, university names

Return ONLY valid JSON.`

    const completion = await client.chat.completions.create({
      model: getModelName('gpt-4o'),
      messages: [
        {
          role: "system",
          content: "Expert VC pattern recognition system. Detect affiliations, universities, and founder patterns from pitch transcripts. Return valid JSON.",
        },
        {
          role: "user",
          content: detectionPrompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    
    return {
      vcAffiliations: result.vcAffiliations || [],
      universitySignals: result.universitySignals || [],
      acceleratorSignals: result.acceleratorSignals || [],
      founderPatterns: result.founderPatterns || [],
      confidence: result.confidence || 0,
    }
  } catch (error: any) {
    logger.warn('[AI-NATIVE-MATCHING] VC affiliation detection failed:', error?.message)
    return {
      vcAffiliations: [],
      universitySignals: [],
      acceleratorSignals: [],
      founderPatterns: [],
      confidence: 0,
    }
  }
}

/**
 * Build comprehensive pitch context from ALL available data
 * Now includes ALL founder profile, onboarding, and detected patterns
 */
function buildComprehensivePitchContext(
  founder: any,
  pitchAnalysis?: any,
  transcript?: string,
  resumeFeatures?: ResumeFeatures,
  founderContext?: ComprehensiveFounderContext | null,
  detectedPatterns?: {
    vcAffiliations: string[]
    universitySignals: string[]
    acceleratorSignals: string[]
    founderPatterns: string[]
  }
): any {
  const sectors = parseJSON<string[]>(founder.sectors || '[]', [])
  const valueAddNeeds = parseJSON<string[]>(founder.valueAddNeeds || '[]', [])
  const ethicsTags = parseJSON<string[]>(founder.ethicsTags || '[]', [])
  const personalityTags = parseJSON<string[]>(founder.personalityTags || '[]', [])
  
  // Build rich context from ALL sources
  const context = {
    // Core startup info
    companyName: founder.startupName || 'Unknown',
    oneLineSummary: pitchAnalysis?.oneLineSummary || founder.bio?.substring(0, 200) || '',
    stage: founder.stage,
    sectorPrimary: sectors[0] || '',
    sectorSecondary: sectors.slice(1),
    
    // Problem & Solution (from pitch analysis, bio, or transcript)
    problemStatement: pitchAnalysis?.problemStatement || founder.bio?.substring(0, 500) || transcript?.substring(0, 500) || '',
    solutionDescription: pitchAnalysis?.solutionDescription || founder.businessModel || '',
    
    // Customer
    targetCustomer: {
      customerType: pitchAnalysis?.targetCustomer || '',
      buyerRole: '',
      companySize: '',
    },
    
    // Geography
    geography: {
      hqLocation: founder.location,
      markets: [],
    },
    
    // Business model
    businessModel: founder.businessModel || pitchAnalysis?.businessModel || '',
    
    // Traction (from multiple sources - prioritize actual data)
    traction: {
      revenue: founder.revenue || pitchAnalysis?.tractionMetrics?.revenue || '',
      users: founder.users || pitchAnalysis?.tractionMetrics?.users || '',
      growthSignal: founder.growthRate || pitchAnalysis?.tractionMetrics?.growth || '',
      mrr: pitchAnalysis?.tractionMetrics?.mrr,
      arr: pitchAnalysis?.tractionMetrics?.arr,
    },
    
    // Technology & moat
    keyTechnologies: resumeFeatures?.skills?.programming || [],
    competitiveMoat: valueAddNeeds,
    
    // 🆕 ENHANCE: Founder background (from onboarding/profile)
    founderBackground: {
      education: founder.education || founderContext?.education || '',
      university: founderContext?.universityAffiliation || founder.universityAffiliation || '',
      isStudent: founderContext?.isStudent || founder.isStudent || false,
      age: founder.age || founderContext?.age,
      techBackground: founderContext?.techBackground || false,
      experienceLevel: founderContext?.experienceLevel || 'early',
      isImmigrant: founderContext?.isImmigrant || false,
      isUnderrepresented: founderContext?.isUnderrepresented || false,
      isVeteran: founderContext?.isVeteran || false,
      willingToDropOut: founder.willingToDropOut || founderContext?.willingToDropOut || false,
    },
    
    // 🆕 ENHANCE: Preferences (from onboarding)
    preferences: {
      valueAddNeeds: valueAddNeeds,
      ethicsTags: ethicsTags,
      personalityTags: personalityTags,
      geoPreference: founderContext?.geoPreference || '',
      decisionSpeedDays: founderContext?.decisionSpeedDays || '',
      targetOwnershipMax: founderContext?.targetOwnershipMax || '',
      fundTypePreference: founderContext?.fundTypePreference || '',
      leadPreference: founderContext?.leadPreference || '',
    },
    
    // 🆕 ENHANCE: Detected patterns (VC affiliations, universities, etc.)
    detectedPatterns: detectedPatterns || {
      vcAffiliations: [],
      universitySignals: [],
      acceleratorSignals: [],
      founderPatterns: [],
    },
    
    // Keywords from ALL sources
    keywords: [
      ...sectors,
      founder.stage,
      founder.location,
      ...(resumeFeatures?.skills?.programming || []),
      ...(resumeFeatures?.skills?.ml || []),
      ...(founderContext?.universityAffiliation ? [founderContext.universityAffiliation] : []),
      ...(detectedPatterns?.vcAffiliations || []),
      ...(detectedPatterns?.universitySignals || []),
      ...(detectedPatterns?.founderPatterns || []),
    ],
    
    // Additional context
    transcript: transcript?.substring(0, 3000), // Increased to 3000 chars for better embedding
    teamSize: founder.teamSize,
    fundingNeed: founder.fundingNeed,
    
    // 🆕 ENHANCE: Additional profile data
    profileRichness: {
      bio: founder.bio || founderContext?.bio || '',
      linkedinUrl: founderContext?.linkedinUrl || '',
      websiteUrl: founderContext?.websiteUrl || '',
      prevFunding: founderContext?.prevFunding || '',
      prevFundingAmount: founderContext?.prevFundingAmount || '',
      cofounders: founderContext?.cofounders || '',
      hoursPerWeek: founderContext?.hoursPerWeek || '',
    },
  }
  
  return context
}

/**
 * AI-Native matching that combines intelligent matching + FAISS vector similarity
 * Uses ALL available founder data for maximum accuracy
 */
export async function aiNativeMatchVCs(
  founder: any,
  investors: Investor[],
  options: {
    pitchAnalysis?: any
    transcript?: string
    resumeFeatures?: ResumeFeatures
    useFAISS?: boolean
  } = {}
): Promise<AINativeMatchResult[]> {
  const { pitchAnalysis, transcript, resumeFeatures, useFAISS = true } = options
  
  // 1. Get comprehensive founder context (with error handling)
  let founderContext: ComprehensiveFounderContext | null = null
  try {
    founderContext = await getComprehensiveFounderContext(founder.email)
    logger.log(`[AI-NATIVE-MATCHING] Loaded founder context: ${founderContext ? 'Yes' : 'No'}`)
    if (founderContext) {
      logger.log(`[AI-NATIVE-MATCHING] Context includes: education=${founderContext.education}, university=${founderContext.universityAffiliation}, isStudent=${founderContext.isStudent}, sectors=${founderContext.sectors.length}`)
    }
  } catch (contextError: any) {
    logger.warn('[AI-NATIVE-MATCHING] Failed to get founder context:', contextError?.message)
    // Continue without context - matching will still work
  }
  
  // 🆕 ENHANCE: Detect VC affiliations and patterns from transcript
  let detectedPatterns: {
    vcAffiliations: string[]
    universitySignals: string[]
    acceleratorSignals: string[]
    founderPatterns: string[]
    confidence: number
  } = {
    vcAffiliations: [],
    universitySignals: [],
    acceleratorSignals: [],
    founderPatterns: [],
    confidence: 0,
  }
  
  if (transcript && transcript.length > 50) {
    try {
      detectedPatterns = await detectVCAffiliations(transcript, founderContext)
      logger.log(`[AI-NATIVE-MATCHING] Detected patterns:`, {
        vcAffiliations: detectedPatterns.vcAffiliations,
        universities: detectedPatterns.universitySignals,
        patterns: detectedPatterns.founderPatterns,
        confidence: detectedPatterns.confidence,
      })
    } catch (patternError: any) {
      logger.warn('[AI-NATIVE-MATCHING] Pattern detection failed:', patternError?.message)
    }
  }
  
  // 2. Build comprehensive pitch context from ALL sources (now includes detected patterns)
  const pitchContext = buildComprehensivePitchContext(
    founder,
    pitchAnalysis,
    transcript,
    resumeFeatures,
    founderContext,
    detectedPatterns
  )
  
  // 3. Generate pitch embedding for vector similarity
  let vectorMatches: RankedVC[] = []
  let pitchEmbedding: number[] | null = null
  
  try {
    pitchEmbedding = await generatePitchEmbedding(pitchContext)
    
    // Try FAISS first (much faster)
    if (useFAISS) {
      try {
        vectorMatches = await rankVCsForPitch(pitchEmbedding, [], 50, true)
        logger.log('[AI-NATIVE-MATCHING] FAISS vector matching successful')
      } catch (faissError: any) {
        logger.warn('[AI-NATIVE-MATCHING] FAISS failed, using intelligent matching only:', faissError.message)
      }
    }
  } catch (embeddingError: any) {
    logger.warn('[AI-NATIVE-MATCHING] Embedding generation failed:', embeddingError.message)
  }
  
  // 4. Intelligent rule-based matching with ENHANCED founder data
  const resumeLikeFeatures: ResumeFeatures = resumeFeatures || {
    basics: {},
    education: founderContext?.education ? [{
      school: founderContext.education,
      degree: '',
      field: '',
    }] : [],
    experience: [],
    skills: {
      programming: [],
      ml: [],
      gtm: [],
      domain: [],
    },
    traction: {
      revenue: founder.revenue || founderContext?.revenue,
      users: founder.users || founderContext?.users,
      growth: founder.growthRate || founderContext?.growthRate,
    },
  }
  
  // 🆕 ENHANCE: Build enriched founder data with ALL profile factors
  const enrichedFounderData = {
    ...founder,
    sectors: parseJSON<string[]>(founder.sectors || '[]', []),
    age: founder.age || founderContext?.age,
    revenue: founder.revenue || founderContext?.revenue,
    users: founder.users || founderContext?.users,
    growthRate: founder.growthRate || founderContext?.growthRate,
    teamSize: founder.teamSize || founderContext?.teamSize,
    // 🆕 Add ALL onboarding/profile factors
    education: founder.education || founderContext?.education || '',
    universityAffiliation: founder.universityAffiliation || founderContext?.universityAffiliation || '',
    isStudent: founder.isStudent || founderContext?.isStudent || false,
    willingToDropOut: founder.willingToDropOut || founderContext?.willingToDropOut || false,
    isImmigrant: founderContext?.isImmigrant || false,
    isUnderrepresented: founderContext?.isUnderrepresented || false,
    isVeteran: founderContext?.isVeteran || false,
    techBackground: founderContext?.techBackground || false,
    experienceLevel: founderContext?.experienceLevel || 'early',
    valueAddNeeds: parseJSON<string[]>(founder.valueAddNeeds || '[]', []),
    ethicsTags: parseJSON<string[]>(founder.ethicsTags || '[]', []),
    personalityTags: parseJSON<string[]>(founder.personalityTags || '[]', []),
    bio: founder.bio || founderContext?.bio || '',
    prevFunding: founderContext?.prevFunding || '',
    prevFundingAmount: founderContext?.prevFundingAmount || '',
    // 🆕 Add detected patterns
    detectedVCAffiliations: detectedPatterns.vcAffiliations,
    detectedUniversities: detectedPatterns.universitySignals,
    detectedFounderPatterns: detectedPatterns.founderPatterns,
  }
  
  let intelligentMatches: EnhancedMatchResult[] = []
  try {
    intelligentMatches = await intelligentMatchVCs(
      resumeLikeFeatures,
      enrichedFounderData,
      investors
    )
    logger.log(`[AI-NATIVE-MATCHING] Intelligent matching completed: ${intelligentMatches.length} matches`)
  } catch (intelligentError: any) {
    logger.error('[AI-NATIVE-MATCHING] Intelligent matching failed:', intelligentError)
    logger.error('[AI-NATIVE-MATCHING] Intelligent error stack:', intelligentError?.stack)
    // Return empty array - will result in zero scores but won't crash
    intelligentMatches = []
  }
  
  // 5. Combine scores with transparency + pattern-based boosts
  const combinedMatches = investors.map(investor => {
    if (!investor || !investor.id) {
      logger.warn('[AI-NATIVE-MATCHING] Invalid investor in list, skipping')
      return null
    }
    
    // Find intelligent match
    const intelligentMatch = intelligentMatches.find(m => m?.investor?.id === investor.id)
    const intelligentScore = intelligentMatch?.score || 0
    
    // Find vector similarity match
    const vectorMatch = vectorMatches.find(m => m?.id === investor.id)
    const vectorSimilarity = (vectorMatch?.similarity ?? 0) || 0
    const vectorScore = Math.round(vectorSimilarity * 100) // Convert 0-1 to 0-100
    
    // 🆕 ENHANCE: Pattern-based score adjustments
    let patternBoost = 0
    const patternReasons: string[] = []
    const investorName = investor.firmName.toLowerCase()
    const investorThesis = (investor.thesis || '').toLowerCase()
    const sectors = parseJSON<string[]>(investor.sectors || '[]', [])
    
    // Boost for detected VC affiliations
    if (detectedPatterns.vcAffiliations.length > 0) {
      // Check if investor is mentioned in affiliations
      for (const affiliation of detectedPatterns.vcAffiliations) {
        const affLower = affiliation.toLowerCase()
        if (investorName.includes(affLower) || affLower.includes(investorName) || 
            investorThesis.includes(affLower)) {
          patternBoost += 15
          patternReasons.push(`Founder has ${affiliation} affiliation`)
        }
      }
    }
    
    // Boost for university matches
    if (detectedPatterns.universitySignals.length > 0 || founderContext?.universityAffiliation) {
      const universities = [
        ...detectedPatterns.universitySignals,
        founderContext?.universityAffiliation || '',
      ].filter(Boolean)
      
      for (const uni of universities) {
        const uniLower = uni.toLowerCase()
        // Stanford/Berkeley/MIT students often match with student-focused VCs
        if (uniLower.includes('stanford') || uniLower.includes('berkeley') || 
            uniLower.includes('mit') || uniLower.includes('harvard')) {
          // Boost for student-focused VCs
          if (investorName.includes('dorm room') || investorName.includes('1517') || 
              investorName.includes('neo') || investorName.includes('thiel')) {
            patternBoost += 10
            patternReasons.push(`${uni} student matches student-focused VC`)
          }
          // Boost for elite VCs that value top universities
          if (investorName.includes('sequoia') || investorName.includes('a16z') || 
              investorName.includes('benchmark') || investorName.includes('accel')) {
            patternBoost += 5
            patternReasons.push(`Elite university (${uni}) matches top-tier VC`)
          }
        }
      }
    }
    
    // Boost for founder pattern matches
    if (detectedPatterns.founderPatterns.length > 0) {
      for (const pattern of detectedPatterns.founderPatterns) {
        const patternLower = pattern.toLowerCase()
        
        // Student founder patterns
        if (patternLower.includes('student')) {
          if (investorName.includes('dorm room') || investorName.includes('1517') || 
              investorName.includes('neo')) {
            patternBoost += 12
            patternReasons.push('Student founder pattern matches student VC')
          }
        }
        
        // Technical founder patterns
        if (patternLower.includes('technical')) {
          if (sectors.some(s => s.toLowerCase().includes('devtools') || 
                             s.toLowerCase().includes('ai') || 
                             s.toLowerCase().includes('ml'))) {
            patternBoost += 8
            patternReasons.push('Technical founder matches tech-focused VC')
          }
        }
        
        // YC alumni pattern
        if (patternLower.includes('yc') || patternLower.includes('y combinator')) {
          // YC alumni often get follow-on funding from top VCs
          if (investorName.includes('sequoia') || investorName.includes('a16z') || 
              investorName.includes('lightspeed') || investorName.includes('index')) {
            patternBoost += 10
            patternReasons.push('YC alumni pattern matches top-tier VC')
          }
        }
      }
    }
    
    // Weighted combination (60% intelligent, 40% vector) + pattern boost
    const intelligentWeight = 0.6
    const vectorWeight = 0.4
    
    const baseCombinedScore = Math.round(
      intelligentScore * intelligentWeight + 
      vectorScore * vectorWeight
    )
    
    // Apply pattern boost (capped at 100)
    const combinedScore = Math.min(100, baseCombinedScore + patternBoost)
    
    // Build transparent score breakdown
    const scoreBreakdown = {
      intelligent: {
        score: intelligentScore,
        weight: intelligentWeight,
        reasons: intelligentMatch?.reasons || [],
      },
      vector: {
        score: vectorScore,
        weight: vectorWeight,
        explanation: vectorMatch 
          ? `Semantic similarity: ${(vectorSimilarity * 100).toFixed(1)}% match based on pitch content, thesis alignment, and investment patterns`
          : 'Vector similarity unavailable',
      },
      ycTrends: intelligentMatch?.ycTrends ? {
        adjustment: intelligentMatch.ycTrends.scoreAdjustment || 0,
        insights: intelligentMatch.ycTrends.insights || [],
      } : undefined,
      patternBoost: patternBoost > 0 ? {
        boost: patternBoost,
        reasons: patternReasons,
        detectedPatterns: detectedPatterns,
      } : undefined,
    }
    
    return {
      investorId: investor.id,
      score: combinedScore,
      confidence: Math.min(95, Math.max(50, combinedScore)), // Confidence based on score
      reasons: [
        ...(intelligentMatch?.reasons || []),
        vectorMatch ? `High semantic similarity (${(vectorSimilarity * 100).toFixed(1)}%)` : '',
      ].filter(Boolean),
      suggestions: intelligentMatch?.suggestions || [],
      detailedReasons: intelligentMatch?.detailedReasons || [],
      strengths: intelligentMatch?.strengths || [],
      weaknesses: intelligentMatch?.weaknesses || [],
      investor,
      // Combined scores
      intelligentScore,
      vectorSimilarity: vectorSimilarity,
      combinedScore,
      scoreBreakdown,
      // Rich context
      founderContext,
      pitchContext: transcript || pitchAnalysis ? {
        transcript: transcript?.substring(0, 1000) || '',
        analysis: pitchAnalysis || {},
        features: pitchContext || {},
      } : undefined,
      // 🆕 Detected patterns
      detectedPatterns: detectedPatterns.confidence > 0 ? detectedPatterns : undefined,
    } as AINativeMatchResult
  })
  
  // Filter out any null matches
  const validMatches = combinedMatches.filter((match): match is AINativeMatchResult => match !== null)
  
  // 6. Sort by combined score (descending)
  validMatches.sort((a, b) => b.combinedScore - a.combinedScore)
  
  // 7. Add symbolic score explanations
  return validMatches.map(match => {
    // Add symbolic score interpretation
    let scoreSymbol = '⭐'
    let scoreMeaning = ''
    
    if (match.combinedScore >= 90) {
      scoreSymbol = '🏆'
      scoreMeaning = 'Elite match - Top tier VCs (Sequoia, Benchmark, a16z) would take meeting'
    } else if (match.combinedScore >= 80) {
      scoreSymbol = '⭐️⭐️⭐️'
      scoreMeaning = 'Excellent match - Strong fit with top VCs (Lightspeed, Index, Greylock)'
    } else if (match.combinedScore >= 70) {
      scoreSymbol = '⭐️⭐️'
      scoreMeaning = 'Strong match - Good fit for seed VCs (Uncork, Homebrew, Initialized)'
    } else if (match.combinedScore >= 60) {
      scoreSymbol = '⭐️'
      scoreMeaning = 'Good match - Suitable for micro-VCs and accelerators (YC, Techstars)'
    } else {
      scoreSymbol = '💡'
      scoreMeaning = 'Moderate match - Build more traction before approaching'
    }
    
    return {
      ...match,
      scoreSymbol,
      scoreMeaning,
    }
  })
}
