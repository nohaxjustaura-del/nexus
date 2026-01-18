import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { intelligentMatchVCs } from '@/lib/intelligent-matching'
import { logger } from '@/lib/logger'
import { validatePitchIdea } from '@/lib/content-validator'
import { ADMIN_EMAIL, CREDIT_COSTS } from '@/lib/constants'
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit'
import { generatePitchEmbedding, rankVCsForPitch } from '@/lib/embeddings'
import { parseJSON } from '@/lib/utils'
import { getComprehensiveFounderContext, buildAIPromptContext } from '@/lib/founder-context'
import { analyzeAgainstYCTrends, getCurrentYCTrends } from '@/lib/yc-trends'
import { generateBatchMatchRationale } from '@/lib/ai-match-rationale'
import { hasOpenRouterKey, openrouterGenerateJson } from '@/lib/openrouter'
import { getPersonalizedVCRecommendations } from '@/lib/predictive-matching'

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

    if (contentType.includes('multipart/form-data')) {
      // FormData - could be file upload or text field
      try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const ideaField = formData.get('idea') as string | null
        
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

      // Match with VCs based on founder profile and idea
      const founderData = {
        stage: founder.stage || 'Pre-Seed',
        sectors: JSON.parse(founder.sectors || '[]'),
        location: founder.location || 'US',
        education: founder.education || '',
        startupName: founder.startupName || '',
      }

      // 🚀 OPTIMIZED: Use cached investors (10x faster)
      const { getCachedInvestors } = await import('@/lib/investor-cache')
      const investors = await getCachedInvestors()

      // 🆕 Use comprehensive founder context for better matching
      const fullFounderData = founderContext
        ? {
            ...founderContext,
            ...founderData,
          }
        : {
            ...founderData,
            age: founder.age,
            education: founder.education,
            isStudent: false,
            gender: founder.gender,
            willingToDropOut: founder.willingToDropOut,
            businessModel: founder.businessModel,
            fundingNeed: founder.fundingNeed,
            revenue: founder.revenue,
            users: founder.users,
            growthRate: founder.growthRate,
            teamSize: founder.teamSize,
            ethicsTags: parseJSON<string[]>(founder.ethicsTags, []),
            personalityTags: parseJSON<string[]>(founder.personalityTags, []),
            valueAddNeeds: parseJSON<string[]>(founder.valueAddNeeds, []),
          }

      const matches = await intelligentMatchVCs(
        {
          basics: {
            name: founder.name,
            email: founder.email,
          },
          skills: {
            programming: founderContext?.techBackground ? ['Technical'] : [],
            ml: founderContext?.sectors?.some((s) => s.toLowerCase().includes('ai')) ? ['AI/ML'] : [],
            gtm: [],
            domain: founderContext?.bio ? [founderContext.bio.substring(0, 100)] : [],
          },
          experience: founderContext?.experienceLevel
            ? [
                {
                  title: founderContext.experienceLevel,
                  org: 'Previous Experience',
                },
              ]
            : [],
          education: founder.education
            ? [
                {
                  school: founder.education,
                },
              ]
            : [],
          projects: [],
        },
        fullFounderData,
        investors
      )

      // Smart Match - AI-powered semantic matching (optional, doesn't block analysis)
      // Uses Google Gemini's text-embedding-004 model
      let smartMatches: any[] = []
      try {
        const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)

        if (!hasGeminiKey) {
          logger.log('[ANALYZE-PITCH-IDEA] Smart Match skipped (GEMINI_API_KEY required)')
        } else {
          logger.log('[ANALYZE-PITCH-IDEA] Running Smart Match with Gemini...')

          // Build pitch features for embedding
          const pitchFeatures = {
            companyName: analysis.companyName || 'Unknown',
            oneLineSummary: analysis.oneLineSummary || '',
            stage: analysis.stage || 'Unknown',
            sectorPrimary: analysis.sectorFit?.primarySector || '',
            sectorSecondary: analysis.sectorFit?.secondarySectors || [],
            problemStatement: analysis.problemStatement || '',
            solutionDescription: analysis.solutionDescription || '',
            targetCustomer: {
              customerType: analysis.targetCustomer || '',
              buyerRole: '',
              companySize: '',
            },
            geography: {
              hqLocation: analysis.geography || '',
              markets: [],
            },
            businessModel: analysis.businessModel || '',
            traction: {
              revenue: analysis.tractionMetrics?.revenue || '',
              users: analysis.tractionMetrics?.users || '',
              growthSignal: analysis.tractionMetrics?.growthRate || '',
            },
            keyTechnologies: analysis.keyTechnologies || [],
            competitiveMoat: analysis.competitiveMoat || [],
            keywords: analysis.keywords || [],
          }

          // Generate pitch embedding
          const pitchEmbedding = await generatePitchEmbedding(pitchFeatures)

          // Get all VCs with embeddings
          // Filter for non-null embeddings after fetching (SQLite compatibility)
          const allInvestors = await db.investor.findMany({
            where: {
              verified: true,
              isPublic: true,
            },
            select: {
              id: true,
              firmName: true,
              fundType: true,
              stages: true,
              sectors: true,
              geography: true,
              geoFocus: true,
              checkSizeMin: true,
              checkSizeMax: true,
              embedding: true,
            },
          })

          // Filter out investors without embeddings
          const investorsWithEmbeddings = allInvestors.filter((inv) => inv.embedding !== null && inv.embedding !== undefined)

          // Prepare VC embeddings
          const vcEmbeddings = investorsWithEmbeddings
            .map((investor) => {
              try {
                return {
                  id: investor.id,
                  firmName: investor.firmName,
                  embedding: JSON.parse(investor.embedding as string),
                  metadata: {
                    stages: parseJSON<string[]>(investor.stages, []),
                    sectors: parseJSON<string[]>(investor.sectors, []),
                    geography: parseJSON<string[]>(investor.geography || investor.geoFocus, []),
                    checkSize:
                      investor.checkSizeMin && investor.checkSizeMax
                        ? `$${investor.checkSizeMin}K-$${investor.checkSizeMax}K`
                        : undefined,
                    fundType: investor.fundType,
                  },
                }
              } catch {
                return null
              }
            })
            .filter(Boolean) as any[]

          // Rank VCs by similarity
          // Try FAISS first (much faster), fall back to in-memory if unavailable
          try {
            smartMatches = await rankVCsForPitch(pitchEmbedding, [], 20, true)
            logger.log(`[ANALYZE-PITCH-IDEA] Smart Match complete with FAISS: ${smartMatches.length} matches`)
          } catch (faissError) {
            // Fall back to in-memory ranking
            if (vcEmbeddings.length > 0) {
              smartMatches = await rankVCsForPitch(pitchEmbedding, vcEmbeddings, 20, false)
              logger.log(
                `[ANALYZE-PITCH-IDEA] Smart Match complete (in-memory): ${smartMatches.length} matches from ${vcEmbeddings.length} VCs`
              )
            } else {
              logger.warn(
                '[ANALYZE-PITCH-IDEA] No VC embeddings found and FAISS unavailable. Run: npm run generate-vc-embeddings or start FAISS service'
              )
            }
          }
        }
      } catch (smartMatchError: any) {
        logger.error('[ANALYZE-PITCH-IDEA] Smart Match failed (non-critical):', smartMatchError.message)
        // Continue without Smart Match if it fails
      }

      // 🆕 AI-NATIVE: Get current YC trends
      const currentTrends = getCurrentYCTrends()

      // 🆕 🚀 ULTRA-SPECIFIC AI RATIONALE: Generate hyper-personalized "Why This Match?" for top 20
      const top20Matches = matches.slice(0, 20)
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
            vcStages: parseJSON<string[]>(m.investor.stages, []),
            vcSectors: parseJSON<string[]>(m.investor.sectors, []),
            vcCheckMin: m.investor.checkMin,
            vcCheckMax: m.investor.checkMax,
            vcThesis: m.investor.thesis || undefined,
            vcSpecialFocus: detectSpecialFocus(m.investor.firmName, m.investor.bio || undefined, m.investor.thesis || undefined),
            vcPortfolio: parseJSON<string[]>(m.investor.portfolio, []).slice(0, 5), // Recent investments
            vcBatch: getCurrentYCTrends().batch, // Current YC batch context
            
            // Match metadata
            matchScore: Math.round(m.score),
            matchReasons: m.reasons,
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
        
        // Validate AI reason before injecting (prevent "undefined" strings)
        const validAiReason = aiReason && 
                             typeof aiReason === 'string' && 
                             aiReason.length > 10 && 
                             aiReason !== 'undefined' &&
                             !aiReason.toLowerCase().includes('undefined')
        
        const combinedReasons = validAiReason
          ? [aiReason, ...m.reasons]
          : m.reasons
      
        return {
        rank: index + 1,
        investor: {
          id: m.investor.id,
          name: m.investor.name,
          firmName: m.investor.firmName,
          bio: m.investor.bio,
          logoUrl: m.investor.logoUrl,
          stages: parseJSON<string[]>(m.investor.stages, []),
          sectors: parseJSON<string[]>(m.investor.sectors, []),
          checkMin: m.investor.checkMin,
          checkMax: m.investor.checkMax,
          geoFocus: parseJSON<string[]>(m.investor.geoFocus, []),
          thesis: m.investor.thesis,
          applicationUrl: m.investor.applicationUrl,
        },
        score: Math.round(m.score),
        similarity: Math.round(m.score),
        confidence: m.confidence,
        // 🆕 First bullet is AI-written explanation that connects founder + pitch + VC
        reasons: combinedReasons.slice(0, 5),
        suggestions: m.suggestions.slice(0, 3), // Top 3 suggestions
        detailedRationale: {
          summary: aiReason || combinedReasons[0] || 'Good potential match', // 🆕 AI-generated rationale
          matchFactors: {
            stage: combinedReasons.some((r) => r.toLowerCase().includes('stage')) ? 'Match' : 'Partial',
            sector: combinedReasons.some((r) => r.toLowerCase().includes('sector')) ? 'Match' : 'Partial',
            geography: combinedReasons.some((r) => r.toLowerCase().includes('geograp')) ? 'Match' : 'Acceptable',
            checkSize: combinedReasons.some((r) => r.toLowerCase().includes('check')) ? 'Match' : 'Acceptable',
            founderFit: combinedReasons.some((r) => r.includes('FIT') || r.includes('PERFECT')) ? 'Excellent' : 'Good',
          },
          whyThisVC: combinedReasons.filter((r) => r.includes('✓') || r.includes('🎓') || r.includes('⭐')).join(' | '),
          nextSteps: m.suggestions.length > 0 ? m.suggestions[0] : 'Research this VC and prepare targeted outreach',
        },
        ycTrends: m.ycTrends,
      }})

      // 🆕 🤖 PREDICTIVE MATCHING: Re-rank based on founder's past interactions
      let personalizedMatches = top20WithRationale
      try {
        logger.log('[ANALYZE-PITCH-IDEA] Applying predictive matching...')
        
        // Convert to format expected by predictive matching
        const baseMatches = top20Matches.slice(0, 20)
        const reranked = await getPersonalizedVCRecommendations(
          founder.id,
          baseMatches,
          20
        )
        
        // Re-apply the rich rationale data to the reranked results
        personalizedMatches = reranked.map(rm => {
          // Find the original match with rationale
          const original = top20WithRationale.find(m => m.investor.id === rm.investor.id)
          return original || {
            rank: top20WithRationale.length + 1,
            investor: {
              id: rm.investor.id,
              name: rm.investor.name,
              firmName: rm.investor.firmName,
              bio: rm.investor.bio,
              logoUrl: rm.investor.logoUrl,
              stages: parseJSON<string[]>(rm.investor.stages, []),
              sectors: parseJSON<string[]>(rm.investor.sectors, []),
              checkMin: rm.investor.checkMin,
              checkMax: rm.investor.checkMax,
              geoFocus: parseJSON<string[]>(rm.investor.geoFocus, []),
              thesis: rm.investor.thesis,
              applicationUrl: rm.investor.applicationUrl,
            },
            score: Math.round(rm.personalizedScore || rm.score),
            similarity: Math.round(rm.personalizedScore || rm.score),
            confidence: 0.85,
            reasons: [rm.reason || 'Recommended based on your preferences'],
            suggestions: [],
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

      return NextResponse.json(
        {
          id: `analysis_${Date.now()}`,
          analysis: {
            ...analysis,
            founderContext: founderContext
              ? {
                  stage: founderContext.stage,
                  hasStrongTraction: founderContext.hasStrongTraction,
                  experienceLevel: founderContext.experienceLevel,
                  profileCompleteness: founderContext.profileCompleteness,
                }
              : undefined,
          },
          matches: personalizedMatches, // 🆕 Now personalized based on founder interactions
          matchCount: matches.length,
          smartMatches: smartMatches, // AI-powered semantic matches (top 20)
          ycTrends: {
            current: currentTrends,
            personalInsights: ycTrendsAnalysis?.insights || [],
            scoreBoost: ycTrendsAnalysis?.scoreAdjustment || 0,
            hotSectorMatches: ycTrendsAnalysis?.hotSectorMatches || [],
          },
          matchingMetadata: {
            totalInvestors: investors.length,
            matchesGenerated: matches.length,
            top20Selected: true,
            includedYCTrends: !!ycTrendsAnalysis,
            includedSmartMatch: smartMatches.length > 0,
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
    return NextResponse.json(
      { 
        status: 'ok',
        message: 'Pitch idea analysis endpoint is working',
        timestamp: new Date().toISOString(),
        hasGemini: hasGeminiKey(),
        hasOpenAI: !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY),
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


