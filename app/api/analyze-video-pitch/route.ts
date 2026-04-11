import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { analyzeVideoPitch, VideoPitchFeatures } from '@/lib/ai'
import { runMatchingPipeline } from '@/lib/matching/matching-orchestrator'
import { validateVideoPitch } from '@/lib/content-validator'
import { CREDIT_COSTS } from '@/lib/constants'
import { shouldEnforceAiCredits } from '@/lib/dev-ai-analysis-bypass'
import { parseJSON } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit'
import { saveFileToDisk, buildFounderSnapshot } from '@/lib/file-storage'
import { getDeepMarketContextSafe } from '@/lib/market-intelligence'
import { runScoringPipeline } from '@/lib/scoring/scoring-pipeline'
import { getComprehensiveFounderContext } from '@/lib/founder-context'
import { reviewerAssignableWhere } from '@/lib/reviewer-filters'
import { analyzeFounderNotFoundResponse, analyzeUnauthorizedResponse } from '@/lib/analyze-routes/responses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Validate file
function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 500 * 1024 * 1024 // 500MB
  const allowedTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime']
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 500MB' }
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only MP4, MOV, and WebM video files are supported' }
  }
  
  return { valid: true }
}

export async function POST(request: NextRequest) {
  // Rate limiting - check before processing
  const rateLimitResponse = await rateLimitMiddleware(request, {
    ...RATE_LIMITS.AI_ANALYSIS,
    identifier: 'analyze-video-pitch',
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return analyzeUnauthorizedResponse()
    }

    // Get founder profile - REQUIRED, no auto-creation
    const founder = await db.founder.findUnique({
      where: { email: user.email },
    }).catch((err) => {
      logger.error('[ANALYZE-VIDEO-PITCH] Error fetching founder:', err)
      return null
    })

    if (!founder) {
      return analyzeFounderNotFoundResponse({ redirectTo: '/founder/onboarding' })
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formError: any) {
      return NextResponse.json({ 
        error: 'Invalid Request',
        message: 'Could not parse form data.',
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
    }

    const file = formData.get('file') as File
    const paymentVerified = formData.get('paymentVerified') === 'true'
    const sessionId = (formData.get('sessionId') as string) || null
    const reviewType = (formData.get('reviewType') as string) || 'ai'
    const reviewerId = formData.get('reviewerId') as string | null
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' }, 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check credits (but don't deduct yet - will deduct after successful analysis)
    const CREDIT_COST = reviewType === 'reviewer' ? CREDIT_COSTS.VIDEO_PITCH.REVIEWER : CREDIT_COSTS.VIDEO_PITCH.REGULAR
    
    // Skip credit check for admin
    let userCredits = null
    if (shouldEnforceAiCredits(user.email)) {
      userCredits = await db.userCredits.findUnique({
        where: { userId: user.id },
      })
      
      if (!userCredits) {
        userCredits = await db.userCredits.create({
          data: {
            userId: user.id,
            credits: 0,
            isPremium: false,
          },
        })
      }
      
      if (!userCredits.isPremium && (userCredits.credits ?? 0) < CREDIT_COST) {
        const creditsNeeded = CREDIT_COST - (userCredits.credits ?? 0)
        return NextResponse.json({
          error: 'Insufficient Credits',
          message: `${reviewType === 'reviewer' ? 'VC-Accepted Reviewer Review' : 'AI Video Pitch Analysis'} costs ${CREDIT_COST} credits. You have ${userCredits.credits ?? 0} credits.`,
          whatWentWrong: `You need ${creditsNeeded} more credit${creditsNeeded > 1 ? 's' : ''} to analyze your video pitch`,
          whyItFailed: 'Each analysis uses credits to cover AI processing costs',
          howToFix: [
            'Claim your daily free credits (available every 24 hours)',
            'Purchase additional credits from your account page',
            'Upgrade to Premium for unlimited analyses',
            'Wait until you have enough credits from daily claims',
          ],
          requiresPayment: true,
          creditCost: CREDIT_COST,
          currentCredits: userCredits.credits ?? 0,
          creditsNeeded,
        }, { 
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Require payment verification only if user is not Premium and doesn't have enough credits
    // Premium users or users with sufficient credits don't need payment verification
    const hasEnoughCredits = userCredits?.isPremium || (userCredits && (userCredits.credits ?? 0) >= CREDIT_COST)
    if (!paymentVerified && !hasEnoughCredits && shouldEnforceAiCredits(user.email)) {
      return NextResponse.json({
        error: 'Payment required',
        requiresPayment: true,
        amount: 0,
        message: 'Please complete checkout before analysis.',
      }, { 
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate file
    const fileValidation = validateFile(file)
    if (!fileValidation.valid) {
      const maxSize = 100 * 1024 * 1024 // 100MB
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      
      let errorDetails: any = {
        error: 'File Validation Failed',
        message: fileValidation.error,
        whatWentWrong: '',
        whyItFailed: '',
        howToFix: [] as string[],
      }
      
      if (file.size > maxSize) {
        errorDetails.whatWentWrong = `Your video is ${fileSizeMB}MB, which exceeds the maximum allowed size of 100MB`
        errorDetails.whyItFailed = 'Large video files take too long to process and may cause timeouts'
        errorDetails.howToFix = [
          'Compress your video using a tool like HandBrake or online compressors',
          'Reduce video resolution or bitrate',
          'Shorten the video length if possible',
          'Convert to a more efficient format (MP4 with H.264 codec)',
        ]
      } else {
        const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo']
        errorDetails.whatWentWrong = `Your file type "${file.type || 'unknown'}" is not supported`
        errorDetails.whyItFailed = 'We can only process standard video formats'
        errorDetails.howToFix = [
          'Convert your video to MP4 format (recommended)',
          'Or use MOV, AVI, or MPEG formats',
          'If using phone camera, ensure it\'s saved as MP4',
          'Use a video converter if needed',
        ]
      }
      
      return NextResponse.json(errorDetails, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Transcribe video using Deepgram or OpenAI Whisper
    let transcript: string
    let transcriptText: string
    let savedFilePath = '' // Path to the saved video file on disk
    
    try {
      logger.log('[ANALYZE-VIDEO-PITCH] Starting video transcription...')
      logger.log('[ANALYZE-VIDEO-PITCH] File name:', file.name, 'Size:', file.size, 'Type:', file.type)

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      logger.log('[ANALYZE-VIDEO-PITCH] Buffer size:', buffer.length)

      const savePromise = saveFileToDisk(buffer, 'videos', founder.id, file.name, {
        contentType: file.type || 'video/mp4',
      })
        .then((path) => {
          logger.log(`[ANALYZE-VIDEO-PITCH] File saved to: ${path}`)
          return path
        })
        .catch((saveErr: unknown) => {
          const msg = saveErr instanceof Error ? saveErr.message : String(saveErr)
          logger.error('[ANALYZE-VIDEO-PITCH] Failed to save file to disk (non-critical):', msg)
          return ''
        })

      const deepgramKey = process.env.DEEPGRAM_API_KEY
      const openaiKey = process.env.OPENAI_API_KEY

      logger.log('[ANALYZE-VIDEO-PITCH] API Keys check:', {
        hasDeepgram: !!deepgramKey,
        hasOpenAI: !!openaiKey,
        deepgramKeyStart: deepgramKey?.substring(0, 10) || 'not set',
      })

      const transcribePromise = (async (): Promise<string> => {
        if (deepgramKey) {
          logger.log('[ANALYZE-VIDEO-PITCH] ✅ Using Deepgram for transcription...')
          const deepgramUrl = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true'
          const audioBody = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength,
          ) as ArrayBuffer
          const response = await fetch(deepgramUrl, {
            method: 'POST',
            headers: {
              Authorization: `Token ${deepgramKey}`,
              'Content-Type': file.type || 'video/mp4',
            },
            body: audioBody,
          })
          logger.log('[ANALYZE-VIDEO-PITCH] Deepgram response status:', response.status)
          if (!response.ok) {
            const errorText = await response.text()
            logger.error(`[ANALYZE-VIDEO-PITCH] ❌ Deepgram error: ${response.status}`, errorText)
            throw new Error(`Deepgram transcription failed: ${response.status}. ${errorText.substring(0, 200)}`)
          }
          const result = (await response.json()) as {
            results?: { channels?: { alternatives?: { transcript?: string }[] }[] }
          }
          const text = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
          logger.log(
            `[ANALYZE-VIDEO-PITCH] 📝 Deepgram raw transcript (${text.length} chars): "${text.substring(0, 500)}..."`,
          )
          if (!text || text.trim().length < 20) {
            logger.error('[ANALYZE-VIDEO-PITCH] ❌ Transcript too short:', text.length, 'chars')
            throw new Error('Video audio could not be transcribed. Please ensure your video has clear, audible speech.')
          }
          logger.log(`[ANALYZE-VIDEO-PITCH] ✅ Deepgram transcription successful: ${text.length} characters`)
          return text
        }
        if (openaiKey) {
          logger.log('[ANALYZE-VIDEO-PITCH] Using OpenAI Whisper for transcription...')
          const OpenAI = require('openai').default
          const openaiClient = new OpenAI({ apiKey: openaiKey })
          const wBody = buffer.buffer.slice(
            buffer.byteOffset,
            buffer.byteOffset + buffer.byteLength,
          ) as ArrayBuffer
          const whisperFile = new File([wBody], file.name, { type: file.type })
          const transcription = await openaiClient.audio.transcriptions.create({
            file: whisperFile,
            model: 'whisper-1',
            language: 'en',
            response_format: 'text',
          })
          const text = typeof transcription === 'string' ? transcription : transcription.text || ''
          if (!text || text.trim().length < 50) {
            throw new Error('Transcription too short or empty. Please ensure your video has clear audio.')
          }
          logger.log(`[ANALYZE-VIDEO-PITCH] OpenAI Whisper transcription successful: ${text.length} characters`)
          return text
        }
        throw new Error(
          'No transcription service available. Please set DEEPGRAM_API_KEY or OPENAI_API_KEY in your .env.local file.',
        )
      })()

      const [savedPath, transcribed] = await Promise.all([savePromise, transcribePromise])
      savedFilePath = savedPath || ''
      transcriptText = transcribed
      transcript = transcriptText.substring(0, 1000)
    } catch (transcriptionError: any) {
      logger.error('[ANALYZE-VIDEO-PITCH] Transcription error:', transcriptionError)
      
      // If transcription fails, return helpful error
      const errorMessage = transcriptionError?.message || 'Unknown transcription error'
      
      return NextResponse.json({ 
        error: 'Transcription Failed',
        message: 'Could not transcribe video audio.',
        whatWentWrong: 'The video audio could not be transcribed',
        whyItFailed: errorMessage.includes('API key') 
          ? 'AI service not configured properly'
          : errorMessage.includes('too short')
          ? 'Video audio is too short or unclear'
          : errorMessage,
        howToFix: [
          'Ensure your video has clear, audible speech',
          'Check that the video file contains audio',
          'Try re-exporting your video with better audio quality',
          'Ensure the video is in a supported format (MP4, MOV, WebM)',
          'If the problem persists, contact support',
        ],
        details: process.env.NODE_ENV === 'development' ? transcriptionError?.message : undefined,
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Handle reviewer review vs AI analysis
    if (reviewType === 'reviewer') {
      // Create a review request for a reviewer
      let assignedReviewerId = reviewerId
      
      // If no reviewer selected, assign best available
      if (!assignedReviewerId) {
        const availableReviewer = await (db as any).reviewer.findFirst({
          where: reviewerAssignableWhere(),
          orderBy: [
            { averageRating: 'desc' },
            { totalReviews: 'asc' }, // Prefer reviewers with fewer reviews for load balancing
          ],
        })
        assignedReviewerId = availableReviewer?.id
      }
      
      if (!assignedReviewerId) {
        return NextResponse.json({
          error: 'No reviewers available',
          message: 'No reviewers are currently available. Please try AI analysis instead.',
        }, { 
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
      // Save video pitch first (file already uploaded above with AI path; same buffer / savedFilePath)
      const videoPitch = await (db as any).videoPitch.create({
        data: {
          founderId: founder.id,
          fileName: file.name,
          fileUrl: savedFilePath || '',
          fileType: file.type.split('/')[1] || 'mp4',
          fileSize: file.size,
          transcript: transcriptText.substring(0, 1000),
          transcriptText: transcriptText.substring(0, 50000),
          founderSnapshot: JSON.stringify(buildFounderSnapshot(founder)),
        },
      })
      
      // Create review request
      const review = await (db as any).videoPitchReview.create({
        data: {
          videoPitchId: videoPitch.id,
          reviewerId: assignedReviewerId,
          status: 'pending',
        },
      })
      
      return NextResponse.json({
        success: true,
        reviewId: review.id,
        videoPitchId: videoPitch.id,
        message: 'Your video pitch has been submitted for review. You will receive an email when the review is complete (typically 2-3 days).',
        reviewer: await (db as any).reviewer.findUnique({
          where: { id: assignedReviewerId },
          select: { name: true, acceptedVC: true },
        }),
      }, {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const shouldRunContentValidation =
      !!transcriptText &&
      transcriptText.length > 50 &&
      !transcriptText.includes('[Video transcription would appear here')

    logger.log('[ANALYZE-VIDEO-PITCH] 🔍 Content validation + founder context (parallel)...')
    logger.log('[ANALYZE-VIDEO-PITCH] Transcript length:', transcriptText.length, 'Preview:', transcriptText.substring(0, 200))

    const validationPromise = (async () => {
      if (!shouldRunContentValidation) {
        return { isValid: true, confidence: 100, reason: 'skipped' }
      }
      try {
        return await validateVideoPitch(transcriptText)
      } catch (validationError: unknown) {
        logger.error('[ANALYZE-VIDEO-PITCH] Validation error:', validationError)
        return { isValid: true, confidence: 100, reason: 'validation error, proceeding' }
      }
    })()

    const [validation, founderContextLoaded] = await Promise.all([
      validationPromise,
      getComprehensiveFounderContext(founder.email),
    ])

    if (shouldRunContentValidation) {
      logger.log('[ANALYZE-VIDEO-PITCH] 📊 Validation result:', JSON.stringify(validation))
      if (!validation.isValid || validation.confidence < 30) {
        logger.warn('[ANALYZE-VIDEO-PITCH] ❌ Validation FAILED:', validation)
        return NextResponse.json(
          {
            error: 'Invalid Content',
            message: validation.reason || 'The video does not appear to be a pitch video.',
            whatWentWrong: "Your video doesn't contain pitch-related content",
            whyItFailed: validation.reason || 'The transcript lacks startup/business pitch elements',
            howToFix: [
              'Ensure your video is actually a startup pitch, not random content',
              'Include discussion of: problem, solution, market, business model, or funding',
              'Speak clearly and mention startup/business-related terms',
              'Make sure the audio is clear and transcribed correctly',
              'If this is a pitch video, add more business context',
            ],
            validationFailed: true,
            confidence: validation.confidence,
            transcript: transcriptText.substring(0, 500),
          },
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
      logger.log(`[ANALYZE-VIDEO-PITCH] ✅ Content validated (confidence: ${validation.confidence}%)`)
    } else {
      logger.log('[ANALYZE-VIDEO-PITCH] ⏭️  Skipping validation (transcript too short or placeholder)')
    }

    let pitchAnalysis: any
    let enhancedFounder: any = founder
    let founderContext: any = null

    try {
      founderContext = founderContextLoaded
      enhancedFounder = {
        ...founder,
        ...founderContext,
        sectors: parseJSON<string[]>(founder.sectors || '[]', []),
      }

      pitchAnalysis = await analyzeVideoPitch(transcriptText, enhancedFounder)
    } catch (aiError: any) {
      logger.error('[ANALYZE-VIDEO-PITCH] AI analysis error:', aiError)
      
      const errorMessage = aiError?.message || 'Unknown AI error'
      const errorCode = aiError?.code || aiError?.status || aiError?.error?.code || 'UNKNOWN'
      
      // Check for network/connection errors
      const isNetworkError = 
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('Unable to reach') ||
        errorCode === 'ECONNREFUSED' ||
        errorCode === 'ETIMEDOUT'
      
      let errorDetails: any = {
        error: isNetworkError ? 'ERROR_OPENAI' : 'AI Analysis Failed',
        message: isNetworkError 
          ? 'Unable to reach the model provider'
          : 'Failed to analyze video pitch with AI',
        whatWentWrong: isNetworkError
          ? 'We\'re having trouble connecting to the AI service'
          : 'The AI service could not process your video pitch',
        whyItFailed: isNetworkError
          ? 'This might be temporary - please try again in a moment'
          : errorMessage,
        howToFix: isNetworkError
          ? [
              'Wait a moment and try again',
              'Check your internet connection',
              'If the problem persists, the AI service may be temporarily unavailable',
              'Contact support if the issue continues',
            ]
          : [
              'Try uploading your video again',
              'Ensure your video has clear audio',
              'Check your internet connection',
              'If the problem persists, try a different video format',
              'Contact support if the issue continues',
            ],
      }
      
      // Check for specific error types
      if (errorMessage.includes('API key') || errorCode === 'invalid_api_key' || errorMessage.includes('No AI API key')) {
        errorDetails.error = 'ERROR_OPENAI'
        errorDetails.whatWentWrong = 'AI service configuration error'
        errorDetails.whyItFailed = 'Invalid or missing API key for AI service'
        errorDetails.howToFix = [
          'This is a server configuration issue',
          'Contact support to resolve',
        ]
      } else if (errorCode === 'insufficient_quota' || errorMessage.includes('quota')) {
        errorDetails.whatWentWrong = 'AI service quota exceeded'
        errorDetails.whyItFailed = 'The AI service has no credits remaining'
        errorDetails.howToFix = [
          'This is a server configuration issue',
          'Contact support to add credits to the AI service',
        ]
      } else if (errorMessage.includes('rate limit') || errorCode === 'rate_limit_exceeded') {
        errorDetails.whatWentWrong = 'AI service rate limit exceeded'
        errorDetails.whyItFailed = 'Too many requests to the AI service'
        errorDetails.howToFix = [
          'Try again in a few moments',
          'The service will be available shortly',
        ]
      }
      
      return NextResponse.json({ 
        ...errorDetails,
        details: {
          title: errorDetails.message,
          detail: errorDetails.whyItFailed,
          additionalInfo: {},
          buttons: [],
          planChoices: [],
        },
        isExpected: false,
        debugDetails: process.env.NODE_ENV === 'development' ? aiError?.message : undefined,
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const baseCtx = founderContext || enhancedFounder
    let videoStartupName: string | null = null
    const namePatterns = [
      /(?:CEO|CTO|founder|co-?founder)\s+(?:of|at)\s+([A-Z][A-Za-z0-9]+)/i,
      /(?:we(?:'re| are)\s+(?:building|creating|launching))\s+([A-Z][A-Za-z0-9]+)/i,
      /([A-Z][A-Za-z0-9]+)\s+is\s+(?:the|a|an)\s+(?:platform|app|tool|product|company|startup|service|solution)/i,
    ]
    for (const pat of namePatterns) {
      const m = transcriptText.match(pat)
      if (m && m[1] && m[1].length > 1 && m[1].toLowerCase() !== 'the') {
        videoStartupName = m[1]
        break
      }
    }
    const videoSectors: string[] = pitchAnalysis?.sectorFit
      ? Object.keys(pitchAnalysis.sectorFit).filter((k: string) => (pitchAnalysis.sectorFit as any)[k] > 40)
      : []
    const videoBio = transcriptText.substring(0, 400)
    const transcriptLower = transcriptText.toLowerCase()
    let videoStage = baseCtx.stage
    if (
      transcriptLower.includes('revenue') ||
      transcriptLower.includes('paying customer') ||
      transcriptLower.includes('mrr')
    )
      videoStage = 'revenue'
    else if (
      transcriptLower.includes('signed') ||
      transcriptLower.includes('pilot') ||
      transcriptLower.includes('beta')
    )
      videoStage = 'pre-seed'
    else if (transcriptLower.includes('prototype') || transcriptLower.includes('mvp')) videoStage = 'pre-seed'

    const videoEnhancedCtx = {
      ...baseCtx,
      startupName: videoStartupName || baseCtx.startupName,
      bio: videoBio,
      sectors: videoSectors.length > 0 ? videoSectors : baseCtx.sectors,
      stage: videoStage,
    }
    const sectorsForDomain = videoEnhancedCtx.sectors || parseJSON<string[]>(founder.sectors || '[]', [])
    const domain = sectorsForDomain[0] || pitchAnalysis?.sectorFit?.primarySector || 'technology'
    const problem =
      pitchAnalysis?.problemStatement || pitchAnalysis?.oneLineSummary || videoBio.substring(0, 300)

    let matchedVCs: any[] = []
    let matchPipelineResult: any = null
    let scoringResult: Awaited<ReturnType<typeof runScoringPipeline>> | null = null

    logger.log('[ANALYZE-VIDEO-PITCH] Matching pipeline v3 + market intel (parallel)...')
    logger.log(`[ANALYZE-VIDEO-PITCH] Transcript length: ${transcriptText.length} characters`)
    logger.log(
      `[ANALYZE-VIDEO-PITCH] Scoring prep: "${videoEnhancedCtx.startupName}" (stage: ${videoEnhancedCtx.stage})`,
    )

    const matchCtx =
      founderContext || (enhancedFounder as unknown as import('@/lib/founder-context').ComprehensiveFounderContext)

    const [matchRes, marketContext] = await Promise.all([
      runMatchingPipeline(matchCtx, pitchAnalysis, transcriptText).catch((matchError: unknown) => {
        const msg = matchError instanceof Error ? matchError.message : String(matchError)
        logger.error('[ANALYZE-VIDEO-PITCH] Matching pipeline error:', msg)
        if (matchError instanceof Error && matchError.stack) {
          logger.error('[ANALYZE-VIDEO-PITCH] Error stack:', matchError.stack)
        }
        return null
      }),
      getDeepMarketContextSafe(domain, problem),
    ])

    if (matchRes) {
      matchPipelineResult = matchRes
      matchedVCs = matchRes.rankedInvestors.map((r: any) => ({
        ...r,
        investor: r.vc,
        score: r.combinedScore,
        intelligentScore: r.combinedScore,
        vectorSimilarity: 0,
        confidence:
          r.investmentLikelihood.confidence === 'HIGH'
            ? 0.95
            : r.investmentLikelihood.confidence === 'MEDIUM'
              ? 0.8
              : 0.6,
        reasons: [],
        suggestions: [],
        detailedReasons: [],
        detectedPatterns: null,
        livePulse: null,
        scoreSymbol: undefined,
        scoreMeaning: undefined,
      }))
      logger.log(`[ANALYZE-VIDEO-PITCH] Matching pipeline v3 completed: ${matchedVCs.length} matches found`)
    } else {
      matchedVCs = []
    }

    try {
      scoringResult = await runScoringPipeline(transcriptText, videoEnhancedCtx, marketContext, 'VIDEO')
      logger.log(`[ANALYZE-VIDEO-PITCH] Scoring Pipeline completed; finalScore: ${scoringResult.finalScore}`)
    } catch (scoringError: unknown) {
      const msg = scoringError instanceof Error ? scoringError.message : String(scoringError)
      logger.error('[ANALYZE-VIDEO-PITCH] Scoring Pipeline failed (non-critical):', msg)
    }

    // Save video pitch analysis
    // Store all analysis data in the analysisResult JSON field
    const videoPitch = await (db as any).videoPitch.create({
      data: {
        founderId: founder.id,
        fileName: file.name,
        fileUrl: savedFilePath || '', // Local disk path to the saved video file
        fileType: file.type.split('/')[1] || 'mp4',
        fileSize: file.size,
        transcript: transcript,
        transcriptText: transcriptText.substring(0, 50000), // Limit text storage
        founderSnapshot: JSON.stringify(buildFounderSnapshot(founder)),
        analysisResult: JSON.stringify({
          features: pitchAnalysis,
          strengths: pitchAnalysis.strengths || [],
          weaknesses: pitchAnalysis.weaknesses || [],
          improvements: pitchAnalysis.improvements || [],
          positiveFeedback: pitchAnalysis.positiveFeedback || [],
          negativeFeedback: pitchAnalysis.negativeFeedback || [],
          sectorFit: pitchAnalysis.sectorFit || {},
          tractionMetrics: pitchAnalysis.tractionMetrics || {},
          marketAnalysis: pitchAnalysis.marketAnalysis || {},
          teamAnalysis: pitchAnalysis.teamAnalysis || {},
          productFit: pitchAnalysis.productFit || {},
          overallScore: scoringResult?.finalScore ?? null,
          scoreBreakdown: scoringResult?.scoreBreakdown ?? null,
          categoryScores: scoringResult?.categoryScores ?? null,
          pipelineVersion: scoringResult?.pipelineVersion ?? null,
          // Save as both "matches" (for matches page) and "matchedVCs" (legacy)
          matches: matchedVCs.slice(0, 20).map(m => ({
            investorId: m.investor.id,
            investor: {
              id: m.investor.id,
              firmName: m.investor.firmName,
              name: m.investor.name,
              fundType: m.investor.fundType,
              stages: parseJSON<string[]>(m.investor.stages || '[]', []),
              sectors: parseJSON<string[]>(m.investor.sectors || '[]', []),
              checkMin: m.investor.checkMin || m.investor.checkSizeMin,
              checkMax: m.investor.checkMax || m.investor.checkSizeMax,
              thesis: m.investor.thesis,
              applicationUrl: m.investor.applicationUrl,
              websiteUrl: m.investor.websiteUrl,
              valueAddTags: parseJSON<string[]>(m.investor.valueAddTags || '[]', []),
            },
            score: Math.round(m.combinedScore || m.score || 0),
            confidence: m.confidence || 85,
            reasons: m.reasons || [],
            suggestions: m.suggestions || [],
            whyApply: m.whyApply,
            bestApproach: m.bestApproach,
            timing: m.timing,
            livePulse: m.livePulse ? { summary: m.livePulse.summary, signalStrength: m.livePulse.signalStrength ?? 0 } : null,
          })),
          matchedVCs: matchedVCs.slice(0, 10).map(m => ({
            investorId: m.investor.id,
            firmName: m.investor.firmName,
            score: Math.round(m.combinedScore || m.score || 0),
            reasons: m.reasons,
            whyApply: m.whyApply,
            bestApproach: m.bestApproach,
            timing: m.timing,
            livePulse: m.livePulse ? { summary: m.livePulse.summary, signalStrength: m.livePulse.signalStrength ?? 0 } : null,
          })),
          topVCRecommendations: matchedVCs.slice(0, 5).map(m => ({
            investorId: m.investor.id,
            firmName: m.investor.firmName,
            score: Math.round(m.combinedScore || m.score || 0),
            whyApply: m.whyApply,
            bestApproach: m.bestApproach,
            timing: m.timing,
            priority: (m.combinedScore || m.score || 0) >= 85 ? 'high' : (m.combinedScore || m.score || 0) >= 70 ? 'medium' : 'low',
            livePulse: m.livePulse ? { summary: m.livePulse.summary, signalStrength: m.livePulse.signalStrength ?? 0 } : null,
          })),
          universityPrograms: matchPipelineResult?.universityPrograms ?? [],
          nichePrograms: matchPipelineResult?.nichePrograms ?? [],
        }),
        smartMatchResults: JSON.stringify(matchedVCs.slice(0, 10)),
      },
    })

    // Deduct credits AFTER successful analysis (admin bypass)
    if (shouldEnforceAiCredits(user.email)) {
      try {
        await db.userCredits.update({
          where: { userId: user.id },
          data: {
            credits: { decrement: CREDIT_COST },
          },
        })
        logger.log(`[ANALYZE-VIDEO-PITCH] Deducted ${CREDIT_COST} credits from user ${user.id}`)
      } catch (creditError: any) {
        // Log but don't fail the request if credit deduction fails
        logger.error('[ANALYZE-VIDEO-PITCH] Error deducting credits:', creditError)
      }
    }

    // Smart Match is now handled by Matching Pipeline v3 (runMatchingPipeline)
    // The combined scores include gate-based investment likelihood + deployment scoring

    // Return complete results immediately
    return NextResponse.json({
      success: true,
      videoPitchId: videoPitch.id,
      analysis: {
        overallScore: scoringResult?.finalScore ?? 0,
        finalScore: scoringResult?.finalScore ?? 0,
        scoreBreakdown: scoringResult?.scoreBreakdown ?? null,
        categoryScores: scoringResult?.categoryScores ?? null,
        strengths: pitchAnalysis.strengths || [],
        weaknesses: pitchAnalysis.weaknesses || [],
        improvements: pitchAnalysis.improvements || [],
        // 🆕 Detailed positive and negative feedback with categories
        positiveFeedback: pitchAnalysis.positiveFeedback || [],
        negativeFeedback: pitchAnalysis.negativeFeedback || [],
        matchedVCs: matchedVCs.slice(0, 20).map(m => ({
          investorId: m.investor.id,
          firmName: m.investor.firmName,
          score: m.combinedScore || m.score || 0,
          intelligentScore: m.intelligentScore || m.score || 0,
          vectorSimilarity: m.vectorSimilarity || 0,
          similarity: m.vectorSimilarity || 0,
          reasons: m.reasons || [],
          whyApply: m.whyApply || '',
          bestApproach: m.bestApproach || '',
          timing: m.timing || '',
          detailedReasons: m.detailedReasons || [],
          scoreBreakdown: m.scoreBreakdown || null,
          scoreSymbol: m.scoreSymbol || '⭐',
          scoreMeaning: m.scoreMeaning || '',
          detectedPatterns: m.detectedPatterns || null,
          livePulse: m.livePulse ? {
            summary: m.livePulse.summary,
            conflict: m.livePulse.conflict,
            fromCache: m.livePulse.fromCache,
            signalStrength: m.livePulse.signalStrength ?? 0,
          } : null,
          investor: {
            id: m.investor.id,
            firmName: m.investor.firmName,
            sectors: parseJSON<string[]>(m.investor.sectors || '[]', []),
            stage: m.investor.stage,
            thesis: m.investor.thesis || '',
          },
        })),
        topVCRecommendations: matchedVCs.slice(0, 5).map(m => ({
          investorId: m.investor.id,
          firmName: m.investor.firmName,
          score: m.combinedScore || m.score || 0,
          whyApply: m.whyApply || '',
          bestApproach: m.bestApproach || '',
          timing: m.timing || '',
          priority: (m.combinedScore || m.score || 0) >= 90 ? 'elite' : (m.combinedScore || m.score || 0) >= 80 ? 'high' : (m.combinedScore || m.score || 0) >= 70 ? 'medium' : 'low',
          scoreSymbol: m.scoreSymbol || '⭐',
          scoreMeaning: m.scoreMeaning || '',
          livePulse: m.livePulse ? {
            summary: m.livePulse.summary,
            conflict: m.livePulse.conflict,
            fromCache: m.livePulse.fromCache,
            signalStrength: m.livePulse.signalStrength ?? 0,
          } : null,
        })),
        sectorFit: pitchAnalysis.sectorFit || {},
        tractionMetrics: pitchAnalysis.tractionMetrics || {},
        marketAnalysis: pitchAnalysis.marketAnalysis || {},
        teamAnalysis: pitchAnalysis.teamAnalysis || {},
        productFit: pitchAnalysis.productFit || {},
        transcript: transcriptText.substring(0, 5000), // Include transcript for display
        // 🆕 Include detected patterns from matching
        detectedPatterns: matchedVCs[0]?.detectedPatterns || null,
        rubricAnalysis: scoringResult?.rubricCompatible ?? null,
      },
      universityPrograms: matchPipelineResult?.universityPrograms ?? [],
      nichePrograms: matchPipelineResult?.nichePrograms ?? [],
      pipelineVersion: matchPipelineResult?.pipelineVersion ?? '3.0',
      matchingDurationMs: matchPipelineResult?.durationMs ?? 0,
      matchingError: matchPipelineResult === null,
    }, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    logger.error('[ANALYZE-VIDEO-PITCH] Video pitch analysis error:', error)
    logger.error('[ANALYZE-VIDEO-PITCH] Error stack:', error?.stack)
    
    // Return detailed error for debugging
    return NextResponse.json(
      { 
        error: 'Failed to analyze video pitch',
        message: error?.message || 'Please try again.',
        whatWentWrong: 'An unexpected error occurred while processing your video pitch',
        whyItFailed: error?.message || 'Unknown error',
        howToFix: [
          'Try uploading your video again',
          'Check that your video file is not corrupted',
          'Ensure you have completed your founder profile',
          'Contact support if the issue persists',
        ],
        details: process.env.NODE_ENV === 'development' ? {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        } : undefined,
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

