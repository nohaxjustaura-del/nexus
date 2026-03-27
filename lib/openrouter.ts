import OpenAI from "openai"
import { getSiteUrl } from '@/lib/site-url'

/**
 * Set `LLM_PREFER_OLLAMA=1` to use local Ollama first when both Ollama and OpenRouter are configured.
 * Default: OpenRouter wins when `OPENROUTER_API_KEY` is set (app analyzer + shared LLM helpers use the cloud key).
 */
function llmPreferOllama(): boolean {
  const v = process.env.LLM_PREFER_OLLAMA?.trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

/**
 * Local Ollama (OpenAI-compatible API).
 * Example: OLLAMA_BASE_URL=http://127.0.0.1:11434/v1  and  OLLAMA_MODEL=llama3.2
 */
export function getOllamaClient(): OpenAI | null {
  const raw = process.env.OLLAMA_BASE_URL?.trim()
  if (!raw) return null
  try {
    let base = raw.replace(/\/$/, '')
    if (!/\/v1$/i.test(base)) {
      base = `${base}/v1`
    }
    return new OpenAI({
      baseURL: base,
      apiKey: process.env.OLLAMA_API_KEY?.trim() || 'ollama',
    })
  } catch (error) {
    console.error('[Ollama] Failed to initialize client:', error)
    return null
  }
}

/**
 * Get OpenRouter client - a unified API for accessing multiple LLM providers
 * Uses OpenAI-compatible SDK with OpenRouter base URL
 */
export function getOpenRouterClient(): OpenAI | null {
  try {
    // ONLY use OpenRouter if OPENROUTER_API_KEY is explicitly set
    // Don't fall back to OPENAI_API_KEY here - that's handled in getAIClient
    const apiKey = process.env.OPENROUTER_API_KEY?.trim()
    if (!apiKey) {
      return null
    }

    return new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.OPENROUTER_REFERER_URL || getSiteUrl(),
        'X-Title': 'NEXUS · AI analysis',
      },
    })
  } catch (error) {
    console.error('[OpenRouter] Failed to initialize client:', error)
    return null
  }
}

/**
 * Preferred LLM: OpenRouter when `OPENROUTER_API_KEY` is set (default), else Ollama.
 * Override with `LLM_PREFER_OLLAMA=1` to use local Ollama first when both are configured.
 */
export function getLlmClient(): OpenAI | null {
  const ollama = getOllamaClient()
  const openRouter = getOpenRouterClient()
  if (llmPreferOllama() && ollama) return ollama
  if (openRouter) return openRouter
  return ollama
}

/** True when requests are routed to the local Ollama client (not OpenRouter). */
export function isUsingOllama(): boolean {
  const ollama = getOllamaClient()
  const openRouter = getOpenRouterClient()
  if (llmPreferOllama()) return !!ollama
  return !openRouter && !!ollama
}

/**
 * Ollama-only: `keep_alive` on the chat payload so the model stays loaded between requests.
 * Default `-1` = keep in memory until the Ollama process stops (Ollama API).
 * Set `OLLAMA_KEEP_ALIVE=0` or `false` to omit (Ollama default unload).
 * Or a duration string: `5m`, `1h`.
 */
export function getOllamaKeepAliveParams(): { keep_alive?: string | number } {
  if (!process.env.OLLAMA_BASE_URL?.trim()) return {}
  const raw = process.env.OLLAMA_KEEP_ALIVE?.trim()
  if (raw === '0' || raw === 'false') return {}
  let keepAlive: string | number = -1
  if (raw && raw !== '-1') {
    if (/^-?\d+$/.test(raw)) keepAlive = parseInt(raw, 10)
    else keepAlive = raw
  }
  return { keep_alive: keepAlive }
}

/**
 * Get the model name for OpenRouter
 * Prioritizes FREE models (DeepSeek, Gemini free tier)
 */
export function getModelName(model: string = 'gpt-4o'): string {
  if (isUsingOllama()) {
    return process.env.OLLAMA_MODEL?.trim() || 'llama3.2'
  }
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
 * True if VC-style JSON extraction can run (OpenRouter credits or local Ollama).
 */
export function hasVcLlmConfigured(): boolean {
  return !!(process.env.OLLAMA_BASE_URL?.trim() || process.env.OPENROUTER_API_KEY?.trim())
}

/**
 * Check if OpenRouter is configured
 * @deprecated Prefer hasVcLlmConfigured — name kept for compatibility; true for Ollama OR OpenRouter.
 */
export function hasOpenRouterKey(): boolean {
  return hasVcLlmConfigured()
}

/** Model for VC JSON extraction (OpenRouter id e.g. deepseek/deepseek-chat, or Ollama tag e.g. llama3.2). */
export function getVcExtractionModel(): string {
  if (isUsingOllama()) {
    return process.env.OLLAMA_MODEL?.trim() || 'llama3.2'
  }
  const m = process.env.OPENROUTER_VC_EXTRACTION_MODEL?.trim()
  if (m) return m
  return 'deepseek/deepseek-chat'
}

/**
 * Cap completion tokens. OpenRouter: default 2048 to reduce 402 risk.
 * Ollama (local): default 8192 — 2048 often truncates long JSON and breaks parsing mid-string.
 */
export function getVcExtractionMaxTokens(): number {
  const raw = process.env.VC_EXTRACTION_MAX_TOKENS?.trim()
  const n = raw ? parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n >= 256 && n <= 16000) return n
  if (isUsingOllama()) return 8192
  return 2048
}

const VC_EXTRACTION_FALLBACK_MODEL = 'openai/gpt-4o-mini'

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
  const client = getLlmClient()
  if (!client) {
    throw new Error('No LLM configured. Set OLLAMA_BASE_URL (local Ollama) or OPENROUTER_API_KEY.')
  }

  const model =
    options.model ||
    (isUsingOllama() ? getVcExtractionModel() : 'deepseek/deepseek-chat')

  const tag = isUsingOllama() ? 'OLLAMA' : 'OPENROUTER'
  console.log(`[${tag}] 🤖 Using model: ${model}`)

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? getVcExtractionMaxTokens(),
    ...(isUsingOllama() ? getOllamaKeepAliveParams() : {}),
  } as any)

  return response.choices[0]?.message?.content || ''
}

/**
 * Extract JSON from model output (prose, markdown fences, trailing junk).
 * Prefers fenced ```json blocks; otherwise slices from first { or [ to last } or ].
 */
function parseJsonFromModelContent(content: string, _model: string): unknown {
  let s = content.trim()
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)

  // Longest ``` ... ``` block (non-greedy inner would truncate nested JSON — use full fence match)
  const fenceOpen = s.match(/```(?:json)?\s*/)
  if (fenceOpen && fenceOpen.index !== undefined) {
    const start = fenceOpen.index + fenceOpen[0].length
    const close = s.indexOf('```', start)
    if (close > start) {
      s = s.slice(start, close).trim()
    }
  }

  const objStart = s.indexOf('{')
  const arrStart = s.indexOf('[')
  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    const end = s.lastIndexOf('}')
    if (end > objStart) s = s.slice(objStart, end + 1)
  } else if (arrStart >= 0) {
    const end = s.lastIndexOf(']')
    if (end > arrStart) s = s.slice(arrStart, end + 1)
  }

  return JSON.parse(s)
}

export async function openrouterGenerateJson<T = any>(options: {
  system: string
  user: string
  temperature?: number
  model?: string
  /** Override max output tokens (defaults from getVcExtractionMaxTokens()). */
  maxTokens?: number
  /** If true (default), retry once with a small OpenRouter model when JSON parse fails */
  retryOnParseError?: boolean
}): Promise<T> {
  const client = getLlmClient()
  if (!client) {
    throw new Error('No LLM configured. Set OLLAMA_BASE_URL (local Ollama) or OPENROUTER_API_KEY.')
  }

  const primaryModel =
    options.model ||
    (isUsingOllama() ? getVcExtractionModel() : 'deepseek/deepseek-chat')
  const retryOnParseError = options.retryOnParseError !== false
  const logTag = isUsingOllama() ? 'OLLAMA' : 'OPENROUTER'

  const run = async (model: string): Promise<T> => {
    console.log(`[${logTag}] 🤖 Using model: ${model}`)

    const ollamaStrict =
      isUsingOllama() && process.env.OLLAMA_JSON_STRICT !== 'false'
    const temp =
      options.temperature ??
      (ollamaStrict ? 0.15 : 0.7)

    let maxTok = options.maxTokens ?? getVcExtractionMaxTokens()

    for (let attempt = 0; attempt < 3; attempt++) {
      const baseParams: Record<string, unknown> = {
        model,
        messages: [
          {
            role: 'system',
            content:
              options.system +
              (ollamaStrict
                ? '\n\nOutput a single JSON object only. No markdown, no code fences, no text before or after.'
                : '\n\nReturn ONLY valid JSON. No markdown, no code blocks, no explanations.'),
          },
          {
            role: 'user',
            content:
              options.user +
              (ollamaStrict
                ? '\n\nReply with one JSON object only.'
                : '\n\nIMPORTANT: Respond with ONLY the JSON object. No markdown code fences.'),
          },
        ],
        temperature: temp,
        max_tokens: maxTok,
      }
      if (ollamaStrict) {
        baseParams.response_format = { type: 'json_object' }
      }
      if (isUsingOllama()) {
        Object.assign(baseParams, getOllamaKeepAliveParams())
      }

      const response = await client.chat.completions.create(baseParams as any)
      const choice = response.choices[0]
      const content = choice?.message?.content || '{}'
      const finishReason = choice?.finish_reason as string | undefined

      console.log(`[${logTag}] 📄 Response length: ${content.length}, starts: ${content.substring(0, 100)}`)

      if (finishReason === 'length' && isUsingOllama() && attempt < 2) {
        const next = Math.min(16000, Math.max(maxTok * 2, maxTok + 4096))
        if (next > maxTok) {
          console.warn(
            `[${logTag}] ⚠️ Output truncated (finish_reason=length); retrying with max_tokens=${next}`,
          )
          maxTok = next
          continue
        }
      }

      try {
        return parseJsonFromModelContent(content, model) as T
      } catch (parseError: any) {
        console.error(`[${logTag}] ❌ JSON parse error:`, parseError.message)
        console.error(`[${logTag}] Raw content:`, content.substring(0, 500))
        throw new Error(`Failed to parse JSON from ${model}: ${parseError.message}`)
      }
    }
    throw new Error(`Unexpected: no JSON result from ${model}`)
  }

  try {
    return await run(primaryModel)
  } catch (e: any) {
    const msg = String(e?.message || e)
    const modelMissing =
      e?.status === 404 ||
      e?.error?.type === "not_found_error" ||
      /model ['"][^'"]+['"] not found|not_found_error/i.test(msg)
    const canFallback404 =
      !isUsingOllama() &&
      getOpenRouterClient() &&
      retryOnParseError &&
      primaryModel !== VC_EXTRACTION_FALLBACK_MODEL &&
      modelMissing
    if (canFallback404) {
      console.warn(
        `[OPENROUTER] Model unavailable (${primaryModel}); retrying with ${VC_EXTRACTION_FALLBACK_MODEL}. ` +
          `Set OPENROUTER_VC_EXTRACTION_MODEL to a valid id from openrouter.ai/models.`,
      )
      return await run(VC_EXTRACTION_FALLBACK_MODEL)
    }
    const canFallbackOpenRouter =
      !isUsingOllama() && getOpenRouterClient() && retryOnParseError && primaryModel !== VC_EXTRACTION_FALLBACK_MODEL
    if (canFallbackOpenRouter && /parse JSON|JSON/i.test(msg)) {
      console.warn(`[OPENROUTER] Retrying with fallback model: ${VC_EXTRACTION_FALLBACK_MODEL}`)
      return await run(VC_EXTRACTION_FALLBACK_MODEL)
    }
    throw e
  }
}

