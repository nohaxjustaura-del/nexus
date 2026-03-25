import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { aiNativeMatchVCs } from '@/lib/ai-native-matching'
import { logger } from '@/lib/logger'
import { validatePitchIdea } from '@/lib/content-validator'
import { ADMIN_EMAIL, CREDIT_COSTS } from '@/lib/constants'
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit'
import { parseJSON } from '@/lib/utils'
import { getComprehensiveFounderContext, buildAIPromptContext } from '@/lib/founder-context'
import { analyzeAgainstYCTrends, getCurrentYCTrends } from '@/lib/yc-trends'
import { generateBatchMatchRationale } from '@/lib/ai-match-rationale'
import { hasOpenRouterKey, openrouterGenerateJson } from '@/lib/openrouter'
import { getPersonalizedVCRecommendations } from '@/lib/predictive-matching'
import { buildFounderSnapshot } from '@/lib/file-storage'
import { getDeepMarketContext } from '@/lib/market-intelligence'
import { runUniversalAnalysis, type FounderDossier } from '@/lib/universal-analysis-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Rate limiting - check before processing
  const rateLimitResponse = await rateLimitMiddleware(request, {
    ...RATE_LIMITS.AI_ANALYSIS,
    identifier: 'analyze-pitch-idea',
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // 🚀 OPTIMIZED: Simplified logging (remove redundant try-catch)
  try {
    logger.log('[ANALYZE-PITCH-IDEA] Starting analysis')
    
    let user
    try {
      user = await getCurrentUser()
    } catch (authError: any) {
      logger.error('[ANALYZE-PITCH-IDEA] Auth error:', authError)
      return NextResponse.json(
        { 
          error: 'Authentication Error',
          message: 'Failed to authenticate user. Please try logging in again.',
        }, 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // 🚀 OPTIMIZED: Simpler error handling
    const founder = await db.founder.findUnique({
      where: { email: user.email },
    })

    if (!founder) {
      return NextResponse.json(
        { error: 'Founder profile not found. Please complete onboarding first.' },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Accept either JSON (text idea) or FormData (file upload or text field)
    const contentType = request.headers.get('content-type') || ''
    let idea = ''

    let voiceRecordingId: string | null = null

    if (contentType.includes('multipart/form-data')) {
      // FormData - could be file upload or text field
      try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const ideaField = formData.get('idea') as string | null
        voiceRecordingId = (formData.get('voiceRecordingId') as string) || null
        
        if (file && file.size > 0) {
          // File upload
          const fileBuffer = await file.arrayBuffer()
          const fileText = new TextDecoder().decode(fileBuffer)
          idea = fileText.trim()
          logger.log(`[ANALYZE-PITCH-IDEA] File upload: ${file.name}`)
        } else if (ideaField) {
          idea = ideaField.trim()
          logger.log(`[ANALYZE-PITCH-IDEA] Text via FormData (${idea.length} chars)`)
        } else {
          return NextResponse.json(
            { error: 'Either a file or idea text is required' },
            { 
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      } catch (formError: any) {
        logger.error('[ANALYZE-PITCH-IDEA] FormData error:', formError)
        return NextResponse.json(
          { 
            error: 'Invalid Request',
            message: 'Could not parse form data.',
            details: formError?.message,
          },
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    } else {
      // JSON text idea
      try {
        const body = await request.json()
        idea = body.idea || ''
        logger.log(`[ANALYZE-PITCH-IDEA] Text via JSON (${idea.length} chars)`)
      } catch (jsonError: any) {
        logger.error('[ANALYZE-PITCH-IDEA] JSON parse error:', jsonError)
        return NextResponse.json(
          { 
            error: 'Invalid Request',
            message: 'Could not parse JSON body.',
            details: jsonError?.message,
          },
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    if (!idea || !idea.trim()) {
      return NextResponse.json(
        { 
          error: 'Pitch Idea Required',
          message: 'No pitch idea was provided',
          whatWentWrong: 'You need to provide a pitch idea to analyze',
          whyItFailed: 'The system requires text content to analyze',
          howToFix: [
            'Enter your pitch idea in the text field',
            'Or upload a text file containing your pitch idea',
            'Make sure your idea is at least 50 characters long',
            'Describe your startup idea, problem, solution, and market',
          ],
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // VALIDATE CONTENT FIRST - before checking credits
    try {
      const validation = await validatePitchIdea(idea)
      if (!validation.isValid) {
        let whatWentWrong = 'Your content does not appear to be a pitch idea'
        let whyItFailed = validation.reason || 'Content validation failed'
        let howToFix = [
          'Make sure you\'re describing a startup idea or business concept',
          'Include details about: problem, solution, market, customers, or business model',
          'Remove any non-pitch content (assignments, recipes, random text, etc.)',
          'Add more context about your startup or business idea',
        ]
        
        if (idea.length < 50) {
          whatWentWrong = 'Your pitch idea is too short'
          whyItFailed = `Minimum 50 characters required, you have ${idea.length}`
          howToFix = [
            'Expand your pitch idea with more details',
            'Describe the problem you\'re solving',
            'Explain your solution and target market',
            'Add information about your business model or traction',
          ]
        } else if (idea.length > 50000) {
          whatWentWrong = 'Your pitch idea is too long'
          whyItFailed = `Maximum 50,000 characters allowed, you have ${idea.length}`
          howToFix = [
            'Summarize your pitch idea to under 50,000 characters',
            'Focus on the key points: problem, solution, market, traction',
            'Remove unnecessary details or split into multiple analyses',
          ]
        }
        
        return NextResponse.json(
          {
            error: 'Invalid Content',
            message: validation.reason || 'The uploaded content does not appear to be a pitch idea.',
            whatWentWrong,
            whyItFailed,
            howToFix,
            validationFailed: true,
            confidence: validation.confidence,
            contentLength: idea.length,
          },
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
      
      logger.log(`[ANALYZE-PITCH-IDEA] Validated (${validation.confidence}%)`)
    } catch (validationError: any) {
      logger.error('[ANALYZE-PITCH-IDEA] Validation failed:', validationError)
    }

    // Check credits (admin bypass) - but don't deduct yet
    if (user.email !== ADMIN_EMAIL) {
      const userCredits = await db.userCredits.findUnique({
        where: { userId: user.id },
      })

      if (!userCredits || (!userCredits.isPremium && (userCredits.credits ?? 0) < CREDIT_COSTS.PITCH_IDEA)) {
        const creditsNeeded = CREDIT_COSTS.PITCH_IDEA - (userCredits?.credits ?? 0)
        return NextResponse.json(
          { 
            error: 'Insufficient Credits',
            message: `Pitch idea analysis costs ${CREDIT_COSTS.PITCH_IDEA} credits. You have ${userCredits?.credits ?? 0} credits.`,
            whatWentWrong: `You need ${creditsNeeded} more credit${creditsNeeded > 1 ? 's' : ''} to analyze your pitch idea`,
            whyItFailed: 'Each analysis uses credits to cover AI processing costs',
            howToFix: [
              'Claim your daily free credits (available every 24 hours)',
              'Purchase additional credits from your account page',
              'Upgrade to Premium for unlimited analyses',
              'Wait until you have enough credits from daily claims',
            ],
            requiresPayment: true,
            creditCost: CREDIT_COSTS.PITCH_IDEA,
            currentCredits: userCredits?.credits ?? 0,
            creditsNeeded,
          },
          { 
            status: 402,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Analyze pitch idea with AI (credits will be deducted after successful analysis)
    // ✅ Use OpenRouter for reliable AI analysis
    if (!hasOpenRouterKey()) {
      return NextResponse.json(
        {
          error: 'Service Unavailable',
          message:
            'OpenRouter is not configured. Please set OPENROUTER_API_KEY in your environment variables and restart the dev server.',
          requiresConfiguration: true,
        },
        {
          status: 503,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    // 🆕 Get COMPLETE founder context for maximum AI accuracy
    const founderContext = await getComprehensiveFounderContext(founder.email)
    const contextPrompt = founderContext ? buildAIPromptContext(founderContext) : ''
    
    // 🆕 Analyze against current YC trends
    let ycTrendsAnalysis
    if (founderContext) {
      try {
        ycTrendsAnalysis = await analyzeAgainstYCTrends({
          age: founderContext.age,
          education: founderContext.education,
          isStudent: founderContext.isStudent,
          willingToDropOut: founderContext.willingToDropOut,
          sectors: founderContext.sectors,
          stage: founderContext.stage,
          revenue: founderContext.revenue,
          users: founderContext.users,
          growthRate: founderContext.growthRate,
          teamSize: founderContext.teamSize,
          skills: [],
          background: founderContext.bio || '',
        })
      } catch (e) {
        logger.log('[ANALYZE-PITCH-IDEA] YC trends analysis failed (non-critical)')
      }
    }

    // 🚀 OPTIMIZED: Concise prompt for faster responses
    const analysisPrompt = `Expert VC analyst. Analyze this pitch:

${contextPrompt ? `FOUNDER: ${contextPrompt.substring(0, 500)}\n\n` : ''}${ycTrendsAnalysis?.insights[0] ? `TREND: ${ycTrendsAnalysis.insights[0].title}\n\n` : ''}PITCH: "${idea.substring(0, 2000)}"

JSON format:
{
  "strengths": ["3-5 strengths"],
  "improvements": ["3-5 improvements"],
  "suggestions": ["3-5 actionable steps"],
  "marketFit": "brief assessment",
  "uniqueness": "competitive advantage",
  "riskFactors": ["2-3 risks"],
  "founderFit": 75,
  "ycFitScore": 70
}

Be specific and actionable.`

    try {
      const aiAnalysis = await openrouterGenerateJson<any>({
        system:
          'You are an expert VC analyst. Provide detailed, actionable feedback on startup pitch ideas. Always respond with valid JSON.',
        user: analysisPrompt,
        temperature: 0.7,
        model: 'meta-llama/llama-3.3-70b-instruct', // Fast, high-quality model
      })

      // Mirror previous behavior: store as JSON text for downstream logic
      const analysisText = JSON.stringify(aiAnalysis)
      let analysis: any = {}
      try {
        analysis = JSON.parse(analysisText)
      } catch {
        analysis = aiAnalysis
      }

      // (rest of handler expects `analysis` to exist below)

      // Deduct credits AFTER successful analysis (admin bypass)
      if (user.email !== ADMIN_EMAIL) {
        try {
          await db.userCredits.update({
            where: { userId: user.id },
            data: {
              credits: { decrement: CREDIT_COSTS.PITCH_IDEA },
            },
          })
          logger.log(`[ANALYZE-PITCH-IDEA] Deducted ${CREDIT_COSTS.PITCH_IDEA} credits`)
        } catch (creditError: any) {
          logger.error('[ANALYZE-PITCH-IDEA] Credit deduction failed:', creditError)
        }
      }

      // 🆕 AI-NATIVE MATCHING: Combined intelligent + vector matching (same as Video Pitch)
      // Uses 60% intelligent matching + 40% FAISS vector similarity + pattern boosts
      const { getCachedInvestors } = await import('@/lib/investor-cache')
      const investors = await getCachedInvestors()
      
      // Build enhanced founder data with all profile context
      const enhancedFounder = {
        ...founder,
        ...founderContext,
        sectors: parseJSON<string[]>(founder.sectors || '[]', []),
      }
      
      logger.log('[ANALYZE-PITCH-IDEA] Starting AI-native matching with FAISS...')
      logger.log(`[ANALYZE-PITCH-IDEA] Pitch idea length: ${idea.length} characters`)
      
      // Use aiNativeMatchVCs which combines:
      // 1. Rule-based intelligent matching (stage, sector, traction)
      // 2. FAISS vector similarity (semantic understanding)
      // 3. Pattern detection (university, accelerator, VC affiliations)
      // 4. Comprehensive founder context
      let matchedVCs = await aiNativeMatchVCs(
        enhancedFounder,
        investors,
        {
          pitchAnalysis: analysis,
          transcript: idea, // Use the pitch idea text as "transcript" for pattern detection
          resumeFeatures: undefined,
          useFAISS: true,
        }
      )
      
      logger.log(`[ANALYZE-PITCH-IDEA] AI-native matching completed: ${matchedVCs.length} matches found`)
      
      // Enhance matches with application recommendations based on combined scores
      matchedVCs = matchedVCs.map(match => {
        const vc = match.investor
        const sectors = parseJSON<string[]>(vc.sectors || '[]', [])
        const founderSectors = parseJSON<string[]>(founder.sectors || '[]', [])
        const sectorMatch = sectors.some((s: string) => 
          founderSectors.some((fs: string) => 
            fs.toLowerCase().includes(s.toLowerCase()) || 
            s.toLowerCase().includes(fs.toLowerCase())
          )
        )

        // Generate application recommendations based on COMBINED score
        const score = match.combinedScore || match.score || 0
        const vectorSim = (match.vectorSimilarity ?? 0) || 0

        let whyApply = `Strong ${sectorMatch ? 'sector' : 'stage'} fit with ${vc.firmName}'s investment thesis.`
        let bestApproach = 'Warm introduction preferred'
        let timing = 'Apply within 2-4 weeks'

        if (score >= 90) {
          whyApply = `🏆 Elite match! ${vc.firmName} actively invests in ${sectors.slice(0, 2).join(' and ')} at ${founder.stage} stage. Your pitch shows ${(vectorSim * 100).toFixed(0)}% semantic alignment with their thesis.`
          bestApproach = 'Warm introduction through portfolio founder or mutual connection'
          timing = 'Apply immediately - high priority match'
        } else if (score >= 80) {
          whyApply = `⭐️⭐️⭐️ Excellent match! ${vc.firmName} invests in ${sectors[0]} and your stage aligns. ${(vectorSim * 100).toFixed(0)}% semantic similarity indicates strong fit.`
          bestApproach = 'Warm introduction or personalized cold email with specific thesis alignment'
          timing = 'Apply within 1 week - strong match'
        } else if (score >= 70) {
          whyApply = `⭐️⭐️ Strong match with ${vc.firmName}. They invest in ${sectors[0]} and your stage aligns. ${(vectorSim * 100).toFixed(0)}% semantic similarity.`
          bestApproach = 'Warm introduction or personalized cold email with specific thesis alignment'
          timing = 'Apply within 1-2 weeks'
        } else if (score >= 60) {
          whyApply = `⭐️ Good match. ${vc.firmName} may be interested given your sector and traction. ${(vectorSim * 100).toFixed(0)}% semantic similarity.`
          bestApproach = 'Personalized cold email highlighting specific alignment points'
          timing = 'Apply within 2-4 weeks'
        } else {
          whyApply = `💡 Moderate fit. ${vc.firmName} may consider your pitch. Build more traction for stronger match.`
          bestApproach = 'Personalized cold email highlighting specific alignment points'
          timing = 'Apply when you have stronger traction metrics'
        }

        return {
          ...match,
          whyApply,
          bestApproach,
          timing,
        }
      })

      // 🆕 AI-NATIVE: Get current YC trends
      const currentTrends = getCurrentYCTrends()

      // 🆕 🚀 ULTRA-SPECIFIC AI RATIONALE: Generate hyper-personalized "Why This Match?" for top 20
      const top20Matches = matchedVCs.slice(0, 20)
      let aiRationales: string[] = []
      try {
        logger.log('[ANALYZE-PITCH-IDEA] Generating ultra-specific AI match rationales...')
        
        // 🆕 Detect special VC focus areas (student founders, Berkeley, etc.)
        const detectSpecialFocus = (vcName: string, vcBio?: string, vcThesis?: string): string | undefined => {
          const combined = `${vcName} ${vcBio || ''} ${vcThesis || ''}`.toLowerCase()
          if (combined.includes('student') || combined.includes('dorm room')) return 'student founders'
          if (combined.includes('berkeley') || combined.includes('skydeck')) return 'Berkeley-affiliated'
          if (combined.includes('stanford')) return 'Stanford-affiliated'
          if (combined.includes('dropout') || vcName.includes('1517')) return 'dropout founders'
          if (combined.includes('underrepresented') || combined.includes('diversity')) return 'diverse founders'
          if (combined.includes('ai-native') || combined.includes('llm')) return 'AI-native products'
          return undefined
        }
        
        aiRationales = await generateBatchMatchRationale(
          top20Matches.map(m => ({
            // Founder context (COMPREHENSIVE)
            pitchIdea: idea,
            founderName: founder.name,
            founderAge: founder.age || undefined,
            founderEducation: founder.education || undefined,
            founderStage: founder.stage,
            founderSectors: parseJSON<string[]>(founder.sectors, []),
            fundingNeed: founder.fundingNeed,
            isStudent: founderContext?.isStudent,
            hasTraction: !!(founder.revenue || founder.users),
            location: founder.location || undefined,
            bio: founder.bio || undefined,
            
            // VC context (ENRICHED)
            vcName: m.investor.name,
            vcFirmName: m.investor.firmName,
            vcStages: parseJSON<string[]>(m.investor.stages || '[]', []),
            vcSectors: parseJSON<string[]>(m.investor.sectors || '[]', []),
            vcCheckMin: m.investor.checkMin || m.investor.checkSizeMin,
            vcCheckMax: m.investor.checkMax || m.investor.checkSizeMax,
            vcThesis: m.investor.thesis || undefined,
            vcSpecialFocus: detectSpecialFocus(m.investor.firmName, m.investor.bio || undefined, m.investor.thesis || undefined),
            vcPortfolio: parseJSON<string[]>(m.investor.portfolio || '[]', []).slice(0, 5), // Recent investments
            vcBatch: getCurrentYCTrends().batch, // Current YC batch context
            
            // Match metadata - use combinedScore from AI-native matching
            matchScore: Math.round(m.combinedScore || m.score || 0),
            matchReasons: m.reasons || [],
          }))
        )
        
        logger.log(`[ANALYZE-PITCH-IDEA] Generated ${aiRationales.length} ultra-specific rationales`)
      } catch (rationaleError: any) {
        logger.error('[ANALYZE-PITCH-IDEA] AI rationale generation failed (non-critical):', rationaleError.message)
      }

      // 🆕 Build detailed rationale for top 20 matches
      const top20WithRationale = top20Matches.map((m, index) => {
        // Inject AI rationale as the first \"reason\" bullet so the UI shows it directly
        const aiReason = aiRationales[index]
        const matchReasons = m.reasons || []
        
        // Validate AI reason before injecting (prevent "undefined" strings)
        const validAiReason = aiReason && 
                             typeof aiReason === 'string' && 
                             aiReason.length > 10 && 
                             aiReason !== 'undefined' &&
                             !aiReason.toLowerCase().includes('undefined')
        
        const combinedReasons = validAiReason
          ? [aiReason, ...matchReasons]
          : matchReasons
        
        // Get combined score from AI-native matching
        const matchScore = Math.round(m.combinedScore || m.score || 0)
        const vectorSim = (m.vectorSimilarity ?? 0) * 100
      
        return {
        rank: index + 1,
        investor: {
          id: m.investor.id,
          name: m.investor.name,
          firmName: m.investor.firmName,
          bio: m.investor.bio,
          logoUrl: m.investor.logoUrl,
          stages: parseJSON<string[]>(m.investor.stages || '[]', []),
          sectors: parseJSON<string[]>(m.investor.sectors || '[]', []),
          checkMin: m.investor.checkMin || m.investor.checkSizeMin,
          checkMax: m.investor.checkMax || m.investor.checkSizeMax,
          geoFocus: parseJSON<string[]>(m.investor.geoFocus || '[]', []),
          thesis: m.investor.thesis,
          applicationUrl: m.investor.applicationUrl,
        },
        score: matchScore,
        similarity: matchScore,
        vectorSimilarity: vectorSim,
        confidence: m.confidence || 0.85,
        reasons: combinedReasons.slice(0, 5),
        suggestions: (m.suggestions || []).slice(0, 3),
        whyApply: m.whyApply,
        bestApproach: m.bestApproach,
        timing: m.timing,
        livePulse: m.livePulse ? {
          summary: m.livePulse.summary,
          conflict: m.livePulse.conflict,
          fromCache: m.livePulse.fromCache,
          signalStrength: m.livePulse.signalStrength ?? 0,
        } : null,
        detailedRationale: {
          summary: aiReason || combinedReasons[0] || 'Good potential match',
          matchFactors: {
            stage: combinedReasons.some((r) => r.toLowerCase().includes('stage')) ? 'Match' : 'Partial',
            sector: combinedReasons.some((r) => r.toLowerCase().includes('sector')) ? 'Match' : 'Partial',
            geography: combinedReasons.some((r) => r.toLowerCase().includes('geograp')) ? 'Match' : 'Acceptable',
            checkSize: combinedReasons.some((r) => r.toLowerCase().includes('check')) ? 'Match' : 'Acceptable',
            founderFit: combinedReasons.some((r) => r.includes('FIT') || r.includes('PERFECT')) ? 'Excellent' : 'Good',
          },
          whyThisVC: combinedReasons.filter((r) => r.includes('✓') || r.includes('🎓') || r.includes('⭐')).join(' | '),
          nextSteps: (m.suggestions || []).length > 0 ? m.suggestions[0] : 'Research this VC and prepare targeted outreach',
        },
        ycTrends: m.ycTrends,
      }})

      // 🆕 🤖 PREDICTIVE MATCHING: Re-rank based on founder's past interactions
      let personalizedMatches = top20WithRationale
      try {
        logger.log('[ANALYZE-PITCH-IDEA] Applying predictive matching...')
        
        // Convert to format expected by predictive matching - use matchedVCs
        const baseMatches = matchedVCs.slice(0, 20)
        const reranked = await getPersonalizedVCRecommendations(
          founder.id,
          baseMatches,
          20
        )
        
        // Re-apply the rich rationale data to the reranked results
        personalizedMatches = reranked.map((rm, idx) => {
          // Find the original match with rationale
          const original = top20WithRationale.find(m => m.investor.id === rm.investor.id)
          if (original) {
            return { ...original, rank: idx + 1 }
          }
          return {
            rank: idx + 1,
            investor: {
              id: rm.investor.id,
              name: rm.investor.name,
              firmName: rm.investor.firmName,
              bio: rm.investor.bio,
              logoUrl: rm.investor.logoUrl,
              stages: parseJSON<string[]>(rm.investor.stages || '[]', []),
              sectors: parseJSON<string[]>(rm.investor.sectors || '[]', []),
              checkMin: rm.investor.checkMin || rm.investor.checkSizeMin,
              checkMax: rm.investor.checkMax || rm.investor.checkSizeMax,
              geoFocus: parseJSON<string[]>(rm.investor.geoFocus || '[]', []),
              thesis: rm.investor.thesis,
              applicationUrl: rm.investor.applicationUrl,
            },
            score: Math.round(rm.personalizedScore || rm.score || 0),
            similarity: Math.round(rm.personalizedScore || rm.score || 0),
            vectorSimilarity: 0,
            confidence: 0.85,
            reasons: [rm.reason || 'Recommended based on your preferences'],
            suggestions: [],
            whyApply: undefined,
            bestApproach: undefined,
            timing: undefined,
            livePulse: null,
            detailedRationale: {
              summary: rm.reason || 'Recommended based on your preferences',
              matchFactors: { stage: 'Match', sector: 'Match', geography: 'Match', checkSize: 'Match', founderFit: 'Good' },
              whyThisVC: rm.reason || '',
              nextSteps: 'Research this VC and prepare targeted outreach',
            },
            ycTrends: undefined,
          }
        })
        
        logger.log('[ANALYZE-PITCH-IDEA] Predictive matching applied successfully')
      } catch (predError: any) {
        logger.warn('[ANALYZE-PITCH-IDEA] Predictive matching failed (non-critical):', predError.message)
        // Keep original matches if predictive fails
      }

      // -----------------------------------------------------------------------
      // UNIVERSAL ANALYSIS ENGINE — rubric scoring with Exa market intelligence
      // -----------------------------------------------------------------------
      let rubricAnalysis: any = null
      try {
        const sectors = parseJSON<string[]>(founder.sectors || '[]', [])
        const domain = sectors[0] || analysis?.sectorFit?.primarySector || 'technology'
        const problem = analysis?.marketFit || idea.substring(0, 300)

        logger.log('[ANALYZE-PITCH-IDEA] Running Market Intelligence + Universal Analysis Engine...')

        const marketContext = await getDeepMarketContext(domain, problem)

        const dossier: FounderDossier = {
          startup: founder.startupName || 'Unknown',
          stage: founder.stage || 'seed',
          sectors,
          location: founder.location || founderContext?.location,
          businessModel: founder.businessModel || analysis?.businessModel,
          summary: idea.substring(0, 1500),
          transcript: undefined,
          education: founder.education || founderContext?.education,
          university: founderContext?.universityAffiliation,
          isStudent: founderContext?.isStudent,
          techBackground: founderContext?.techBackground,
          isImmigrant: founderContext?.isImmigrant,
          isVeteran: founderContext?.isVeteran,
          isUnderrepresented: founderContext?.isUnderrepresented,
          cofounders: founderContext?.cofounders,
          prevFunding: founderContext?.prevFunding,
          revenue: founder.revenue || analysis?.tractionMetrics?.revenue,
          users: founder.users || analysis?.tractionMetrics?.users,
          growth: founder.growthRate || analysis?.tractionMetrics?.growth,
          mrr: analysis?.tractionMetrics?.mrr,
          teamSize: founder.teamSize || founderContext?.teamSize,
          fundingNeed: founder.fundingNeed || founderContext?.fundingNeed,
          valueAddNeeds: parseJSON<string[]>(founder.valueAddNeeds || '[]', []),
        }

        rubricAnalysis = await runUniversalAnalysis(dossier, 'IDEA', marketContext)
        logger.log('[ANALYZE-PITCH-IDEA] Universal Analysis Engine completed successfully')
      } catch (rubricError: any) {
        logger.error('[ANALYZE-PITCH-IDEA] Universal Analysis Engine failed (non-critical):', rubricError?.message)
      }

      // Save pitch idea analysis to database for training data
      let pitchIdeaRecord: any = null
      try {
        pitchIdeaRecord = await (db as any).pitchIdeaAnalysis.create({
          data: {
            founderId: founder.id,
            ideaText: idea.substring(0, 50000), // Store the full pitch idea text
            analysisResult: JSON.stringify(analysis),
            smartMatchResults: JSON.stringify(personalizedMatches.slice(0, 10)),
            founderSnapshot: JSON.stringify(buildFounderSnapshot(founder)),
          },
        })
        logger.log(`[ANALYZE-PITCH-IDEA] Saved analysis to database: ${pitchIdeaRecord.id}`)

        // Link voice recording to this pitch idea analysis if one was used
        if (voiceRecordingId) {
          try {
            await (db as any).voiceRecording.update({
              where: { id: voiceRecordingId },
              data: { pitchIdeaAnalysisId: pitchIdeaRecord.id },
            })
            logger.log(`[ANALYZE-PITCH-IDEA] Linked voice recording ${voiceRecordingId} to analysis`)
          } catch (linkErr: any) {
            logger.error('[ANALYZE-PITCH-IDEA] Failed to link voice recording (non-critical):', linkErr.message)
          }
        }
      } catch (saveError: any) {
        logger.error('[ANALYZE-PITCH-IDEA] Failed to save analysis to database (non-critical):', saveError.message)
      }

      return NextResponse.json(
        {
          id: pitchIdeaRecord?.id || `analysis_${Date.now()}`,
          analysis: {
            ...analysis,
            rubricAnalysis: rubricAnalysis || null,
            founderContext: founderContext
              ? {
                  stage: founderContext.stage,
                  hasStrongTraction: founderContext.hasStrongTraction,
                  experienceLevel: founderContext.experienceLevel,
                  profileCompleteness: founderContext.profileCompleteness,
                }
              : undefined,
          },
          matches: personalizedMatches, // 🆕 Now personalized based on founder interactions + AI-native matching
          matchCount: matchedVCs.length,
          // 🆕 AI-native matching combines intelligent + vector matching (no separate smartMatches needed)
          ycTrends: {
            current: currentTrends,
            personalInsights: ycTrendsAnalysis?.insights || [],
            scoreBoost: ycTrendsAnalysis?.scoreAdjustment || 0,
            hotSectorMatches: ycTrendsAnalysis?.hotSectorMatches || [],
          },
          matchingMetadata: {
            totalInvestors: investors.length,
            matchesGenerated: matchedVCs.length,
            top20Selected: true,
            includedYCTrends: !!ycTrendsAnalysis,
            usedAINativeMatching: true, // 🆕 Combined intelligent + FAISS matching
            usedFullFounderContext: !!founderContext,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (aiError: any) {
      logger.error('[ANALYZE-PITCH-IDEA] Gemini AI error:', aiError)
      const msg = aiError?.message || 'Gemini request failed'
      const status = String(msg).includes('429') ? 429 : 500
      return NextResponse.json(
        {
          error: 'AI Analysis Failed',
          message: msg,
          provider: 'gemini',
        },
        { status, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (error: any) {
    // Safe error logging
    try {
      logger.error('[ANALYZE-PITCH-IDEA] Error:', error)
      logger.error('[ANALYZE-PITCH-IDEA] Error stack:', error?.stack)
    } catch {
      // Fallback to console if logger fails
      logger.error('[ANALYZE-PITCH-IDEA] Error:', error)
      logger.error('[ANALYZE-PITCH-IDEA] Error stack:', error?.stack)
    }
    
    // Ensure we always return JSON, never HTML
    const errorMessage = error?.message || String(error) || 'An unexpected error occurred'
    const errorDetails = process.env.NODE_ENV === 'development' && error?.stack 
      ? error.stack.split('\n').slice(0, 5).join('\n') 
      : undefined
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze pitch idea',
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

// GET endpoint for testing/debugging
export async function GET(request: NextRequest) {
  try {
    const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
    return NextResponse.json(
      { 
        status: 'ok',
        message: 'Pitch idea analysis endpoint is working',
        timestamp: new Date().toISOString(),
        hasGemini,
        hasOpenRouter: hasOpenRouterKey(),
        usesAINativeMatching: true, // Combined intelligent + FAISS matching
      },
      { 
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Endpoint error',
        message: error?.message || 'Unknown error',
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}


