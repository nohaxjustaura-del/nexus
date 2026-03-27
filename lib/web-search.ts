/**
 * Real-time web search integration for 100/100 accuracy with updated information
 * Uses Tavily API for current, accurate web data
 */

import { tavily } from '@tavily/core'

let tavilyClient: ReturnType<typeof tavily> | null = null

function getTavilyClient(): ReturnType<typeof tavily> | null {
  if (tavilyClient) {
    return tavilyClient
  }

  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    console.warn('[WEB-SEARCH] TAVILY_API_KEY not set. Web search will be disabled.')
    return null
  }

  try {
    tavilyClient = tavily({ apiKey })
    return tavilyClient
  } catch (error) {
    console.error('[WEB-SEARCH] Failed to initialize Tavily client:', error)
    return null
  }
}

export interface WebSearchResult {
  title: string
  url: string
  content: string
  publishedDate?: string
  score: number
}

export interface WebSearchResponse {
  results: WebSearchResult[]
  query: string
  responseTime: number
  /** Tavily synthesized answer when includeAnswer: true (improves downstream extraction) */
  answer?: string
  /** Tavily-reported API credits for this request when includeUsage was sent */
  tavilyCredits?: number
}

/** Optional Tavily filters (see @tavily/core TavilySearchOptions). */
export type SearchWebTavilyOptions = {
  topic?: 'general' | 'news' | 'finance'
  days?: number
  startDate?: string
  endDate?: string
  timeRange?: 'year' | 'month' | 'week' | 'day' | 'y' | 'm' | 'w' | 'd'
  /** When true, response may include usage (logged in discovery). */
  includeUsage?: boolean
}

/**
 * Search the web for real-time information
 * @param query Search query
 * @param maxResults Maximum number of results (default: 5)
 * @param searchDepth Depth of search (default: 'advanced' for more accurate results)
 * @param tavilyExtra Optional Tavily API filters (e.g. startDate, topic: news)
 */
export async function searchWeb(
  query: string,
  maxResults: number = 5,
  searchDepth: 'basic' | 'advanced' = 'advanced',
  tavilyExtra?: SearchWebTavilyOptions
): Promise<WebSearchResponse> {
  const client = getTavilyClient()
  if (!client) {
    console.warn('[WEB-SEARCH] Tavily not available, returning empty results')
    return {
      results: [],
      query,
      responseTime: 0,
    }
  }

  const startTime = Date.now()

  try {
    const response = await client.search(query, {
      searchDepth,
      maxResults,
      includeAnswer: true,
      includeRawContent: 'text',
      includeImages: false,
      ...(tavilyExtra || {}),
    })

    const results: WebSearchResult[] = (response.results || []).map((result: any) => ({
      title: result.title || 'Untitled',
      url: result.url || '',
      content: result.content || result.rawContent || '',
      publishedDate: result.publishedDate,
      score: result.score || 0,
    }))

    const responseTime = Date.now() - startTime
    const raw = response as { answer?: string; usage?: { credits?: number } }
    const answer = typeof raw.answer === 'string' && raw.answer.trim() ? raw.answer.trim() : undefined
    const usage = raw.usage
    const tavilyCredits = typeof usage?.credits === 'number' ? usage.credits : undefined

    if (results.length === 0) {
      const hint =
        tavilyExtra?.startDate != null
          ? ' (strict startDate can return nothing; check quota or relax VC_DISCOVERY_CONTENT_SINCE)'
          : ''
      console.warn(`[WEB-SEARCH] Tavily returned 0 results for query.${hint}`)
    }

    return {
      results,
      query,
      responseTime,
      answer,
      tavilyCredits,
    }
  } catch (error: any) {
    const msg = error?.message || String(error)
    console.error('[WEB-SEARCH] Search failed:', msg)
    if (/402|403|429|quota|credit|limit|exceeded|payment/i.test(msg)) {
      console.error('[WEB-SEARCH] This may be a Tavily billing, rate limit, or plan issue. Check https://tavily.com')
    }
    return {
      results: [],
      query,
      responseTime: Date.now() - startTime,
    }
  }
}

/**
 * Search for VC/founder information with real-time data
 */
export async function searchVCInfo(firmName: string, additionalContext?: string): Promise<WebSearchResponse> {
  const year = new Date().getFullYear()
  const query = additionalContext
    ? `${firmName} ${additionalContext} investment thesis recent deals portfolio`
    : `${firmName} VC investment thesis recent deals portfolio ${year - 1} ${year}`

  const max = Math.min(8, Math.max(5, parseInt(process.env.TAVILY_VC_SEARCH_MAX_RESULTS || '6', 10) || 6))
  return searchWeb(query, max, 'advanced', { includeUsage: true })
}

/**
 * Search for founder background/credibility information
 */
export async function searchFounderInfo(
  founderName: string,
  companyName?: string,
  sector?: string
): Promise<WebSearchResponse> {
  let query = founderName
  if (companyName) {
    query += ` ${companyName}`
  }
  if (sector) {
    query += ` ${sector} startup founder`
  }
  const year = new Date().getFullYear()
  query += ` background experience achievements ${year - 1} ${year}`

  return searchWeb(query, 5, 'advanced')
}

/**
 * Search for sector/trend information
 */
export async function searchSectorTrends(sector: string): Promise<WebSearchResponse> {
  const year = new Date().getFullYear()
  const query = `${sector} startup trends market analysis ${year - 1} ${year} VC investment`
  return searchWeb(query, 5, 'advanced')
}

/**
 * Format web search results for AI prompts
 */
export function formatWebSearchResults(results: WebSearchResult[]): string {
  if (!results || results.length === 0) {
    return ''
  }

  const formatted = results
    .map((result, index) => {
      return `[Source ${index + 1}: ${result.title}]
URL: ${result.url}
${result.publishedDate ? `Published: ${result.publishedDate}` : ''}
Content: ${result.content.substring(0, 500)}${result.content.length > 500 ? '...' : ''}`
    })
    .join('\n\n')

  return `\n\n=== REAL-TIME WEB SEARCH RESULTS (UPDATED INFORMATION) ===\n${formatted}\n=== END WEB SEARCH RESULTS ===\n\n`
}

/**
 * Check if web search is available
 */
export function isWebSearchAvailable(): boolean {
  return !!process.env.TAVILY_API_KEY && !!getTavilyClient()
}

/**
 * Deep-read top URLs via Tavily extract (optional elsewhere; VC research pipeline uses Exa-only).
 */
export async function tavilyExtractUrlsForResearch(
  urls: string[],
  firmName: string,
): Promise<{ text: string; credits?: number }> {
  const client = getTavilyClient()
  if (!client || urls.length === 0) {
    return { text: '' }
  }

  const max = Math.min(
    10,
    Math.max(4, parseInt(process.env.VC_RESEARCH_TAVILY_EXTRACT_MAX_URLS || '8', 10) || 8),
  )
  const clean = [...new Set(urls.map((u) => normalizeHttpUrl(u)).filter((u): u is string => !!u))].slice(
    0,
    max,
  )
  if (!clean.length) return { text: '' }

  const startTime = Date.now()
  try {
    const res = await client.extract(clean, {
      extractDepth: 'advanced',
      format: 'text',
      includeUsage: true,
      query: `Investment firm "${firmName}": thesis, fund size / check size, stages, sectors, geography, portfolio companies, value-add, website, application process.`,
      timeout: 55,
    })
    const cred = res.usage?.credits
    const parts = (res.results || []).map((r) => {
      const title = r.title ?? r.url ?? 'untitled'
      const body = (r.rawContent || '').slice(0, 5200)
      return `[extract: ${title}]\n${body}`
    })
    const failed = (res as { failedResults?: unknown[] }).failedResults?.length ?? 0
    console.log(
      `[WEB-SEARCH] Tavily extract: ${parts.length} page(s), ${failed} failed, ${Date.now() - startTime}ms`,
    )
    return {
      text: parts.join('\n\n'),
      credits: typeof cred === 'number' ? cred : undefined,
    }
  } catch (error: any) {
    const msg = error?.message || String(error)
    console.error('[WEB-SEARCH] Tavily extract failed:', msg)
    return { text: '' }
  }
}

function normalizeHttpUrl(u: string): string | null {
  const s = u.trim()
  if (!/^https?:\/\//i.test(s)) return null
  try {
    const x = new URL(s)
    x.hash = ''
    return x.toString()
  } catch {
    return null
  }
}