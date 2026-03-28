import OpenAI from 'openai'
import { getLlmClient, getModelName } from './openrouter'

// Initialize AI client for validation
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
    console.error('[CONTENT-VALIDATOR] Failed to initialize AI client:', error)
  }
  return null
}

export interface ValidationResult {
  isValid: boolean
  confidence: number // 0-100
  reason?: string
}

/**
 * Validates if text content is actually a pitch idea
 */
export async function validatePitchIdea(content: string): Promise<ValidationResult> {
  // Basic checks first
  if (!content || content.trim().length < 50) {
    return {
      isValid: false,
      confidence: 0,
      reason: 'Content is too short to be a pitch idea (minimum 50 characters required)',
    }
  }

  if (content.length > 50000) {
    return {
      isValid: false,
      confidence: 0,
      reason: 'Content is too long (maximum 50,000 characters)',
    }
  }

  // Check for obvious non-pitch content patterns
  const suspiciousPatterns = [
    /assignment\s+#?\d+/i,
    /homework\s+#?\d+/i,
    /due\s+date/i,
    /course\s+code/i,
    /professor|instructor/i,
    /rubric|grading/i,
    /question\s+\d+/i,
    /problem\s+\d+/i,
    /chapter\s+\d+/i,
    /textbook/i,
    /recipe/i,
    /shopping\s+list/i,
    /random\s+text/i,
    /test\s+content/i,
    /lorem\s+ipsum/i,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return {
        isValid: false,
        confidence: 0,
        reason: 'Content does not appear to be a pitch idea (detected non-pitch content patterns)',
      }
    }
  }

  // Use AI to validate content relevance
  const aiClient = getAIClient()
  if (!aiClient) {
    // If AI is not available, do basic keyword check
    const pitchKeywords = [
      'startup', 'business', 'product', 'service', 'market', 'customer', 'revenue',
      'funding', 'investor', 'problem', 'solution', 'traction', 'growth', 'team',
      'company', 'venture', 'fundraising', 'pitch', 'idea', 'concept'
    ]
    
    const contentLower = content.toLowerCase()
    const keywordMatches = pitchKeywords.filter(keyword => contentLower.includes(keyword)).length
    
    if (keywordMatches < 3) {
      return {
        isValid: false,
        confidence: 30,
        reason: 'Content does not appear to be related to a startup pitch idea',
      }
    }
    
    return {
      isValid: true,
      confidence: 60,
    }
  }

  try {
    const maxTokens = process.env.OPENROUTER_API_KEY ? 500 : undefined
    
    const validationPrompt = `You are a content validator. Analyze this text and determine if it is a legitimate startup pitch idea or business concept.

Content to validate:
${content.substring(0, 2000)}

Return ONLY a JSON object with:
{
  "isValid": true/false,
  "confidence": 0-100,
  "reason": "brief explanation"
}

Consider it VALID if it:
- Describes a startup idea, product concept, or business opportunity
- Mentions problems, solutions, markets, customers, or business models
- Is related to entrepreneurship, innovation, or fundraising

Consider it INVALID if it:
- Is random text, spam, or gibberish
- Is a school assignment, homework, or test content
- Is a recipe, shopping list, or unrelated personal content
- Has no connection to startups, business, or entrepreneurship
- Is clearly not a pitch idea

Be strict - only validate legitimate pitch ideas. Return valid JSON only.`

    const completion = await aiClient.chat.completions.create({
      model: getModelName('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: 'You are a content validator. Analyze text and return JSON with isValid (boolean), confidence (0-100), and reason (string).',
        },
        {
          role: 'user',
          content: validationPrompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'
    const result = JSON.parse(responseText) as ValidationResult

    return {
      isValid: result.isValid || false,
      confidence: result.confidence || 0,
      reason: result.reason,
    }
  } catch (error: any) {
    console.error('[CONTENT-VALIDATOR] AI validation error:', error)
    // Fallback to basic validation
    return {
      isValid: true, // Allow through if AI fails, but log it
      confidence: 50,
      reason: 'AI validation unavailable, using basic checks',
    }
  }
}

/**
 * Validates if text content is actually a pitch deck
 */
export async function validatePitchDeck(content: string): Promise<ValidationResult> {
  // Basic checks
  if (!content || content.trim().length < 100) {
    return {
      isValid: false,
      confidence: 0,
      reason: 'Content is too short to be a pitch deck (minimum 100 characters required)',
    }
  }

  // Check for pitch deck indicators
  const pitchDeckIndicators = [
    /problem\s+statement/i,
    /solution/i,
    /market\s+opportunity/i,
    /business\s+model/i,
    /traction/i,
    /team/i,
    /funding|fundraising|ask/i,
    /competition|competitive/i,
    /go\s+to\s+market|gtm/i,
    /revenue|mrr|arr/i,
    /slide\s+\d+/i,
  ]

  const contentLower = content.toLowerCase()
  const indicatorMatches = pitchDeckIndicators.filter(pattern => pattern.test(contentLower)).length

  if (indicatorMatches < 2) {
    return {
      isValid: false,
      confidence: 20,
      reason: 'Content does not appear to be a pitch deck (missing key pitch deck sections)',
    }
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /assignment\s+#?\d+/i,
    /homework/i,
    /recipe/i,
    /shopping\s+list/i,
    /random\s+text/i,
    /test\s+content/i,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return {
        isValid: false,
        confidence: 0,
        reason: 'Content does not appear to be a pitch deck (detected non-pitch content)',
      }
    }
  }

  // Use AI for deeper validation
  const aiClient = getAIClient()
  if (aiClient) {
    try {
      const maxTokens = process.env.OPENROUTER_API_KEY ? 500 : undefined
      
      const validationPrompt = `Analyze this text and determine if it is a legitimate pitch deck or business presentation.

Content:
${content.substring(0, 3000)}

Return ONLY JSON:
{
  "isValid": true/false,
  "confidence": 0-100,
  "reason": "brief explanation"
}

Valid if: Contains business/pitch content (problem, solution, market, traction, team, funding, etc.)
Invalid if: Random text, assignments, recipes, or unrelated content

Return valid JSON only.`

      const completion = await aiClient.chat.completions.create({
        model: getModelName('gpt-4o'),
        messages: [
          {
            role: 'system',
            content: 'You are a content validator. Return JSON with isValid, confidence, and reason.',
          },
          {
            role: 'user',
            content: validationPrompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
      })

      const responseText = completion.choices[0]?.message?.content || '{}'
      const result = JSON.parse(responseText) as ValidationResult

      return {
        isValid: result.isValid || false,
        confidence: result.confidence || 0,
        reason: result.reason,
      }
    } catch (error: any) {
      console.error('[CONTENT-VALIDATOR] AI validation error:', error)
    }
  }

  // Fallback: if we have pitch deck indicators, allow it
  return {
    isValid: indicatorMatches >= 2,
    confidence: Math.min(70, indicatorMatches * 15),
    reason: indicatorMatches >= 2 ? 'Contains pitch deck indicators' : 'Missing pitch deck content',
  }
}

/**
 * Validates if transcript content is actually a video pitch
 */
export async function validateVideoPitch(transcript: string): Promise<ValidationResult> {
  // Basic checks - more lenient
  if (!transcript || transcript.trim().length < 50) {
    return {
      isValid: false,
      confidence: 0,
      reason: 'Transcript is too short to be a video pitch (minimum 50 characters required)',
    }
  }

  // Check for pitch-related content - VERY lenient matching
  const pitchIndicators = [
    /startup|business|company|venture|entrepreneur|founded|founding/i,
    /problem|solution|issue|challenge|opportunity|addressing/i,
    /market|customer|user|client|audience/i,
    /funding|investor|investment|capital|raise|raising/i,
    /product|service|platform|app|software|technology/i,
    /traction|revenue|growth|scale|metrics|users/i,
    /team|founder|build|create|develop|building|creating/i,
    /\$\d+|\d+%|million|thousand|billion/i, // Numbers/metrics
    /stanford|harvard|mit|facebook|google|engineer/i, // Founder credentials
    /pitch|presenting|introduce|introduction/i, // Pitch language
  ]

  const transcriptLower = transcript.toLowerCase()
  const indicatorMatches = pitchIndicators.filter(pattern => pattern.test(transcriptLower)).length

  // Accept if ANY indicator matches OR if transcript is long enough (shows effort)
  if (indicatorMatches < 1 && transcript.length < 200) {
    return {
      isValid: false,
      confidence: 20,
      reason: 'Transcript does not appear to be a video pitch (missing pitch-related content)',
    }
  }
  
  // If transcript is long enough (200+ chars), be very lenient
  if (transcript.length >= 200 && indicatorMatches >= 0) {
    return {
      isValid: true,
      confidence: 60,
      reason: 'Sufficient content length with founders introducing themselves',
    }
  }

  // Check for suspicious patterns - VERY STRICT (only reject obvious spam)
  const suspiciousPatterns = [
    /this\s+is\s+a\s+test\s+video/i,
    /lorem\s+ipsum/i,
    /random\s+gibberish/i,
  ]

  const transcriptLower2 = transcript.toLowerCase()
  
  // Only reject if MULTIPLE suspicious patterns match
  const suspiciousMatches = suspiciousPatterns.filter(pattern => pattern.test(transcriptLower2)).length
  
  if (suspiciousMatches >= 2) {
    return {
      isValid: false,
      confidence: 0,
      reason: 'Transcript appears to be test content or spam',
    }
  }

  // Use AI for validation
  const aiClient = getAIClient()
  if (aiClient) {
    try {
      const maxTokens = process.env.OPENROUTER_API_KEY ? 500 : undefined
      
      const validationPrompt = `Analyze this video transcript and determine if it is a legitimate startup pitch video.

Transcript:
${transcript.substring(0, 3000)}

Return ONLY JSON:
{
  "isValid": true/false,
  "confidence": 0-100,
  "reason": "brief explanation"
}

Valid if: Contains pitch content (startup idea, business concept, fundraising, etc.)
Invalid if: Random audio, music, movies, assignments, or unrelated content

Return valid JSON only.`

      const completion = await aiClient.chat.completions.create({
        model: getModelName('gpt-4o'),
        messages: [
          {
            role: 'system',
            content: 'You are a content validator. Return JSON with isValid, confidence, and reason.',
          },
          {
            role: 'user',
            content: validationPrompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
      })

      const responseText = completion.choices[0]?.message?.content || '{}'
      const result = JSON.parse(responseText) as ValidationResult

      return {
        isValid: result.isValid || false,
        confidence: result.confidence || 0,
        reason: result.reason,
      }
    } catch (error: any) {
      console.error('[CONTENT-VALIDATOR] AI validation error:', error)
    }
  }

  // Fallback - more lenient
  return {
    isValid: indicatorMatches >= 1,
    confidence: Math.min(80, indicatorMatches * 20),
    reason: indicatorMatches >= 1 ? 'Contains pitch-related content' : 'Missing pitch content',
  }
}








