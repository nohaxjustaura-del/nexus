/**
 * One-off / CLI investor enrichment: Exa (multi-key failover) + LLM extraction.
 * Does not use lib/exa-service.ts or lib/vc-research-retrieval.ts — mirrors Exa.search pattern only.
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import Exa from 'exa-js'
import { z } from 'zod'
import type { Investor, InvestorPortfolioCompany, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { runExaWithKeyFailover } from '@/lib/exa-key-failover'
import { hasExaApiKey } from '@/lib/exa-keys'
import {
  EXA_GLOBAL_COOLDOWN_MS,
  isExaGlobalCooldownActive,
  msUntilExaGlobalCooldownEnds,
} from '@/lib/exa-global-cooldown'
import { openrouterGenerateJson, hasVcLlmConfigured } from '@/lib/openrouter'
import { investorSectorsPromptList, isInvestorSector } from '@/lib/constants/investor-sectors'
import { assertInvestorEnrichmentMigrated } from '@/lib/investor-enrichment-db-ready'

const EXA_NUM_RESULTS = 8
const EXA_MAX_CHARS = 3000
const EXA_SINCE = '2020-01-01'

const ENRICH_COOLDOWN_MAX_WAIT_MS = EXA_GLOBAL_COOLDOWN_MS + 120_000

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Strip parentheticals / bracketed qualifiers for Exa web search.
 * DB labels like "Sequoia Capital (core fund)" match poorly in search; pages use the shorter name.
 */
export function firmNameForExaSearch(firmName: string): string {
  let s = firmName.trim()
  s = s.replace(/\s*\([^)]*\)\s*/g, ' ')
  s = s.replace(/\s*\[[^\]]*\]\s*/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s.length > 0 ? s : firmName.trim()
}

function parseInterQueryDelayMs(): number {
  const raw = process.env.INVESTOR_ENRICH_EXA_DELAY_MS?.trim()
  const n = raw ? parseInt(raw, 10) : NaN
  if (!Number.isFinite(n) || n < 0) return 600
  return n
}

/** True when merged Exa `rawSources` should be written to disk (see INVESTOR_ENRICH_DUMP_RAW_PATH). */
export function isInvestorEnrichDumpRawEnabled(): boolean {
  const v = process.env.INVESTOR_ENRICH_DUMP_RAW?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

function isInvestorEnrichDebugFirmEnabled(): boolean {
  const v = process.env.INVESTOR_ENRICH_DEBUG_FIRM?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

async function waitUntilExaNotPaused(verbose: boolean): Promise<void> {
  const deadline = Date.now() + ENRICH_COOLDOWN_MAX_WAIT_MS
  while (isExaGlobalCooldownActive() && Date.now() < deadline) {
    const ms = Math.min(msUntilExaGlobalCooldownEnds(), 30_000)
    const sec = Math.max(1, Math.ceil(ms / 1000))
    if (verbose) {
      console.log(`[ENRICH] Exa paused (global cooldown, multi-key recovery); waiting ~${sec}s…`)
    }
    await sleep(Math.max(1000, ms))
  }
  if (isExaGlobalCooldownActive() && verbose) {
    console.warn('[ENRICH] Exa still in cooldown after max wait — continuing without hits for this leg.')
  }
}

function buildTextBlockFromResults(
  results: Array<{ title?: string | null; url?: string | null; text?: string | null }>,
): { textBlock: string; urls: string[] } {
  const urls: string[] = []
  const parts = results.map((r, i) => {
    const title = r.title ?? 'Untitled'
    const u = typeof r.url === 'string' && /^https?:\/\//i.test(r.url) ? r.url : ''
    if (u) urls.push(u)
    const body = (typeof r.text === 'string' ? r.text : '').slice(0, EXA_MAX_CHARS)
    return `[exa ${i + 1}: ${title}]\n${u}\n${body}`
  })
  return { textBlock: parts.join('\n\n'), urls }
}

async function runSingleExaSearchOnce(
  query: string,
  verbose: boolean,
): Promise<{
  textBlock: string
  resultCount: number
  retryAfterCooldown: boolean
  /** 0-based index into getExaApiKeys() when Exa succeeded */
  keyIndex?: number
}> {
  const failover = await runExaWithKeyFailover(async (exa) => {
    const res = await exa.search(query, {
      type: 'auto',
      numResults: EXA_NUM_RESULTS,
      startPublishedDate: EXA_SINCE,
      contents: { text: { maxCharacters: EXA_MAX_CHARS } },
    })
    const results = res.results ?? []
    const { textBlock } = buildTextBlockFromResults(results)
    return { textBlock, resultCount: results.length }
  })

  if (failover.ok) {
    return {
      textBlock: failover.data.textBlock,
      resultCount: failover.data.resultCount,
      retryAfterCooldown: false,
      keyIndex: failover.keyIndex,
    }
  }
  if (failover.kind === 'cooldown' || failover.kind === 'all_keys_quota') {
    return { textBlock: '', resultCount: 0, retryAfterCooldown: true }
  }
  if (failover.kind === 'no_keys') {
    throw new Error('No Exa API keys configured (EXA_API_KEYS / EXA_API_KEY).')
  }
  if (verbose) {
    console.warn(`[ENRICH] Exa search failed (${failover.kind}): ${failover.message ?? ''}`)
  }
  return { textBlock: '', resultCount: 0, retryAfterCooldown: false }
}

async function runSingleExaSearchWithRetry(
  query: string,
  verbose: boolean,
): Promise<{ textBlock: string; resultCount: number; keyIndex: number | null }> {
  await waitUntilExaNotPaused(verbose)
  let { textBlock, resultCount, retryAfterCooldown, keyIndex } = await runSingleExaSearchOnce(query, verbose)
  if (retryAfterCooldown) {
    await waitUntilExaNotPaused(verbose)
    const second = await runSingleExaSearchOnce(query, verbose)
    textBlock = second.textBlock
    resultCount = second.resultCount
    keyIndex = second.keyIndex ?? keyIndex
    if (second.retryAfterCooldown) {
      if (verbose) {
        console.warn('[ENRICH] Exa still in cooldown/quota after retry — empty results for this query.')
      }
      return { textBlock: '', resultCount: 0, keyIndex: null }
    }
  }
  return { textBlock, resultCount, keyIndex: keyIndex ?? null }
}

export type FetchEnrichmentSourcesMeta = {
  hitsPerQuery: number[]
  /** 1-based Exa key index per query when a key succeeded; null if that query returned no hits / failed */
  exaKeyIndexByQuery: Array<number | null>
  /** Firm label used inside the 3 Exa query strings (may differ from DB row when parentheticals stripped). */
  exaQueryNameUsed: string
  /** Length of merged rawSources passed to the LLM (diagnostics). */
  rawSourcesCharCount: number
  warnings: string[]
}

/**
 * 3 targeted Exa searches; mirrors vc-research-retrieval exaSearchPass options (no import).
 */
export type FetchEnrichmentSourcesOptions = {
  /** Routine Exa progress logs. Default true. */
  verbose?: boolean
}

export async function fetchEnrichmentSources(
  firmName: string,
  websiteUrl?: string | null,
  options?: FetchEnrichmentSourcesOptions,
): Promise<{ rawSources: string; meta: FetchEnrichmentSourcesMeta }> {
  const verbose = options?.verbose !== false
  if (!hasExaApiKey()) {
    throw new Error('Exa API keys missing. Set EXA_API_KEYS or EXA_API_KEY.')
  }

  const delayMs = parseInterQueryDelayMs()
  const exaQueryName = firmNameForExaSearch(firmName)
  let hostBoost = ''
  if (websiteUrl?.trim()) {
    try {
      const h = new URL(websiteUrl.trim().startsWith('http') ? websiteUrl.trim() : `https://${websiteUrl.trim()}`)
        .hostname
      if (h) hostBoost = ` site:${h}`
    } catch {
      /* ignore */
    }
  }

  const queries = [
    `"${exaQueryName}" venture capital investments portfolio 2020 2021 2022 2023 2024${hostBoost}`,
    `"${exaQueryName}" founding partners team fund`,
    `"${exaQueryName}" invests in site:techcrunch.com OR site:businesswire.com OR site:prnewswire.com`,
  ]

  const hitsPerQuery: number[] = []
  const exaKeyIndexByQuery: Array<number | null> = []
  const warnings: string[] = []
  const sections: string[] = []

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i]!
    try {
      const { textBlock, resultCount, keyIndex } = await runSingleExaSearchWithRetry(q, verbose)
      hitsPerQuery.push(resultCount)
      exaKeyIndexByQuery.push(keyIndex != null ? keyIndex + 1 : null)
      if (verbose) console.log(`[ENRICH] Exa query ${i + 1}/3 hits: ${resultCount}`)
      if (textBlock.trim()) {
        sections.push(`=== QUERY ${i + 1} ===\n${q}\n\n${textBlock}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (verbose) console.error(`[ENRICH] Exa query ${i + 1} threw: ${msg}`)
      warnings.push(`query_${i + 1}_error: ${msg}`)
      hitsPerQuery.push(0)
      exaKeyIndexByQuery.push(null)
    }
    if (i < queries.length - 1) await sleep(delayMs)
  }

  let rawSources = sections.join('\n\n')
  if (!rawSources.trim()) {
    warnings.push('no_exa_text')
    rawSources = 'NO_EXA_SOURCES_RETURNED\n'
  }

  const rawSourcesCharCount = rawSources.length
  if (isInvestorEnrichDumpRawEnabled()) {
    const outPath =
      process.env.INVESTOR_ENRICH_DUMP_RAW_PATH?.trim() || join(process.cwd(), 'debug-raw-sources.txt')
    try {
      writeFileSync(outPath, rawSources, 'utf8')
      console.warn(`[ENRICH] INVESTOR_ENRICH_DUMP_RAW → wrote ${rawSourcesCharCount} chars to ${outPath}`)
    } catch (e) {
      console.warn('[ENRICH] Failed to write raw sources file:', e instanceof Error ? e.message : e)
    }
  }

  return {
    rawSources,
    meta: {
      hitsPerQuery,
      exaKeyIndexByQuery,
      exaQueryNameUsed: exaQueryName,
      rawSourcesCharCount,
      warnings,
    },
  }
}

const firmConfidenceSchema = z.object({
  foundedYear: z.number().min(0).max(10),
  partnerNames: z.number().min(0).max(10),
  sectors: z.number().min(0).max(10),
  activelyInvesting: z.number().min(0).max(10),
  /** Present on new prompts; older LLM responses may omit — default 0. */
  firmSummary: z.number().min(0).max(10).optional().default(0),
})

const firmExtractSchema = z.object({
  foundedYear: z.number().int().nullable().optional(),
  partnerNames: z
    .array(z.string())
    .default([])
    .transform((a) => a.slice(0, 5)),
  sectors: z
    .array(z.string())
    .default([])
    .transform((a) => a.slice(0, 4)),
  activelyInvesting: z.boolean().nullable().optional(),
  /** Grounded 2–3 sentence mandate; max 350 chars (trimmed). */
  firmSummary: z
    .string()
    .optional()
    .transform((s) => (typeof s === 'string' ? s : '').trim().slice(0, 350)),
  confidence: firmConfidenceSchema,
})

export type FirmEnrichmentFields = z.infer<typeof firmExtractSchema>

export async function extractEnrichedFields(
  firmName: string,
  rawSources: string,
  options?: { verbose?: boolean },
): Promise<FirmEnrichmentFields> {
  const verbose = options?.verbose !== false
  if (verbose || isInvestorEnrichDebugFirmEnabled()) {
    console.log('[ENRICH] extractEnrichedFields rawSources length:', rawSources.length)
    console.log('[ENRICH] extractEnrichedFields rawSources preview (500 chars):\n', rawSources.slice(0, 500))
  }
  const sectorList = investorSectorsPromptList()
  const system = `You extract structured data about a VC firm from web search excerpts about this firm. Use what appears in the excerpts; do not invent facts that are not supported there.

Context: Our database label may include a suffix in parentheses (e.g. "Firm Name (core fund)"); excerpts often use a shorter name ("Firm Name"). Treat unambiguous references to the same firm as valid.

Extraction guidance (read the excerpts carefully):
- foundedYear: Look for phrases like "founded in YYYY", "established in YYYY", "since YYYY" (when clearly the firm's founding). Return the 4-digit year or null only if no founding year appears anywhere in the sources.
- partnerNames: Look for people identified as Partner, General Partner, GP, Managing Partner, or listed on the firm's team page. Return up to 5 distinct "First Last" names as written in the sources. Empty array only if no names appear.
- sectors: Normalize ONLY to this exact list (comma-separated in your head): ${sectorList}. Max 4 labels. Else [] if none of these labels are clearly supported.
- activelyInvesting: true if any investment, fund close, or deal activity from 2023 onward is mentioned for this firm; false only if sources clearly indicate they stopped investing before 2022; null only if there is genuinely no signal either way.
- firmSummary: A single string of at most 350 characters (hard limit). Write 2–3 short sentences as a neutral third-person investment mandate: typical stages, sector focus, geographic focus, and any distinctive approach when supported by the excerpts. Ground every clause in the source material; do not invent. Do not mention how to apply, contact instructions, or outreach. If the excerpts lack enough signal for a substantive summary, return an empty string.
- confidence.*: Integer 0-10 per field group. If you extracted foundedYear / partnerNames / sectors / activelyInvesting / firmSummary from clear wording in the excerpts, use 7-10 for that group. Use 0 only when that information is genuinely absent from ALL excerpts — not because phrasing was informal.

Return one JSON object with keys: foundedYear, partnerNames, sectors, activelyInvesting, firmSummary, confidence (object with foundedYear, partnerNames, sectors, activelyInvesting, firmSummary as numbers).`

  const user = `Fund / firm name: "${firmName}"\n\nSource material:\n${rawSources.slice(0, 120_000)}`

  const raw = await openrouterGenerateJson<unknown>({
    system,
    user,
    temperature: 0.25,
    useVcPipeline: true,
    retryOnParseError: true,
  })

  const parsed = firmExtractSchema.safeParse(raw)
  if (!parsed.success) {
    if (verbose) console.warn('[ENRICH] Firm field extraction Zod warnings:', parsed.error.flatten())
    return {
      foundedYear: null,
      partnerNames: [],
      sectors: [],
      activelyInvesting: null,
      firmSummary: '',
      confidence: { foundedYear: 0, partnerNames: 0, sectors: 0, activelyInvesting: 0, firmSummary: 0 },
    }
  }

  const sectors = parsed.data.sectors.filter((s) => isInvestorSector(s))
  if (sectors.length !== parsed.data.sectors.length && verbose) {
    console.warn('[ENRICH] Dropped non-taxonomy sector labels from firm extraction.')
  }

  return {
    ...parsed.data,
    sectors,
    partnerNames: parsed.data.partnerNames.map((n) => n.trim()).filter(Boolean).slice(0, 5),
  }
}

const dealRowSchema = z.object({
  companyName: z.string(),
  companyWebsite: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  investmentYear: z.number().int().nullable().optional(),
  investmentDate: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  isLead: z.boolean().nullable().optional(),
  coInvestors: z.array(z.string()).default([]),
  sourceUrl: z.string(),
  confidence: z.number(),
})

const portfolioExtractSchema = z.object({
  deals: z.array(dealRowSchema).default([]),
})

export type PortfolioDealExtract = z.infer<typeof dealRowSchema>

/** Normalize LLM / source stage strings to fixed title case for DB/UI. */
const CANONICAL_DEAL_STAGE = new Map<string, string>([
  ['pre-seed', 'Pre-Seed'],
  ['pre seed', 'Pre-Seed'],
  ['preseed', 'Pre-Seed'],
  ['seed', 'Seed'],
  ['series a', 'Series A'],
  ['series a+', 'Series A'],
  ['series b', 'Series B'],
  ['series c', 'Series C'],
  ['series d', 'Series D'],
  ['series e', 'Series E'],
  ['series f', 'Series F'],
  ['growth', 'Growth'],
])

function normalizeDealStage(s: string | null | undefined): string | null {
  if (!s?.trim()) return null
  const t = s.trim()
  const key = t.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  const mapped = CANONICAL_DEAL_STAGE.get(key)
  if (mapped) return mapped
  const m = key.match(/^series ([a-z])\+?$/)
  if (m) return `Series ${m[1]!.toUpperCase()}`
  return t
}

export type CleanPortfolioDeal = {
  companyName: string
  companyWebsite: string | null
  sector: string | null
  stage: string | null
  investmentYear: number | null
  investmentDate: Date | null
  amount: number | null
  isLead: boolean | null
  coInvestors: string[]
  sourceUrl: string
  confidence: number
}

function selfFundAliasSet(firmName: string): Set<string> {
  const s = new Set<string>()
  const norm = (x: string) => x.trim().toLowerCase().replace(/\s+/g, ' ')
  const full = norm(firmName)
  if (full) s.add(full)
  const ex = norm(firmNameForExaSearch(firmName))
  if (ex) s.add(ex)
  const noParen = full.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  if (noParen) s.add(noParen)
  return s
}

function isCoInvestorSelfFirm(co: string, firmName: string): boolean {
  const x = co.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!x) return true
  return selfFundAliasSet(firmName).has(x)
}

/** How well the article URL path matches the portfolio company (higher = more likely the primary subject). */
function urlPathCompanyMatchScore(sourceUrl: string, companyName: string): number {
  try {
    const path = new URL(sourceUrl).pathname.toLowerCase()
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 48)
    if (slug.length < 3) return 0
    if (path.includes(slug)) return 100
    for (const w of companyName.toLowerCase().split(/\s+/)) {
      const t = w.replace(/[^a-z0-9]/g, '')
      if (t.length >= 4 && path.includes(t)) return 50
    }
    return 0
  } catch {
    return 0
  }
}

function normalizePortfolioSourceUrlKey(url: string): string {
  try {
    const u = new URL(url.trim())
    u.hash = ''
    let p = u.pathname.replace(/\/+$/, '')
    if (!p) p = '/'
    u.pathname = p
    return u.href.toLowerCase()
  } catch {
    return url.trim().toLowerCase()
  }
}

function stripSelfFromCoInvestorsDeal(deal: CleanPortfolioDeal, firmName: string): CleanPortfolioDeal {
  const coInvestors = deal.coInvestors.filter((c) => !isCoInvestorSelfFirm(c, firmName))
  return { ...deal, coInvestors }
}

/** When multiple deals share one article URL, keep the row that best matches the URL slug / headline company. */
function dedupePortfolioDealsBySourceUrl(deals: CleanPortfolioDeal[]): CleanPortfolioDeal[] {
  const groups = new Map<string, CleanPortfolioDeal[]>()
  for (const d of deals) {
    const k = normalizePortfolioSourceUrlKey(d.sourceUrl)
    const g = groups.get(k) ?? []
    g.push(d)
    groups.set(k, g)
  }
  const out: CleanPortfolioDeal[] = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      out.push(group[0]!)
      continue
    }
    const ranked = [...group].sort((a, b) => {
      const sa = urlPathCompanyMatchScore(a.sourceUrl, a.companyName) + a.confidence * 0.01
      const sb = urlPathCompanyMatchScore(b.sourceUrl, b.companyName) + b.confidence * 0.01
      return sb - sa
    })
    out.push(ranked[0]!)
  }
  return out
}

const LONG_MONTH =
  'January|February|March|April|May|June|July|August|September|October|November|December'

function tryAugmentInvestmentDateFromRawSources(
  deal: CleanPortfolioDeal,
  rawSources: string,
): CleanPortfolioDeal {
  if (deal.investmentDate) return deal
  const url = deal.sourceUrl
  const idx = rawSources.indexOf(url)
  if (idx === -1) return deal
  const win = rawSources.slice(Math.max(0, idx - 200), Math.min(rawSources.length, idx + 12000))
  const iso = win.match(/\b(20[2-9]\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/)
  if (iso) {
    const d = new Date(iso[0] + 'T12:00:00.000Z')
    if (!Number.isNaN(d.getTime())) {
      return {
        ...deal,
        investmentDate: d,
        investmentYear: deal.investmentYear ?? d.getUTCFullYear(),
      }
    }
  }
  const verbal = win.match(new RegExp(`\\b(${LONG_MONTH})\\s+\\d{1,2},?\\s+20[2-9]\\d\\b`, 'i'))
  if (verbal?.[0]) {
    const t = Date.parse(verbal[0])
    if (!Number.isNaN(t)) {
      const d = new Date(t)
      return {
        ...deal,
        investmentDate: d,
        investmentYear: deal.investmentYear ?? d.getFullYear(),
      }
    }
  }
  return deal
}

function postProcessPortfolioDeals(
  deals: CleanPortfolioDeal[],
  firmName: string,
  rawSources: string,
): CleanPortfolioDeal[] {
  const dated = deals.map((d) => tryAugmentInvestmentDateFromRawSources(d, rawSources))
  const stripped = dated.map((d) => stripSelfFromCoInvestorsDeal(d, firmName))
  return dedupePortfolioDealsBySourceUrl(stripped)
}

export function filterAndNormalizeDeals(deals: PortfolioDealExtract[]): CleanPortfolioDeal[] {
  const out: CleanPortfolioDeal[] = []
  for (const d of deals) {
    if (d.confidence < 4) continue
    if (!d.companyName?.trim()) continue
    const url = (d.sourceUrl || '').trim()
    if (!/^https?:\/\//i.test(url)) continue

    let investmentDate: Date | null = null
    if (d.investmentDate?.trim()) {
      const dt = new Date(d.investmentDate.trim())
      if (!Number.isNaN(dt.getTime())) investmentDate = dt
    }
    let year = d.investmentYear ?? null
    if (year == null && investmentDate) year = investmentDate.getFullYear()
    if (year != null && year < 2020) continue
    if (year == null && investmentDate == null) continue

    let sector: string | null = d.sector?.trim() || null
    if (sector && !isInvestorSector(sector)) {
      sector = null
    }

    out.push({
      companyName: d.companyName.trim(),
      companyWebsite: d.companyWebsite?.trim() || null,
      sector,
      stage: normalizeDealStage(d.stage),
      investmentYear: year,
      investmentDate,
      amount: d.amount != null && Number.isFinite(d.amount) ? d.amount : null,
      isLead: d.isLead ?? null,
      coInvestors: (d.coInvestors || []).map((x) => x.trim()).filter(Boolean),
      sourceUrl: url,
      confidence: d.confidence,
    })
  }
  return out
}

export async function extractPortfolioCompanies(
  firmName: string,
  rawSources: string,
  options?: { verbose?: boolean },
): Promise<CleanPortfolioDeal[]> {
  const verbose = options?.verbose !== false
  const sectorList = investorSectorsPromptList()
  const exaQueryName = firmNameForExaSearch(firmName)
  const system = `Extract individual investment deals made by "${firmName}" (may appear as "${exaQueryName}" in press) from these sources. Only include deals from 2020 onwards. Only include deals explicitly mentioned — do not infer or invent.

The fund may appear in excerpts under a shorter name than our full label; attribute deals to this fund when the reference is unambiguous.

Additional rules (critical):
1) Each deal MUST use a distinct supporting sourceUrl when they are different companies. If one article URL discusses multiple companies, output one deal per company only when the excerpt ties that company to a financing; each must use the same sourceUrl but different companyName/amounts as stated for THAT company. If two rows would share the same sourceUrl AND the same round amount, they are duplicates — keep only the company whose name best matches the article headline or URL slug (usually the main subject of the piece).
2) coInvestors must list OTHER funds or angels in the round. NEVER include "${exaQueryName}", "${firmName}", or the same firm under a spelling variant (e.g. do not list "Sequoia Capital" as a co-investor when the lead is Sequoia).
3) investmentDate: Prefer an explicit announcement/closing date from the excerpt. If none, use the article byline / publish date visible in the excerpt (often "Month DD, YYYY" near the top) as YYYY-MM-DD. Only use null if no date can be read from the excerpt window for that source.

For each deal return:
- companyName, companyWebsite (or null)
- sector: one value from [${sectorList}] or null
- stage: EXACT title case — one of: Pre-Seed, Seed, Series A, Series B, Series C, Series D, Series E, Growth, or null. Never return lowercase (e.g. "seed" is invalid; use "Seed").
- investmentYear: 4-digit year or null
- investmentDate: ISO date string YYYY-MM-DD when possible (see rule 3)
- amount: number or null (USD millions, e.g. 5 for $5M)
- isLead: boolean or null
- coInvestors: string[] — other participants only (rule 2)
- sourceUrl: string (must be http(s) URL of the supporting source)
- confidence: 0-10 (only include deals you would score >=4 yourself; still output 0-10 scale)

Return JSON: { "deals": [ ... ] }`

  const user = `Fund / firm name: "${firmName}"\n\nSource material:\n${rawSources.slice(0, 120_000)}`

  const raw = await openrouterGenerateJson<unknown>({
    system,
    user,
    temperature: 0.15,
    useVcPipeline: true,
    retryOnParseError: true,
  })

  const parsed = portfolioExtractSchema.safeParse(raw)
  if (!parsed.success) {
    if (verbose) console.warn('[ENRICH] Portfolio extraction Zod warnings:', parsed.error.flatten())
    return []
  }

  const filtered = filterAndNormalizeDeals(parsed.data.deals as PortfolioDealExtract[])
  return postProcessPortfolioDeals(filtered, firmName, rawSources)
}

function computeLastDealDate(deals: CleanPortfolioDeal[]): Date | null {
  if (deals.length === 0) return null
  const dated = deals.map((d) => d.investmentDate).filter((x): x is Date => x != null)
  if (dated.length) {
    return new Date(Math.max(...dated.map((t) => t.getTime())))
  }
  const years = deals.map((d) => d.investmentYear).filter((y): y is number => y != null && y >= 2020)
  if (!years.length) return null
  const maxY = Math.max(...years)
  // Placeholder when only year is known (no dated deals): mid-year avoids Dec 31 end-of-year noise in UIs.
  return new Date(Date.UTC(maxY, 5, 15, 12, 0, 0, 0))
}

/** Profile / hero thesis is "weak" when empty or only a short tagline — safe to replace with firmSummary. */
export function isThesisWeakForEnrichment(thesis: string | null | undefined): boolean {
  const t = thesis?.trim() ?? ''
  return t.length === 0 || t.length < 120
}

function formatDealAmountForCache(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return ''
  if (amount >= 1) {
    const rounded = Math.abs(amount % 1) < 0.05 ? amount.toFixed(0) : amount.toFixed(1)
    return `$${rounded}M`
  }
  return `$${Math.round(amount * 1000)}K`
}

/** Shape matches public profile `recentDeals` consumption (`name`, `date`, `amount`). */
export function buildRecentDealsForEnrichmentCache(deals: CleanPortfolioDeal[]): Array<{
  name?: string
  date?: string
  amount?: string
}> {
  const sorted = [...deals].sort((a, b) => {
    const ya = a.investmentYear ?? 0
    const yb = b.investmentYear ?? 0
    if (ya !== yb) return yb - ya
    const ta = a.investmentDate?.getTime() ?? 0
    const tb = b.investmentDate?.getTime() ?? 0
    return tb - ta
  })
  return sorted.slice(0, 12).map((d) => {
    const date =
      d.investmentDate != null
        ? d.investmentDate.toISOString().slice(0, 10)
        : d.investmentYear != null
          ? String(d.investmentYear)
          : undefined
    const amt =
      d.amount != null && Number.isFinite(d.amount) && d.amount > 0 ? formatDealAmountForCache(d.amount) : undefined
    return {
      name: d.companyName,
      date,
      amount: amt,
    }
  })
}

export type PersistEnrichmentInput = {
  investorId: string
  firm: FirmEnrichmentFields
  deals: CleanPortfolioDeal[]
}

export type PersistEnrichmentResult = {
  investor: Investor & { portfolioCompanies: InvestorPortfolioCompany[] }
  skipped: boolean
  sectorsUpdated: boolean
}

export async function persistEnrichment(input: PersistEnrichmentInput): Promise<PersistEnrichmentResult> {
  const { investorId, firm, deals } = input

  const lastDealDate = computeLastDealDate(deals)

  const partnerNamesJson =
    firm.partnerNames.length > 0 ? JSON.stringify(firm.partnerNames) : null

  const sectorsConfidenceOk = firm.confidence.sectors >= 6
  const newSectorsJson =
    sectorsConfidenceOk && firm.sectors.length > 0 ? JSON.stringify(firm.sectors) : null

  const existing = await db.investor.findUnique({
    where: { id: investorId },
    select: {
      foundedYear: true,
      partnerNames: true,
      activelyInvesting: true,
      lastDealDate: true,
      sectors: true,
      thesis: true,
      enrichmentCache: { select: { snapshot: true, recentDeals: true } },
    },
  })
  if (!existing) throw new Error(`Investor not found: ${investorId}`)

  /** Only replace relational portfolio when this run produced ≥1 deal; do not wipe on sector-only updates. */
  const shouldRewritePortfolioRows = deals.length > 0

  const firmSummaryTrim = (firm.firmSummary ?? '').trim().slice(0, 350)

  const recentDealsJson =
    deals.length > 0 ? JSON.stringify(buildRecentDealsForEnrichmentCache(deals)) : null

  const snapExisting = existing.enrichmentCache?.snapshot ?? ''
  const dealsExisting = existing.enrichmentCache?.recentDeals ?? '[]'
  const hasCacheRow = Boolean(existing.enrichmentCache)
  const snapshotToPersist = firmSummaryTrim.length > 0 ? firmSummaryTrim : null
  const snapshotChanged = snapshotToPersist !== null && snapshotToPersist !== snapExisting
  /** Keep Investor.thesis aligned with cache snapshot when snapshot updates, so APIs/UI never show two divergent mandates. */
  const thesisShouldSync =
    firmSummaryTrim.length > 0 &&
    (isThesisWeakForEnrichment(existing.thesis) || snapshotChanged)
  const dealsChanged = recentDealsJson !== null && recentDealsJson !== dealsExisting
  const cacheCreate = !hasCacheRow && (snapshotToPersist !== null || recentDealsJson !== null)
  const cacheNeedsWrite = snapshotChanged || dealsChanged || cacheCreate

  const scalarPatch: Prisma.InvestorUpdateInput = {
    foundedYear: firm.foundedYear ?? null,
    partnerNames: partnerNamesJson,
  }
  if (deals.length > 0) {
    scalarPatch.lastDealDate = lastDealDate
  }

  if (firm.activelyInvesting !== null && firm.activelyInvesting !== undefined) {
    scalarPatch.activelyInvesting = firm.activelyInvesting
  }

  if (newSectorsJson) {
    scalarPatch.sectors = newSectorsJson
  }

  if (thesisShouldSync) {
    scalarPatch.thesis = firmSummaryTrim
  }

  const sectorsUpdated = Boolean(newSectorsJson && newSectorsJson !== (existing.sectors || '[]'))

  const foundedChanged = (firm.foundedYear ?? null) !== (existing.foundedYear ?? null)
  const partnersChanged = (partnerNamesJson ?? null) !== (existing.partnerNames ?? null)
  const lastDealChanged =
    deals.length > 0 &&
    (lastDealDate?.getTime() ?? null) !== (existing.lastDealDate?.getTime() ?? null)
  const activeChanged =
    firm.activelyInvesting !== null &&
    firm.activelyInvesting !== undefined &&
    firm.activelyInvesting !== existing.activelyInvesting
  const thesisChanged =
    thesisShouldSync && (existing.thesis?.trim() ?? '') !== firmSummaryTrim

  const hasNetChange =
    shouldRewritePortfolioRows ||
    sectorsUpdated ||
    foundedChanged ||
    partnersChanged ||
    lastDealChanged ||
    activeChanged ||
    thesisChanged ||
    cacheNeedsWrite

  if (!hasNetChange) {
    const inv = await db.investor.findUnique({
      where: { id: investorId },
      include: { portfolioCompanies: true },
    })
    return { investor: inv!, skipped: true, sectorsUpdated: false }
  }

  const enrichedAt = new Date()

  const cacheUpdatePayload: {
    snapshot?: string
    recentDeals?: string
    lastUpdated: Date
    isConflict: boolean
  } = {
    lastUpdated: enrichedAt,
    isConflict: false,
  }
  if (snapshotToPersist !== null) {
    cacheUpdatePayload.snapshot = snapshotToPersist
  }
  if (recentDealsJson !== null) {
    cacheUpdatePayload.recentDeals = recentDealsJson
  }

  const cacheCreatePayload = {
    investorId,
    snapshot: snapshotToPersist ?? '',
    recentDeals: recentDealsJson ?? '[]',
    lastUpdated: enrichedAt,
    isConflict: false,
  }

  const investor = await db.$transaction(async (tx) => {
    if (shouldRewritePortfolioRows) {
      await tx.investorPortfolioCompany.deleteMany({ where: { investorId } })
      if (deals.length > 0) {
        await tx.investorPortfolioCompany.createMany({
          data: deals.map((d) => ({
            investorId,
            companyName: d.companyName,
            companyWebsite: d.companyWebsite,
            sector: d.sector,
            stage: d.stage,
            investmentYear: d.investmentYear,
            investmentDate: d.investmentDate,
            amount: d.amount,
            amountCurrency: 'USD',
            isLead: d.isLead,
            coInvestors: JSON.stringify(d.coInvestors),
            sourceUrl: d.sourceUrl,
            confidence: d.confidence,
          })),
        })
      }
    }

    const inv = await tx.investor.update({
      where: { id: investorId },
      data: {
        ...scalarPatch,
        enrichedAt,
        enrichmentVersion: { increment: 1 },
      },
      include: { portfolioCompanies: true },
    })

    if (cacheNeedsWrite) {
      await tx.vCEnrichmentCache.upsert({
        where: { investorId },
        create: cacheCreatePayload,
        update: cacheUpdatePayload,
      })
    }

    return inv
  })

  return { investor, skipped: false, sectorsUpdated }
}

export type EnrichInvestorByIdResult = {
  investor: Investor & { portfolioCompanies: InvestorPortfolioCompany[] }
  meta: FetchEnrichmentSourcesMeta
  firm: FirmEnrichmentFields
  deals: CleanPortfolioDeal[]
  skippedPersist: boolean
  sectorsUpdated: boolean
}

export type EnrichInvestorByIdOptions = {
  /** Routine [ENRICH] console logs during Exa + extraction. Default true. */
  verbose?: boolean
}

export async function enrichInvestorById(
  investorId: string,
  options?: EnrichInvestorByIdOptions,
): Promise<EnrichInvestorByIdResult> {
  const verbose = options?.verbose !== false
  if (!hasExaApiKey()) {
    throw new Error('Exa API keys missing (EXA_API_KEYS / EXA_API_KEY).')
  }
  if (!hasVcLlmConfigured()) {
    throw new Error('LLM not configured for VC pipeline (OPENROUTER_API_KEY or Ollama + VC_LLM_PROVIDER).')
  }

  await assertInvestorEnrichmentMigrated(db)

  const row = await db.investor.findUnique({
    where: { id: investorId },
    select: { id: true, firmName: true, websiteUrl: true, sectors: true },
  })
  if (!row) throw new Error(`Investor id not found: ${investorId}`)

  const { rawSources, meta } = await fetchEnrichmentSources(row.firmName, row.websiteUrl, { verbose })
  const firm = await extractEnrichedFields(row.firmName, rawSources, { verbose })
  const deals = await extractPortfolioCompanies(row.firmName, rawSources, { verbose })

  const persist = await persistEnrichment({
    investorId: row.id,
    firm,
    deals,
  })

  return {
    investor: persist.investor,
    meta,
    firm,
    deals,
    skippedPersist: persist.skipped,
    sectorsUpdated: persist.sectorsUpdated,
  }
}

export async function findInvestorIdsByFirmNameLoose(name: string): Promise<{ id: string; firmName: string }[]> {
  const q = name.trim()
  if (!q) return []
  return db.investor.findMany({
    where: { firmName: { contains: q, mode: 'insensitive' } },
    select: { id: true, firmName: true },
    take: 15,
    orderBy: { firmName: 'asc' },
  })
}
