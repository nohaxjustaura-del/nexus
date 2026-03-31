import OpenAI from "openai"
import { getSiteUrl } from '@/lib/site-url'
import { logger } from '@/lib/logger'

/**
 * LLM routing:
 *
 * - **VC / investor research JSON** (`useVcPipeline: true` in `openrouterGenerateJson`): OpenRouter **or**
 *   local **Ollama** (OpenAI-compatible `/v1/chat/completions`). Pick with `VC_LLM_PROVIDER` or auto:
 *   OpenRouter if `OPENROUTER_API_KEY` is set, else Ollama when `OLLAMA_BASE_URL` + `OLLAMA_MODEL` (or `OLLAMA_VC_MODEL`) are set.
 * - **Pitch scoring** (`forceOpenRouter: true`): OpenRouter only.
 * - **Other analysis**: OpenRouter when the key is set.
 */

/**
 * Get OpenRouter client - a unified API for accessing multiple LLM providers.
 * Uses OpenAI-compatible SDK with OpenRouter base URL.
 */
export function getOpenRouterClient(): OpenAI | null {
  try {
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

/** Primary LLM client. All paths use OpenRouter. */
export function getLlmClient(): OpenAI | null {
  return getOpenRouterClient()
}

/**
 * Get the model name for OpenRouter.
 * Prioritizes cost-effective models.
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

/** True if OpenRouter API key is present (other features: scoring, analysis, etc.). */
export function hasOpenRouterKey(): boolean {
  return !!process.env.OPENROUTER_API_KEY?.trim()
}

/** Ollama configured for VC JSON extraction (research workers, validation, etc.). */
export function isOllamaVcConfigured(): boolean {
  const base = process.env.OLLAMA_BASE_URL?.trim()
  const model = (process.env.OLLAMA_VC_MODEL || process.env.OLLAMA_MODEL)?.trim()
  return !!base && !!model
}

/**
 * VC pipeline can run with OpenRouter **or** Ollama. Use for research workers / investor extraction.
 */
export function hasVcLlmConfigured(): boolean {
  return hasOpenRouterKey() || isOllamaVcConfigured()
}

/**
 * Which backend handles `useVcPipeline` JSON calls.
 * - `VC_LLM_PROVIDER=openrouter` | `ollama` forces that backend (must be configured).
 * - Otherwise: OpenRouter if key set, else Ollama.
 */
export function getVcLlmBackend(): 'openrouter' | 'ollama' {
  const p = process.env.VC_LLM_PROVIDER?.trim().toLowerCase()
  if (p === 'openrouter') return 'openrouter'
  if (p === 'ollama') return 'ollama'
  if (hasOpenRouterKey()) return 'openrouter'
  return 'ollama'
}

/** Root like `http://127.0.0.1:11434` — accepts env with or without trailing `/v1`. */
export function normalizeOllamaOpenAiBaseUrl(raw: string): string {
  let b = raw.trim().replace(/\/+$/, '')
  if (b.endsWith('/v1')) return b
  return `${b}/v1`
}

/** OpenAI SDK client pointed at Ollama (`OLLAMA_BASE_URL` may include or omit `/v1`). */
export function getOllamaOpenAiClient(): OpenAI | null {
  const raw = process.env.OLLAMA_BASE_URL?.trim()
  if (!raw) return null
  return new OpenAI({
    apiKey: 'ollama',
    baseURL: normalizeOllamaOpenAiBaseUrl(raw),
  })
}

/** Model for VC extraction on Ollama; prefer a strong instruct model for JSON fidelity. */
export function getOllamaVcModel(): string {
  return (
    process.env.OLLAMA_VC_MODEL?.trim() ||
    process.env.OLLAMA_MODEL?.trim() ||
    'qwen2.5:14b-instruct'
  )
}

/** Model for VC JSON extraction via OpenRouter. */
export function getVcExtractionModel(): string {
  const m = process.env.OPENROUTER_VC_EXTRACTION_MODEL?.trim()
  if (m) return m
  return 'meta-llama/llama-3.3-70b-instruct'
}

/** VC pipeline LLM client (OpenRouter or Ollama). */
export function getVcPipelineLlmClient(): OpenAI | null {
  if (getVcLlmBackend() === 'ollama') return getOllamaOpenAiClient()
  return getOpenRouterClient()
}

/** Model id for VC pipeline calls (OpenRouter slug or Ollama tag). */
export function getVcPipelineModel(): string {
  if (getVcLlmBackend() === 'ollama') return getOllamaVcModel()
  const m = process.env.OPENROUTER_VC_EXTRACTION_MODEL?.trim()
  if (m) return m
  return 'meta-llama/llama-3.3-70b-instruct'
}

/**
 * Model for scoring passes. Falls back through
 * OPENROUTER_SCORING_MODEL -> OPENROUTER_VC_EXTRACTION_MODEL -> deepseek/deepseek-chat.
 */
export function getScoringOpenRouterModel(): string {
  const scoring = process.env.OPENROUTER_SCORING_MODEL?.trim()
  if (scoring) return scoring
  const vc = process.env.OPENROUTER_VC_EXTRACTION_MODEL?.trim()
  if (vc) return vc
  return 'deepseek/deepseek-chat'
}

/** Model for match narrative generation. */
export function getMatchingNarrativeOpenRouterModel(): string {
  const m = process.env.OPENROUTER_MATCHING_MODEL?.trim()
  if (m) return m
  return getScoringOpenRouterModel()
}

/**
 * Model for pitch analysis (strengths/weaknesses/market fit).
 * Separate from scoring/extraction because analysis benefits from
 * stronger reasoning capabilities.
 *
 * Falls back through:
 *   OPENROUTER_ANALYSIS_MODEL -> OPENROUTER_SCORING_MODEL -> meta-llama/llama-3.3-70b-instruct
 */
export function getAnalysisOpenRouterModel(): string {
  const analysis = process.env.OPENROUTER_ANALYSIS_MODEL?.trim()
  if (analysis) return analysis
  const scoring = process.env.OPENROUTER_SCORING_MODEL?.trim()
  if (scoring) return scoring
  return 'meta-llama/llama-3.3-70b-instruct'
}

/** LLM client for multi-pass pitch scoring. */
export function getScoringLlmClient(): OpenAI | null {
  return getOpenRouterClient()
}

/** Model id for tier classification and scoring-adjacent calls. */
export function getModelNameForScoring(model: string = 'gpt-4o'): string {
  if (getOpenRouterClient()) {
    return getScoringOpenRouterModel()
  }
  return getModelName(model)
}

/** Cap completion tokens. Default 4096 for OpenRouter. */
export function getVcExtractionMaxTokens(): number {
  const raw = process.env.VC_EXTRACTION_MAX_TOKENS?.trim()
  const n = raw ? parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n >= 256 && n <= 16000) return n
  return 4096
}

const VC_EXTRACTION_FALLBACK_MODEL = 'openai/gpt-4o-mini'

const LLM_REQUEST_TIMEOUT_MS = 90_000

function resolveMaxTokens(override?: number): number {
  if (override != null) return override
  const raw = process.env.VC_EXTRACTION_MAX_TOKENS?.trim()
  const n = raw ? parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n >= 256 && n <= 16000) return n
  return 4096
}

/** Generate text using OpenRouter. */
export async function openrouterGenerateText(
  prompt: string,
  options: {
    temperature?: number
    maxTokens?: number
    model?: string
    useVcPipeline?: boolean
  } = {}
): Promise<string> {
  const client = getOpenRouterClient()
  if (!client) {
    throw new Error('No LLM configured. Set OPENROUTER_API_KEY.')
  }

  const useVc = options.useVcPipeline === true
  const model = options.model ?? (useVc ? getVcPipelineModel() : getVcExtractionModel())

  if (process.env.DEBUG) console.log(`[OPENROUTER] Using model: ${model}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT_MS)
  const maxTok = resolveMaxTokens(options.maxTokens)
  const t0 = Date.now()
  logger.integration('[OPENROUTER] chat.completions (text) start', { model, max_tokens: maxTok })
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.7,
      max_tokens: maxTok,
    } as any, { signal: controller.signal })

    const out = response.choices[0]?.message?.content || ''
    logger.integration('[OPENROUTER] chat.completions (text) ok', {
      model,
      ms: Date.now() - t0,
      chars: out.length,
    })
    return out
  } catch (e: any) {
    logger.integration('[OPENROUTER] chat.completions (text) error', {
      model,
      ms: Date.now() - t0,
      message: e?.message ?? String(e),
    })
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Extract JSON from model output (prose, markdown fences, trailing junk).
 * Prefers fenced ```json blocks; otherwise slices from first { or [ to last } or ].
 */
function parseJsonFromModelContent(content: string, _model: string): unknown {
  let s = content.trim()
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)

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

const JSON_SYSTEM_SUFFIX =
  '\n\nReturn ONLY valid JSON. No markdown, no code blocks, no explanations.' +
  '\nInside JSON string values, never use unescaped ASCII double quotes (").' +
  ' For quoted phrases use curly quotes (“like this”) or single quotes, or escape as \\".'

function resolveJsonLlm(options: {
  forceOpenRouter?: boolean
  useVcPipeline?: boolean
  model?: string
}): { client: OpenAI; model: string; backend: 'openrouter' | 'ollama' } {
  const isScoringPass = options.forceOpenRouter === true
  const useVc = !isScoringPass && options.useVcPipeline === true

  if (isScoringPass) {
    const client = getOpenRouterClient()
    if (!client) throw new Error('OpenRouter required for scoring. Set OPENROUTER_API_KEY.')
    return {
      client,
      model: options.model ?? getScoringOpenRouterModel(),
      backend: 'openrouter',
    }
  }

  if (!useVc) {
    const client = getOpenRouterClient()
    if (!client) throw new Error('No LLM configured. Set OPENROUTER_API_KEY.')
    return {
      client,
      model: options.model ?? getVcExtractionModel(),
      backend: 'openrouter',
    }
  }

  const forced = process.env.VC_LLM_PROVIDER?.trim().toLowerCase()
  const wantOpenRouter =
    forced === 'openrouter' || (forced !== 'ollama' && hasOpenRouterKey())

  if (wantOpenRouter) {
    const client = getOpenRouterClient()
    if (client) {
      const m =
        options.model ??
        (process.env.OPENROUTER_VC_EXTRACTION_MODEL?.trim() || 'meta-llama/llama-3.3-70b-instruct')
      return { client, model: m, backend: 'openrouter' }
    }
    if (forced === 'openrouter') {
      throw new Error('VC_LLM_PROVIDER=openrouter but OPENROUTER_API_KEY is missing.')
    }
  }

  const oc = getOllamaOpenAiClient()
  if (!oc || !isOllamaVcConfigured()) {
    throw new Error(
      'No LLM for investor research. Set OPENROUTER_API_KEY or OLLAMA_BASE_URL + OLLAMA_MODEL (or OLLAMA_VC_MODEL). For local-only: VC_LLM_PROVIDER=ollama.',
    )
  }
  return { client: oc, model: options.model ?? getOllamaVcModel(), backend: 'ollama' }
}

export async function openrouterGenerateJson<T = any>(options: {
  system: string
  user: string
  temperature?: number
  model?: string
  maxTokens?: number
  retryOnParseError?: boolean
  forceOpenRouter?: boolean
  useVcPipeline?: boolean
}): Promise<T> {
  const { client, model: primaryModel, backend } = resolveJsonLlm(options)
  const retryOnParseError = options.retryOnParseError !== false

  const useOllamaJsonObject =
    backend === 'ollama' &&
    process.env.OLLAMA_JSON_OBJECT?.trim() !== '0' &&
    process.env.OLLAMA_JSON_OBJECT?.toLowerCase() !== 'false'

  const run = async (
    model: string,
    llmClient: OpenAI,
    jsonObjectMode: boolean,
  ): Promise<T> => {
    const label = backend === 'ollama' ? 'OLLAMA' : 'OPENROUTER'
    if (process.env.DEBUG) console.log(`[${label}] JSON extract — model: ${model}`)

    const temp = options.temperature ?? 0.7
    const maxTok = resolveMaxTokens(options.maxTokens)
    const t0 = Date.now()
    logger.integration(`[${label}] chat.completions (JSON) start`, {
      model,
      max_tokens: maxTok,
      temperature: temp,
      json_object: jsonObjectMode,
    })

    const baseParams: Record<string, unknown> = {
      model,
      messages: [
        {
          role: 'system',
          content: options.system + JSON_SYSTEM_SUFFIX,
        },
        {
          role: 'user',
          content:
            options.user +
            '\n\nIMPORTANT: Respond with ONLY the JSON object. No markdown code fences.',
        },
      ],
      temperature: temp,
      max_tokens: maxTok,
      ...(jsonObjectMode ? { response_format: { type: 'json_object' as const } } : {}),
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT_MS)
    let content: string
    try {
      const response = await llmClient.chat.completions.create(baseParams as any, { signal: controller.signal })
      const choice = response.choices[0]
      content = choice?.message?.content || '{}'
    } catch (e: any) {
      logger.integration(`[${label}] chat.completions (JSON) error`, {
        model,
        ms: Date.now() - t0,
        message: e?.message ?? String(e),
      })
      throw e
    } finally {
      clearTimeout(timeout)
    }

    if (process.env.DEBUG) console.log(`[${label}] Response length: ${content.length}, starts: ${content.substring(0, 100)}`)

    try {
      const parsed = parseJsonFromModelContent(content, model) as T
      logger.integration(`[${label}] chat.completions (JSON) ok`, {
        model,
        ms: Date.now() - t0,
        contentChars: content.length,
      })
      return parsed
    } catch (parseError: any) {
      logger.integration(`[${label}] JSON parse failed`, {
        model,
        ms: Date.now() - t0,
        message: parseError?.message,
      })
      console.error(`[${label}] JSON parse error:`, parseError.message)
      console.error(`[${label}] Raw content:`, content.substring(0, 500))
      throw new Error(`Failed to parse JSON from ${model}: ${parseError.message}`)
    }
  }

  const openRouterJsonObject =
    backend === 'openrouter' &&
    process.env.OPENROUTER_JSON_OBJECT?.trim() !== '0' &&
    process.env.OPENROUTER_JSON_OBJECT?.toLowerCase() !== 'false'

  try {
    return await run(
      primaryModel,
      client,
      backend === 'ollama' ? useOllamaJsonObject : openRouterJsonObject,
    )
  } catch (e: any) {
    const msg = String(e?.message || e)

    if (backend === 'ollama' && useOllamaJsonObject) {
      const canRetryLoose =
        retryOnParseError &&
        (/parse JSON|JSON|response_format|json_object/i.test(msg) || e?.status === 400)
      if (canRetryLoose) {
        console.warn('[OLLAMA] Retrying without JSON object mode. Set OLLAMA_JSON_OBJECT=0 to skip json_object.')
        return await run(primaryModel, client, false)
      }
    }

    if (backend !== 'openrouter') {
      throw e
    }

    const modelMissing =
      e?.status === 404 ||
      e?.error?.type === "not_found_error" ||
      /model ['"][^'"]+['"] not found|not_found_error/i.test(msg)
    const canFallback404 =
      retryOnParseError &&
      primaryModel !== VC_EXTRACTION_FALLBACK_MODEL &&
      modelMissing
    if (canFallback404) {
      console.warn(
        `[OPENROUTER] Model unavailable (${primaryModel}); retrying with ${VC_EXTRACTION_FALLBACK_MODEL}. ` +
          `Set OPENROUTER_VC_EXTRACTION_MODEL to a valid id from openrouter.ai/models.`,
      )
      return await run(VC_EXTRACTION_FALLBACK_MODEL, client, openRouterJsonObject)
    }
    const canFallbackParse =
      retryOnParseError &&
      primaryModel !== VC_EXTRACTION_FALLBACK_MODEL
    if (canFallbackParse && /parse JSON|JSON/i.test(msg)) {
      console.warn(`[OPENROUTER] Retrying with fallback model: ${VC_EXTRACTION_FALLBACK_MODEL}`)
      return await run(VC_EXTRACTION_FALLBACK_MODEL, client, openRouterJsonObject)
    }
    throw e
  }
}
