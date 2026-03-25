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
}

/**
 * Search the web for real-time information
 * @param query Search query
 * @param maxResults Maximum number of results (default: 5)
 * @param searchDepth Depth of search (default: 'advanced' for more accurate results)
 */
export async function searchWeb(
  query: string,
  maxResults: number = 5,
  searchDepth: 'basic' | 'advanced' = 'advanced'
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
    })

    const results: WebSearchResult[] = (response.results || []).map((result: any) => ({
      title: result.title || 'Untitled',
      url: result.url || '',
      content: result.content || result.rawContent || '',
      publishedDate: result.publishedDate,
      score: result.score || 0,
    }))

    const responseTime = Date.now() - startTime

    return {
      results,
      query,
      responseTime,
    }
  } catch (error: any) {
    console.error('[WEB-SEARCH] Search failed:', error?.message || error)
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

  return searchWeb(query, 5, 'advanced')
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