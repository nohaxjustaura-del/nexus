import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { runMatchingPipeline } from '@/lib/matching/matching-orchestrator'
import { logger } from '@/lib/logger'
import { validatePitchIdea } from '@/lib/content-validator'
import { CREDIT_COSTS } from '@/lib/constants'
import { shouldEnforceAiCredits } from '@/lib/dev-ai-analysis-bypass'
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit'
import { parseJSON } from '@/lib/utils'
import { getComprehensiveFounderContext, buildAIPromptContext } from '@/lib/founder-context'
import { analyzeAgainstYCTrends, getCurrentYCTrends } from '@/lib/yc-trends'
import { generateBatchMatchRationale } from '@/lib/ai-match-rationale'
import { hasOpenRouterKey, openrouterGenerateJson, getAnalysisOpenRouterModel } from '@/lib/openrouter'
import { getPersonalizedVCRecommendations } from '@/lib/predictive-matching'
import { buildFounderSnapshot } from '@/lib/file-storage'
import { getDeepMarketContext } from '@/lib/market-intelligence'
import { runScoringPipeline } from '@/lib/scoring/scoring-pipeline'
import { analyzeFounderNotFoundResponse, analyzeUnauthorizedResponse } from '@/lib/analyze-routes/responses'

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
      return analyzeUnauthorizedResponse()
    }

    // 🚀 OPTIMIZED: Simpler error handling
    const founder = await db.founder.findUnique({
      where: { email: user.email },
    })

    if (!founder) {
      return analyzeFounderNotFoundResponse()
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
    if (shouldEnforceAiCredits(user.email)) {
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

    const ycTrendLine = ycTrendsAnalysis?.insights?.[0]
      ? `\nRELEVANT YC TREND: ${ycTrendsAnalysis.insights[0].title}${ycTrendsAnalysis.insights[0].description ? ` — ${ycTrendsAnalysis.insights[0].description}` : ''}\n`
      : ''

    const analysisPrompt = `You are conducting a deep analysis of a startup pitch. Think carefully before responding.

=== FOUNDER PROFILE ===
${contextPrompt || '(No founder profile data available)'}

=== PITCH CONTENT ===
${idea.substring(0, 8000)}
${ycTrendLine}
=== ANALYSIS FRAMEWORK ===

STEP 1 — REASONING (internal): Before generating your response, consider:
- What specific sub-sector or niche does this startup operate in? (e.g., not just "fintech" but "embedded payroll for gig economy platforms")
- What is the founder's unique insight or unfair advantage?
- What non-obvious market adjacencies or emerging categories does this touch?
- What would a domain-expert investor in this exact niche care about most?
- What specific competitors (including indirect ones) exist in this space?

STEP 2 — Generate your analysis with these requirements:

STRENGTHS: Identify 3-5 genuine strengths. Each must cite a specific element from the pitch or founder profile. Distinguish between strong signals (backed by evidence) and moderate signals (plausible but unverified). Prioritize niche-specific advantages over generic positives.

IMPROVEMENTS: Identify 3-5 areas for improvement. Be specific about WHAT is weak and WHY it matters for fundraising. Reference what investors in this specific sub-sector typically expect.

SUGGESTIONS: Provide 3-5 actionable next steps. Each should be achievable within 30-60 days and directly address a gap. Include specific tactics (not just "get more traction" — say HOW).

MARKET FIT: Assess the startup's positioning within its specific market niche. Reference the competitive landscape, timing factors, and whether the problem is acute enough to drive buyer urgency.

UNIQUENESS: Identify the specific competitive moat or wedge. Distinguish between real differentiation (proprietary data, network effects, regulatory advantage, deep domain expertise) and superficial differentiation ("we use AI").

RISK FACTORS: Identify 2-4 risks specific to THIS startup (not generic startup risks). Include at least one risk related to the competitive landscape and one related to execution.

SUB-SECTOR TAGS: Identify 2-4 specific niche tags that describe this startup's exact positioning (e.g., "vertical SaaS", "creator economy infrastructure", "climate-tech hardware", "AI-native dev tools").

Return valid JSON:
{
  "reasoning": "<2-3 sentences of your initial assessment — what makes this pitch interesting or concerning at first glance>",
  "strengths": ["<specific strength with evidence>", ...],
  "improvements": ["<specific gap with context>", ...],
  "suggestions": ["<actionable step with timeline>", ...],
  "marketFit": "<2-3 sentence assessment of market positioning and timing>",
  "uniqueness": "<specific competitive advantage analysis>",
  "riskFactors": ["<specific risk>", ...],
  "subSectorTags": ["<niche tag>", ...]
}`

    try {
      const aiAnalysis = await openrouterGenerateJson<any>({
        system:
          'You are a Principal at a Tier-1 VC firm with deep expertise across sectors. You have evaluated thousands of pitches and can identify non-obvious patterns, niche market opportunities, and founder-market fit signals that generalist analysts miss. Provide specific, evidence-based feedback grounded in the actual pitch content — never generic advice. Always respond with valid JSON.',
        user: analysisPrompt,
        temperature: 0.3,
        model: getAnalysisOpenRouterModel(),
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
      if (shouldEnforceAiCredits(user.email)) {
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

      // Matching Pipeline v3
      const { getCachedInvestors } = await import('@/lib/investor-cache')
      const investors = await getCachedInvestors()

      // Build enhanced founder data with all profile context
      const enhancedFounder = {
        ...founder,
        ...founderContext,
        sectors: parseJSON<string[]>(founder.sectors || '[]', []),
      }

      logger.log('[ANALYZE-PITCH-IDEA] Starting matching pipeline v3...')
      logger.log(`[ANALYZE-PITCH-IDEA] Pitch idea length: ${idea.length} characters`)

      let matchedVCs: any[] = []
      let matchPipelineResult: any = null
      try {
        matchPipelineResult = await runMatchingPipeline(
          founderContext ?? (enhancedFounder as unknown as import('@/lib/founder-context').ComprehensiveFounderContext),
          analysis,
          null, // idea route has no transcript
          undefined,
          { rawPitchText: idea },
        )

        // Adapter: expose m.investor so all downstream response code works unchanged
        matchedVCs = matchPipelineResult.rankedInvestors.map((r: any) => ({
          ...r,
          investor: r.vc,
          score: r.combinedScore,
          intelligentScore: r.combinedScore,
          vectorSimilarity: 0,
          confidence: r.investmentLikelihood.confidence === 'HIGH' ? 0.95
            : r.investmentLikelihood.confidence === 'MEDIUM' ? 0.80
            : 0.60,
          reasons: [],
          suggestions: [],
          detailedReasons: [],
          livePulse: null,
          ycTrends: undefined,
        }))

        logger.log(`[ANALYZE-PITCH-IDEA] Matching pipeline v3 completed: ${matchedVCs.length} matches found`)
      } catch (matchError: any) {
        logger.error('[ANALYZE-PITCH-IDEA] Matching pipeline error:', matchError)
        matchedVCs = []
      }

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
            stage: combinedReasons.some((r: string) => r.toLowerCase().includes('stage')) ? 'Match' : 'Partial',
            sector: combinedReasons.some((r: string) => r.toLowerCase().includes('sector')) ? 'Match' : 'Partial',
            geography: combinedReasons.some((r: string) => r.toLowerCase().includes('geograp')) ? 'Match' : 'Acceptable',
            checkSize: combinedReasons.some((r: string) => r.toLowerCase().includes('check')) ? 'Match' : 'Acceptable',
            founderFit: combinedReasons.some((r: string) => r.includes('FIT') || r.includes('PERFECT')) ? 'Excellent' : 'Good',
          },
          whyThisVC: combinedReasons.filter((r: string) => r.includes('✓') || r.includes('🎓') || r.includes('⭐')).join(' | '),
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
      // MULTI-PASS SCORING PIPELINE (replaces Universal Analysis Engine)
      // -----------------------------------------------------------------------
      let rubricAnalysis: any = null
      let scoringResult: Awaited<ReturnType<typeof runScoringPipeline>> | null = null
      try {
        const sectors = parseJSON<string[]>(founder.sectors || '[]', [])
        const domain = sectors[0] || 'technology'
        const problem = analysis?.marketFit || idea.substring(0, 300)

        logger.log('[ANALYZE-PITCH-IDEA] Running Market Intelligence + Scoring Pipeline...')

        const marketContext = await getDeepMarketContext(domain, problem)
        scoringResult = await runScoringPipeline(
          idea,
          founderContext ?? (founder as unknown as import('@/lib/founder-context').ComprehensiveFounderContext),
          marketContext,
          'IDEA',
        )
        rubricAnalysis = scoringResult.rubricCompatible

        // Map pipeline tier to a ycFitScore for backward compatibility with UI
        const YC_FIT_MAP: Record<string, number> = {
          EXCEPTIONAL: 95,
          STRONG: 80,
          DEVELOPING: 60,
          EARLY: 35,
          PASS: 10,
        }
        analysis.founderFit = scoringResult.categoryScores.team
        analysis.ycFitScore = YC_FIT_MAP[scoringResult.tier] ?? 60

        logger.log(`[ANALYZE-PITCH-IDEA] Scoring Pipeline completed; finalScore: ${scoringResult.finalScore}`)
      } catch (scoringError: any) {
        logger.error('[ANALYZE-PITCH-IDEA] Scoring Pipeline failed (non-critical):', scoringError?.message)
      }

      if (scoringResult) {
        Object.assign(analysis, {
          rubricAnalysis: rubricAnalysis ?? null,
          finalScore: scoringResult.finalScore,
          overallScore: scoringResult.finalScore,
          scoreBreakdown: scoringResult.scoreBreakdown,
          categoryScores: scoringResult.categoryScores,
          pipelineVersion: scoringResult.pipelineVersion,
        })
      } else if (rubricAnalysis) {
        analysis.rubricAnalysis = rubricAnalysis
      }

      // Persist university programs so they are available from stored analysis
      ;(analysis as any).universityPrograms = matchPipelineResult?.universityPrograms ?? []
      ;(analysis as any).nichePrograms = matchPipelineResult?.nichePrograms ?? []

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
            finalScore: scoringResult?.finalScore ?? null,
            scoreBreakdown: scoringResult?.scoreBreakdown ?? null,
            categoryScores: scoringResult?.categoryScores ?? null,
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
            usedAINativeMatching: true,
            usedFullFounderContext: !!founderContext,
          },
          universityPrograms: matchPipelineResult?.universityPrograms ?? [],
          nichePrograms: matchPipelineResult?.nichePrograms ?? [],
          pipelineVersion: matchPipelineResult?.pipelineVersion ?? '3.0',
          matchingDurationMs: matchPipelineResult?.durationMs ?? 0,
          matchingError: matchPipelineResult === null,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (aiError: any) {
      logger.error('[ANALYZE-PITCH-IDEA] OpenRouter AI error:', aiError)
      const msg = aiError?.message || 'AI analysis request failed'
      const status = String(msg).includes('429') ? 429 : 500
      return NextResponse.json(
        {
          error: 'AI Analysis Failed',
          message: msg,
          provider: 'openrouter',
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


