import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserOrAdmin } from '@/lib/auth'
import { extractPitchDeckFeatures } from '@/lib/ai'
import { runMatchingPipeline } from '@/lib/matching/matching-orchestrator'
import { logger } from '@/lib/logger'
import { validatePitchDeck } from '@/lib/content-validator'
import { ADMIN_EMAIL, CREDIT_COSTS } from '@/lib/constants'
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit'
import { parseJSON } from '@/lib/utils'
import { getComprehensiveFounderContext } from '@/lib/founder-context'
import { saveFileToDisk, buildFounderSnapshot } from '@/lib/file-storage'
import { getDeepMarketContext } from '@/lib/market-intelligence'
import { runScoringPipeline } from '@/lib/scoring/scoring-pipeline'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Simple text extraction from PDF (basic implementation)
async function extractTextFromPDF(file: File): Promise<string> {
  // For now, return a placeholder - in production you'd use a PDF parsing library
  // like pdf-parse or pdfjs-dist
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  // Basic text extraction - this is a simplified version
  // In production, use a proper PDF parser
  try {
    // Try to extract text from buffer (very basic)
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000))
    // Remove non-printable characters but keep some structure
    return text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').substring(0, 50000)
  } catch (error) {
    logger.error('[ANALYZE-PITCH-DECK] Error extracting text from PDF:', error)
    return 'Unable to extract text from pitch deck. Please ensure the file is readable.'
  }
}

// Validate file
function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024 // 50MB
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint']
  const allowedExtensions = ['.pdf', '.pptx', '.ppt']
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 50MB' }
  }
  
  const fileName = file.name.toLowerCase()
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
  
  if (!allowedTypes.includes(file.type) && !hasValidExtension) {
    return { valid: false, error: 'Only PDF and PowerPoint files are supported' }
  }
  
  return { valid: true }
}

export async function POST(request: NextRequest) {
  // Rate limiting - check before processing
  const rateLimitResponse = await rateLimitMiddleware(request, {
    ...RATE_LIMITS.AI_ANALYSIS,
    identifier: 'analyze-pitch-deck',
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      logger.log('[ANALYZE-PITCH-DECK] Starting pitch deck analysis...')
    }
    const user = await getCurrentUserOrAdmin()
    
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        logger.log('[ANALYZE-PITCH-DECK] No user found, returning 401')
      }
      return NextResponse.json(
        { error: 'Unauthorized' },
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get founder profile
    if (process.env.NODE_ENV === 'development') {
      logger.log('[ANALYZE-PITCH-DECK] Fetching founder profile for:', user.email)
    }
    const founder = await db.founder.findUnique({
      where: { email: user.email },
    }).catch((err) => {
      logger.error('[ANALYZE-PITCH-DECK] Error fetching founder:', err)
      return null
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
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' }, 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      const maxSize = 50 * 1024 * 1024 // 50MB
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      
      let errorDetails: any = {
        error: 'File Validation Failed',
        message: validation.error,
        whatWentWrong: '',
        whyItFailed: '',
        howToFix: [] as string[],
      }
      
      if (file.size > maxSize) {
        errorDetails.whatWentWrong = `Your file is ${fileSizeMB}MB, which exceeds the maximum allowed size of 50MB`
        errorDetails.whyItFailed = 'Large files take too long to process and may cause timeouts'
        errorDetails.howToFix = [
          'Compress your PDF using an online tool like SmallPDF or ILovePDF',
          'Remove unnecessary images or reduce image quality',
          'Split your deck into multiple smaller files if needed',
          'Convert PowerPoint to PDF format (PDFs are typically smaller)',
        ]
      } else {
        const allowedExtensions = ['.pdf', '.pptx', '.ppt']
        const fileName = file.name.toLowerCase()
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext))
        
        errorDetails.whatWentWrong = `Your file type "${file.type || 'unknown'}" is not supported`
        errorDetails.whyItFailed = 'We can only extract text from PDF and PowerPoint files'
        errorDetails.howToFix = [
          'Convert your file to PDF format (recommended)',
          'Or save as PowerPoint (.pptx or .ppt)',
          'If using Google Slides, download as PDF or PowerPoint',
          'If using Keynote, export as PDF or PowerPoint',
        ]
      }
      
      return NextResponse.json(errorDetails, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check credits (but don't deduct yet - will deduct after successful analysis)
    const CREDIT_COST = CREDIT_COSTS.PITCH_DECK
    
    // Skip credit check for admin
    if (user.email !== ADMIN_EMAIL) {
      let userCredits = await db.userCredits.findUnique({
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
          message: `Pitch deck analysis costs ${CREDIT_COST} credits. You have ${userCredits.credits ?? 0} credits.`,
          whatWentWrong: `You need ${creditsNeeded} more credit${creditsNeeded > 1 ? 's' : ''} to analyze your pitch deck`,
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

    // Save pitch deck file to local disk for training data
    let savedFilePath = ''
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      savedFilePath = await saveFileToDisk(buffer, 'pitch-decks', founder.id, file.name, {
        contentType: file.type || 'application/pdf',
      })
      logger.log(`[ANALYZE-PITCH-DECK] File saved to: ${savedFilePath}`)
    } catch (saveErr: any) {
      logger.error('[ANALYZE-PITCH-DECK] Failed to save file to disk (non-critical):', saveErr.message)
    }

    // Extract text from pitch deck
    const deckText = await extractTextFromPDF(file)
    
    if (!deckText || deckText.length < 50) {
      return NextResponse.json({
        error: 'Text Extraction Failed',
        message: 'Could not extract readable text from your pitch deck',
        whatWentWrong: 'The file appears to be empty, corrupted, or contains only images without text',
        whyItFailed: 'Our system needs readable text to analyze your pitch. Images, scanned documents, or corrupted files cannot be processed',
        howToFix: [
          'Ensure your pitch deck contains actual text (not just images)',
          'If your deck is scanned, use OCR (Optical Character Recognition) to extract text first',
          'Re-save your file as a new PDF to ensure it\'s not corrupted',
          'Try exporting from your original presentation software (PowerPoint, Google Slides, etc.)',
          'Check that the file opens correctly in a PDF viewer before uploading',
        ],
        extractedLength: deckText?.length || 0,
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // VALIDATE CONTENT FIRST - before checking credits
    try {
      const validation = await validatePitchDeck(deckText)
      if (!validation.isValid) {
        const missingElements: string[] = []
        const pitchDeckIndicators = [
          { pattern: /problem\s+statement/i, name: 'Problem Statement' },
          { pattern: /solution/i, name: 'Solution' },
          { pattern: /market\s+opportunity/i, name: 'Market Opportunity' },
          { pattern: /business\s+model/i, name: 'Business Model' },
          { pattern: /traction/i, name: 'Traction' },
          { pattern: /team/i, name: 'Team' },
          { pattern: /funding|fundraising|ask/i, name: 'Funding/Ask' },
        ]
        
        const contentLower = deckText.toLowerCase()
        pitchDeckIndicators.forEach(({ pattern, name }) => {
          if (!pattern.test(contentLower)) {
            missingElements.push(name)
          }
        })
        
        return NextResponse.json({
          error: 'Invalid Content',
          message: validation.reason || 'The uploaded file does not appear to be a pitch deck.',
          whatWentWrong: 'Your file doesn\'t contain the key elements of a pitch deck',
          whyItFailed: `Confidence: ${validation.confidence}%. Missing typical pitch deck sections.`,
          howToFix: [
            'Ensure your deck includes: Problem Statement, Solution, Market Opportunity, Business Model, Traction, Team, and Funding Ask',
            missingElements.length > 0 && `Your deck is missing: ${missingElements.slice(0, 3).join(', ')}`,
            'Add more detail about your startup, business model, and market',
            'If this is a pitch deck, make sure it\'s complete and not just a template',
            'Check that text was extracted correctly (not just images)',
          ].filter(Boolean),
          missingElements: missingElements.slice(0, 5),
          validationFailed: true,
          confidence: validation.confidence,
        }, { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
        logger.log(`[ANALYZE-PITCH-DECK] Content validated (confidence: ${validation.confidence}%)`)
    } catch (validationError: any) {
        logger.error('[ANALYZE-PITCH-DECK] Validation error:', validationError)
      // If validation fails due to error, still proceed but log it
    }

    // Analyze pitch deck (qualitative analysis only — scores come from pipeline)
    const features = await extractPitchDeckFeatures(deckText, founder)

    // 🆕 Get cached investors (faster) and comprehensive founder context
    const { getCachedInvestors } = await import('@/lib/investor-cache')
    const investors = await getCachedInvestors()
    const founderContext = await getComprehensiveFounderContext(founder.email)

    // Build enhanced founder data with all profile context
    const enhancedFounder = {
      ...founder,
      ...founderContext,
      sectors: parseJSON<string[]>(founder.sectors || '[]', []),
    }

    logger.log('[ANALYZE-PITCH-DECK] Starting matching pipeline v3...')
    logger.log(`[ANALYZE-PITCH-DECK] Deck text length: ${deckText.length} characters`)

    let matchedVCs: any[] = []
    let matchPipelineResult: any = null
    try {
      matchPipelineResult = await runMatchingPipeline(
        founderContext ?? (enhancedFounder as unknown as import('@/lib/founder-context').ComprehensiveFounderContext),
        features,
        null, // deck route has no transcript
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
      }))

      logger.log(`[ANALYZE-PITCH-DECK] Matching pipeline v3 completed: ${matchedVCs.length} matches found`)
    } catch (matchError: any) {
      logger.error('[ANALYZE-PITCH-DECK] Matching pipeline error:', matchError)
      matchedVCs = []
    }
    
    // Top 20 matches with enhanced data
    const top20Matches = matchedVCs.slice(0, 20)

    // -----------------------------------------------------------------------
    // MULTI-PASS SCORING PIPELINE
    // -----------------------------------------------------------------------
    let scoringResult: Awaited<ReturnType<typeof runScoringPipeline>> | null = null
    try {
      const sectors = parseJSON<string[]>(founder.sectors || '[]', [])
      const domain = sectors[0] || 'technology'
      const problem = features.strengths?.[0] || founder.bio?.substring(0, 300) || ''

      logger.log('[ANALYZE-PITCH-DECK] Running Market Intelligence + Scoring Pipeline...')

      const marketContext = await getDeepMarketContext(domain, problem)
      scoringResult = await runScoringPipeline(deckText, founderContext ?? (enhancedFounder as unknown as import('@/lib/founder-context').ComprehensiveFounderContext), marketContext)
      logger.log(`[ANALYZE-PITCH-DECK] Scoring Pipeline completed — finalScore: ${scoringResult.finalScore}`)
    } catch (scoringError: any) {
      logger.error('[ANALYZE-PITCH-DECK] Scoring Pipeline failed (non-critical):', scoringError?.message)
    }

    // 🆕 Save pitch deck analysis to database (like video pitch)
    const analysisData = {
      overallScore: scoringResult?.finalScore ?? 0,
      strengths: features.strengths,
      weaknesses: features.weaknesses,
      improvements: features.improvements,
      sectorFit: features.sectorFit,
      tractionMetrics: features.tractionMetrics,
      marketAnalysis: features.marketAnalysis,
      teamAnalysis: features.teamAnalysis,
      productFit: features.productFit,
      matches: top20Matches.map((m, idx) => ({
        rank: idx + 1,
        investorId: m.investor.id,
        investor: {
          id: m.investor.id,
          name: m.investor.name,
          firmName: m.investor.firmName,
          fundType: m.investor.fundType,
          stages: parseJSON<string[]>(m.investor.stages || '[]', []),
          sectors: parseJSON<string[]>(m.investor.sectors || '[]', []),
          checkMin: m.investor.checkMin || m.investor.checkSizeMin,
          checkMax: m.investor.checkMax || m.investor.checkSizeMax,
          thesis: m.investor.thesis,
          applicationUrl: m.investor.applicationUrl,
        },
        score: Math.round(m.combinedScore || m.score || 0),
        confidence: m.confidence || 85,
        reasons: m.reasons || [],
        suggestions: m.suggestions || [],
        whyApply: m.whyApply,
        bestApproach: m.bestApproach,
        timing: m.timing,
      })),
      matchedVCs: top20Matches.slice(0, 10).map(m => ({
        investorId: m.investor.id,
        firmName: m.investor.firmName,
        score: Math.round(m.combinedScore || m.score || 0),
        reasons: m.reasons || [],
      })),
    }

    let pitchDeckAnalysis
    try {
      pitchDeckAnalysis = await db.pitchDeckAnalysis.create({
        data: {
          founderId: founder.id,
          fileName: file.name,
          fileUrl: savedFilePath || '',
          fileType: file.type.split('/')[1] || 'pdf',
          fileSize: file.size,
          extractedText: deckText.substring(0, 50000), // Store extracted text for training
          overallScore: scoringResult?.finalScore ?? 0,
          analysisResult: JSON.stringify(analysisData),
          smartMatchResults: JSON.stringify(top20Matches.slice(0, 10)),
          founderSnapshot: JSON.stringify(buildFounderSnapshot(founder)),
        },
      })
      logger.log(`[ANALYZE-PITCH-DECK] Saved analysis to database: ${pitchDeckAnalysis.id}`)
    } catch (saveError: any) {
      logger.error('[ANALYZE-PITCH-DECK] Failed to save analysis to database:', saveError.message)
      // Continue anyway - don't fail the request if save fails
    }

    // Return results
    if (process.env.NODE_ENV === 'development') {
      logger.log('[ANALYZE-PITCH-DECK] Analysis complete, returning results')
    }
    return NextResponse.json({
      pitchDeckId: pitchDeckAnalysis?.id || `pitch-deck-${Date.now()}`,
      analysis: {
        overallScore: scoringResult?.finalScore ?? 0,
        finalScore: scoringResult?.finalScore ?? 0,
        scoreBreakdown: scoringResult?.scoreBreakdown ?? null,
        categoryScores: scoringResult?.categoryScores ?? null,
        rubricAnalysis: scoringResult?.rubricCompatible ?? null,
        strengths: features.strengths,
        weaknesses: features.weaknesses,
        improvements: features.improvements,
        matchedVCs: top20Matches.map((m, idx) => ({
          rank: idx + 1,
          investorId: m.investor.id,
          firmName: m.investor.firmName,
          score: Math.round(m.combinedScore || m.score || 0),
          similarity: Math.round(m.combinedScore || m.score || 0),
          vectorSimilarity: (m.vectorSimilarity ?? 0) * 100,
          reasons: m.reasons || [],
          detailedReasons: m.detailedReasons || [],
          whyApply: m.whyApply,
          bestApproach: m.bestApproach,
          timing: m.timing,
          livePulse: m.livePulse ? {
            summary: m.livePulse.summary,
            conflict: m.livePulse.conflict,
            fromCache: m.livePulse.fromCache,
            signalStrength: m.livePulse.signalStrength ?? 0,
          } : null,
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
        })),
        sectorFit: features.sectorFit,
        tractionMetrics: features.tractionMetrics,
        marketAnalysis: features.marketAnalysis,
        teamAnalysis: features.teamAnalysis,
        productFit: features.productFit,
      },
      matchCount: matchedVCs.length,
      // 🆕 Matching metadata
      matchingMetadata: {
        totalInvestors: investors.length,
        matchesGenerated: matchedVCs.length,
        top20Selected: true,
        usedAINativeMatching: true,
        usedFullFounderContext: !!founderContext,
      },
      universityPrograms: matchPipelineResult?.universityPrograms ?? [],
      pipelineVersion: matchPipelineResult?.pipelineVersion ?? '3.0',
      matchingDurationMs: matchPipelineResult?.durationMs ?? 0,
      matchingError: matchPipelineResult === null,
    }, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    logger.error('[ANALYZE-PITCH-DECK] Error:', error)
    logger.error('[ANALYZE-PITCH-DECK] Error stack:', error.stack)
    
    // Check for specific error types
    let errorDetails: any = {
      error: 'Analysis Failed',
      message: error.message || 'An unexpected error occurred while analyzing your pitch deck',
      whatWentWrong: 'The analysis process encountered an error',
      whyItFailed: error.message || 'An internal error occurred',
      howToFix: [
        'Try uploading your file again',
        'Ensure your file is not corrupted',
        'Check your internet connection',
        'If the problem persists, try a different file format (PDF or PowerPoint)',
        'Contact support if the issue continues',
      ],
    }
    
    // AI-specific errors
    if (error.message?.includes('API') || error.message?.includes('OpenAI') || error.message?.includes('OpenRouter')) {
      errorDetails.whatWentWrong = 'AI analysis service is unavailable or misconfigured'
      errorDetails.whyItFailed = 'The AI service could not process your request'
      errorDetails.howToFix = [
        'Try again in a few moments',
        'Check that the AI service is properly configured',
        'If this persists, contact support',
      ]
    }
    
    // Database errors
    if (error.message?.includes('database') || error.message?.includes('Prisma')) {
      errorDetails.whatWentWrong = 'Database connection error'
      errorDetails.whyItFailed = 'Could not save or retrieve data from the database'
      errorDetails.howToFix = [
        'Try again in a few moments',
        'Your file was not processed - no credits were deducted',
        'Contact support if this continues',
      ]
    }
    
    return NextResponse.json(
      { 
        ...errorDetails,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
