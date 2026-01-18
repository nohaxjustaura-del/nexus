import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { extractPitchDeckFeatures, PitchDeckFeatures } from '@/lib/ai'
import { intelligentMatchVCs } from '@/lib/intelligent-matching'
import { logger } from '@/lib/logger'
import { validatePitchDeck } from '@/lib/content-validator'
import { ADMIN_EMAIL, CREDIT_COSTS } from '@/lib/constants'
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit'
import { generatePitchEmbedding, rankVCsForPitch } from '@/lib/embeddings'
import { parseJSON } from '@/lib/utils'

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
    const user = await getCurrentUser()
    
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
        const missingElements = []
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

    // Analyze pitch deck
    const features = await extractPitchDeckFeatures(deckText, founder)

    // Get all investors
    const investors = await db.investor.findMany({
      where: {
        verified: true,
      },
      take: 200,
    })

    // Prepare founder data for matching
    const founderData = {
      email: founder.email,
      name: founder.name,
      stage: founder.stage || 'Seed',
      sectors: JSON.parse(founder.sectors || '[]'),
      fundingNeed: founder.fundingNeed || 500,
      location: founder.location || 'US',
    }

    // Convert pitch deck features to resume-like features for matching
    const resumeFeatures = {
      skills: [],
      experiences: [],
      keywords: features.strengths || [],
      traction: features.tractionMetrics || {},
    }

    // Match with VCs
    const matches = await intelligentMatchVCs(resumeFeatures as any, founderData, investors)

    // Prepare analysis result
    const analysisResult = {
      features,
      matches: matches.slice(0, 20).map(m => ({
        investorId: m.investor.id,
        firmName: m.investor.firmName,
        score: m.score,
        reasons: m.reasons,
        detailedReasons: m.detailedReasons,
      })),
      matchCount: matches.length,
      fileName: file.name,
      analyzedAt: new Date().toISOString(),
    }

    // Smart Match - AI-powered semantic matching (optional, doesn't block analysis)
    // Uses Google Gemini's text-embedding-004 model
    let smartMatches: any[] = []
    try {
      const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
      
      if (!hasGeminiKey) {
        logger.log('[ANALYZE-PITCH-DECK] Smart Match skipped (GEMINI_API_KEY required)')
      } else {
        logger.log('[ANALYZE-PITCH-DECK] Running Smart Match with Gemini...')
        // Build pitch features for embedding
        const pitchFeatures = {
          companyName: features.companyName || 'Unknown',
          oneLineSummary: features.oneLineSummary || '',
          stage: features.stage || 'Unknown',
          sectorPrimary: features.sectorFit?.primarySector || '',
          sectorSecondary: features.sectorFit?.secondarySectors || [],
          problemStatement: features.problemStatement || '',
          solutionDescription: features.solutionDescription || '',
          targetCustomer: {
            customerType: features.targetCustomer || '',
            buyerRole: '',
            companySize: '',
          },
          geography: {
            hqLocation: features.geography || '',
            markets: [],
          },
          businessModel: features.businessModel || '',
          traction: {
            revenue: features.tractionMetrics?.revenue || '',
            users: features.tractionMetrics?.users || '',
            growthSignal: features.tractionMetrics?.growthRate || '',
          },
          keyTechnologies: features.keyTechnologies || [],
          competitiveMoat: features.competitiveMoat || [],
          keywords: features.keywords || [],
        }

        // Generate pitch embedding
        const pitchEmbedding = await generatePitchEmbedding(pitchFeatures)

        // Get all VCs with embeddings (only those that have embeddings)
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
        const investors = allInvestors.filter(inv => inv.embedding !== null && inv.embedding !== undefined)

        // Prepare VC embeddings
        const vcEmbeddings: Array<{
          id: string
          firmName: string
          embedding: number[]
          metadata: any
        }> = []

        for (const investor of investors) {
          try {
            const embedding = JSON.parse(investor.embedding as string)
            vcEmbeddings.push({
              id: investor.id,
              firmName: investor.firmName,
              embedding,
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
            })
          } catch {
            // Skip if embedding parsing fails
            continue
          }
        }

        // Rank VCs by similarity
        // Try FAISS first (much faster), fall back to in-memory if unavailable
        try {
          smartMatches = await rankVCsForPitch(pitchEmbedding, [], 20, true)
          logger.log(`[ANALYZE-PITCH-DECK] Smart Match complete with FAISS: ${smartMatches.length} matches`)
        } catch (faissError) {
          // Fall back to in-memory ranking
          if (vcEmbeddings.length > 0) {
            smartMatches = await rankVCsForPitch(pitchEmbedding, vcEmbeddings, 20, false)
            logger.log(`[ANALYZE-PITCH-DECK] Smart Match complete (in-memory): ${smartMatches.length} matches from ${vcEmbeddings.length} VCs`)
          } else {
            logger.warn('[ANALYZE-PITCH-DECK] No VC embeddings found and FAISS unavailable. Run: npm run generate-vc-embeddings or start FAISS service')
          }
        }
      }
    } catch (smartMatchError: any) {
      logger.error('[ANALYZE-PITCH-DECK] Smart Match failed (non-critical):', smartMatchError.message)
      // Continue without Smart Match if it fails - analysis should still work
    }

    // Return results
    if (process.env.NODE_ENV === 'development') {
      logger.log('[ANALYZE-PITCH-DECK] Analysis complete, returning results')
    }
    return NextResponse.json({
      pitchDeckId: `pitch-deck-${Date.now()}`, // Temporary ID
      analysis: {
        overallScore: features.overallScore,
        strengths: features.strengths,
        weaknesses: features.weaknesses,
        improvements: features.improvements,
        matchedVCs: matches.slice(0, 20).map(m => ({
          investorId: m.investor.id,
          firmName: m.investor.firmName,
          score: m.score,
          similarity: m.score, // Add similarity rating for consistency
          reasons: m.reasons,
          detailedReasons: m.detailedReasons,
        })),
        sectorFit: features.sectorFit,
        tractionMetrics: features.tractionMetrics,
        marketAnalysis: features.marketAnalysis,
        teamAnalysis: features.teamAnalysis,
        productFit: features.productFit,
      },
      matchCount: matches.length,
      smartMatches: smartMatches, // AI-powered semantic matches
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
