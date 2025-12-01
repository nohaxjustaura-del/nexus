import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { extractPitchDeckFeatures, PitchDeckFeatures } from '@/lib/ai'
import { intelligentMatchVCs } from '@/lib/intelligent-matching'
import { logger } from '@/lib/logger'

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
    console.error('Error extracting text from PDF:', error)
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
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ANALYZE-PITCH-DECK] Starting pitch deck analysis...')
    }
    const user = await getCurrentUser()
    
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ANALYZE-PITCH-DECK] No user found, returning 401')
      }
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get founder profile
    if (process.env.NODE_ENV === 'development') {
      console.log('[ANALYZE-PITCH-DECK] Fetching founder profile for:', user.email)
    }
    const founder = await db.founder.findUnique({
      where: { email: user.email },
    }).catch((err) => {
      console.error('Error fetching founder:', err)
      return null
    })

    if (!founder) {
      return NextResponse.json(
        { error: 'Founder profile not found. Please complete onboarding first.' },
        { status: 404 }
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
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Check and deduct credits
    const CREDIT_COST = 50
    const ADMIN_EMAIL = 'nohaxjustaura@gmail.com'
    
    // Skip credit check for admin
    if (user.email !== ADMIN_EMAIL) {
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
      
      if (!userCredits.isPremium && userCredits.credits < CREDIT_COST) {
        return NextResponse.json({
          error: `Insufficient credits. Pitch deck analysis costs ${CREDIT_COST} credits. You have ${userCredits.credits} credits.`,
          requiresPayment: true,
          creditCost: CREDIT_COST,
          currentCredits: userCredits.credits,
        }, { status: 402 })
      }
      
      // Deduct credits if not premium
      if (!userCredits.isPremium) {
        await (db as any).userCredits.update({
          where: { userId: user.id },
          data: {
            credits: Math.max(0, userCredits.credits - CREDIT_COST),
          },
        })
      }
    }

    // Extract text from pitch deck
    const deckText = await extractTextFromPDF(file)
    
    if (!deckText || deckText.length < 50) {
      return NextResponse.json({
        error: 'Could not extract readable text from pitch deck. Please ensure the file is not corrupted and contains text.',
      }, { status: 400 })
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

    // Return results
    if (process.env.NODE_ENV === 'development') {
      console.log('[ANALYZE-PITCH-DECK] Analysis complete, returning results')
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
    })
  } catch (error: any) {
    console.error('[ANALYZE-PITCH-DECK] Error:', error)
    console.error('[ANALYZE-PITCH-DECK] Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: 'Failed to analyze pitch deck',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
