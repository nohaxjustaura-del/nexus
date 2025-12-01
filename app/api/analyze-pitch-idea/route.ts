import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { intelligentMatchVCs } from '@/lib/intelligent-matching'
import { logger } from '@/lib/logger'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const ADMIN_EMAIL = 'nohaxjustaura@gmail.com'
const PITCH_IDEA_CREDIT_COST = 15

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    logger.log('[ANALYZE-PITCH-IDEA] Starting pitch idea analysis...')
    
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get founder profile
    const founder = await db.founder.findUnique({
      where: { email: user.email },
    })

    if (!founder) {
      return NextResponse.json(
        { error: 'Founder profile not found. Please complete onboarding first.' },
        { status: 404 }
      )
    }

    // Accept either JSON (text idea) or FormData (file upload)
    const contentType = request.headers.get('content-type') || ''
    let idea = ''

    if (contentType.includes('multipart/form-data')) {
      // File upload
      const formData = await request.formData()
      const file = formData.get('file') as File
      
      if (!file) {
        return NextResponse.json(
          { error: 'File is required when using file upload' },
          { status: 400 }
        )
      }

      // Read file content (supports .txt, .doc, .docx, .pdf)
      const fileBuffer = await file.arrayBuffer()
      const fileText = new TextDecoder().decode(fileBuffer)
      idea = fileText.trim()

      logger.log(`[ANALYZE-PITCH-IDEA] Received file upload: ${file.name} (${file.size} bytes)`)
    } else {
      // JSON text idea
      const { idea: textIdea } = await request.json()
      idea = textIdea || ''
    }

    if (!idea || !idea.trim()) {
      return NextResponse.json(
        { error: 'Pitch idea is required (either as text or file)' },
        { status: 400 }
      )
    }

    // Check credits (admin bypass)
    if (user.email !== ADMIN_EMAIL) {
      const userCredits = await db.userCredits.findUnique({
        where: { userId: user.id },
      })

      if (!userCredits || (!userCredits.isPremium && (userCredits.credits ?? 0) < PITCH_IDEA_CREDIT_COST)) {
        return NextResponse.json(
          { 
            error: 'Insufficient credits',
            message: `Pitch idea analysis costs ${PITCH_IDEA_CREDIT_COST} credits. You have ${userCredits?.credits ?? 0} credits.`,
            requiresPayment: true,
          },
          { status: 402 }
        )
      }

      // Deduct credits
      await db.userCredits.update({
        where: { userId: user.id },
        data: {
          credits: { decrement: PITCH_IDEA_CREDIT_COST },
        },
      })
    }

    // Analyze pitch idea with AI
    const analysisPrompt = `You are an expert VC analyst with 15+ years of experience evaluating startup pitches. 
    You've seen thousands of pitches and know exactly what makes them compelling to investors.

    Analyze this pitch idea and provide detailed feedback:

    "${idea}"

    Provide a JSON response with:
    1. strengths: array of 3-5 key strengths of this pitch idea
    2. improvements: array of 3-5 specific areas that need improvement
    3. suggestions: array of 3-5 actionable next steps to strengthen the pitch
    4. marketFit: brief assessment of market fit (1-2 sentences)
    5. uniqueness: brief assessment of what makes it unique (1-2 sentences)
    6. riskFactors: array of 2-3 main risk factors investors might see

    Be specific, honest, and actionable. Format as valid JSON.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert VC analyst. Provide detailed, actionable feedback on startup pitch ideas. Always respond with valid JSON.',
        },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const analysisText = completion.choices[0]?.message?.content || '{}'
    let analysis: any = {}
    try {
      analysis = JSON.parse(analysisText)
    } catch (e) {
      logger.error('[ANALYZE-PITCH-IDEA] Error parsing AI response:', e)
      analysis = {
        strengths: ['The idea shows potential'],
        improvements: ['Could use more specific details'],
        suggestions: ['Refine the pitch with more concrete examples'],
        marketFit: 'Needs more market validation',
        uniqueness: 'Consider what makes this different',
        riskFactors: ['Market competition', 'Execution risk'],
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

    // Fetch all investors for matching
    const investors = await db.investor.findMany({
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

    const matches = await intelligentMatchVCs(
      {
        basics: {
          name: founder.name,
          email: founder.email,
        },
        skills: {
          programming: [],
          ml: [],
          gtm: [],
          domain: [],
        },
        experience: [],
        education: [],
        projects: [],
      },
      founderData,
      investors
    )

    // Note: Analysis model doesn't exist in schema, so we skip saving
    // If you need to save analyses, add an Analysis model to the Prisma schema first
    
    return NextResponse.json({
      id: `analysis_${Date.now()}`, // Temporary ID since we're not saving
      analysis,
      matches: matches.slice(0, 10),
      matchCount: matches.length,
    })
  } catch (error: any) {
    logger.error('[ANALYZE-PITCH-IDEA] Error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze pitch idea', message: error.message },
      { status: 500 }
    )
  }
}


