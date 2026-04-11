/**
 * Discover capital-provider names (VC, angel, accelerator, CVC, FO, grants, etc.): two parallel Exa searches per round,
 * then heuristic fund-name extraction. No Tavily, no OpenRouter.
 */

import { db } from '@/lib/db'
import { runExaWithKeyFailover } from '@/lib/exa-key-failover'
import { getExaApiKeys, hasExaApiKey } from '@/lib/exa-keys'
import { isExaGlobalCooldownActive, msUntilExaGlobalCooldownEnds } from '@/lib/exa-global-cooldown'
import { isLikelyRealFirmName } from '@/lib/firm-name-quality'

export const DISCOVERY_SECTORS = [
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
] as const

export const DISCOVERY_REGIONS = [
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
] as const

export const DISCOVERY_STAGES = [
  'pre-seed',
  'seed',
  'Series A',
  'early-stage',
  'micro VC',
  'first-time fund',
] as const

const SECTORS = DISCOVERY_SECTORS as readonly string[]
const REGIONS = DISCOVERY_REGIONS as readonly string[]
const STAGES = DISCOVERY_STAGES as readonly string[]

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

/**
 * Domain allowlist for Exa discovery, per blueprint.
 * When set, only results from these hosts are kept. This kills the
 * "article headline as firm name" problem by ignoring general news sites.
 *
 * ENV: EXA_DOMAIN_ALLOWLIST=crunchbase.com,pitchbook.com,angel.co,...
 */
const EXA_DOMAIN_ALLOWLIST: string[] = (() => {
  const raw = process.env.EXA_DOMAIN_ALLOWLIST?.trim()
  if (!raw) {
    return [
      'crunchbase.com',
      'pitchbook.com',
      'angel.co',
      'nfx.com',
      'visible.vc',
      'signal.nfx.com',
      'fundingwire.com',
    ]
  }
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
})()

const EXA_BLOCKED_HOST_SUBSTRINGS = [
  'techcrunch.com',
  'forbes.com',
  'bloomberg.com',
  'reuters.com',
  'businessinsider.com',
  'nytimes.com',
  'wsj.com',
]

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

function pick<T>(arr: readonly T[]): T {
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
  'how does',
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
  'learn more',
  'who we are',
  'at a glance',
  'read more',
  'sign up',
  'click here',
  'fund structure',
  'fund size',
  'fund management',
  'takes questions',
  'intentionally',
  'debuting our',
  'investing in foundational',
  'supports companies',
  'support startups',
  'in three ways',
  'outlook',
  'pipeline',
  'principals',
  'private equity',
  'and private equity',
  'fund thesis',
  'vc pipeline',
  'general partners',
  'end fund',
  'commitments ',
  '.com/',
  'securing a',
  'who raised',
  'computer &',
  'network security',
  'raised capital',
  'urban infrastructure',
  'all countries',
  'key trends',
  'driving investments',
  'investor type',
  'flagship fund',
  'portfolio investments',
]

const SUSPICIOUS_NAME_PHRASES = [
  'venture builder fund',
  'top vc',
  'top venture capital',
  'list of venture',
  'best venture capital',
  'closes debut fund',
  'focused thesis',
  'investment thesis',
  'stage marketplaces',
  'platform pricing',
  'collaborative ai venture',
  'billion startup',
  'startup investment fund',
  'innovation accelerator',
  'corporate venture capital',
  'emerging manager venture',
  'us venture capital',
  'venture capital outlook',
  'venture capital and',
  'technology companies',
  'traditional vc',
  'traditional venture',
  'growth startups fund',
  'ai crossover fund',
  'crossover fund',
  'industry computer',
  'early stage saas',
  'second flagship',
  'inside nextladder',
]

/** Sentence-like patterns that indicate a headline, not a fund name. */
const SENTENCE_INDICATORS = /\b(the \$\d|is |are |was |were |has |have |takes |from |about |with |our |their |this |that |these |those |does |companies in)\b/i

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

  // Strip numbered list prefixes: "1. ", "2. ", "3) ", etc.
  t = t.replace(/^\d+[.)]\s*/, '')

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
  if (t.length < 3 || t.length > 80) return false
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length > 6) return false
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
  if (SENTENCE_INDICATORS.test(t)) return false
  if (/^(at |a |the |on |in |for |related |unique |end |how |who |securing |financed |share |potential |traditional |all |inside |about |key |early stage )/i.test(t)) return false
  if (/\$\d/.test(t)) return false
  if (/\.\w{2,}\//i.test(t)) return false
  if (t.length > 10 && t === t.toUpperCase()) return false
  if (words.length >= 4) {
    const half = Math.floor(words.length / 2)
    const first = words.slice(0, half).join(' ').toLowerCase()
    const second = words.slice(half, half * 2).join(' ').toLowerCase()
    if (first === second) return false
  }
  if (/^\d{4}\s/.test(t)) return false

  if (t.includes(',')) return false
  if (/\.\w{2,4}$/i.test(t) && !t.includes(' ')) return false
  if (/[/=?]/.test(t)) return false

  // Reject names where first word is all-lowercase (sentence fragments)
  if (words.length >= 2 && words[0] === words[0]!.toLowerCase() && /^[a-z]/.test(words[0]!)) return false

  // Reject industry categories with "&"
  if (/&\s*(network|security|technology|software|systems|services|solutions)/i.test(t)) return false

  // Reject parentheses (form labels like "Investor Type (VC or CVC)")
  if (/[()]/.test(t)) return false

  // Reject concatenated words from bad parsing: "CroatiaVesna", "SloveniaSouth"
  // Only flag camelCase words longer than 10 chars (avoids hitting legitimate brands like "NextLadder")
  {
    const parts = t.split(/\s+/)
    if (parts.some((w) => /[a-z][A-Z]/.test(w) && w.length > 10)) return false
  }

  // Reject "Portfolio Investments", "Driving Investments", "Flagship Fund" — descriptive phrases
  if (/\b(portfolio investments|driving investments|flagship fund|investor type)\b/i.test(t)) return false

  // Reject 2-word names where BOTH words are generic/category terms
  if (words.length === 2) {
    const CATEGORY_WORDS = new Set([
      ...GENERIC_ONLY_WORDS,
      'saas', 'institute', 'traditional', 'ukrainian', 'european', 'american',
      'asian', 'african', 'beast', 'type', 'second', 'third', 'early', 'late',
      'stage', 'micro', 'nano', 'mega', 'super', 'open', 'general', 'standard',
    ])
    const w0 = words[0]!.toLowerCase().replace(/[^a-z0-9]/g, '')
    const w1 = words[1]!.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (CATEGORY_WORDS.has(w0) && CATEGORY_WORDS.has(w1)) return false
  }

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
  return hasExaApiKey()
}

export type ExaScrapeResult = { urls: string[]; textBlock: string }

function discoveryExaMaxChars(): number {
  const raw = parseInt(process.env.VC_DISCOVERY_EXA_MAX_CHARS || '2400', 10)
  return Math.min(8000, Math.max(800, Number.isFinite(raw) ? raw : 2400))
}

/** Exa: neural/autocomplete search + text snippets (scrape). */
export async function exaScrapeQuery(query: string, numResults: number): Promise<ExaScrapeResult> {
  if (!hasExaApiKey()) return { urls: [], textBlock: '' }
  const maxC = discoveryExaMaxChars()

  if (isExaGlobalCooldownActive()) {
    const waitMs = msUntilExaGlobalCooldownEnds()
    console.warn(
      `[VC-DISCOVERY] Exa in cooldown window (~${Math.ceil(
        waitMs / 1000,
      )}s remaining); skipping discovery query: ${query}`,
    )
    return { urls: [], textBlock: '' }
  }

  const failover = await runExaWithKeyFailover(async (exa) => {
    const res = await exa.search(query, {
      type: 'auto',
      numResults,
      startPublishedDate: VC_DISCOVERY_CONTENT_SINCE,
      contents: { text: { maxCharacters: maxC } },
    })
    const results = res.results ?? []
    const urls = results
      .map((r) => r.url)
      .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
      .filter((u) => {
        try {
          const host = new URL(u!).hostname.toLowerCase()
          if (EXA_BLOCKED_HOST_SUBSTRINGS.some((b) => host.includes(b))) return false
          if (EXA_DOMAIN_ALLOWLIST.length === 0) return true
          return EXA_DOMAIN_ALLOWLIST.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
        } catch {
          return false
        }
      })
    const textBlock = results
      .map((r, i) => {
        const title = r.title ?? 'Untitled'
        const body = (typeof r.text === 'string' ? r.text : '') || ''
        return `[exa ${i + 1}: ${title}]\n${r.url}\n${body.slice(0, maxC)}`
      })
      .join('\n\n')
    return { urls, textBlock }
  })

  if (failover.ok) {
    return { urls: failover.data.urls, textBlock: failover.data.textBlock }
  }
  if (failover.kind === 'non_quota_error') {
    console.warn('[VC-DISCOVERY] Exa scrape failed:', failover.message)
  } else if (failover.kind === 'all_keys_quota') {
    console.warn('[VC-DISCOVERY] All Exa keys quota/auth — stopping discovery rounds after cooldown.')
  }
  return { urls: [], textBlock: '' }
}

/** Hosts that should never count as "web presence" for a VC firm. */
const PRESENCE_BLOCKED_HOSTS = [
  ...EXA_BLOCKED_HOST_SUBSTRINGS,
  'wikipedia.org',
  'reddit.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'youtube.com',
  'medium.com',
  'substack.com',
  'tiktok.com',
]

export type WebPresenceResult = 'confirmed' | 'rejected' | 'inconclusive'

/**
 * Lightweight web presence check for a candidate firm name.
 *
 * IMPORTANT: This calls Exa directly WITHOUT the discovery allowlist filter.
 * The allowlist is for discovery search (to avoid noisy news sites when extracting
 * fund names), but the presence check needs to see ALL results — including the
 * firm's own .com website.
 */
export async function checkDiscoveryWebPresence(name: string): Promise<WebPresenceResult> {
  if (!hasExaApiKey()) return 'inconclusive'
  if (isExaGlobalCooldownActive()) return 'inconclusive'

  const q = `"${name}" venture capital investor`

  type PresenceHit = { url: string; text: string; title: string }
  const failover = await runExaWithKeyFailover(async (exa) => {
    const res = await exa.search(q, {
      type: 'auto',
      numResults: 5,
      contents: { text: { maxCharacters: 400 } },
    })
    return (res.results ?? [])
      .filter((r) => typeof r.url === 'string' && /^https?:\/\//i.test(r.url))
      .map((r) => ({
        url: r.url!,
        text: (typeof r.text === 'string' ? r.text : '') || '',
        title: (typeof r.title === 'string' ? r.title : '') || '',
      }))
  })

  if (!failover.ok) {
    if (failover.kind === 'all_keys_quota') return 'inconclusive'
    if (isExaGlobalCooldownActive()) return 'inconclusive'
    return 'rejected'
  }

  const hits: PresenceHit[] = failover.data
  if (!hits.length) return 'rejected'

  // Build name variants for matching: full name + significant words
  const nameLower = name.toLowerCase()
  const nameWords = nameLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3)
  // Require at least 2 significant words to match, or the full name
  const significantWords = nameWords.filter((w) => !GENERIC_ONLY_WORDS.has(w))

  for (const hit of hits) {
    try {
      const host = new URL(hit.url).hostname.toLowerCase()
      if (PRESENCE_BLOCKED_HOSTS.some((b) => host.includes(b))) continue

      const haystack = `${host} ${hit.title} ${hit.text}`.toLowerCase()

      // Strong signal: full name appears in the result
      if (haystack.includes(nameLower)) return 'confirmed'

      // Medium signal: the distinctive part of the name appears in host or text
      if (significantWords.length > 0 && significantWords.every((w) => haystack.includes(w))) {
        return 'confirmed'
      }
    } catch {
      continue
    }
  }

  return 'rejected'
}

/** Legacy wrapper for backward compatibility */
export async function hasDiscoveryWebPresence(name: string): Promise<boolean> {
  const result = await checkDiscoveryWebPresence(name)
  return result === 'confirmed'
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
    throw new Error('VC discovery requires Exa keys: EXA_API_KEYS or EXA_API_KEY (see lib/exa-keys.ts).')
  }

  const queries = buildRandomDiscoveryQueries(Math.max(1, options.searchRounds))
  const textChunks: string[] = []

  console.log(
    `[VC-DISCOVERY] Pipeline: dual Exa search/pass (parallel). Recency ≥ ${VC_DISCOVERY_CONTENT_SINCE}. No Tavily.`,
  )
  console.log(`[VC-DISCOVERY] Exa keys configured: ${hasExaApiKey() ? getExaApiKeys().length : 0}`)

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

    if (
      !pass1.textBlock.trim() &&
      !pass2.textBlock.trim() &&
      isExaGlobalCooldownActive()
    ) {
      console.warn('[VC-DISCOVERY] Exa quota/cooldown — stopping remaining discovery rounds (no credits / cooling down).')
      break
    }

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

// ---------------------------------------------------------------------------
// New query strategies: portfolio-backtrack and directory-style
// ---------------------------------------------------------------------------

const PORTFOLIO_BACKTRACK_TEMPLATES = [
  '{sector} startup funded {stage} round {year} led by',
  '{sector} company raises {stage} funding {year} investor {region}',
  '{sector} {region} startup {year} venture backed {stage} round investors',
  'startup {sector} closes {stage} round {year} {region} venture capital',
  '{sector} funding round announced {year} {region} lead investor',
  'startup funding {sector} {stage} deal {year} VC firm backed',
]

const DIRECTORY_STYLE_TEMPLATES = [
  'venture capital firms investing in {sector} {region}',
  '{sector} VC investors {region} active {year}',
  'top {stage} investors {sector} {region} {year}',
  'list of {sector} venture capital funds {region}',
  '{region} VC firms {sector} focus portfolio',
  'active {stage} venture funds {sector} {region} {year}',
]

export type DiscoveryQueryStrategy = 'blueprint' | 'portfolio_backtrack' | 'directory'

/**
 * Build queries using the portfolio-backtrack strategy: surfaces VC names
 * from funded company announcements rather than fund-close news.
 */
export function buildPortfolioBacktrackQueries(
  combos: Array<{ sector: string; region: string; stage: string }>,
): string[] {
  const out: string[] = []
  for (const { sector, region, stage } of combos) {
    const tpl = pick(PORTFOLIO_BACKTRACK_TEMPLATES)
    const year = pickDiscoveryVintageYear()
    out.push(
      tpl
        .replace(/\{sector\}/g, sector)
        .replace(/\{region\}/g, region)
        .replace(/\{stage\}/g, stage)
        .replace(/\{year\}/g, String(year)),
    )
  }
  return out
}

/**
 * Build queries using the directory strategy: targets VC listing pages
 * on Crunchbase, AngelList, PitchBook, etc.
 */
export function buildDirectoryQueries(
  combos: Array<{ sector: string; region: string; stage: string }>,
): string[] {
  const out: string[] = []
  for (const { sector, region, stage } of combos) {
    const tpl = pick(DIRECTORY_STYLE_TEMPLATES)
    const year = pickDiscoveryVintageYear()
    out.push(
      tpl
        .replace(/\{sector\}/g, sector)
        .replace(/\{region\}/g, region)
        .replace(/\{stage\}/g, stage)
        .replace(/\{year\}/g, String(year)),
    )
  }
  return out
}

/**
 * Build targeted queries for specific (sector, region, stage) combos
 * from the coverage tracker instead of random selection.
 */
export function buildSystematicDiscoveryQueries(
  combos: Array<{ sector: string; region: string; stage: string }>,
): string[] {
  const out: string[] = []
  for (const { sector, region, stage } of combos) {
    const tpl = pick([...BLUEPRINTS])
    const year = pickDiscoveryVintageYear()
    const period = pickReportingPeriod()
    out.push(
      tpl
        .replace(/\{sector\}/g, sector)
        .replace(/\{region\}/g, region)
        .replace(/\{stage\}/g, stage)
        .replace(/\{year\}/g, String(year))
        .replace(/\{period\}/g, period)
        .replace(/\{angle\}/g, pick(ANGLES)),
    )
  }
  return out
}

export type SystematicDiscoveryResult = {
  candidates: string[]
  queriesRun: number
  strategy: DiscoveryQueryStrategy
}

/**
 * Run a single discovery round for one strategy and a set of combos.
 * Returns extracted candidate names (already deduped against existingKeys).
 */
export async function runDiscoveryRound(
  strategy: DiscoveryQueryStrategy,
  combos: Array<{ sector: string; region: string; stage: string }>,
  existingKeys: Set<string>,
  options: { resultsPerQuery: number; delayBetweenQueriesMs: number; maxNames: number },
): Promise<SystematicDiscoveryResult> {
  if (!isDiscoverySearchConfigured()) {
    return { candidates: [], queriesRun: 0, strategy }
  }

  let queries: string[]
  switch (strategy) {
    case 'portfolio_backtrack':
      queries = buildPortfolioBacktrackQueries(combos)
      break
    case 'directory':
      queries = buildDirectoryQueries(combos)
      break
    default:
      queries = buildSystematicDiscoveryQueries(combos)
  }

  const textChunks: string[] = []
  const nResults = Math.max(3, options.resultsPerQuery)
  let queriesRun = 0

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i]!
    console.log(`[VC-DISCOVERY:${strategy}] Query ${i + 1}/${queries.length}: ${q}`)

    const q2 = complementaryDiscoveryQuery(q)
    const [pass1, pass2] = await Promise.all([
      exaScrapeQuery(q, nResults),
      exaScrapeQuery(q2, nResults),
    ])
    queriesRun++

    if (!pass1.textBlock.trim() && !pass2.textBlock.trim() && isExaGlobalCooldownActive()) {
      console.warn(`[VC-DISCOVERY:${strategy}] Exa quota/cooldown — stopping.`)
      break
    }

    const merged = [
      pass1.textBlock && `--- Exa pass 1 ---\n${pass1.textBlock}`,
      pass2.textBlock && `--- Exa pass 2 ---\n${pass2.textBlock}`,
    ]
      .filter(Boolean)
      .join('\n\n')

    if (merged.trim()) textChunks.push(merged)

    if (options.delayBetweenQueriesMs > 0 && i < queries.length - 1) {
      await new Promise((r) => setTimeout(r, options.delayBetweenQueriesMs))
    }
  }

  const corpus = textChunks.join('\n\n').slice(0, 120_000)
  if (corpus.length < 100) {
    return { candidates: [], queriesRun, strategy }
  }

  const heuristicNames = extractFundNamesHeuristic(corpus)
  const seen = new Set<string>()
  const candidates: string[] = []
  for (const name of heuristicNames) {
    const key = normalizeFirmKey(name)
    if (!key || key.length < 3) continue
    if (existingKeys.has(key) || seen.has(key)) continue
    seen.add(key)
    candidates.push(name)
  }

  shuffleInPlace(candidates)
  return {
    candidates: candidates.slice(0, Math.max(1, options.maxNames)),
    queriesRun,
    strategy,
  }
}
