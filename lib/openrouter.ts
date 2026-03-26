import OpenAI from 'openai'
import { getSiteUrl } from '@/lib/site-url'

/** Request timeout for OpenRouter (ms). Low defaults cause "Connection error" on slow networks. */
const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS) || 120_000

/** SDK-level retries (429/5xx). Network failures still need our outer retry loop. */
const OPENROUTER_MAX_RETRIES = Math.min(5, Number(process.env.OPENROUTER_MAX_RETRIES) || 3)

/** Outer retries when fetch fails with connection / network errors */
const OPENROUTER_OUTER_RETRIES = Math.min(6, Number(process.env.OPENROUTER_OUTER_RETRIES) || 3)

function isLikelyNetworkError(err: unknown): boolean {
  if (!err) return false
  const e = err as Error & { cause?: unknown; code?: string }
  const msg = `${e.message || ''} ${e.code || ''}`.toLowerCase()
  const patterns = [
    'connection error',
    'fetch failed',
    'econnreset',
    'etimedout',
    'enotfound',
    'eai_again',
    'socket',
    'network',
    'tls',
    'ssl',
    'aborted',
    'timeout',
    'und_err',
  ]
  if (patterns.some((p) => msg.includes(p))) return true
  if (e.cause) return isLikelyNetworkError(e.cause)
  return false
}

function logNetworkError(context: string, err: unknown): void {
  const e = err as Error & { cause?: { message?: string; code?: string } }
  const causeMsg = e?.cause?.message || e?.cause?.code || ''
  console.error(`[OPENROUTER] ${context}: ${e?.message || err}${causeMsg ? ` (cause: ${causeMsg})` : ''}`)
}

function parseJsonFromChatContent(content: string, _modelLabel: string): unknown {
  let jsonText = content.trim()

  const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1]
  }

  const firstBrace = jsonText.indexOf('{')
  const lastBrace = jsonText.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1)
  }

  return JSON.parse(jsonText)
}

async function chatCompletionParseJson<T>(
  client: OpenAI,
  model: string,
  options: { system: string; user: string; temperature: number; maxTokens?: number },
  logLabel: string
): Promise<T> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          options.system +
          '\n\nReturn ONLY valid JSON. No markdown, no code blocks, no explanations.',
      },
      {
        role: 'user',
        content:
          options.user +
          '\n\nIMPORTANT: Respond with ONLY the JSON object. No markdown code fences.',
      },
    ],
    temperature: options.temperature,
    max_tokens: options.maxTokens ?? 4000,
  })

  const content = response.choices[0]?.message?.content || '{}'
  console.log(
    `[${logLabel}] 📄 Response length: ${content.length}, starts: ${content.substring(0, 100)}`
  )

  try {
    const parsed = parseJsonFromChatContent(content, model) as T
    console.log(`[${logLabel}] ✅ JSON parsed OK`)
    return parsed
  } catch (parseError: unknown) {
    const pe = parseError as Error
    console.error(`[${logLabel}] ❌ JSON parse error:`, pe.message)
    console.error(`[${logLabel}] Raw content:`, content.substring(0, 500))
    throw new Error(`Failed to parse JSON from ${model}: ${pe.message}`)
  }
}

/**
 * Get OpenRouter client - a unified API for accessing multiple LLM providers
 * Uses OpenAI-compatible SDK with OpenRouter base URL
 */
export function getOpenRouterClient(): OpenAI | null {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return null
    }

    return new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: OPENROUTER_TIMEOUT_MS,
      maxRetries: OPENROUTER_MAX_RETRIES,
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_REFERER_URL || getSiteUrl(),
        'X-Title': 'NEXUS',
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
  if (process.env.OPENROUTER_API_KEY) {
    if (model === 'gpt-4o') {
      return 'openai/gpt-4o-mini'
    }

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

  return model
}

/**
 * Check if OpenRouter is configured
 */
export function hasOpenRouterKey(): boolean {
  return !!process.env.OPENROUTER_API_KEY
}

/**
 * Generate text using OpenRouter only (retries on transient network errors).
 */
export async function openrouterGenerateText(
  prompt: string,
  options: {
    temperature?: number
    maxTokens?: number
    model?: string
  } = {}
): Promise<string> {
  const model = options.model || 'deepseek/deepseek-chat'
  const temperature = options.temperature ?? 0.7
  const maxTokens = options.maxTokens ?? 4000

  const tryOpenRouter = async (): Promise<string> => {
    const client = getOpenRouterClient()
    if (!client) {
      throw new Error('OpenRouter not configured. Set OPENROUTER_API_KEY.')
    }
    console.log(`[OPENROUTER] 🤖 Using model: ${model}`)
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    })
    return response.choices[0]?.message?.content || ''
  }

  let lastError: unknown
  for (let attempt = 0; attempt < OPENROUTER_OUTER_RETRIES; attempt++) {
    try {
      return await tryOpenRouter()
    } catch (e) {
      lastError = e
      logNetworkError(`Text attempt ${attempt + 1}/${OPENROUTER_OUTER_RETRIES}`, e)
      if (!isLikelyNetworkError(e) || attempt === OPENROUTER_OUTER_RETRIES - 1) {
        break
      }
      const wait = 1500 * (attempt + 1)
      console.warn(`[OPENROUTER] Retrying in ${wait}ms...`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

function isOpenRouterInsufficientCredits(err: unknown): boolean {
  const m = `${err instanceof Error ? err.message : String(err)}`.toLowerCase()
  return (
    m.includes('402') ||
    m.includes('more credits') ||
    (m.includes('afford') && m.includes('token')) ||
    (m.includes('insufficient') && m.includes('credit'))
  )
}

/**
 * Generate JSON using OpenRouter only (retries on transient network errors).
 * Use `maxTokens` well below your balance; OpenRouter rejects when requested max_tokens exceeds affordable headroom.
 */
export async function openrouterGenerateJson<T = any>(options: {
  system: string
  user: string
  temperature?: number
  model?: string
  maxTokens?: number
}): Promise<T> {
  const model = options.model || 'deepseek/deepseek-chat'
  const temperature = options.temperature ?? 0.7
  let maxTokens = options.maxTokens ?? 4000

  const client = getOpenRouterClient()
  if (!client) {
    throw new Error('OpenRouter not configured. Set OPENROUTER_API_KEY.')
  }

  console.log(`[OPENROUTER] 🤖 Using model: ${model} (max_tokens ${maxTokens})`)

  let lastError: unknown
  for (let attempt = 0; attempt < OPENROUTER_OUTER_RETRIES; attempt++) {
    try {
      return await chatCompletionParseJson<T>(
        client,
        model,
        {
          system: options.system,
          user: options.user,
          temperature,
          maxTokens,
        },
        'OPENROUTER',
      )
    } catch (e) {
      lastError = e
      if (isOpenRouterInsufficientCredits(e) && maxTokens > 800) {
        maxTokens = Math.max(800, Math.floor(maxTokens * 0.45))
        console.warn(
          `[OPENROUTER] Credit/token ceiling hit; retrying with max_tokens=${maxTokens}. Add credits: https://openrouter.ai/settings/credits`,
        )
        continue
      }
      if (isOpenRouterInsufficientCredits(e)) {
        console.error(
          `[OPENROUTER] Still out of headroom at max_tokens=${maxTokens}. Add OpenRouter credits or set OPENROUTER_VC_RESEARCH_MODEL to a cheaper model.`,
        )
      }
      if (isLikelyNetworkError(e) && attempt < OPENROUTER_OUTER_RETRIES - 1) {
        logNetworkError(`JSON attempt ${attempt + 1}/${OPENROUTER_OUTER_RETRIES}`, e)
        const wait = 2000 * (attempt + 1)
        console.warn(`[OPENROUTER] Network error; retrying in ${wait}ms...`)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      if (isLikelyNetworkError(e)) {
        logNetworkError(`JSON final OpenRouter attempt`, e)
      }
      break
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
