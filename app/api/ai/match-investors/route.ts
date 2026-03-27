import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'
import OpenAI from 'openai'
import { FUND_COACH_SYSTEM_PROMPT } from '@/lib/ai-prompts'
import { getLlmClient, getModelName } from '@/lib/openrouter'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Get AI client - Ollama / OpenRouter / OpenAI
function getAIClient(): OpenAI | null {
  const llm = getLlmClient()
  if (llm) {
    return llm
  }
  
  try {
    if (process.env.OPENAI_API_KEY) {
      return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    }
  } catch (error) {
    console.error('[MATCH-INVESTORS] Failed to initialize AI client:', error)
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in first.' }, { status: 401 })
    }

    // Get user's founder and startup profile
    const userProfile = await db.user.findUnique({
      where: { id: user.id },
      select: {
        founderProfile: true,
        startupProfile: true,
      },
    })

    if (!userProfile?.founderProfile || !userProfile?.startupProfile) {
      return NextResponse.json(
        { error: 'Please complete onboarding first' },
        { status: 400 }
      )
    }

    // Parse profiles
    const founderProfile = JSON.parse(userProfile.founderProfile as string)
    const startupProfile = JSON.parse(userProfile.startupProfile as string)

    // Fetch ALL investors from database for matching
    const investors = await db.investor.findMany({
      select: {
        id: true,
        name: true,
        firmName: true,
        email: true,
        verified: true,
        bio: true,
        stages: true,
        checkMin: true,
        checkMax: true,
        sectors: true,
        geoFocus: true,
        thesis: true,
        fundType: true,
        leadFollow: true,
        valueAddTags: true,
        ethicsTags: true,
        personalityType: true,
        decisionSpeed: true,
        websiteUrl: true,
        applicationUrl: true,
      },
      take: 500, // Limit to avoid token limits
    })

    // Format investor database for AI
    const investorDatabase = investors.map(inv => ({
      id: inv.id,
      name: inv.firmName || inv.name,
      type: inv.fundType,
      verified: inv.verified,
      website_url: inv.websiteUrl,
      apply_url: inv.applicationUrl,
      investment_stages: inv.stages ? JSON.parse(inv.stages) : [],
      check_size_min: inv.checkMin,
      check_size_max: inv.checkMax,
      sectors: inv.sectors ? JSON.parse(inv.sectors) : [],
      geography_focus: inv.geoFocus ? JSON.parse(inv.geoFocus) : [],
      thesis: inv.thesis,
      bio: inv.bio,
      value_add_services: inv.valueAddTags ? JSON.parse(inv.valueAddTags) : [],
      style: [inv.personalityType],
      decision_speed: inv.decisionSpeed,
      founder_focus: inv.ethicsTags ? JSON.parse(inv.ethicsTags) : [],
      lead_follow: inv.leadFollow,
    }))

    // Build the full prompt for GPT-4
    const userPrompt = `
# FOUNDER PROFILE

${JSON.stringify(founderProfile, null, 2)}

# STARTUP PROFILE

${JSON.stringify(startupProfile, null, 2)}

# INVESTOR DATABASE

${JSON.stringify(investorDatabase.slice(0, 100), null, 2)}

Please analyze this founder and startup, provide detailed feedback, and match them with the best investors from the database.
`

    // Call AI service (OpenRouter or OpenAI)
    const aiClient = getAIClient()
    if (!aiClient) {
      return NextResponse.json(
        { error: 'AI service not configured', message: 'Set OLLAMA_BASE_URL, OPENROUTER_API_KEY, or OPENAI_API_KEY' },
        { status: 503 }
      )
    }

    // Limit max_tokens for free tier OpenRouter accounts (reduce from 4000 to 3000 to be safe)
    const maxTokens =
      (process.env.OLLAMA_BASE_URL?.trim() || process.env.OPENROUTER_API_KEY) ? 3000 : 4000
    
    const completion = await aiClient.chat.completions.create({
      model: getModelName('gpt-4-turbo-preview'), // Uses OpenRouter format if OpenRouter is configured
      messages: [
        {
          role: 'system',
          content: FUND_COACH_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: maxTokens, // Limit tokens for OpenRouter free tier
    })

    const analysis = completion.choices[0]?.message?.content

    if (!analysis) {
      throw new Error('No response from AI')
    }

    // Save the analysis
    await db.user.update({
      where: { id: user.id },
      data: {
        lastAiAnalysis: analysis,
        lastAnalysisDate: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error: any) {
    console.error('Error in AI matching:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}

