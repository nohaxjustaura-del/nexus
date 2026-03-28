/**
 * Discover capital-provider names (VC, angel, accelerator, CVC, FO, grants, etc.): two parallel Exa searches per round,
 * then heuristic fund-name extraction. No Tavily, no OpenRouter.
 */

import Exa from 'exa-js'
import { db } from '@/lib/db'
import { isLikelyRealFirmName } from '@/lib/firm-name-quality'

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
 * Exa `startPublishedDate` filter for discovery (optional breadth vs recency).
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
  'nonprofit foundation grant startup funding {sector} {year} {region}',
  'government innovation fund startup {sector} {region} {year}',
  'venture debt fund {sector} {year} {region} lending',
  'angel network {sector} {region} {year} investments syndicate',
  'startup incubator program {sector} {year} {region} equity',
  'revenue based financing RBF {sector} {year} {region}',
]

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

const SUSPICIOUS_NAME_PHRASES = [
  'venture builder fund',
  'top vc',
  'top venture capital',
  'list of venture',
  'best venture capital',
]

const GENERIC_ONLY_WORDS = new Set([
  'africa',
  'asia',
  'europe',
  'global',
  'emerging',
  'first',
  'new',
  'seed',
  'preseed',
  'pre',
  'series',
  'a',
  'b',
  'c',
  'climate',
  'ai',
  'fintech',
  'deeptech',
  'health',
  'healthcare',
  'impact',
  'growth',
  'venture',
  'ventures',
  'capital',
  'partners',
  'fund',
  'funds',
  'investment',
  'investments',
  'management',
  'equity',
  'builder',
  'holdings',
  'group',
  'labs',
  'advisors',
  'associates',
  'vc',
])

function sanitizeExtractedName(raw: string): string {
  let t = raw
    .replace(/[“”"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Some headlines arrive as "Source - Candidate Fund Name"; keep RHS only.
  if (/[|:\-]/.test(t)) {
    const parts = t
      .split(/\s*[|:\-]\s*/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length >= 2) {
      const rhs = parts[parts.length - 1]!
      if (rhs.length >= 4 && rhs.length <= 110) t = rhs
    }
  }

  t = t.replace(/^[^\w]+|[^\w)]+$/g, '').trim()
  return t
}

function looksTooGenericName(name: string): boolean {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) return true
  const nonGeneric = words.filter((w) => !GENERIC_ONLY_WORDS.has(w))
  return nonGeneric.length === 0
}

function isPlausibleFundName(raw: string): boolean {
  const t = sanitizeExtractedName(raw)
  if (!isLikelyRealFirmName(t)) return false
  if (t.length < 3 || t.length > 120) return false
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length > 10) return false
  if (words.length === 1 && t.length < 5) return false
  const lower = t.toLowerCase()
  for (const j of JUNK_SUBSTRINGS) {
    if (lower.includes(j)) return false
  }
  for (const bad of SUSPICIOUS_NAME_PHRASES) {
    if (lower.includes(bad)) return false
  }
  if (looksTooGenericName(t)) return false
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
 * Pull fund-like strings from merged Exa passages (no LLM).
 */
function extractFundNamesHeuristic(corpus: string): string[] {
  const found = new Set<string>()
  const suffix =
    /\b([A-Z][A-Za-z0-9&]*(?:\s+[A-Z][A-Za-z0-9&]*){0,6})\s+(Capital|Ventures|Venture Partners|Partners|VC|Fund|Holdings|Investments|Management|Equity|Labs|Advisors|Group|Associates|Accelerator|Foundation|Institute|Syndicate|Network)\b/g
  let m: RegExpExecArray | null
  const s = corpus.replace(/\r/g, '\n')
  while ((m = suffix.exec(s)) !== null) {
    const name = sanitizeExtractedName(`${m[1]} ${m[2]}`)
    if (isPlausibleFundName(name) && nameAllowedByYearWindow(s, name)) found.add(name)
  }
  for (const line of s.split('\n')) {
    const bullet = sanitizeExtractedName(line.replace(/^\s*[-*•\d.)]+\s*/, '').trim())
    if (bullet.length < 6 || bullet.length > 100) continue
    if (!/\b(Capital|Ventures|Partners|VC|Fund|Accelerator|Foundation|Syndicate|Network|Institute)\b/i.test(bullet))
      continue
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

/** Discovery requires Exa only (two search passes per round). */
export function isDiscoverySearchConfigured(): boolean {
  return !!process.env.EXA_API_KEY?.trim()
}

export type ExaScrapeResult = { urls: string[]; textBlock: string }

function discoveryExaMaxChars(): number {
  const raw = parseInt(process.env.VC_DISCOVERY_EXA_MAX_CHARS || '2400', 10)
  return Math.min(8000, Math.max(800, Number.isFinite(raw) ? raw : 2400))
}

/** Exa: neural/autocomplete search + text snippets (scrape). */
export async function exaScrapeQuery(query: string, numResults: number): Promise<ExaScrapeResult> {
  const key = process.env.EXA_API_KEY?.trim()
  if (!key) return { urls: [], textBlock: '' }
  const maxC = discoveryExaMaxChars()
  try {
    const exa = new Exa(key)
    const res = await exa.search(query, {
      type: 'auto',
      numResults,
      startPublishedDate: VC_DISCOVERY_CONTENT_SINCE,
      contents: { text: { maxCharacters: maxC } },
    })
    const results = res.results ?? []
    const urls = results.map((r) => r.url).filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
    const textBlock = results
      .map((r, i) => {
        const title = r.title ?? 'Untitled'
        const body = (typeof r.text === 'string' ? r.text : '') || ''
        return `[exa ${i + 1}: ${title}]\n${r.url}\n${body.slice(0, maxC)}`
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

const EXA_SECOND_PASS_SUFFIXES = [
  'venture fund portfolio companies institutional LPs fundraising',
  'VC firm lead investor seed Series A recent funding',
  'emerging manager first fund final close limited partners',
  'growth equity venture deal flow institutional capital',
  'accelerator cohort angel syndicate family office deployment',
  'grant program nonprofit foundation startup funding announced',
]

function complementaryDiscoveryQuery(primary: string): string {
  return `${primary} ${pick(EXA_SECOND_PASS_SUFFIXES)}`
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
 * Two Exa passes per round (parallel) → merged corpus → heuristic fund names. No OpenRouter.
 */
export async function discoverCandidateFirmNames(
  existingKeys: Set<string>,
  options: DiscoverCandidatesOptions,
): Promise<string[]> {
  if (!isDiscoverySearchConfigured()) {
    throw new Error('VC discovery requires EXA_API_KEY (dual Exa search per round).')
  }

  const queries = buildRandomDiscoveryQueries(Math.max(1, options.searchRounds))
  const textChunks: string[] = []

  console.log(
    `[VC-DISCOVERY] Pipeline: dual Exa search/pass (parallel). Recency ≥ ${VC_DISCOVERY_CONTENT_SINCE}. No Tavily.`,
  )
  console.log(`[VC-DISCOVERY] Exa key: ${!!process.env.EXA_API_KEY?.trim()}`)

  const nResults = Math.max(3, options.resultsPerQuery)

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i]!
    console.log(`[VC-DISCOVERY] Round ${i + 1}/${queries.length}: ${q}`)

    const q2 = complementaryDiscoveryQuery(q)
    const [pass1, pass2] = await Promise.all([
      exaScrapeQuery(q, nResults),
      exaScrapeQuery(q2, nResults),
    ])
    console.log(
      `[VC-DISCOVERY] Exa dual: pass1 ${pass1.urls.length} URLs, ${pass1.textBlock.length} chars | pass2 ${pass2.urls.length} URLs, ${pass2.textBlock.length} chars`,
    )

    const merged = [
      pass1.textBlock && `--- Exa pass 1 ---\n${pass1.textBlock}`,
      pass2.textBlock && `--- Exa pass 2 ---\n${pass2.textBlock}`,
    ]
      .filter(Boolean)
      .join('\n\n')

    if (merged.trim()) {
      textChunks.push(`=== Query: ${q} ===\n${merged}`)
    } else {
      console.warn(`[VC-DISCOVERY] No text for query (check Exa quota and VC_DISCOVERY_CONTENT_SINCE).`)
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
