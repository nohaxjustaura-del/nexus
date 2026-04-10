/**
 * ===============================================================================
 * MARKET INTELLIGENCE SERVICE
 * ===============================================================================
 *
 * Uses Exa Deep Search to build real-time market context around a founder's idea.
 * Four parallel searches paint a complete competitive picture:
 *
 *   1. SATURATION: who else is funded in this space right now?
 *   2. CATALYSTS: what macro shifts (regulation, tech breakthroughs) could help or hurt?
 *   3. GRAVEYARD: what already failed here, and why?
 *   4. INCUMBENTS: which established giants already own the customer relationship?
 *
 * The output is a structured text dossier consumed by the scoring LLM so it can
 * ground its analysis in real market data rather than training-set knowledge.
 */

import { exaQuotaErrorMessage } from "./exa-global-cooldown"
import { runExaWithKeyFailover } from "./exa-key-failover"
import { hasExaApiKey } from "./exa-keys"
import { logger } from "./logger"

function settledReasonMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message
  if (typeof reason === "object" && reason !== null && "message" in reason) {
    return String((reason as { message: unknown }).message)
  }
  return String(reason)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketSearchResult {
  title: string
  url: string
  date: string | null
  excerpt: string
}

export interface DeepMarketContext {
  saturation: MarketSearchResult[]
  catalysts: MarketSearchResult[]
  graveyard: MarketSearchResult[]
  incumbents: MarketSearchResult[]
  dossier: string
}

/** Used when Exa is unavailable or searches fail — keeps scoring pipeline usable. */
export function fallbackDeepMarketContext(domain: string, problem: string): DeepMarketContext {
  const dossier = [
    `=== MARKET INTELLIGENCE DOSSIER: ${domain} ===`,
    `Problem space: ${problem}`,
    "",
    "Live market search was unavailable; ground analysis in the pitch transcript and founder context.",
  ].join("\n")
  return {
    saturation: [],
    catalysts: [],
    graveyard: [],
    incumbents: [],
    dossier,
  }
}

/**
 * Same as getDeepMarketContext but never throws — returns fallback dossier on error or missing API key.
 */
export async function getDeepMarketContextSafe(
  domain: string,
  problem: string,
): Promise<DeepMarketContext> {
  try {
    return await getDeepMarketContext(domain, problem)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.warn("[MARKET-INTEL] Using fallback context:", msg)
    return fallbackDeepMarketContext(domain, problem)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateToSentences(text: string, maxSentences: number): string {
  if (!text) return ""
  const sentences = text.match(/[^.!?]+[.!?]+/g)
  if (!sentences) return text.slice(0, 400)
  return sentences.slice(0, maxSentences).join(" ").trim()
}

function cleanResults(
  results: Array<{
    title?: string | null
    url?: string | null
    publishedDate?: string | null
    text?: string | null
  }>
): MarketSearchResult[] {
  return results
    .filter((r) => r.title && r.text)
    .map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      date: r.publishedDate ?? null,
      excerpt: truncateToSentences(r.text ?? "", 4),
    }))
}

function buildSection(
  heading: string,
  results: MarketSearchResult[],
  emptyMsg: string,
): string {
  if (results.length === 0) return `${heading}\n${emptyMsg}\n`

  const bullets = results
    .map(
      (r, i) =>
        `  ${i + 1}. "${r.title}"${r.date ? ` (${r.date})` : ""}\n     ${r.excerpt}`,
    )
    .join("\n")

  return `${heading}\n${bullets}\n`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs 4 parallel Exa Deep Searches to build real-time market context.
 *
 * @param domain   The startup's sector / domain (e.g. "AI expense management for SMBs")
 * @param problem  The core problem the startup solves (used to sharpen queries)
 * @returns        Structured results + a single `dossier` string for the scoring LLM
 */
export async function getDeepMarketContext(
  domain: string,
  problem: string,
): Promise<DeepMarketContext> {
  if (!hasExaApiKey()) {
    throw new Error(
      "Exa is not configured. Set EXA_API_KEYS (or EXA_API_KEY) in .env — see lib/exa-keys.ts.",
    )
  }

  const saturationQuery =
    `Startups in ${domain} that raised Seed or Series A in 2025-2026. Focus on funding amounts and lead investors.`
  const catalystsQuery =
    `2026 regulatory changes and technological breakthroughs in ${domain}. Look for sovereign AI shifts and compute cost trends.`
  const graveyardQuery =
    `Failed startups or post-mortem reports in ${domain} from 2024-2026. Identify common points of failure.`
  const incumbentsQuery =
    `Market leaders and established giants in ${domain}. Focus on their 2026 AI roadmap, autonomous initiatives, and recent acquisitions.`

  logger.log(`[MARKET-INTEL] Launching 4 parallel Exa searches for domain="${domain}"`)

  const failover = await runExaWithKeyFailover(async (exa) => {
    const searchOpts = (
      query: string,
      category: "company" | "news" | "research paper",
    ) =>
      exa.search(query, {
        type: "auto",
        numResults: 3,
        category,
        contents: { text: { maxCharacters: 800 } },
      })

    const [saturationRes, catalystsRes, graveyardRes, incumbentsRes] = await Promise.allSettled([
      searchOpts(saturationQuery, "company"),
      searchOpts(catalystsQuery, "news"),
      searchOpts(graveyardQuery, "research paper"),
      searchOpts(incumbentsQuery, "company"),
    ])

    const saturation = saturationRes.status === "fulfilled"
      ? cleanResults(saturationRes.value.results)
      : []
    const catalysts = catalystsRes.status === "fulfilled"
      ? cleanResults(catalystsRes.value.results)
      : []
    const graveyard = graveyardRes.status === "fulfilled"
      ? cleanResults(graveyardRes.value.results)
      : []
    const incumbents = incumbentsRes.status === "fulfilled"
      ? cleanResults(incumbentsRes.value.results)
      : []

    if (saturationRes.status === "rejected") {
      logger.warn("[MARKET-INTEL] Saturation search failed:", saturationRes.reason?.message)
    }
    if (catalystsRes.status === "rejected") {
      logger.warn("[MARKET-INTEL] Catalysts search failed:", catalystsRes.reason?.message)
    }
    if (graveyardRes.status === "rejected") {
      logger.warn("[MARKET-INTEL] Graveyard search failed:", graveyardRes.reason?.message)
    }
    if (incumbentsRes.status === "rejected") {
      logger.warn("[MARKET-INTEL] Incumbents search failed:", incumbentsRes.reason?.message)
    }

    // Quota/rate-limit/auth on any parallel search must fail the whole key attempt so
    // runExaWithKeyFailover can advance through EXA_API_KEYS (otherwise allSettled would
    // return empty slices and we'd never try keys 2–7).
    const parallel = [saturationRes, catalystsRes, graveyardRes, incumbentsRes] as const
    for (const r of parallel) {
      if (r.status !== "rejected") continue
      const m = settledReasonMessage(r.reason)
      if (exaQuotaErrorMessage(m)) {
        throw new Error(m)
      }
    }

    return { saturation, catalysts, graveyard, incumbents }
  })

  if (!failover.ok) {
    if (failover.kind === "all_keys_quota") {
      throw new Error(failover.message || "Exa quota exhausted for all keys")
    }
    if (failover.kind === "cooldown") {
      throw new Error("Exa in cooldown")
    }
    if (failover.kind === "no_keys") {
      throw new Error("No Exa API keys configured")
    }
    throw new Error(failover.message || "Exa market intelligence search failed")
  }

  const { saturation, catalysts, graveyard, incumbents } = failover.data

  logger.log(
    `[MARKET-INTEL] Results: saturation ${saturation.length}, catalysts ${catalysts.length}, graveyard ${graveyard.length}, incumbents ${incumbents.length}`,
  )

  const dossier = [
    `=== MARKET INTELLIGENCE DOSSIER: ${domain} ===`,
    `Problem space: ${problem}`,
    "",
    buildSection(
      "SATURATION (recently funded competitors):",
      saturation,
      "No recent Seed/Series A rounds found in this space. That may indicate a white-space opportunity or a nascent market.",
    ),
    buildSection(
      "INCUMBENTS (established market leaders & Goliaths):",
      incumbents,
      "No dominant incumbents identified. The space may lack a clear market leader.",
    ),
    buildSection(
      "CATALYSTS (macro tailwinds & headwinds):",
      catalysts,
      "No recent regulatory or technology shifts found. Market conditions appear stable.",
    ),
    buildSection(
      "GRAVEYARD (failed predecessors & lessons):",
      graveyard,
      "No notable failures found in this space: either under-explored or a well-established market.",
    ),
  ].join("\n")

  return { saturation, catalysts, graveyard, incumbents, dossier }
}
