import { NextRequest, NextResponse } from 'next/server'
import { extractResumeFeatures, ResumeFeatures } from '@/lib/ai'
import { db } from '@/lib/db'
import { intelligentMatchVCs, analyzeResumeContext, recommendFellowships } from '@/lib/intelligent-matching'
import { parseJSON } from '@/lib/utils'
import { validateResume, validateFile } from '@/lib/resume-validator'
import { loadReferenceResume, extractReferencePatterns } from '@/lib/resume-reference'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Resume analysis has been disabled - we cannot effectively use resumes to match founders with VCs
  return NextResponse.json(
    { 
      error: 'Feature Disabled',
      message: 'Resume analysis is no longer available. Please use Video Pitch or Pitch Deck analysis instead.',
      redirect: '/founder/video-pitch'
    },
    { status: 410 } // 410 Gone - resource no longer available
  )
  
  /* DISABLED - Resume analysis removed from platform
  try {
    logger.log('[ANALYZE-RESUME] Starting resume analysis request...')
    let formData: FormData
    try {
      formData = await request.formData()
      logger.log('[ANALYZE-RESUME] Form data parsed successfully')
    } catch (formError: any) {
      logger.error('[ANALYZE-RESUME] Error parsing form data:', formError)
      return NextResponse.json({ 
        error: 'Invalid Request',
        message: 'Could not parse form data.',
        details: [formError?.message || 'Invalid form data format'],
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const file = formData.get('file') as File
    const founderDataStr = formData.get('founderData') as string
    const paymentVerified = formData.get('paymentVerified') === 'true'
    
    let founderData: any = {}
    try {
      founderData = founderDataStr ? JSON.parse(founderDataStr) : {}
    } catch (parseError: any) {
      logger.warn('[ANALYZE-RESUME] Error parsing founder data, using defaults:', parseError)
      founderData = {}
    }
    
    // Get current user
    const user = await getCurrentUser()
    
    // Fetch founder profile and preferences from database if user is logged in
    if (user && user.email) {
      try {
        const founder = await db.founder.findUnique({
          where: { email: user.email },
        })
        
        if (founder) {
          // Merge database data with provided data (provided data takes precedence)
          founderData = {
            ...founderData,
            email: founder.email,
            name: founder.name,
            age: founder.age,
            education: founder.education,
            gender: founder.gender || founderData.gender,
            willingToDropOut: founder.willingToDropOut || founderData.willingToDropOut,
            startupName: founder.startupName || founderData.startupName,
            stage: founder.stage || founderData.stage,
            sectors: founderData.sectors || JSON.parse(founder.sectors || '[]'),
            businessModel: founder.businessModel || founderData.businessModel,
            location: founder.location || founderData.location,
            fundingNeed: founder.fundingNeed || founderData.fundingNeed || 500,
            ethicsTags: founderData.ethicsTags || JSON.parse(founder.ethicsTags || '[]'),
            personalityTags: founderData.personalityTags || JSON.parse(founder.personalityTags || '[]'),
            valueAddNeeds: founderData.valueAddNeeds || JSON.parse(founder.valueAddNeeds || '[]'),
          }
          
          // Fetch preferences from FounderPrefs table
          try {
            const prefs = await (db as any).$queryRawUnsafe(
              `SELECT * FROM FounderPrefs WHERE email = ?`,
              user.email
            )
            if (prefs && prefs.length > 0) {
              const pref = prefs[0]
              founderData.geoPreference = pref.geoPreference || founderData.geoPreference
              founderData.decisionSpeedDays = pref.decisionSpeedDays || founderData.decisionSpeedDays
              founderData.targetOwnershipMax = pref.targetOwnershipMax || founderData.targetOwnershipMax
              founderData.fundTypePreference = pref.fundTypePreference || founderData.fundTypePreference
              founderData.leadPreference = pref.leadPreference || founderData.leadPreference
              // New diversity fields
              founderData.isImmigrant = pref.isImmigrant === 1 || pref.isImmigrant === true || founderData.isImmigrant
              founderData.isUnderrepresented = pref.isUnderrepresented === 1 || pref.isUnderrepresented === true || founderData.isUnderrepresented
              founderData.isStudent = pref.isStudent === 1 || pref.isStudent === true || founderData.isStudent
              founderData.isVeteran = pref.isVeteran === 1 || pref.isVeteran === true || founderData.isVeteran
            }
          } catch (prefError) {
            console.warn('Could not fetch preferences:', prefError)
            // Try Prisma model as fallback
            try {
              const prefs = await (db as any).founderPrefs.findUnique({
                where: { email: user.email },
              })
              if (prefs) {
                founderData.geoPreference = prefs.geoPreference || founderData.geoPreference
                founderData.decisionSpeedDays = prefs.decisionSpeedDays || founderData.decisionSpeedDays
                founderData.targetOwnershipMax = prefs.targetOwnershipMax || founderData.targetOwnershipMax
                founderData.fundTypePreference = prefs.fundTypePreference || founderData.fundTypePreference
                founderData.leadPreference = prefs.leadPreference || founderData.leadPreference
                founderData.isImmigrant = prefs.isImmigrant || founderData.isImmigrant
                founderData.isUnderrepresented = prefs.isUnderrepresented || founderData.isUnderrepresented
                founderData.isStudent = prefs.isStudent || founderData.isStudent
                founderData.isVeteran = prefs.isVeteran || founderData.isVeteran
              }
            } catch (prismaError) {
              console.warn('Could not fetch preferences via Prisma:', prismaError)
            }
          }
          
          // Fetch diversity info from FounderContact table
          try {
            const contact = await (db as any).$queryRawUnsafe(
              `SELECT * FROM FounderContact WHERE email = ?`,
              user.email
            )
            if (contact && contact.length > 0) {
              const c = contact[0]
              // Store any diversity-related fields if they exist
              // (These would need to be added to FounderContact schema if not already there)
            }
          } catch (contactError) {
            console.warn('Could not fetch contact info:', contactError)
          }
        }
      } catch (dbError) {
        console.warn('Could not fetch founder profile:', dbError)
        // Continue with provided founderData
      }
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type and size
    const fileValidation = validateFile(file)
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    // Payment check removed - using credit system instead (see below)

    // Extract text from file
    let resumeText: string
    try {
      resumeText = await file.text()
      
      // Validate we got actual text content
      if (!resumeText || resumeText.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Invalid File',
          message: 'The uploaded file appears to be empty or could not be read as text.',
          details: ['If this is a PDF, please ensure it contains selectable text (not scanned images)'],
        }, { status: 400 })
      }
    } catch (fileError: any) {
      console.error('Error reading file:', fileError)
      return NextResponse.json({ 
        error: 'File Read Error',
        message: 'Could not read the uploaded file.',
        details: [fileError?.message || 'Unknown error reading file'],
      }, { status: 400 })
    }
    
    // LENIENT VALIDATION: Validate that it's actually a resume BEFORE processing
    // We're very permissive here - if it looks remotely professional, we'll accept it
    const validation = await validateResume(resumeText)
    
    logger.log('[ANALYZE-RESUME] Validation result:', {
      isValid: validation.isValid,
      confidence: validation.confidence,
      reasons: validation.reasons.slice(0, 3), // Log first 3 reasons
    })
    
    if (!validation.isValid) {
      logger.warn('[ANALYZE-RESUME] Resume validation failed:', validation.reasons)
      return NextResponse.json({ 
        error: 'Invalid Resume Upload',
        message: 'This file does not appear to be a professional resume',
        details: validation.reasons,
        confidence: validation.confidence,
        requiresPayment: false, // Don't charge for invalid uploads
      }, { status: 400 })
    }

    // VERY LENIENT confidence threshold - accept if it has ANY professional signals
    if (validation.confidence < 25) {
      logger.warn('[ANALYZE-RESUME] Resume confidence too low:', validation.confidence)
      return NextResponse.json({
        error: 'Low Confidence Resume',
        message: 'The uploaded file may not be a complete resume. Please ensure it includes sections for Experience, Education, and Skills.',
        details: validation.reasons,
        confidence: validation.confidence,
        requiresPayment: false,
      }, { status: 400 })
    }
    
    logger.log('[ANALYZE-RESUME] Resume validated successfully with', validation.confidence, '% confidence')
    
    // Check and deduct credits for AI analysis (25 credits) - BEFORE processing
    const CREDIT_COST = 25
    const ADMIN_EMAIL = 'nohaxjustaura@gmail.com'
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[ANALYZE-RESUME] Checking credits...')
    }
    // user already defined above, reuse it
    if (user) {
      // Skip credit check for admin
      if (user.email === ADMIN_EMAIL) {
        console.log('[ANALYZE-RESUME] Admin user detected, skipping credit check')
      } else {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('[ANALYZE-RESUME] Fetching user credits for:', user.id)
          }
          let userCredits = await (db as any).userCredits.findUnique({
            where: { userId: user.id },
          })
          
          if (!userCredits) {
            userCredits = await (db as any).userCredits.create({
              data: {
                userId: user.id,
                credits: 0,
                isPremium: false,
              },
            })
          }
          
          // Check if user has enough credits or is premium
          if (!userCredits.isPremium && userCredits.credits < CREDIT_COST) {
            return NextResponse.json({
              error: `Insufficient credits. AI Resume Analysis costs ${CREDIT_COST} credits. You have ${userCredits.credits} credits.`,
              requiresPayment: true,
              creditCost: CREDIT_COST,
              currentCredits: userCredits.credits,
            }, { status: 402 })
          }
          
          // Deduct credits if not premium (before processing to ensure payment)
          if (!userCredits.isPremium) {
            await (db as any).userCredits.update({
              where: { userId: user.id },
              data: {
                credits: userCredits.credits - CREDIT_COST,
              },
            })
          }
        } catch (creditError: any) {
          console.error('Error checking/deducting credits:', creditError)
          // If credit system fails, still allow analysis (graceful degradation for beta)
          // In production, you might want to return an error here
        }
      }
    }
    
    // Load reference resume for pattern matching (fail gracefully if not available)
    let referenceResume: string | null = null
    try {
      referenceResume = await loadReferenceResume()
      if (referenceResume && referenceResume.length > 0) {
        console.log('✅ Loaded reference resume for pattern matching')
      }
    } catch (refError: any) {
      console.warn('Could not load reference resume, continuing without it:', refError?.message || refError)
      // Continue without reference resume - not critical
      referenceResume = null
    }
    
    // Use AI to extract structured features (or fallback to smart parsing)
    let features: ResumeFeatures
    
    try {
      if (process.env.OPENAI_API_KEY) {
        // Real AI extraction with reference resume for better pattern recognition
        features = await extractResumeFeatures(resumeText, referenceResume || undefined)
      } else {
        // Smart fallback: parse resume text intelligently with reference patterns
        let referencePatterns = null
        try {
          referencePatterns = referenceResume ? extractReferencePatterns(referenceResume) : null
        } catch (patternError: any) {
          console.warn('Could not extract reference patterns:', patternError?.message || patternError)
          referencePatterns = null
        }
        features = await smartParseResume(resumeText, founderData, referencePatterns)
      }
    } catch (extractionError: any) {
      console.error('Error extracting resume features:', extractionError?.message || extractionError)
      // Fallback to basic parsing if extraction fails
      try {
        features = await smartParseResume(resumeText, founderData, null)
      } catch (fallbackError: any) {
        console.error('Fallback parsing also failed:', fallbackError?.message || fallbackError)
        throw new Error(`Failed to parse resume: ${fallbackError?.message || 'Unknown parsing error'}`)
      }
    }

    // Validate features were extracted
    if (!features || !features.experience || features.experience.length === 0) {
      console.warn('Warning: No experience extracted from resume, using fallback')
      // Ensure we have at least basic features
      if (!features) {
        features = {
          basics: {},
          education: [],
          experience: [],
          skills: {},
        }
      }
    }

    // Analyze resume context
    const context = analyzeResumeContext(features, founderData)

    // Get all investors (fetch all fields needed for matching)
    let investors
    try {
      investors = await db.investor.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        firmName: true,
        verified: true,
        stages: true,
        sectors: true,
        checkMin: true,
        checkMax: true,
        geoFocus: true,
        leadFollow: true,
        fundSize: true,
        valueAddTags: true,
        ethicsTags: true,
        personalityType: true,
        decisionSpeed: true,
        applicationUrl: true,
        fundType: true,
        thesis: true,
        proofPoints: true,
        portfolio: true,
        ownershipTarget: true,
        responsivenessScore: true,
        notableInvestments: true,
        linkedinUrl: true,
        websiteUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    } catch (dbError: any) {
      console.error('Database error fetching investors:', dbError?.message || dbError)
      throw new Error(`Failed to fetch investors: ${dbError?.message || 'Database error'}`)
    }

    // Intelligent matching based on resume content
    let allMatches
    try {
      allMatches = await intelligentMatchVCs(features, founderData, investors)
    } catch (matchError: any) {
      console.error('Error matching VCs:', matchError?.message || matchError)
      throw new Error(`Failed to match VCs: ${matchError?.message || 'Matching error'}`)
    }

    // Check if user is premium or has credits (before calculating matches)
    let isPremium = false
    if (user) {
      try {
        const userCredits = await (db as any).userCredits.findUnique({
          where: { userId: user.id },
        })
        isPremium = userCredits?.isPremium || false
      } catch (e) {
        console.warn('Could not check premium status:', e)
      }
    }

    // Calculate overall compatibility score
    const avgScore = allMatches.length > 0 
      ? Math.round(allMatches.slice(0, 10).reduce((sum, m) => sum + m.score, 0) / Math.min(10, allMatches.length))
      : 65

    // For free tier: show 5 "good fit" matches (scores 60-85, not the absolute best)
    // For premium: show top 20 best matches
    let matchesToShow = allMatches
    if (!isPremium) {
      // Free tier: Get matches in the 60-85 range (good fit, not best fit)
      const goodFitMatches = allMatches.filter(m => m.score >= 60 && m.score <= 85)
      if (goodFitMatches.length >= 5) {
        // Take 5 random good fits to avoid always showing the same ones
        matchesToShow = goodFitMatches.sort(() => Math.random() - 0.5).slice(0, 5)
      } else {
        // Fallback: take top 5 if not enough good fits
        matchesToShow = allMatches.slice(0, 5)
      }
    }

    // Prepare matches for response with detailed breakdown
    const topMatches = (isPremium ? allMatches.slice(0, 20) : matchesToShow).map(m => ({
      investor: {
        id: m.investor.id,
        firmName: m.investor.firmName,
        name: m.investor.name,
        fundType: m.investor.fundType || 'VC',
        stages: parseJSON<string[]>(m.investor.stages, []),
        sectors: parseJSON<string[]>(m.investor.sectors, []),
        checkMin: m.investor.checkMin,
        checkMax: m.investor.checkMax,
        decisionSpeed: m.investor.decisionSpeed || '2-4 weeks',
        valueAddTags: parseJSON<string[]>(m.investor.valueAddTags, []),
        applicationUrl: m.investor.applicationUrl || '#',
      },
      score: m.score,
      confidence: m.confidence || 75,
      boosted: m.score > 85,
      boostReason: m.reasons.find((r: string) => r.includes('🎓') || r.includes('⚙️') || r.includes('💻') || r.includes('⚡')) || null,
      reasons: m.reasons || [],
      suggestions: m.suggestions || [],
      components: (m as any).components,
      // Add detailed breakdown if available
      detailedReasons: (m as any).detailedReasons || [],
      strengths: (m as any).strengths || [],
      weaknesses: (m as any).weaknesses || [],
    }))

    // Generate fellowship/accelerator recommendations
    const fellowshipRecs = recommendFellowships(features, founderData)
    
    // Generate analysis result
    const result = {
      analysis: {
        compatibilityScore: avgScore,
        confidence: 85,
        skills: extractSkills(features),
        experiences: extractExperiences(features),
        keywords: extractKeywords(features, founderData),
        gaps: identifyGaps(features, founderData, context),
        suggestions: generateSmartSuggestions(features, founderData, context),
        isStudent: context.isStudent,
        isTechnical: context.isTechnical,
        hasOpenSource: context.hasOpenSource,
        hasTraction: context.hasTraction,
      },
      matches: topMatches,
      matchCount: isPremium ? allMatches.length : matchesToShow.length,
      fellowships: fellowshipRecs,
      isPremium: isPremium,
      freeTierLimit: !isPremium ? 5 : undefined,
    }

    // Save analysis to database if user is logged in
    try {
      if (user && user.email) {
        // Find or create founder profile
        let founder = await db.founder.findUnique({
          where: { email: user.email },
        })

        if (!founder) {
          // Create founder profile if doesn't exist
          founder = await db.founder.create({
            data: {
              email: user.email,
              name: user.email.split('@')[0], // Use email prefix as default name
              stage: founderData.stage || 'seed',
              sectors: JSON.stringify(founderData.sectors || []),
              location: founderData.location || 'US',
              fundingNeed: founderData.fundingNeed || 500,
              ethicsTags: JSON.stringify(founderData.ethicsTags || []),
              personalityTags: JSON.stringify(founderData.personalityTags || []),
              valueAddNeeds: JSON.stringify(founderData.valueAddNeeds || []),
            },
          })
        }

        // Save analysis (create new entry each time - allows multiple analyses)
        await db.resumeAnalysis.create({
          data: {
            founderId: founder.id,
            resumeText: resumeText.substring(0, 10000), // Store first 10K chars
            resumeFileName: file.name,
            skills: JSON.stringify(extractSkills(features)),
            experiences: JSON.stringify(extractExperiences(features)),
            keywords: JSON.stringify(extractKeywords(features, founderData)),
            gaps: JSON.stringify(identifyGaps(features, founderData, context)),
            suggestions: JSON.stringify(generateSmartSuggestions(features, founderData, context)),
            topVCs: JSON.stringify(topMatches.slice(0, 10).map(m => m.investor.id)),
            compatibilityScore: avgScore,
            fullResult: JSON.stringify(result), // Store full result for easy retrieval
          },
        })

        console.log(`✅ Saved resume analysis for ${user.email}`)
      }
    } catch (saveError: any) {
      // Don't fail the request if save fails - just log it
      console.warn('Could not save analysis to database:', saveError?.message || saveError)
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Resume analysis error:', error)
    console.error('Error stack:', error?.stack)
    
    // Ensure we always return JSON, never HTML
    const errorMessage = error?.message || String(error) || 'Unknown error occurred'
    const errorDetails = process.env.NODE_ENV === 'development' && error?.stack 
      ? error.stack.split('\n').slice(0, 5).join('\n') 
      : undefined
    
    // Always return JSON with explicit content-type header
    return NextResponse.json(
      { 
        error: 'Failed to analyze resume',
        message: errorMessage,
        ...(errorDetails && { details: [errorDetails] }),
        timestamp: new Date().toISOString(),
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  }
}

// Smart parsing when OpenAI is not available - improved accuracy
async function smartParseResume(
  resumeText: string,
  founderData: any,
  referencePatterns?: ReturnType<typeof extractReferencePatterns> | null
): Promise<ResumeFeatures> {
  const text = resumeText.toLowerCase()
  const lines = resumeText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  // Use reference patterns if available to improve extraction
  if (referencePatterns) {
    // Match section structure from reference
    const referenceSections = referencePatterns.commonSections
    // Use similar parsing logic based on reference format
  }
  
  // Extract name from first few lines
  const nameMatch = resumeText.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m)
  const name = nameMatch ? nameMatch[1] : founderData.name

  // Extract email
  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const email = emailMatch ? emailMatch[0] : founderData.email

  // Extract location
  const locationMatch = resumeText.match(/(?:location|based in|address)[:]\s*([A-Z][a-z]+(?:,\s*[A-Z]{2})?)/i) ||
                      resumeText.match(/([A-Z][a-z]+),\s*([A-Z]{2}|[A-Z][a-z]+)/)
  const city = locationMatch ? locationMatch[1] : founderData.location?.split(',')[0]

  // Detect technical skills with better patterns
  const programmingSkills: string[] = []
  const mlSkills: string[] = []
  const techKeywords: Record<string, string> = {
    python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript',
    react: 'React', 'node.js': 'Node.js', node: 'Node.js',
    go: 'Go', rust: 'Rust', java: 'Java', cpp: 'C++', 'c++': 'C++',
    pytorch: 'PyTorch', tensorflow: 'TensorFlow', llm: 'LLMs',
    'machine learning': 'Machine Learning', ai: 'AI', 
    'deep learning': 'Deep Learning', transformers: 'Transformers',
    sql: 'SQL', aws: 'AWS', docker: 'Docker', kubernetes: 'Kubernetes',
    git: 'Git', mongodb: 'MongoDB', postgresql: 'PostgreSQL',
  }

  // Look for skills section
  let inSkillsSection = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    if (/skills|expertise|proficiencies|technical/i.test(line)) {
      inSkillsSection = true
      continue
    }
    if (inSkillsSection && (line.length < 3 || /experience|education|projects/i.test(line))) {
      inSkillsSection = false
    }
    if (inSkillsSection) {
      for (const [key, value] of Object.entries(techKeywords)) {
        if (line.includes(key)) {
          if (['pytorch', 'tensorflow', 'llm', 'machine learning', 'ai', 'deep learning', 'transformers'].includes(key)) {
            if (!mlSkills.includes(value)) mlSkills.push(value)
          } else {
            if (!programmingSkills.includes(value)) programmingSkills.push(value)
          }
        }
      }
    }
  }

  // Also check entire text if no skills section found
  if (programmingSkills.length === 0 && mlSkills.length === 0) {
    for (const [key, value] of Object.entries(techKeywords)) {
      if (text.includes(key)) {
        if (['pytorch', 'tensorflow', 'llm', 'machine learning', 'ai', 'deep learning', 'transformers'].includes(key)) {
          if (!mlSkills.includes(value)) mlSkills.push(value)
        } else {
          if (!programmingSkills.includes(value)) programmingSkills.push(value)
        }
      }
    }
  }

  // Detect leadership roles
  const leadership = /founder|ceo|cto|director|lead engineer|tech lead|manager|vp|vice president|head of|executive/i.test(resumeText)

  // Extract education entries
  const education: any[] = []
  const universities = [
    'stanford', 'mit', 'harvard', 'berkeley', 'carnegie mellon', 
    'caltech', 'cornell', 'yale', 'princeton', 'columbia', 'nyu',
    'ucla', 'uc berkeley', 'georgia tech', 'cmu', 'ut austin'
  ]
  
  // Look for education section
  let inEducationSection = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineLower = line.toLowerCase()
    if (/education|academic/i.test(lineLower)) {
      inEducationSection = true
      continue
    }
    if (inEducationSection && (/experience|work|skills|projects/i.test(lineLower))) {
      inEducationSection = false
    }
    if (inEducationSection || i < 20) { // Also check first 20 lines
      for (const uni of universities) {
        if (lineLower.includes(uni)) {
          const degreeMatch = line.match(/(bachelor|master|phd|doctorate|bs|ba|ms|ma|ph\.?d)/i)
          const yearMatch = line.match(/(20\d{2}|19\d{2})/)
          education.push({
            school: uni.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            degree: degreeMatch ? degreeMatch[1] : 'Degree',
            endYear: yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear(),
          })
          break
        }
      }
    }
  }

  // Extract work experience
  const experience: any[] = []
  let inExperienceSection = false
  let currentExp: any = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineLower = line.toLowerCase()
    
    if (/experience|work history|employment|professional/i.test(lineLower)) {
      inExperienceSection = true
      continue
    }
    if (inExperienceSection && (/education|skills|projects|summary/i.test(lineLower))) {
      inExperienceSection = false
      if (currentExp) {
        experience.push(currentExp)
        currentExp = null
      }
    }
    
    if (inExperienceSection || i < 30) {
      // Look for job title patterns
      const titleMatch = line.match(/(?:^|\s)(?:Senior|Junior|Lead|Principal|Staff)?\s*(Engineer|Developer|Manager|Director|Founder|CEO|CTO|Designer|Analyst|Consultant|Specialist)/i)
      const companyMatch = line.match(/(?:at|@)\s+([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd|Technologies|Systems)?)/i) ||
                          line.match(/^([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd|Technologies|Systems)?)/)
      const dateMatch = line.match(/(\d{4}|\w+\s+\d{4})\s*(?:-|–|to)\s*(\d{4}|present|current)/i)
      
      if (titleMatch && !currentExp) {
        currentExp = {
          title: titleMatch[0].trim(),
          org: companyMatch ? companyMatch[1].trim() : 'Company',
          start: dateMatch ? dateMatch[1] : undefined,
          end: dateMatch ? dateMatch[2] : undefined,
          sectors: founderData.sectors || [],
          skills: [...programmingSkills, ...mlSkills],
          highlights: [],
        }
      } else if (currentExp && companyMatch && !currentExp.org.includes(companyMatch[1])) {
        currentExp.org = companyMatch[1].trim()
      }
    }
  }
  
  if (currentExp) {
    experience.push(currentExp)
  }
  
  // If no experience found, create a basic one
  if (experience.length === 0) {
    experience.push({
      title: leadership ? 'Founder/CTO' : programmingSkills.length > 0 ? 'Software Engineer' : 'Professional',
      org: founderData.startupName || 'Current Company',
      sectors: founderData.sectors || [],
      skills: [...programmingSkills, ...mlSkills],
      highlights: [],
    })
  }

  // Check if student/early
  const isStudent = /student|undergraduate|college|university|dropout|dropping out/i.test(resumeText) ||
    founderData.willingToDropOut ||
    (founderData.age && founderData.age < 23)

  // Detect traction metrics with ENHANCED patterns - check entire resume
  const traction: any = {}
  
  // Revenue patterns - VERY COMPREHENSIVE
  const revenuePatterns = [
    // Direct patterns: "$30K revenue", "$450K ARR", "$5K MRR"
    /(\$?\d+[km]?)\s*(mrr|arr|revenue|monthly\s+recurring|annual\s+recurring|recurring\s+revenue)/i,
    // In context: "Generated $30,000 in revenue", "Revenue: $450K"
    /(?:generated|revenue|recurring|earned|made)\s*[:\-]?\s*(\$?\d+[km]?)/i,
    // With commas: "$30,000", "$450,000"
    /\$(\d{1,3}(?:,\d{3})*(?:k|m)?)/i,
    // In bullet points: "- $30K revenue", "- Revenue: $450K"
    /[-•]\s*(?:revenue|mrr|arr)[:\-]?\s*(\$?\d+[km]?)/i,
  ]
  
  for (const pattern of revenuePatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      const value = parseMetric(match[1] || match[0])
      if (value > 0) {
        traction.revenue = Math.max(traction.revenue || 0, value)
        break
      }
    }
  }
  
  // User patterns - VERY COMPREHENSIVE
  const userPatterns = [
    // Direct: "1,200 users", "5K customers", "350 MAU"
    /(\d{1,3}(?:,\d{3})*(?:k|m)?)\s*(users|customers|mau|dau|active\s+users|subscribers|members|reps)/i,
    // With context: "Achieved 1,200 monthly active users"
    /(?:achieved|reached|grew\s+to|have|serving)\s+(\d{1,3}(?:,\d{3})*(?:k|m)?)\s*(?:monthly\s+active\s+)?(?:users|customers|mau|dau)/i,
    // In metrics sections: "Users: 1,200", "MAU: 5K"
    /(?:users|customers|mau|dau)[:\-]?\s*(\d{1,3}(?:,\d{3})*(?:k|m)?)/i,
    // With "across" or "serving": "450 sales reps across 22 companies"
    /(\d{1,3}(?:,\d{3})*(?:k|m)?)\s*(?:sales\s+)?(?:reps|users|customers)\s+(?:across|serving)/i,
  ]
  
  for (const pattern of userPatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      const value = parseMetric(match[1] || match[0])
      if (value > 0) {
        traction.users = Math.max(traction.users || 0, value)
        break
      }
    }
  }

  // Growth patterns - VERY COMPREHENSIVE
  const growthPatterns = [
    // Direct: "50% MoM", "28% month-over-month", "40% growth"
    /(\d+)%\s*(mom|yoy|growth|monthly|yearly|month-over-month|year-over-year|monthly\s+growth)/i,
    // In context: "Growing 50% month-over-month", "Growth: 40% MoM"
    /(?:growing|growth|grew)[:\-]?\s*(\d+)%/i,
    // With "for X months": "50% MoM for 4 consecutive months"
    /(\d+)%\s*(?:mom|monthly)\s+(?:for|over|consecutive)/i,
  ]
  
  for (const pattern of growthPatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      traction.growth = `${match[1]}% growth`
      break
    }
  }

  // Model Performance Metrics - NEW COMPREHENSIVE DETECTION
  const modelPerformance: any = {}
  
  // Accuracy patterns
  const accuracyPatterns = [
    /(\d+)%\s*accuracy/i,
    /accuracy[:\-]?\s*(\d+)%/i,
    /achieved\s+(\d+)%\s*accuracy/i,
    /(\d+)%\s*accuracy\s+vs\s+(\d+)%\s*baseline/i,
  ]
  
  for (const pattern of accuracyPatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      modelPerformance.accuracy = parseFloat(match[1])
      break
    }
  }
  
  // Latency/Performance patterns
  const latencyPatterns = [
    /(?:improved|reduced|decreased)\s+(?:latency|model\s+latency|build\s+times|inference\s+time)\s+by\s+(\d+)%/i,
    /(?:latency|inference\s+cost|build\s+time)[:\-]?\s*\$?(\d+\.?\d*)/i,
    /(\d+)%\s*(?:faster|improvement|reduction)\s+(?:in\s+)?(?:latency|performance|speed)/i,
  ]
  
  for (const pattern of latencyPatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      modelPerformance.latency = match[1]
      break
    }
  }
  
  // Benchmark patterns
  const benchmarkPatterns = [
    /(\d+)%\s*accuracy\s+vs\s+(\d+)%\s*(?:baseline|previous)/i,
    /(?:benchmark|evaluation|performance)[:\-]?\s*(\d+)%/i,
    /(\d+)x\s*(?:faster|better|improvement)/i,
  ]
  
  for (const pattern of benchmarkPatterns) {
    const match = resumeText.match(pattern)
    if (match) {
      modelPerformance.benchmark = match[0]
      break
    }
  }
  
  // Store model performance in traction if found
  if (Object.keys(modelPerformance).length > 0) {
    traction.modelPerformance = modelPerformance
  }

  // Detect open source
  const openSource: any = {}
  const starsMatch = resumeText.match(/(\d+)\+?\s*(github\s*)?stars/i)
  if (starsMatch) {
    openSource.stars = parseInt(starsMatch[1])
  }
  const reposMatch = resumeText.match(/(\d+)\+?\s*repos/i)
  if (reposMatch) {
    openSource.repos = parseInt(reposMatch[1])
  }

  // Calculate years of experience from date ranges
  const dateRanges = resumeText.match(/(\d{4}|\w+\s+\d{4})\s*(?:-|–|to)\s*(\d{4}|present|current)/gi) || []
  let totalYears = 0
  const seenRanges = new Set<string>()
  
  dateRanges.forEach(exp => {
    const match = exp.match(/(\d{4}|\w+\s+(\d{4}))\s*(?:-|–|to)\s*(\d{4}|present|current)/i)
    if (match && !seenRanges.has(exp)) {
      seenRanges.add(exp)
      const startYear = match[2] ? parseInt(match[2]) : parseInt(match[1])
      const endYear = match[3].toLowerCase() === 'present' || match[3].toLowerCase() === 'current' 
        ? new Date().getFullYear() 
        : parseInt(match[3])
      if (endYear >= startYear) {
        totalYears += (endYear - startYear)
      }
    }
  })

  return {
    basics: {
      name,
      email,
      city,
      country: 'US',
    },
    education: education.length > 0 ? education : [],
    experience,
    skills: {
      programming: programmingSkills,
      ml: mlSkills,
      gtm: [],
    },
    yearsExp: totalYears > 0 ? totalYears : (leadership ? 2 : 1),
    leadership,
    openSource: Object.keys(openSource).length > 0 ? openSource : undefined,
    traction: Object.keys(traction).length > 0 ? traction : undefined,
    isStudent,
  } as any
}

function parseMetric(str: string): number {
  const cleaned = str.replace(/[$,]/g, '')
  const num = parseFloat(cleaned)
  if (str.toLowerCase().includes('m')) return num * 1000000
  if (str.toLowerCase().includes('k')) return num * 1000
  return num
}

function extractSkills(features: ResumeFeatures): string[] {
  const skills: string[] = []
  if (features.skills.programming) skills.push(...features.skills.programming)
  if (features.skills.ml) skills.push(...features.skills.ml)
  if (features.skills.gtm) skills.push(...features.skills.gtm)
  if (features.skills.domain) skills.push(...features.skills.domain)
  if (features.leadership) skills.push('Leadership')
  if (features.yearsExp && features.yearsExp > 3) skills.push('Experienced Founder')
  return [...new Set(skills)].slice(0, 10)
}

function extractExperiences(features: ResumeFeatures): string[] {
  const exps: string[] = []
  
  features.experience?.forEach(exp => {
    const highlights = exp.highlights?.map(h => `${h.metric}: ${h.value}${h.unit}`).join(', ')
    exps.push(`${exp.title} at ${exp.org}${highlights ? ` (${highlights})` : ''}`)
  })

  if (features.openSource?.stars) {
    exps.push(`Open Source: ${features.openSource.stars}+ GitHub stars`)
  }

  if (features.traction?.revenue) {
    const rev = features.traction.revenue
    const formatted = rev > 1000 ? `$${(rev/1000).toFixed(0)}K` : `$${rev}`
    exps.push(`Traction: ${formatted} revenue`)
  }

  if (features.traction?.users) {
    const users = features.traction.users
    const formatted = users > 1000 ? `${(users/1000).toFixed(0)}K` : users
    exps.push(`${formatted} users`)
  }

  return exps.slice(0, 6)
}

function extractKeywords(features: ResumeFeatures, founderData: any): string[] {
  const keywords: Set<string> = new Set()
  
  features.experience?.forEach(exp => {
    exp.sectors?.forEach(s => keywords.add(s))
    exp.skills?.forEach(s => keywords.add(s))
  })

  founderData.sectors?.forEach((s: string) => keywords.add(s))
  
  if (features.leadership) keywords.add('Founder')
  if ((features as any).isStudent) keywords.add('Student Founder')
  if (features.openSource?.stars && features.openSource.stars > 100) keywords.add('Open Source Contributor')
  if (features.traction?.revenue) keywords.add('Revenue')
  if (features.traction?.users) keywords.add('User Traction')

  return Array.from(keywords).slice(0, 12)
}

function identifyGaps(
  features: ResumeFeatures,
  founderData: any,
  context: any
): string[] {
  const gaps: string[] = []
  const sectors = founderData.sectors || []

  // Check for missing metrics
  if (!features.traction?.revenue && !features.traction?.users) {
    gaps.push('No quantifiable traction metrics (users, revenue, or growth)')
  }

  // Check for sector-specific gaps
  if (sectors.includes('AI/ML')) {
    if (!features.skills?.ml || features.skills.ml.length === 0) {
      gaps.push('Limited ML/AI technical skills demonstrated')
    }
    if (!features.traction?.users && !resumeHasMetrics(features)) {
      gaps.push('Missing model performance metrics or evaluation benchmarks')
    }
  }

  if (sectors.includes('Developer Tools')) {
    if (!features.openSource?.stars) {
      gaps.push('No GitHub stars or open-source traction mentioned')
    }
  }

  if (sectors.includes('SaaS') || sectors.includes('Enterprise')) {
    if (!features.traction?.revenue) {
      gaps.push('Missing revenue (MRR/ARR) metrics')
    }
  }

  if (sectors.includes('Fintech')) {
    if (!/regulatory|compliance|license|bank partner/i.test(JSON.stringify(features))) {
      gaps.push('No mention of regulatory strategy or banking partnerships')
    }
  }

  // Generic gaps
  if (!features.openSource && sectors.some((s: string) => ['AI/ML', 'Developer Tools', 'SaaS'].includes(s))) {
    gaps.push('Consider adding GitHub profile or open-source projects')
  }

  if (gaps.length === 0) {
    gaps.push('Strong profile overall! Focus on highlighting specific metrics')
  }

  return gaps.slice(0, 4)
}

function resumeHasMetrics(features: ResumeFeatures): boolean {
  return features.experience?.some(exp => 
    exp.highlights && exp.highlights.length > 0
  ) || false
}

function generateSmartSuggestions(
  features: ResumeFeatures,
  founderData: any,
  context: any
): string[] {
  const suggestions: string[] = []
  const sectors = founderData.sectors || []

  // Student-specific suggestions
  if (context.isStudent) {
    suggestions.push('🎓 Target student-focused VCs: Dorm Room Fund, 1517 Fund, Bay Area Angels')
    suggestions.push('💪 Emphasize full-time commitment: "Dropped out to pursue full-time" or "Ready to go all-in"')
  }

  // Technical founder suggestions
  if (context.isTechnical) {
    if (!context.hasOpenSource) {
      suggestions.push('💻 For DevTools VCs: Open-source a component and target 200+ GitHub stars')
    }
    if (sectors.includes('AI/ML')) {
      suggestions.push('📊 For AI/ML VCs: Add "Model achieved 95% accuracy, 10x faster than GPT-4"')
    }
  }

  // Sector-specific suggestions
  if (sectors.includes('AI/ML') && !context.hasTraction) {
    suggestions.push('🔬 Include AI metrics: inference costs, evaluation benchmarks, latency improvements')
  }

  if (sectors.includes('SaaS') || sectors.includes('Enterprise')) {
    if (!features.traction?.revenue) {
      suggestions.push('💰 Add revenue metrics: "$15K MRR growing 25% MoM" or "3 enterprise pilots at $50K each"')
    }
    suggestions.push('📈 Include sales efficiency: "CAC payback in 8 months" or "Win rate: 35%"')
  }

  if (sectors.includes('Developer Tools')) {
    suggestions.push('⭐ Show OSS traction: "350+ GitHub stars, 50 weekly downloads, 15 contributors"')
    suggestions.push('⚡ Emphasize time-to-value: "Developers ship in <10 minutes"')
  }

  if (sectors.includes('Fintech')) {
    suggestions.push('🏦 Mention regulatory wins: "Partnered with Evolve Bank" or "Money transmitter license approved"')
  }

  if (sectors.includes('Climate Tech')) {
    suggestions.push('🌱 Include sustainability metrics: "TRL 7, pilot at 3 sites, 1000 tons CO2/year reduction"')
  }

  if (sectors.includes('Consumer')) {
    suggestions.push('📱 Add retention: "D7: 45%, D30: 28%, DAU/MAU: 0.35"')
  }

  // Generic high-impact
  if (suggestions.length < 3) {
    suggestions.push('🎯 Quantify every achievement: "Grew X from A to B in C months"')
    suggestions.push('🔗 Add product demo link, GitHub, or live product URL')
  }

  return suggestions.slice(0, 5)
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Feature Disabled',
    message: 'Resume analysis is no longer available. Please use Video Pitch or Pitch Deck analysis instead.'
  })
}
*/ // END DISABLED CODE - Resume analysis removed from platform
