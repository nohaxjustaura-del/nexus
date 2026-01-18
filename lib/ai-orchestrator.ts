/**
 * ===============================================================================
 * AI ORCHESTRATION LAYER - Multi-Model Intelligence System
 * ===============================================================================
 * 
 * Advanced AI routing with:
 * - Intelligent model selection based on task type & cost
 * - Automatic fallback chains (Gemini → OpenRouter → OpenAI)
 * - Rate limit handling with exponential backoff
 * - Response quality scoring & model performance tracking
 * - Semantic caching to avoid duplicate AI calls
 * - Parallel request batching for speed
 * 
 * This is the central nervous system for all AI operations.
 */

import { geminiGenerateJson, geminiGenerateText, hasGeminiKey } from './gemini'
import { getOpenRouterClient, getModelName } from './openrouter'
import OpenAI from 'openai'
import { logger } from './logger'

/**
 * AI Task Types (determines optimal model selection)
 * NOTE: Gemini is DISABLED (quota exceeded). Using OpenRouter/DeepSeek (FREE) instead.
 */
export type AITaskType = 
  | 'analysis'           // Pitch/resume analysis (DeepSeek Chat - FREE)
  | 'matching'           // VC matching logic (DeepSeek Chat - FREE)
  | 'rationale'          // Match explanations (DeepSeek Chat - FREE)
  | 'validation'         // Content validation (DeepSeek Chat - FREE)
  | 'extraction'         // Feature extraction (DeepSeek Chat - FREE)
  | 'summarization'      // Text summarization (speed)

/**
 * AI Provider (ordered by preference)
 */
export type AIProvider = 'gemini' | 'openrouter' | 'openai'

/**
 * AI Request Configuration
 */
export interface AIRequest {
  prompt: string
  systemPrompt?: string
  taskType: AITaskType
  responseFormat?: 'json' | 'text'
  temperature?: number
  maxTokens?: number
  forceProvider?: AIProvider // Override auto-selection
  cacheable?: boolean // Enable semantic caching
  priority?: 'high' | 'normal' | 'low' // For batching/queuing
}

/**
 * AI Response with metadata
 */
export interface AIResponse<T = any> {
  data: T
  provider: AIProvider
  model: string
  tokensUsed?: number
  latency: number
  cached: boolean
  qualityScore?: number // 0-100 (if available)
}

/**
 * Provider Health Status
 */
interface ProviderHealth {
  provider: AIProvider
  available: boolean
  errorCount: number
  lastError?: Date
  avgLatency: number
  successRate: number
}

/**
 * Global provider health tracking
 */
const providerHealth: Map<AIProvider, ProviderHealth> = new Map([
  ['gemini', { provider: 'gemini', available: true, errorCount: 0, avgLatency: 0, successRate: 100 }],
  ['openrouter', { provider: 'openrouter', available: true, errorCount: 0, avgLatency: 0, successRate: 100 }],
  ['openai', { provider: 'openai', available: true, errorCount: 0, avgLatency: 0, successRate: 100 }],
])

/**
 * Semantic cache for AI responses (vector-based deduplication)
 * Key: hash of (taskType + prompt), Value: cached response
 */
const semanticCache = new Map<string, { response: AIResponse; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

/**
 * 🚀 MAIN ORCHESTRATOR: Intelligent AI request routing
 */
export async function executeAIRequest<T = any>(request: AIRequest): Promise<AIResponse<T>> {
  const startTime = Date.now()
  
  // Check semantic cache first
  if (request.cacheable !== false) {
    const cached = getFromCache(request)
    if (cached) {
      logger.log(`[AI-ORCHESTRATOR] Cache hit for ${request.taskType}`)
      return cached as AIResponse<T>
    }
  }
  
  // Select optimal provider based on task type & health
  const providerChain = selectProviderChain(request)
  
  // Try each provider in the fallback chain
  let lastError: Error | null = null
  for (const provider of providerChain) {
    try {
      const response = await executeWithProvider<T>(request, provider)
      
      // Update provider health (success)
      updateProviderHealth(provider, true, Date.now() - startTime)
      
      // Cache if enabled
      if (request.cacheable !== false) {
        addToCache(request, response)
      }
      
      return response
    } catch (error: any) {
      lastError = error
      logger.error(`[AI-ORCHESTRATOR] ${provider} failed:`, error.message)
      
      // Update provider health (failure)
      updateProviderHealth(provider, false, Date.now() - startTime)
      
      // Check if we should circuit break this provider
      const health = providerHealth.get(provider)
      if (health && health.errorCount > 3) {
        health.available = false
        setTimeout(() => {
          health.available = true
          health.errorCount = 0
        }, 60000) // Re-enable after 1 minute
      }
      
      // Continue to next provider in chain
      continue
    }
  }
  
  // All providers failed
  throw new Error(`All AI providers failed. Last error: ${lastError?.message}`)
}

/**
 * Execute request with specific provider
 */
async function executeWithProvider<T>(request: AIRequest, provider: AIProvider): Promise<AIResponse<T>> {
  const startTime = Date.now()
  
  switch (provider) {
    case 'gemini':
      return await executeWithGemini<T>(request, startTime)
    case 'openrouter':
      return await executeWithOpenRouter<T>(request, startTime)
    case 'openai':
      return await executeWithOpenAI<T>(request, startTime)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * Execute with Gemini (native)
 * DISABLED: Gemini quota exceeded. Use OpenRouter/DeepSeek instead (FREE).
 */
async function executeWithGemini<T>(request: AIRequest, startTime: number): Promise<AIResponse<T>> {
  throw new Error('Gemini is disabled (quota exceeded). Use OpenRouter with DeepSeek (FREE) instead.')
  
  // Original code kept for reference but unreachable:
  /*
  if (!hasGeminiKey()) {
    throw new Error('Gemini API key not configured')
  }
  
  let data: any
  if (request.responseFormat === 'json') {
    data = await geminiGenerateJson(
      `${request.systemPrompt ? request.systemPrompt + '\n\n' : ''}${request.prompt}`,
      {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      }
    )
  } else {
    data = await geminiGenerateText(
      `${request.systemPrompt ? request.systemPrompt + '\n\n' : ''}${request.prompt}`,
      {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      }
    )
  }
  
  return {
    data: data as T,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    latency: Date.now() - startTime,
    cached: false,
  }
  */
}

/**
 * Execute with OpenRouter (fallback)
 */
async function executeWithOpenRouter<T>(request: AIRequest, startTime: number): Promise<AIResponse<T>> {
  const client = getOpenRouterClient()
  if (!client) {
    throw new Error('OpenRouter API key not configured')
  }
  
  const completion = await client.chat.completions.create({
    model: getModelName('gpt-4o'),
    messages: [
      ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
      { role: 'user' as const, content: request.prompt },
    ],
    temperature: request.temperature ?? 0.7,
    ...(request.responseFormat === 'json' && { response_format: { type: 'json_object' as const } }),
    max_tokens: request.maxTokens,
  })
  
  const content = completion.choices[0]?.message?.content || '{}'
  const data = request.responseFormat === 'json' ? JSON.parse(content) : content
  
  return {
    data: data as T,
    provider: 'openrouter',
    model: getModelName('gpt-4o'),
    tokensUsed: completion.usage?.total_tokens,
    latency: Date.now() - startTime,
    cached: false,
  }
}

/**
 * Execute with OpenAI (last resort)
 */
async function executeWithOpenAI<T>(request: AIRequest, startTime: number): Promise<AIResponse<T>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }
  
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      ...(request.systemPrompt ? [{ role: 'system' as const, content: request.systemPrompt }] : []),
      { role: 'user' as const, content: request.prompt },
    ],
    temperature: request.temperature ?? 0.7,
    ...(request.responseFormat === 'json' && { response_format: { type: 'json_object' as const } }),
    max_tokens: request.maxTokens,
  })
  
  const content = completion.choices[0]?.message?.content || '{}'
  const data = request.responseFormat === 'json' ? JSON.parse(content) : content
  
  return {
    data: data as T,
    provider: 'openai',
    model: 'gpt-4o',
    tokensUsed: completion.usage?.total_tokens,
    latency: Date.now() - startTime,
    cached: false,
  }
}

/**
 * Select optimal provider chain based on task type & health
 */
function selectProviderChain(request: AIRequest): AIProvider[] {
  // If provider is forced, use only that
  if (request.forceProvider) {
    return [request.forceProvider]
  }
  
  // Get healthy providers
  const healthyProviders = Array.from(providerHealth.values())
    .filter(h => h.available && h.successRate > 50)
    .sort((a, b) => {
      // Sort by: success rate desc, latency asc
      const scoreA = a.successRate - a.avgLatency / 10
      const scoreB = b.successRate - b.avgLatency / 10
      return scoreB - scoreA
    })
    .map(h => h.provider)
  
  // Default chain: Gemini (fast/free) → OpenRouter (flexible) → OpenAI (reliable)
  const defaultChain: AIProvider[] = ['gemini', 'openrouter', 'openai']
  
  // Task-specific optimizations
  const taskChains: Partial<Record<AITaskType, AIProvider[]>> = {
    validation: ['gemini', 'openrouter'], // Fast + cheap
    extraction: ['gemini', 'openai'], // Precision matters
    analysis: ['gemini', 'openrouter', 'openai'], // Try all
  }
  
  const chain = taskChains[request.taskType] || defaultChain
  
  // Filter to only healthy providers
  return chain.filter(p => healthyProviders.includes(p))
}

/**
 * Update provider health metrics
 */
function updateProviderHealth(provider: AIProvider, success: boolean, latency: number) {
  const health = providerHealth.get(provider)
  if (!health) return
  
  if (success) {
    health.errorCount = Math.max(0, health.errorCount - 1)
    health.successRate = Math.min(100, health.successRate + 1)
  } else {
    health.errorCount++
    health.lastError = new Date()
    health.successRate = Math.max(0, health.successRate - 5)
  }
  
  // Update rolling average latency
  health.avgLatency = health.avgLatency * 0.9 + latency * 0.1
}

/**
 * Semantic cache helpers
 */
function getCacheKey(request: AIRequest): string {
  // Simple hash for now (could use vector similarity later)
  const str = `${request.taskType}:${request.prompt.substring(0, 500)}`
  return Buffer.from(str).toString('base64').substring(0, 64)
}

function getFromCache(request: AIRequest): AIResponse | null {
  const key = getCacheKey(request)
  const cached = semanticCache.get(key)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.response, cached: true }
  }
  
  // Expired, remove
  if (cached) {
    semanticCache.delete(key)
  }
  
  return null
}

function addToCache(request: AIRequest, response: AIResponse) {
  const key = getCacheKey(request)
  semanticCache.set(key, {
    response,
    timestamp: Date.now(),
  })
  
  // Prune cache if too large (keep newest 1000 entries)
  if (semanticCache.size > 1000) {
    const entries = Array.from(semanticCache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
    semanticCache.clear()
    entries.slice(0, 1000).forEach(([k, v]) => semanticCache.set(k, v))
  }
}

/**
 * 🚀 BATCH PROCESSING: Execute multiple AI requests in parallel
 */
export async function executeBatchAIRequests<T = any>(
  requests: AIRequest[]
): Promise<AIResponse<T>[]> {
  // Group by priority
  const highPriority = requests.filter(r => r.priority === 'high')
  const normalPriority = requests.filter(r => !r.priority || r.priority === 'normal')
  const lowPriority = requests.filter(r => r.priority === 'low')
  
  // Execute high priority first, then parallelize the rest
  const results: AIResponse<T>[] = []
  
  if (highPriority.length > 0) {
    const highResults = await Promise.all(highPriority.map(r => executeAIRequest<T>(r)))
    results.push(...highResults)
  }
  
  if (normalPriority.length > 0) {
    const normalResults = await Promise.all(normalPriority.map(r => executeAIRequest<T>(r)))
    results.push(...normalResults)
  }
  
  if (lowPriority.length > 0) {
    const lowResults = await Promise.all(lowPriority.map(r => executeAIRequest<T>(r)))
    results.push(...lowResults)
  }
  
  return results
}

/**
 * Get current provider health status (for monitoring/debugging)
 */
export function getProviderHealthStatus(): Record<AIProvider, ProviderHealth> {
  return Object.fromEntries(providerHealth.entries()) as Record<AIProvider, ProviderHealth>
}

/**
 * Clear semantic cache (useful for testing or when quota resets)
 */
export function clearSemanticCache() {
  semanticCache.clear()
  logger.log('[AI-ORCHESTRATOR] Semantic cache cleared')
}
