/**
 * Discover VC / investment-firm names: Exa scrapes the web; Tavily summarizes (answer) + extracts
 * page text from Exa URLs. No OpenRouter in this path.
 */

import Exa from 'exa-js'
import { tavily } from '@tavily/core'
import { db } from '@/lib/db'

const SECTORS = [
  'SaaS',
  'fintech',
  'AI',
  'climate tech',
  'healthcare',
  'consumer',
  'B2B software',
  'deep tech',
  'logistics',
  'defense tech',
  'proptech',
  'edtech',
  'web3',
  'biotech',
  'hardware',
  'cybersecurity',
]

const REGIONS = [
  'United States',
  'Europe',
  'UK',
  'Southeast Asia',
  'India',
  'Latin America',
  'Africa',
  'Middle East',
  'Nordic',
  'DACH',
  'France',
  'Japan',
  'Australia',
  'Canada',
  'Global',
]

const STAGES = ['pre-seed', 'seed', 'Series A', 'early-stage', 'micro VC', 'first-time fund']

const ANGLES = [
  'first close 2026',
  'final close announcement',
  'new fund launch',
  'Fund II Fund III 2026',
  'SPV deployment',
  'emerging managers 2026',
  'angel syndicate 2026 deals',
  'accelerator fund 2026 cohort',
]

/**
 * Exa snippet filter + Tavily search startDate.
 */
export const VC_DISCOVERY_CONTENT_SINCE: string = (() => {
  const e = process.env.VC_DISCOVERY_CONTENT_SINCE?.trim()
  if (e && /^\d{4}-\d{2}-\d{2}$/.test(e)) return e
  return '2026-01-01'
})()

const BLUEPRINTS = [
  '{period} {sector} venture capital fund close {region}',
  'new {stage} VC fund {sector} {region} raised {year}',
  'venture fund {year} first close {sector} {region}',
  'micro VC {sector} {region} {year} new fund announcement',
  '{sector} VC lead investor seed round {period} {region}',
  'corporate venture capital {sector} {year} new vehicle {region}',
  'first-time fund manager {sector} {year} {region} debut',
  'accelerator venture fund {sector} {year} investments',
  'venture capital {year} portfolio investment {sector} announced',
  'emerging VC firm {region} {sector} fund launch {year}',
  'family office venture fund {sector} {year} {region}',
  'rolling fund {sector} investors deployments {year}',
  'SPV syndicate {sector} {year} startup investment {region}',
  'pre-seed seed fund {year} {sector} {region} closes',
  'growth equity venture {sector} {region} {year} fundraising',
  'climate AI fintech fund {year} close {region}',
  'university venture fund {region} {year} new investments',
  'crossover fund venture {sector} {year} {region}',
  'venture capital {angle} {sector} {region}',
  'emerging manager VC {angle} {year} {sector}',
]

let tavilyDiscoveryClient: ReturnType<typeof tavily> | null = null

function getTavilyDiscoveryClient(): ReturnType<typeof tavily> | null {
  if (tavilyDiscoveryClient) return tavilyDiscoveryClient
  const apiKey = process.env.TAVILY_API_KEY?.trim()
  if (!apiKey) return null
  try {
    tavilyDiscoveryClient = tavily({ apiKey })
    return tavilyDiscoveryClient
  } catch (e) {
    console.error('[VC-DISCOVERY] Tavily init failed:', e)
    return null
  }
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function normalizeFirmKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const JUNK_SUBSTRINGS = [
  'top 10',
  'top ten',
  'best vc',
  'how to',
  'what is',
  'ultimate guide',
  'podcast',
  'newsletter',
  'subscribe',
  'linkedin.com',
  'http://',
  'https://',
  'wikipedia',
  'list of',
  'ranking',
  'according to',
]

function isPlausibleFundName(raw: string): boolean {
  const t = raw.trim()
  if (t.length < 3 || t.length > 120) return false
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length > 10) return false
  if (words.length === 1 && t.length < 5) return false
  const lower = t.toLowerCase()
  for (const j of JUNK_SUBSTRINGS) {
    if (lower.includes(j)) return false
  }
  if (/^\d+$/.test(t.replace(/\s/g, ''))) return false
  return true
}

/** If env VC_DISCOVERY_REQUIRE_YEAR_IN_SNIPPET=1, keep names only when 2026+ appears nearby in corpus. */
function nameAllowedByYearWindow(corpus: string, name: string): boolean {
  const v = process.env.VC_DISCOVERY_REQUIRE_YEAR_IN_SNIPPET?.trim()
  if (v !== '1' && v?.toLowerCase() !== 'true') return true
  const idx = corpus.indexOf(name)
  if (idx < 0) return false
  const win = corpus.slice(Math.max(0, idx - 140), Math.min(corpus.length, idx + name.length + 140))
  return /\b20(2[6-9]|3[0-9])\b/.test(win)
}

/**
 * Pull fund-like strings from Tavily answer + extracted pages + Exa snippets (no LLM).
 */
function extractFundNamesHeuristic(corpus: string): string[] {
  const found = new Set<string>()
  const suffix =
    /\b([A-Z][A-Za-z0-9&]*(?:\s+[A-Z][A-Za-z0-9&]*){0,6})\s+(Capital|Ventures|Venture Partners|Partners|VC|Fund|Holdings|Investments|Management|Equity|Labs|Advisors|Group|Associates)\b/g
  let m: RegExpExecArray | null
  const s = corpus.replace(/\r/g, '\n')
  while ((m = suffix.exec(s)) !== null) {
    const name = `${m[1]} ${m[2]}`.replace(/\s+/g, ' ').trim()
    if (isPlausibleFundName(name) && nameAllowedByYearWindow(s, name)) found.add(name)
  }
  for (const line of s.split('\n')) {
    const bullet = line.replace(/^\s*[-*•\d.)]+\s*/, '').trim()
    if (bullet.length < 6 || bullet.length > 100) continue
    if (!/\b(Capital|Ventures|Partners|VC|Fund)\b/i.test(bullet)) continue
    if (isPlausibleFundName(bullet) && nameAllowedByYearWindow(s, bullet)) found.add(bullet)
  }
  return [...found]
}

export async function loadExistingFirmKeysFromDb(): Promise<Set<string>> {
  const rows = await db.investor.findMany({ select: { firmName: true } })
  const set = new Set<string>()
  for (const r of rows) {
    if (r.firmName) {
      const k = normalizeFirmKey(r.firmName)
      if (k) set.add(k)
    }
  }
  return set
}

/** Discovery requires both: Exa scrapes, Tavily answers + extracts. */
export function isDiscoverySearchConfigured(): boolean {
  return !!process.env.TAVILY_API_KEY?.trim() && !!process.env.EXA_API_KEY?.trim()
}

export type ExaScrapeResult = { urls: string[]; textBlock: string }

/** Exa: neural/autocomplete search + text snippets (scrape). */
export async function exaScrapeQuery(query: string, numResults: number): Promise<ExaScrapeResult> {
  const key = process.env.EXA_API_KEY?.trim()
  if (!key) return { urls: [], textBlock: '' }
  try {
    const exa = new Exa(key)
    const res = await exa.search(query, {
      type: 'auto',
      numResults,
      startPublishedDate: VC_DISCOVERY_CONTENT_SINCE,
      contents: { text: { maxCharacters: 1800 } },
    })
    const results = res.results ?? []
    const urls = results.map((r) => r.url).filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
    const textBlock = results
      .map((r, i) => {
        const title = r.title ?? 'Untitled'
        const body = (typeof r.text === 'string' ? r.text : '') || ''
        return `[exa ${i + 1}: ${title}]\n${r.url}\n${body.slice(0, 1800)}`
      })
      .join('\n\n')
    return { urls, textBlock }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[VC-DISCOVERY] Exa scrape failed:', msg)
    if (/402|403|429|quota|credit|limit|exceeded|payment|unauthor/i.test(msg)) {
      console.warn('[VC-DISCOVERY] Exa may be billing/auth/rate limited. See https://exa.ai')
    }
    return { urls: [], textBlock: '' }
  }
}

/** Tavily search with AI answer (extraction/summary on Tavily side). */
export async function tavilyAnswerForQuery(query: string, maxResults: number): Promise<string> {
  const client = getTavilyDiscoveryClient()
  if (!client) return ''
  try {
    const topic = Math.random() < 0.55 ? 'news' : 'finance'
    const response = await client.search(query, {
      searchDepth: 'advanced',
      maxResults,
      includeAnswer: 'advanced',
      includeRawContent: false,
      includeImages: false,
      topic,
      startDate: VC_DISCOVERY_CONTENT_SINCE,
      includeUsage: true,
    })
    const cred = response.usage?.credits
    const n = response.results?.length ?? 0
    const ans = typeof response.answer === 'string' ? response.answer.trim() : ''
    console.log(
      `[VC-DISCOVERY] Tavily answer: ${ans.length} chars (search hits: ${n}${cred != null ? `, ~${cred} credits` : ''})`,
    )
    return ans
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[VC-DISCOVERY] Tavily search/answer failed:', msg)
    if (/402|403|429|quota|credit|limit|exceeded|payment/i.test(msg)) {
      console.warn('[VC-DISCOVERY] Tavily may be out of credits or rate limited. See https://tavily.com')
    }
    return ''
  }
}

/** Tavily extract: pull clean text from Exa URLs (focused query). */
export async function tavilyExtractFromUrls(urls: string[], seedQuery: string): Promise<string> {
  const client = getTavilyDiscoveryClient()
  if (!client || urls.length === 0) return ''
  const clean = [...new Set(urls)]
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 6)
  if (!clean.length) return ''
  try {
    const res = await client.extract(clean, {
      extractDepth: 'advanced',
      format: 'text',
      includeUsage: true,
      query: `venture capital funds, VC firms, institutional investors, fund names: ${seedQuery.slice(0, 180)}`,
      timeout: 45,
    })
    const cred = res.usage?.credits
    const parts = res.results.map((r) => {
      const body = (r.rawContent || '').slice(0, 4500)
      return `[tavily extract: ${r.title || r.url}]\n${body}`
    })
    const failed = res.failedResults?.length ?? 0
    console.log(
      `[VC-DISCOVERY] Tavily extract: ${parts.length} page(s), ${failed} failed${cred != null ? `, ~${cred} credits` : ''}`,
    )
    return parts.join('\n\n')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[VC-DISCOVERY] Tavily extract failed:', msg)
    return ''
  }
}

/** Vintage years emphasized in queries: current/next year, anchored at 2026+. */
function pickDiscoveryVintageYear(): number {
  const y = new Date().getFullYear()
  const floor = Math.max(2026, y)
  const r = Math.random()
  if (r < 0.5) return floor
  if (r < 0.82) return floor + 1
  if (r < 0.92) return floor
  return floor + 1
}

function pickReportingPeriod(): string {
  const fy = pickDiscoveryVintageYear()
  const slot = pick(['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2'])
  return `${slot} ${fy}`
}

export function buildRandomDiscoveryQueries(count: number): string[] {
  const templates = [...BLUEPRINTS]
  shuffleInPlace(templates)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const tpl = templates[i % templates.length]!
    const year = pickDiscoveryVintageYear()
    const period = pickReportingPeriod()
    const q = tpl
      .replace(/\{sector\}/g, pick(SECTORS))
      .replace(/\{region\}/g, pick(REGIONS))
      .replace(/\{stage\}/g, pick(STAGES))
      .replace(/\{year\}/g, String(year))
      .replace(/\{period\}/g, period)
      .replace(/\{angle\}/g, pick(ANGLES))
    out.push(q)
  }
  return out
}

export type DiscoverCandidatesOptions = {
  searchRounds: number
  resultsPerQuery: number
  maxNames: number
  delayBetweenQueriesMs: number
}

/**
 * Exa scrapes → Tavily answer + Tavily extract(Exa URLs) → heuristic fund names. No OpenRouter.
 */
export async function discoverCandidateFirmNames(
  existingKeys: Set<string>,
  options: DiscoverCandidatesOptions,
): Promise<string[]> {
  if (!isDiscoverySearchConfigured()) {
    throw new Error(
      'VC discovery requires both TAVILY_API_KEY and EXA_API_KEY (Exa scrapes, Tavily answers + extracts).',
    )
  }

  const queries = buildRandomDiscoveryQueries(Math.max(1, options.searchRounds))
  const textChunks: string[] = []

  console.log(
    `[VC-DISCOVERY] Pipeline: Exa scrape → Tavily answer + Tavily extract (URLs from Exa). Recency ≥ ${VC_DISCOVERY_CONTENT_SINCE}. No OpenRouter.`,
  )
  console.log(
    `[VC-DISCOVERY] API keys: Tavily=${!!process.env.TAVILY_API_KEY?.trim()}, Exa=${!!process.env.EXA_API_KEY?.trim()}`,
  )

  const nResults = Math.max(3, options.resultsPerQuery)

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i]!
    console.log(`[VC-DISCOVERY] Round ${i + 1}/${queries.length}: ${q}`)

    const { urls, textBlock } = await exaScrapeQuery(q, nResults)
    console.log(`[VC-DISCOVERY] Exa scrape: ${urls.length} URL(s), ${textBlock.length} chars`)

    const answer = await tavilyAnswerForQuery(q, nResults)
    const extracted = await tavilyExtractFromUrls(urls, q)

    const merged = [textBlock && `--- Exa snippets ---\n${textBlock}`, answer && `--- Tavily answer ---\n${answer}`, extracted && `--- Tavily extract ---\n${extracted}`]
      .filter(Boolean)
      .join('\n\n')

    if (merged.trim()) {
      textChunks.push(`=== Query: ${q} ===\n${merged}`)
    } else {
      console.warn(`[VC-DISCOVERY] No text for query (check Exa/Tavily quotas and date filter).`)
    }

    if (options.delayBetweenQueriesMs > 0 && i < queries.length - 1) {
      await new Promise((r) => setTimeout(r, options.delayBetweenQueriesMs))
    }
  }

  const corpus = textChunks.join('\n\n').slice(0, 120_000)
  if (corpus.length < 200) {
    console.warn('[VC-DISCOVERY] Corpus too small; increase --discover-rounds or relax VC_DISCOVERY_CONTENT_SINCE.')
    return []
  }

  const heuristicNames = extractFundNamesHeuristic(corpus)
  console.log(`[VC-DISCOVERY] Heuristic names (pre-filter): ${heuristicNames.length}`)

  const seen = new Set<string>()
  const candidates: string[] = []
  for (const name of heuristicNames) {
    const key = normalizeFirmKey(name)
    if (!key || key.length < 3) continue
    if (existingKeys.has(key)) continue
    if (seen.has(key)) continue
    seen.add(key)
    candidates.push(name)
  }

  shuffleInPlace(candidates)
  return candidates.slice(0, Math.max(1, options.maxNames))
}

export async function discoverNewFirmNamesNotInDatabase(
  options: DiscoverCandidatesOptions,
): Promise<string[]> {
  const existingKeys = await loadExistingFirmKeysFromDb()
  return discoverCandidateFirmNames(existingKeys, options)
}
