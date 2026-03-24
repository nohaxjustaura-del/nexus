import OpenAI from "openai"

/**
 * Get OpenRouter client - a unified API for accessing multiple LLM providers
 * Uses OpenAI-compatible SDK with OpenRouter base URL
 */
export function getOpenRouterClient(): OpenAI | null {
  try {
    // ONLY use OpenRouter if OPENROUTER_API_KEY is explicitly set
    // Don't fall back to OPENAI_API_KEY here - that's handled in getAIClient
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return null
    }

    return new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_REFERER_URL || 'https://foundermatch.com',
        'X-Title': 'FounderMatch - AI Analysis',
      },
    })
  } catch (error) {
    console.error('[OpenRouter] Failed to initialize client:', error)
    return null
  }
}

/**
 * Get the model name for OpenRouter
 * Prioritizes FREE models (DeepSeek, Gemini free tier)
 */
export function getModelName(model: string = 'gpt-4o'): string {
  // If using OpenRouter, prioritize FREE models
  if (process.env.OPENROUTER_API_KEY) {
    if (model === 'gpt-4o') {
      return 'openai/gpt-4o-mini'
    }
    
    // Prioritize Gemini free tier if GEMINI_API_KEY is set
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      if (model === 'gemini' || model.includes('gemini')) {
        return 'google/gemini-2.0-flash-thinking-exp:free'
      }
    }
    
    if (!model.includes('/')) {
      return 'openai/gpt-4o-mini'
    }
    return model
  }
  
  // If using OpenAI directly, return model as-is
  return model
}

/**
 * Check if OpenRouter is configured
 */
export function hasOpenRouterKey(): boolean {
  return !!(process.env.OPENROUTER_API_KEY)
}

/**
 * Generate text using OpenRouter
 */
export async function openrouterGenerateText(
  prompt: string,
  options: {
    temperature?: number
    maxTokens?: number
    model?: string
  } = {}
): Promise<string> {
  const client = getOpenRouterClient()
  if (!client) {
    throw new Error('OpenRouter not configured. Set OPENROUTER_API_KEY.')
  }

  const model = options.model || 'deepseek/deepseek-chat' // FREE model!
  
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4000,
  })

  return response.choices[0]?.message?.content || ''
}

/**
 * Generate JSON using OpenRouter
 */
export async function openrouterGenerateJson<T = any>(options: {
  system: string
  user: string
  temperature?: number
  model?: string
}): Promise<T> {
  const client = getOpenRouterClient()
  if (!client) {
    throw new Error('OpenRouter not configured. Set OPENROUTER_API_KEY.')
  }

  const model = options.model || 'deepseek/deepseek-chat' // FREE model!
  
  console.log(`[OPENROUTER] 🤖 Using model: ${model} (FREE)`)
  
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: options.system + '\n\nReturn ONLY valid JSON. No markdown, no code blocks, no explanations.' },
      { role: 'user', content: options.user + '\n\nIMPORTANT: Respond with ONLY the JSON object. No markdown code fences.' },
    ],
    temperature: options.temperature ?? 0.7,
    max_tokens: 4000,
  })

  const content = response.choices[0]?.message?.content || '{}'
  
  console.log(`[OPENROUTER] 📄 Response length: ${content.length}, starts: ${content.substring(0, 100)}`)
  
  // Extract JSON from response (handles markdown code blocks and extra text)
  let jsonText = content.trim()
  
  // Remove markdown code blocks if present
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1]
    console.log(`[OPENROUTER] 🔧 Extracted from markdown code block`)
  }
  
  // Find JSON object boundaries
  const firstBrace = jsonText.indexOf('{')
  const lastBrace = jsonText.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1)
  }
  
  console.log(`[OPENROUTER] ✅ Parsing JSON...`)
  
  try {
    return JSON.parse(jsonText)
  } catch (parseError: any) {
    console.error(`[OPENROUTER] ❌ JSON parse error:`, parseError.message)
    console.error(`[OPENROUTER] Raw content:`, content.substring(0, 500))
    throw new Error(`Failed to parse JSON from ${model}: ${parseError.message}`)
  }
}

