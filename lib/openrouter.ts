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
  return 'meta-llama/llama-3.3-70b-instruct'
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

/** Total HTTP attempts per completion (first try + retries after 429). Ollama uses 1. */
function resolveOpenRouter429MaxAttempts(): number {
  const raw = process.env.OPENROUTER_429_MAX_ATTEMPTS?.trim()
  const n = raw ? parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n >= 1 && n <= 10) return n
  return 4
}

/** Base delay (ms) before the first post-429 retry; doubles each attempt (capped), plus jitter. */
function resolveOpenRouter429BaseDelayMs(): number {
  const raw = process.env.OPENROUTER_429_BASE_DELAY_MS?.trim()
  const n = raw ? parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n >= 250 && n <= 120_000) return n
  return 2_000
}

function isOpenRouterRateLimitError(e: unknown): boolean {
  const any = e as { status?: number; message?: string }
  if (any?.status === 429) return true
  const msg = String(any?.message ?? e ?? '')
  return /\b429\b|rate[\s_-]?limit|too many requests|capacity|overload|throttl/i.test(msg)
}

/**
 * Milliseconds to wait after a 429 before the next attempt.
 * Uses exponential backoff from OPENROUTER_429_BASE_DELAY_MS (default 2000),
 * capped (~60s calculated, ~120s if Retry-After demands longer).
 * Honors `Retry-After` response header (seconds) when the SDK exposes it.
 */
function openRouter429WaitMs(attemptIndex: number, e: unknown): number {
  const any = e as {
    headers?: Record<string, string | undefined> | { get?: (name: string) => string | null }
  }
  let fromHeaderMs = NaN
  const h = any?.headers
  if (h && typeof (h as { get?: unknown }).get === 'function') {
    const ra = (h as { get: (name: string) => string | null }).get('retry-after')
    if (ra) {
      const sec = parseInt(ra, 10)
      if (Number.isFinite(sec) && sec > 0) fromHeaderMs = sec * 1000
    }
  } else if (h && typeof h === 'object') {
    const rec = h as Record<string, string | undefined>
    const ra = rec['retry-after'] ?? rec['Retry-After']
    if (ra) {
      const sec = parseInt(String(ra), 10)
      if (Number.isFinite(sec) && sec > 0) fromHeaderMs = sec * 1000
    }
  }
  const base = resolveOpenRouter429BaseDelayMs()
  const exp = Math.min(60_000, base * 2 ** attemptIndex)
  const jitter = Math.floor(Math.random() * 500)
  const calculated = Math.min(90_000, exp + jitter)
  if (Number.isFinite(fromHeaderMs) && fromHeaderMs > 0) {
    return Math.min(120_000, Math.max(fromHeaderMs, calculated))
  }
  return calculated
}

async function withOpenRouter429Retries<T>(
  backend: 'openrouter' | 'ollama',
  label: string,
  model: string,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const max = backend === 'openrouter' ? resolveOpenRouter429MaxAttempts() : 1
  let lastErr: unknown
  for (let attempt = 0; attempt < max; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT_MS)
    try {
      const out = await fn(controller.signal)
      clearTimeout(timeout)
      return out
    } catch (e: unknown) {
      clearTimeout(timeout)
      lastErr = e
      const canRetry =
        backend === 'openrouter' && isOpenRouterRateLimitError(e) && attempt < max - 1
      if (!canRetry) throw e
      const waitMs = openRouter429WaitMs(attempt, e)
      console.warn(
        `[${label}] Rate limited (429); waiting ${Math.round(waitMs / 1000)}s before retry ${attempt + 2}/${max} (model ${model})`,
      )
      logger.integration(`[${label}] chat.completions 429 backoff`, {
        model,
        attempt: attempt + 1,
        max_attempts: max,
        wait_ms: waitMs,
      })
      await new Promise<void>((r) => setTimeout(r, waitMs))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

function resolveMaxTokens(override?: number): number {
  if (override != null) return override
  const raw = process.env.VC_EXTRACTION_MAX_TOKENS?.trim()
  const n = raw ? parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n >= 256 && n <= 16000) return n
  return 4096
}

// ---------------------------------------------------------------------------
// Scoring concurrency limiter
// ---------------------------------------------------------------------------

/** Simple FIFO concurrency gate — prevents rate-limit bursts on scoring calls. */
function makeLimiter(concurrency: number) {
  let running = 0
  const queue: Array<() => void> = []
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = () => {
        running++
        fn()
          .then(resolve, reject)
          .finally(() => {
            running--
            if (queue.length > 0) queue.shift()!()
          })
      }
      if (running < concurrency) execute()
      else queue.push(execute)
    })
  }
}

function resolveScoringConcurrency(): number {
  const raw = process.env.SCORING_LLM_CONCURRENCY?.trim()
  const n = raw ? parseInt(raw, 10) : NaN
  if (Number.isFinite(n) && n >= 1 && n <= 10) return n
  return 2
}

/**
 * Shared concurrency gate for all `forceOpenRouter: true` scoring calls.
 *
 * The scoring pipeline (Phase 2) fires up to 8 concurrent DeepSeek calls:
 *   5 criterion batches + 2 adversarial (bull/bear) + 1 tier classifier.
 * Without throttling, these all hit DeepSeek simultaneously and trigger 429s
 * that cascade into every pass falling back to placeholder values.
 *
 * Default: 2 concurrent (safe for DeepSeek free/limited tier).
 * Override: SCORING_LLM_CONCURRENCY env var (1–10).
 * To eliminate 429s entirely, set OPENROUTER_SCORING_MODEL to a model with
 * higher rate limits (e.g. meta-llama/llama-3.3-70b-instruct).
 */
const _scoringLimiter = makeLimiter(resolveScoringConcurrency())

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

  const maxTok = resolveMaxTokens(options.maxTokens)
  const t0 = Date.now()
  logger.integration('[OPENROUTER] chat.completions (text) start', { model, max_tokens: maxTok })
  try {
    const response = await withOpenRouter429Retries(
      'openrouter',
      'OPENROUTER',
      model,
      (signal) =>
        client.chat.completions.create(
          {
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature ?? 0.7,
            max_tokens: maxTok,
          } as any,
          { signal },
        ),
    )

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

/**
 * Internal implementation — runs a single JSON LLM call with retry/fallback logic.
 * External callers should use `openrouterGenerateJson`, which applies the scoring
 * concurrency limiter when `forceOpenRouter: true`.
 */
async function _openrouterGenerateJsonCore<T = any>(options: {
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

    let content: string
    try {
      const response = await withOpenRouter429Retries(backend, label, model, (signal) =>
        llmClient.chat.completions.create(baseParams as any, { signal }),
      )
      const choice = response.choices[0]
      content = choice?.message?.content || '{}'
    } catch (e: any) {
      logger.integration(`[${label}] chat.completions (JSON) error`, {
        model,
        ms: Date.now() - t0,
        message: e?.message ?? String(e),
      })
      throw e
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

/**
 * Generate JSON using an OpenRouter (or Ollama) LLM.
 *
 * When `forceOpenRouter: true` (all scoring passes), the call is routed through
 * `_scoringLimiter` to cap concurrent DeepSeek/scoring requests at
 * SCORING_LLM_CONCURRENCY (default 2). This prevents the 8 Phase-2 calls from
 * hitting DeepSeek's rate limit simultaneously and 429-cascading into every
 * scoring pass falling back to placeholder values.
 */
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
  if (options.forceOpenRouter === true) {
    return _scoringLimiter<T>(() => _openrouterGenerateJsonCore<T>(options))
  }
  return _openrouterGenerateJsonCore<T>(options)
}
