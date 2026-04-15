import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import OpenAI from 'openai'
import { getLlmClient, getModelName } from '@/lib/openrouter'
import { getSubscriptionStatus, requiresPro } from '@/lib/subscription'
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit'

// Get AI client - supports both OpenRouter and OpenAI
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
    logger.error('[FOUNDER-FEEDBACK] Failed to initialize AI client:', error)
  }
  return null
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Rate limiting - check before processing
  const rateLimitResponse = await rateLimitMiddleware(request, {
    ...RATE_LIMITS.AI_ANALYSIS,
    identifier: 'founder-feedback',
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    logger.log('[FOUNDER-FEEDBACK] Starting founder feedback request...')
    
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { analysisId, idea, pitchDeckText, videoTranscript } = await request.json()

    const sub = await getSubscriptionStatus(user.id, user.email)
    if (requiresPro(sub)) {
      return NextResponse.json(
        { error: 'Upgrade Required', message: 'Upgrade to Pro for founder feedback.', requiresUpgrade: true },
        { status: 403 },
      )
    }

    // Note: Analysis model doesn't exist in schema
    // If you need to retrieve previous analyses, add an Analysis model to the Prisma schema first
    let originalAnalysis: any = null
    // Temporarily disabled until Analysis model is added to schema
    // if (analysisId) {
    //   const analysis = await db.analysis.findUnique({
    //     where: { id: analysisId },
    //   })
    //   if (analysis) {
    //     try {
    //       originalAnalysis = JSON.parse(analysis.result || '{}')
    //     } catch (e) {
    //       logger.error('[FOUNDER-FEEDBACK] Error parsing analysis:', e)
    //     }
    //   }
    // }

    // Generate feedback from YC-funded founders perspective
    const feedbackPrompt = `You are Inigo and William, two YC-funded founders who have successfully raised funding. 
    You're providing personalized feedback to help another founder improve their pitch and increase their chances of getting funded.

    ${idea ? `Pitch Idea:\n"${idea}"\n\n` : ''}
    ${pitchDeckText ? `Pitch Deck Content:\n"${pitchDeckText.substring(0, 2000)}"\n\n` : ''}
    ${videoTranscript ? `Video Pitch Transcript:\n"${videoTranscript.substring(0, 2000)}"\n\n` : ''}
    ${originalAnalysis ? `Previous AI Analysis:\n${JSON.stringify(originalAnalysis.analysis || {}, null, 2)}\n\n` : ''}

    Provide detailed, actionable feedback as if you're a YC-funded founder helping a friend. Include:
    1. What's working well (be specific)
    2. Critical gaps or weaknesses that need fixing
    3. Specific, actionable improvements (not generic advice)
    4. How to better position this for VCs
    5. Red flags investors might see and how to address them
    6. Next steps to strengthen the pitch

    Be honest, supportive, and specific. Write in a conversational but professional tone, as if you're a mentor giving direct feedback.
    Format as plain text (not JSON), 3-5 paragraphs.`

    const aiClient = getAIClient()
    if (!aiClient) {
      return NextResponse.json(
        { error: 'AI service not configured', message: 'Set OLLAMA_BASE_URL, OPENROUTER_API_KEY, or OPENAI_API_KEY' },
        { status: 503 }
      )
    }

    // Limit max_tokens for free tier OpenRouter accounts
    const maxTokens =
      (process.env.OLLAMA_BASE_URL?.trim() || process.env.OPENROUTER_API_KEY) ? 4000 : undefined
    
    const completion = await aiClient.chat.completions.create({
      model: getModelName('gpt-4o'), // Uses OpenRouter format if OpenRouter is configured
      messages: [
        {
          role: 'system',
          content: 'You are Inigo and William, YC-funded founders providing personalized feedback to help other founders improve their pitches. Be specific, actionable, and supportive.',
        },
        { role: 'user', content: feedbackPrompt },
      ],
      temperature: 0.8,
      max_tokens: maxTokens, // Limit tokens for OpenRouter free tier
    })

    const feedback = completion.choices[0]?.message?.content || 'Unable to generate feedback at this time. Please try again.'

    // Note: Analysis model doesn't exist in schema
    // Saving feedback is temporarily disabled until Analysis model is added to schema
    // if (analysisId) {
    //   try {
    //     const analysis = await db.analysis.findUnique({
    //       where: { id: analysisId },
    //     })
    //     if (analysis) {
    //       const result = JSON.parse(analysis.result || '{}')
    //       result.founderFeedback = feedback
    //       await db.analysis.update({
    //         where: { id: analysisId },
    //         data: {
    //           result: JSON.stringify(result),
    //         },
    //       })
    //     }
    //   } catch (e) {
    //     logger.error('[FOUNDER-FEEDBACK] Error saving feedback:', e)
    //   }
    // }

    return NextResponse.json({
      feedback,
      success: true,
    })
  } catch (error: any) {
    logger.error('[FOUNDER-FEEDBACK] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get founder feedback', message: error.message },
      { status: 500 }
    )
  }
}



