/**
 * Investor research retrieval: parallel Exa searches (mandate, deal flow, non-VC capital shapes) + merged passages.
 * Covers VCs, angels, accelerators, CVC, family offices, grants, syndicates, etc. LLM consumes this in auto-research-vcs.
 */

import Exa from 'exa-js'
import { hasOpenRouterKey, hasVcLlmConfigured, getVcLlmBackend, isOllamaVcConfigured } from '@/lib/openrouter'

export type VcResearchRetrievalSnapshot = {
  mergedContext: string
  sources: string[]
  /** Total Exa results across both passes */
  exaTotalResults: number
  /** How many passes returned at least one hit (0–3) */
  exaPassesWithHits: number
}

export function getVcResearchPipelineEnvStatus(): {
  exa: boolean
  /** OpenRouter API key present */
  openrouter: boolean
  /** Ollama URL + model present for VC pipeline */
  ollama: boolean
  /** Either backend usable for investor JSON extraction */
  llm: boolean
  /** Active backend for `useVcPipeline` JSON (openrouter if key unless forced ollama) */
  vcLlmBackend: 'openrouter' | 'ollama' | 'none'
} {
  const exa = !!process.env.EXA_API_KEY?.trim()
  const or = hasOpenRouterKey()
  const om = isOllamaVcConfigured()
  const llm = hasVcLlmConfigured()
  const vcLlmBackend: 'openrouter' | 'ollama' | 'none' = llm ? getVcLlmBackend() : 'none'
  return { exa, openrouter: or, ollama: om, llm, vcLlmBackend }
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

/** Max chars per Exa snippet (default 3800 for richer extraction). */
function researchExaMaxChars(): number {
  const raw = parseInt(process.env.VC_RESEARCH_EXA_MAX_CHARS || '3800', 10)
  return Math.min(12000, Math.max(1200, Number.isFinite(raw) ? raw : 3800))
}

/**
 * Optional recency floor for research passes. Priority:
 * 1) VC_RESEARCH_EXA_SINCE=YYYY-MM-DD (fixed)
 * 2) VC_RESEARCH_EXA_RECENCY_DAYS=N (rolling, N>0); N=0 or unset = no date filter (widest corpus)
 */
export function getVcResearchStartPublishedDate(): string | undefined {
  const fixed = process.env.VC_RESEARCH_EXA_SINCE?.trim()
  if (fixed && /^\d{4}-\d{2}-\d{2}$/.test(fixed)) return fixed
  const daysRaw = process.env.VC_RESEARCH_EXA_RECENCY_DAYS?.trim()
  if (daysRaw === undefined || daysRaw === '') return undefined
  const days = parseInt(daysRaw, 10)
  if (!Number.isFinite(days) || days <= 0) return undefined
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

async function exaSearchPass(query: string, numResults: number): Promise<{
  textBlock: string
  urls: string[]
  resultCount: number
}> {
  const key = process.env.EXA_API_KEY?.trim()
  if (!key) {
    return { textBlock: '', urls: [], resultCount: 0 }
  }

  const exa = new Exa(key)
  const since = getVcResearchStartPublishedDate()
  const maxC = researchExaMaxChars()
  const searchOpts = {
    type: 'auto' as const,
    numResults,
    contents: { text: { maxCharacters: maxC } },
    ...(since ? { startPublishedDate: since } : {}),
  }

  try {
    const res = await exa.search(query, searchOpts as Parameters<Exa['search']>[1])
    const results = res.results ?? []
    const urls = results
      .map((r) => r.url)
      .filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u))
    const textBlock = results
      .map((r, i) => {
        const title = r.title ?? 'Untitled'
        const body = (typeof r.text === 'string' ? r.text : '') || ''
        return `[exa ${i + 1}: ${title}]\n${r.url}\n${body.slice(0, maxC)}`
      })
      .join('\n\n')
    return { textBlock, urls, resultCount: results.length }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[VC-RETRIEVAL] Exa search failed:', msg)
    if (/402|403|429|quota|credit|limit|exceeded|payment|unauthor/i.test(msg)) {
      console.warn('[VC-RETRIEVAL] Check EXA_API_KEY and Exa quota (https://exa.ai).')
    }
    return { textBlock: '', urls: [], resultCount: 0 }
  }
}

/**
 * Three parallel Exa queries per firm: mandate, deal flow / capital activity, and non-VC shapes (accelerator, angel, FO, grants).
 */
export async function gatherVCFirmRetrievalContext(
  firmName: string,
): Promise<VcResearchRetrievalSnapshot | null> {
  if (!process.env.EXA_API_KEY?.trim()) {
    console.error('[VC-RETRIEVAL] Set EXA_API_KEY (Tavily disabled for VC research).')
    return null
  }

  const year = new Date().getFullYear()
  const prevYear = year - 1
  const n = Math.min(
    15,
    Math.max(4, parseInt(process.env.VC_RESEARCH_EXA_NUM_RESULTS || '8', 10) || 8),
  )
  /** ~same total hit budget as legacy 2×n, spread across three angles */
  const perPass = Math.max(3, Math.min(8, Math.ceil((n * 2) / 3)))

  const q1 = `"${firmName}" investment mandate thesis sectors stages geography strategy focus LP institutional ${year}`
  const q2 = `"${firmName}" portfolio companies funding round investment deal lead co-invest SPV syndicate ${year} ${prevYear}`
  const q3 = `"${firmName}" accelerator incubator cohort program application OR angel network syndicate OR family office venture OR corporate venture CVC OR grant nonprofit foundation funding ${year}`

  const [pass1, pass2, pass3] = await Promise.all([
    exaSearchPass(q1, perPass),
    exaSearchPass(q2, perPass),
    exaSearchPass(q3, perPass),
  ])

  const recency = getVcResearchStartPublishedDate()
  console.log(
    `[VC-RETRIEVAL] Exa triple (published≥${recency ?? 'any'}): p1 ${pass1.resultCount} hits / ${pass1.textBlock.length} ch | p2 ${pass2.resultCount} / ${pass2.textBlock.length} | p3 ${pass3.resultCount} / ${pass3.textBlock.length}`,
  )

  const urlSet = new Set<string>()
  for (const u of pass1.urls) {
    const x = normalizeHttpUrl(u)
    if (x) urlSet.add(x)
  }
  for (const u of pass2.urls) {
    const x = normalizeHttpUrl(u)
    if (x) urlSet.add(x)
  }
  for (const u of pass3.urls) {
    const x = normalizeHttpUrl(u)
    if (x) urlSet.add(x)
  }
  const sources = [...urlSet]

  const chunks: string[] = []
  if (pass1.textBlock.trim()) {
    chunks.push(`--- Exa pass 1 (mandate / thesis / fund profile) ---\n${pass1.textBlock.trim()}`)
  }
  if (pass2.textBlock.trim()) {
    chunks.push(`--- Exa pass 2 (deals / rounds / co-invest / activity) ---\n${pass2.textBlock.trim()}`)
  }
  if (pass3.textBlock.trim()) {
    chunks.push(
      `--- Exa pass 3 (accelerator / angel / family office / CVC / grants / programs) ---\n${pass3.textBlock.trim()}`,
    )
  }

  const mergedContext = chunks.join('\n\n')
  const passesWithHits =
    (pass1.resultCount > 0 ? 1 : 0) + (pass2.resultCount > 0 ? 1 : 0) + (pass3.resultCount > 0 ? 1 : 0)
  const totalResults = pass1.resultCount + pass2.resultCount + pass3.resultCount

  if (mergedContext.trim().length < 120) {
    console.warn(`[VC-RETRIEVAL] Insufficient text for "${firmName}" (exa hits: ${totalResults}).`)
    return null
  }

  if (passesWithHits < 2) {
    console.warn(
      `[VC-RETRIEVAL] Only ${passesWithHits}/3 Exa passes returned results for "${firmName}".`,
    )
  }

  return {
    mergedContext,
    sources,
    exaTotalResults: totalResults,
    exaPassesWithHits: passesWithHits,
  }
}
