/**
 * ===============================================================================
 * EXA ENRICHMENT — VC MATCHING PIPELINE v3
 * ===============================================================================
 *
 * Replaces getLiveInvestorPulse() from lib/exa-service.ts *for the matching
 * pipeline only*. The original function remains untouched for other callsites.
 *
 * Exports:
 *   ExaClient           — re-exported type alias for Exa instance
 *   createExaClient()   — first resolved key from getExaApiKeys() (optional; bundles use failover internally)
 *   fetchAllVCBundles() — batch fetcher with 10 QPS rate-limit enforcement
 *
 * Rate-limit contract:
 *   Exa allows 10 queries/second. Each VC = 3 queries.
 *   Batch size = 3 VCs × 3 queries = 9 queries per batch (safely under limit).
 *   1 200 ms delay between batches gives a comfortable margin.
 */

import Exa from 'exa-js'
import { runExaWithKeyFailover } from '@/lib/exa-key-failover'
import { getExaApiKeys } from '@/lib/exa-keys'
import { logger } from '@/lib/logger'
import type { EnrichedExaSnippet, FounderMatchSignal, VCExaBundle, VCProfile } from './types'

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

/** Opaque type alias so callers don't need to import exa-js directly. */
export type ExaClient = Exa

export function createExaClient(): ExaClient {
  const keys = getExaApiKeys()
  if (!keys.length) {
    throw new Error(
      'Exa is not configured. Set EXA_API_KEYS (or EXA_API_KEY) in .env.local — see lib/exa-keys.ts.',
    )
  }
  return new Exa(keys[0]!)
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const EXA_BATCH_SIZE = 3           // VCs per parallel batch (3 × 3 = 9 queries)
const EXA_BATCH_DELAY_MS = 1_200   // ms between batches (10 QPS margin)
const EXA_NUM_RESULTS = 5          // results per query
const EXA_MAX_CHARS = 600          // slightly more than the 500 in getLiveInvestorPulse

// ---------------------------------------------------------------------------
// PART 1 — Query Builder
// ---------------------------------------------------------------------------

/**
 * Builds the 3 complementary Exa search queries for a single VC.
 *
 * Q1 — Revealed thesis   : what they've actually funded (behavior)
 * Q2 — Stated conviction : what they say they care about (words)
 * Q3 — Founder-specific  : activity in this exact sector + stage
 */
function buildVCQueries(
  vc: VCProfile,
  founder: FounderMatchSignal,
): { q1: string; q2: string; q3: string } {
  const firmName = vc.firmName
  const fundType = (vc.fundType ?? '').toLowerCase()

  // Q1 — revealed thesis
  let q1: string
  if (fundType.includes('accelerator') || fundType.includes('fellowship') || fundType.includes('program')) {
    q1 = `"${firmName}" (cohort OR batch OR "demo day" OR "accepted" OR "portfolio")`
  } else if (fundType.includes('angel')) {
    q1 = `"${firmName}" (investment OR "backed" OR "angel round" OR "wrote a check")`
  } else {
    q1 = `"${firmName}" (investment OR "led the round" OR "portfolio company" OR "backed" OR "seed round" OR "Series A")`
  }

  // Q2 — stated conviction
  const q2 = `"${firmName}" (thesis OR "why we invest" OR "what we look for" OR "investment memo" OR "our focus" OR "we believe")`

  // Q3 — founder-specific (sector + stage activity)
  const q3 = `"${firmName}" ${founder.primarySector} ${founder.stage} (investment OR portfolio OR thesis OR "looking for")`

  return { q1, q2, q3 }
}

// ---------------------------------------------------------------------------
// PART 2 — Date Parser
// ---------------------------------------------------------------------------

/**
 * Converts a raw publishedDate string from Exa into months-ago (float).
 * Returns null when the date cannot be parsed or is absent.
 */
export function parseMonthsAgo(publishedDate: string | null): number | null {
  if (!publishedDate) return null

  const now = Date.now()
  const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44

  const raw = publishedDate.trim().toLowerCase()

  // ── Relative strings ────────────────────────────────────────────────────
  if (raw === 'yesterday') return 0
  if (raw === 'last week' || raw === 'a week ago') return 0.25
  if (raw === 'last month' || raw === 'a month ago') return 1
  if (raw === 'this year' || raw === 'this year.') return 6   // conservative middle

  // ── Quarter strings: "Q1 2025", "q3 2024" ──────────────────────────────
  const quarterMatch = raw.match(/^q([1-4])\s+(\d{4})$/)
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1], 10)
    const year = parseInt(quarterMatch[2], 10)
    // Middle of each quarter: Q1→Feb 15, Q2→May 15, Q3→Aug 15, Q4→Nov 15
    const midMonth = [1, 4, 7, 10][quarter - 1]  // 0-indexed months
    const d = new Date(year, midMonth, 15)
    if (!isNaN(d.getTime())) {
      return Math.max(0, (now - d.getTime()) / MS_PER_MONTH)
    }
  }

  // ── ISO date "2025-01-15" or "2025-01" ──────────────────────────────────
  // Also handles "January 2025", "Jan 2025" via Date.parse
  const parsed = Date.parse(publishedDate)   // use original casing for month names
  if (!isNaN(parsed)) {
    return Math.max(0, (now - parsed) / MS_PER_MONTH)
  }

  // ── "Month YYYY" with various formats not caught by Date.parse ───────────
  const monthYearMatch = publishedDate.match(/([A-Za-z]+)\s+(\d{4})/)
  if (monthYearMatch) {
    const attempt = Date.parse(`${monthYearMatch[1]} 1 ${monthYearMatch[2]}`)
    if (!isNaN(attempt)) {
      return Math.max(0, (now - attempt) / MS_PER_MONTH)
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns an ISO date string `n` months before today. */
function monthsAgoISO(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().split('T')[0]
}

/** Extracts the first `maxSentences` sentences from a block of text. */
function truncateToSentences(text: string, maxSentences: number): string {
  if (!text) return ''
  const sentences = text.match(/[^.!?]+[.!?]+/g)
  if (!sentences) return text.slice(0, 300)
  return sentences.slice(0, maxSentences).join(' ').trim()
}

// Exa raw result shape (exa-js doesn't export this type directly)
interface RawExaResult {
  title?: string | null
  publishedDate?: string | null
  text?: string | null
  url?: string | null
}

/** Cleans raw Exa results into EnrichedExaSnippets with the given queryType. */
function cleanToSnippets(
  results: RawExaResult[],
  queryType: EnrichedExaSnippet['queryType'],
): EnrichedExaSnippet[] {
  return results
    .filter((r) => r.title)
    .map((r) => ({
      title: r.title ?? '',
      snippet: truncateToSentences(r.text ?? '', 2),
      publishedDate: r.publishedDate ?? null,
      monthsAgo: parseMonthsAgo(r.publishedDate ?? null),
      queryType,
      url: r.url ?? '',
    }))
}

/** Returns an empty VCExaBundle for error-path returns. */
function emptyBundle(vc: VCProfile): VCExaBundle {
  return {
    vcId: vc.id,
    vcName: vc.firmName,
    revealedThesis: [],
    statedConviction: [],
    founderSpecific: [],
    fetchedAt: new Date(),
    totalSnippets: 0,
  }
}

// ---------------------------------------------------------------------------
// PART 3 — Single VC Fetcher
// ---------------------------------------------------------------------------

/**
 * Fetches all 3 Exa query bundles for a single VC.
 * Never throws — always returns a VCExaBundle (possibly empty on full failure).
 */
export async function fetchVCExaBundle(
  vc: VCProfile,
  founder: FounderMatchSignal,
): Promise<VCExaBundle> {
  const t0 = Date.now()
  const { q1, q2, q3 } = buildVCQueries(vc, founder)

  const sixMonthsAgo = monthsAgoISO(6)
  const twelveMonthsAgo = monthsAgoISO(12)

  const failover = await runExaWithKeyFailover(async (exaClient) => {
    const [r1, r2, r3] = await Promise.all([
      exaClient
        .search(q1, {
          type: 'auto',
          numResults: EXA_NUM_RESULTS,
          startPublishedDate: sixMonthsAgo,
          contents: { text: { maxCharacters: EXA_MAX_CHARS } },
        })
        .then((res) => cleanToSnippets(res.results as RawExaResult[], 'revealed_thesis')),
      exaClient
        .search(q2, {
          type: 'auto',
          numResults: EXA_NUM_RESULTS,
          startPublishedDate: twelveMonthsAgo,
          contents: { text: { maxCharacters: EXA_MAX_CHARS } },
        })
        .then((res) => cleanToSnippets(res.results as RawExaResult[], 'stated_conviction')),
      exaClient
        .search(q3, {
          type: 'auto',
          numResults: EXA_NUM_RESULTS,
          startPublishedDate: sixMonthsAgo,
          contents: { text: { maxCharacters: EXA_MAX_CHARS } },
        })
        .then((res) => cleanToSnippets(res.results as RawExaResult[], 'founder_specific')),
    ])
    return { r1, r2, r3 }
  })

  if (!failover.ok) {
    return emptyBundle(vc)
  }

  const { r1, r2, r3 } = failover.data
  const totalSnippets = r1.length + r2.length + r3.length
  const ms = Date.now() - t0
  logger.integration('[EXA] bundle ok', {
    firm: vc.firmName,
    ms,
    thesis: r1.length,
    stated: r2.length,
    founder_specific: r3.length,
    total: totalSnippets,
  })

  return {
    vcId: vc.id,
    vcName: vc.firmName,
    revealedThesis: r1,
    statedConviction: r2,
    founderSpecific: r3,
    fetchedAt: new Date(),
    totalSnippets,
  }
}

// ---------------------------------------------------------------------------
// PART 4 — Batch Fetcher with Rate Limiting
// ---------------------------------------------------------------------------

/**
 * Fetches Exa bundles for all VCs in the pool, enforcing the 10 QPS limit.
 *
 * Batches of 3 VCs fire in parallel (3 × 3 = 9 queries per batch).
 * A 1 200 ms delay is enforced between batches.
 *
 * `onVCComplete` fires immediately when each individual VC's fetch resolves —
 * this lets the orchestrator kick off Gemini gate reasoning for that VC
 * without waiting for the rest of the batch to finish.
 *
 * Returns a Map<vcId → VCExaBundle> when all batches are done.
 */
export async function fetchAllVCBundles(
  vcs: VCProfile[],
  founder: FounderMatchSignal,
  onVCComplete?: (vcId: string, bundle: VCExaBundle) => void,
): Promise<Map<string, VCExaBundle>> {
  const results = new Map<string, VCExaBundle>()

  for (let i = 0; i < vcs.length; i += EXA_BATCH_SIZE) {
    const batch = vcs.slice(i, i + EXA_BATCH_SIZE)
    const isLastBatch = i + EXA_BATCH_SIZE >= vcs.length

    // Within a batch, fire all fetches simultaneously. Each VC's .then()
    // fires onVCComplete as soon as that individual VC resolves — the
    // orchestrator can start Gemini work immediately for that VC.
    await Promise.all(
      batch.map((vc) =>
        fetchVCExaBundle(vc, founder)
          .catch((): VCExaBundle => emptyBundle(vc))   // safety net — fetchVCExaBundle never throws but belt+suspenders
          .then((bundle) => {
            results.set(vc.id, bundle)
            onVCComplete?.(vc.id, bundle)
          }),
      ),
    )

    // Delay between batches to stay inside the 10 QPS rate limit.
    // Skip the delay after the final batch since there's nothing following it.
    if (!isLastBatch) {
      await new Promise<void>((resolve) => setTimeout(resolve, EXA_BATCH_DELAY_MS))
    }
  }

  return results
}
