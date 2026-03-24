import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { analyzeVideoPitch, VideoPitchFeatures } from '@/lib/ai'
import { intelligentMatchVCs } from '@/lib/intelligent-matching'
import { aiNativeMatchVCs } from '@/lib/ai-native-matching'
import { validateVideoPitch } from '@/lib/content-validator'
import { ADMIN_EMAIL, CREDIT_COSTS } from '@/lib/constants'
import { generatePitchEmbedding, rankVCsForPitch } from '@/lib/embeddings'
import { parseJSON } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit'
import { saveFileToDisk, buildFounderSnapshot } from '@/lib/file-storage'
import { getDeepMarketContext } from '@/lib/market-intelligence'
import { runUniversalAnalysis, type FounderDossier } from '@/lib/universal-analysis-engine'

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get founder profile - REQUIRED, no auto-creation
    const founder = await db.founder.findUnique({
      where: { email: user.email },
    }).catch((err) => {
      logger.error('[ANALYZE-VIDEO-PITCH] Error fetching founder:', err)
      return null
    })

    if (!founder) {
      return NextResponse.json(
        { 
          error: 'Founder profile not found. Please complete onboarding first.',
          redirectTo: '/founder/onboarding',
        },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
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
    if (user.email !== ADMIN_EMAIL) {
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
    if (!paymentVerified && !hasEnoughCredits && user.email !== ADMIN_EMAIL) {
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
      
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      logger.log('[ANALYZE-VIDEO-PITCH] Buffer size:', buffer.length)

      // Save video file to local disk for training data
      try {
        savedFilePath = await saveFileToDisk(buffer, 'videos', founder.id, file.name)
        logger.log(`[ANALYZE-VIDEO-PITCH] File saved to: ${savedFilePath}`)
      } catch (saveErr: any) {
        logger.error('[ANALYZE-VIDEO-PITCH] Failed to save file to disk (non-critical):', saveErr.message)
      }
      
      // Try Deepgram first (if key available), then fall back to OpenAI Whisper
      const deepgramKey = process.env.DEEPGRAM_API_KEY
      const openaiKey = process.env.OPENAI_API_KEY
      
      logger.log('[ANALYZE-VIDEO-PITCH] API Keys check:', {
        hasDeepgram: !!deepgramKey,
        hasOpenAI: !!openaiKey,
        deepgramKeyStart: deepgramKey?.substring(0, 10) || 'not set'
      })
      
      if (deepgramKey) {
        // Use Deepgram API (preferred - better free tier)
        logger.log('[ANALYZE-VIDEO-PITCH] ✅ Using Deepgram for transcription...')
        
        const deepgramUrl = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true'
        logger.log('[ANALYZE-VIDEO-PITCH] Calling Deepgram API...')
        
        const response = await fetch(deepgramUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${deepgramKey}`,
            'Content-Type': file.type || 'video/mp4',
          },
          body: buffer,
        })
        
        logger.log('[ANALYZE-VIDEO-PITCH] Deepgram response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          logger.error(`[ANALYZE-VIDEO-PITCH] ❌ Deepgram error: ${response.status}`, errorText)
          throw new Error(`Deepgram transcription failed: ${response.status}. ${errorText.substring(0, 200)}`)
        }
        
        const result = await response.json() as any
        logger.log('[ANALYZE-VIDEO-PITCH] Deepgram response structure:', JSON.stringify(result).substring(0, 500))
        
        transcriptText = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
        
        logger.log(`[ANALYZE-VIDEO-PITCH] 📝 Deepgram raw transcript (${transcriptText.length} chars): "${transcriptText.substring(0, 500)}..."`)
        
        if (!transcriptText || transcriptText.trim().length < 20) {
          logger.error('[ANALYZE-VIDEO-PITCH] ❌ Transcript too short:', transcriptText.length, 'chars')
          throw new Error('Video audio could not be transcribed. Please ensure your video has clear, audible speech.')
        }
        
        logger.log(`[ANALYZE-VIDEO-PITCH] ✅ Deepgram transcription successful: ${transcriptText.length} characters`)
        
      } else if (openaiKey) {
        // Fallback to OpenAI Whisper
        logger.log('[ANALYZE-VIDEO-PITCH] Using OpenAI Whisper for transcription...')
        
        const OpenAI = require("openai").default
        const openaiClient = new OpenAI({
          apiKey: openaiKey,
        })
        
        const whisperFile = new File([buffer], file.name, { type: file.type })
        
        const transcription = await openaiClient.audio.transcriptions.create({
          file: whisperFile,
          model: 'whisper-1',
          language: 'en',
          response_format: 'text',
        })
        
        transcriptText = typeof transcription === 'string' ? transcription : transcription.text || ''
        
        if (!transcriptText || transcriptText.trim().length < 50) {
          throw new Error('Transcription too short or empty. Please ensure your video has clear audio.')
        }
        
        logger.log(`[ANALYZE-VIDEO-PITCH] OpenAI Whisper transcription successful: ${transcriptText.length} characters`)
        
      } else {
        throw new Error('No transcription service available. Please set DEEPGRAM_API_KEY or OPENAI_API_KEY in your .env.local file.')
      }
      
      transcript = transcriptText.substring(0, 1000) // Summary for display
      
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
          where: {
            active: true,
            verified: true,
            vcAccepted: true,
          },
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
      
      // Save video pitch first
      const videoPitch = await (db as any).videoPitch.create({
        data: {
          founderId: founder.id,
          fileName: file.name,
          fileUrl: '', // In production, upload to storage
          fileType: file.type.split('/')[1] || 'mp4',
          fileSize: file.size,
          transcript: transcriptText.substring(0, 1000),
          transcriptText: transcriptText.substring(0, 50000),
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

    // VALIDATE CONTENT FIRST - before analysis
    logger.log('[ANALYZE-VIDEO-PITCH] 🔍 Starting content validation...')
    logger.log('[ANALYZE-VIDEO-PITCH] Transcript length:', transcriptText.length, 'Preview:', transcriptText.substring(0, 200))
    
    if (transcriptText && transcriptText.length > 50 && !transcriptText.includes('[Video transcription would appear here')) {
      try {
        const validation = await validateVideoPitch(transcriptText)
        
        logger.log('[ANALYZE-VIDEO-PITCH] 📊 Validation result:', JSON.stringify(validation))
        
        // More lenient - only reject if confidence is very low (< 30)
        if (!validation.isValid || validation.confidence < 30) {
          logger.warn('[ANALYZE-VIDEO-PITCH] ❌ Validation FAILED:', validation)
          return NextResponse.json({
            error: 'Invalid Content',
            message: validation.reason || 'The video does not appear to be a pitch video.',
            whatWentWrong: 'Your video doesn\'t contain pitch-related content',
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
            transcript: transcriptText.substring(0, 500), // Show first 500 chars for debugging
          }, { 
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        
        logger.log(`[ANALYZE-VIDEO-PITCH] ✅ Content validated (confidence: ${validation.confidence}%)`)
      } catch (validationError: any) {
        logger.error('[ANALYZE-VIDEO-PITCH] Validation error:', validationError)
        // If validation fails due to error, still proceed but log it
      }
    } else {
      logger.log('[ANALYZE-VIDEO-PITCH] ⏭️  Skipping validation (transcript too short or placeholder)')
    }

    // AI Analysis (existing flow) - now uses ALL founder profile data
    let pitchAnalysis: any
    let enhancedFounder: any = founder // Default to founder, will be enhanced below
    let founderContext: any = null
    
    try {
      // Get comprehensive founder context for analysis
      const { getComprehensiveFounderContext } = await import('@/lib/founder-context')
      founderContext = await getComprehensiveFounderContext(founder.email)
      
      // Enhance founder object with all context data
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

    // Get all investors for matching
    const investors = await db.investor.findMany({
      where: { verified: true },
    })

    // Use AI-Native Matching (combines intelligent matching + FAISS vector similarity)
    let matchedVCs: any[] = []
    try {
      logger.log('[ANALYZE-VIDEO-PITCH] Starting AI-native matching with FAISS...')
      logger.log(`[ANALYZE-VIDEO-PITCH] Transcript length: ${transcriptText.length} characters`)
      
      // Use aiNativeMatchVCs which combines:
      // 1. Rule-based intelligent matching (stage, sector, traction)
      // 2. FAISS vector similarity (semantic understanding)
      // 3. Comprehensive founder context (profile, pitch, video, resume)
      // 🆕 ENHANCE: Pass transcript to matching for context-aware recommendations
      // Use enhanced founder with all profile data for matching
      matchedVCs = await aiNativeMatchVCs(
        enhancedFounder, // Use enhanced founder with ALL profile data
        investors,
        {
          pitchAnalysis: pitchAnalysis,
          transcript: transcriptText, // Use REAL transcript from video
          resumeFeatures: undefined, // Will be extracted from founder profile if available
          useFAISS: true, // Enable FAISS for vector similarity
        }
      )

      logger.log(`[ANALYZE-VIDEO-PITCH] AI-native matching completed: ${matchedVCs.length} matches found`)

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
        const vectorSim = (match.vectorSimilarity ?? 0) || 0 // Fix NaN issue

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
    } catch (matchError: any) {
      logger.error('[ANALYZE-VIDEO-PITCH] AI-native matching error:', matchError)
      logger.error('[ANALYZE-VIDEO-PITCH] Error stack:', matchError?.stack)
      
      // Fallback to basic matching if AI-native fails
      try {
        logger.log('[ANALYZE-VIDEO-PITCH] Falling back to intelligent matching...')
        const resumeLikeFeatures = {
          basics: {},
          education: [],
          experience: [],
          projects: [],
          skills: {
            programming: [],
            ml: [],
            gtm: [],
            domain: [],
          },
          yearsExp: 0,
          leadership: true,
          traction: pitchAnalysis.tractionMetrics,
        }

        matchedVCs = await intelligentMatchVCs(
          resumeLikeFeatures,
          {
            stage: founder.stage,
            sectors: parseJSON<string[]>(founder.sectors || '[]', []),
            fundingNeed: founder.fundingNeed,
            location: founder.location,
          },
          investors
        )
        
        // Add default vectorSimilarity to prevent NaN
        matchedVCs = matchedVCs.map(m => ({
          ...m,
          vectorSimilarity: 0,
          combinedScore: m.score,
        }))
        
        logger.log('[ANALYZE-VIDEO-PITCH] Fallback to intelligent matching successful')
      } catch (fallbackError: any) {
        logger.error('[ANALYZE-VIDEO-PITCH] Fallback matching also failed:', fallbackError)
        matchedVCs = []
      }
    }

    // -----------------------------------------------------------------------
    // UNIVERSAL ANALYSIS ENGINE — rubric scoring with Exa market intelligence
    // -----------------------------------------------------------------------
    let rubricAnalysis: any = null
    try {
      const sectors = parseJSON<string[]>(founder.sectors || '[]', [])
      const domain = sectors[0] || pitchAnalysis?.sectorFit?.primarySector || 'technology'
      const problem = pitchAnalysis?.problemStatement || pitchAnalysis?.oneLineSummary || founder.bio?.substring(0, 300) || ''

      logger.log('[ANALYZE-VIDEO-PITCH] Running Market Intelligence + Universal Analysis Engine...')

      const marketContext = await getDeepMarketContext(domain, problem)

      const dossier: FounderDossier = {
        startup: founder.startupName || 'Unknown',
        stage: founder.stage || 'seed',
        sectors,
        location: founder.location || founderContext?.location,
        businessModel: founder.businessModel || pitchAnalysis?.businessModel,
        summary: pitchAnalysis?.oneLineSummary || founder.bio?.substring(0, 1000) || '',
        transcript: transcriptText?.substring(0, 1500),
        education: founder.education || founderContext?.education,
        university: founderContext?.universityAffiliation,
        isStudent: founderContext?.isStudent,
        techBackground: founderContext?.techBackground,
        isImmigrant: founderContext?.isImmigrant,
        isVeteran: founderContext?.isVeteran,
        isUnderrepresented: founderContext?.isUnderrepresented,
        cofounders: founderContext?.cofounders,
        prevFunding: founderContext?.prevFunding,
        revenue: founder.revenue || pitchAnalysis?.tractionMetrics?.revenue,
        users: founder.users || pitchAnalysis?.tractionMetrics?.users,
        growth: founder.growthRate || pitchAnalysis?.tractionMetrics?.growth,
        mrr: pitchAnalysis?.tractionMetrics?.mrr,
        teamSize: founder.teamSize || founderContext?.teamSize,
        fundingNeed: founder.fundingNeed || founderContext?.fundingNeed,
        valueAddNeeds: parseJSON<string[]>(founder.valueAddNeeds || '[]', []),
      }

      rubricAnalysis = await runUniversalAnalysis(dossier, 'VIDEO', marketContext)
      logger.log('[ANALYZE-VIDEO-PITCH] Universal Analysis Engine completed successfully')
    } catch (rubricError: any) {
      logger.error('[ANALYZE-VIDEO-PITCH] Universal Analysis Engine failed (non-critical):', rubricError?.message)
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
          presentationScore: pitchAnalysis.presentationScore || null,
          contentScore: pitchAnalysis.contentScore || null,
          overallScore: pitchAnalysis.overallScore || null,
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
        }),
        smartMatchResults: JSON.stringify(matchedVCs.slice(0, 10)),
      },
    })

    // Deduct credits AFTER successful analysis (admin bypass)
    if (user.email !== ADMIN_EMAIL) {
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

    // Smart Match is now integrated into aiNativeMatchVCs above
    // The combined scores already include vector similarity from FAISS
    // No need for separate smartMatches - it's all in matchedVCs now

    // Return complete results immediately
    return NextResponse.json({
      success: true,
      videoPitchId: videoPitch.id,
      analysis: {
        overallScore: pitchAnalysis.overallScore || 0,
        presentationScore: pitchAnalysis.presentationScore || 0,
        contentScore: pitchAnalysis.contentScore || 0,
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
        rubricAnalysis: rubricAnalysis || null,
      },
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

