/**
 * VC firm research retrieval: two parallel Exa searches (different angles) + merged passages.
 * LLM (OpenRouter or local Ollama) consumes merged text in auto-research-vcs (extraction only). Tavily is not used here.
 */

import Exa from 'exa-js'
import { hasOpenRouterKey } from '@/lib/openrouter'

export type VcResearchRetrievalSnapshot = {
  mergedContext: string
  sources: string[]
  /** Total Exa results across both passes */
  exaTotalResults: number
  /** How many passes returned at least one hit (0–2) */
  exaPassesWithHits: number
}

export function getVcResearchPipelineEnvStatus(): {
  exa: boolean
  /** True when OpenRouter or Ollama is configured for JSON extraction */
  openrouter: boolean
} {
  return {
    exa: !!process.env.EXA_API_KEY?.trim(),
    openrouter: hasOpenRouterKey(),
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
  const since = process.env.VC_RESEARCH_EXA_SINCE?.trim()
  const searchOpts = {
    type: 'auto' as const,
    numResults,
    contents: { text: { maxCharacters: 2600 } },
    ...(since && /^\d{4}-\d{2}-\d{2}$/.test(since) ? { startPublishedDate: since } : {}),
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
        return `[exa ${i + 1}: ${title}]\n${r.url}\n${body.slice(0, 2600)}`
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
 * Two parallel Exa queries per firm (thesis/portfolio vs deals/fundraise) for broader coverage.
 */
export async function gatherVCFirmRetrievalContext(
  firmName: string,
): Promise<VcResearchRetrievalSnapshot | null> {
  if (!process.env.EXA_API_KEY?.trim()) {
    console.error('[VC-RETRIEVAL] Set EXA_API_KEY (Tavily disabled for VC research).')
    return null
  }

  const year = new Date().getFullYear()
  const n = Math.min(
    15,
    Math.max(4, parseInt(process.env.VC_RESEARCH_EXA_NUM_RESULTS || '8', 10) || 8),
  )

  const q1 = `"${firmName}" venture capital investment focus thesis sectors stages geography mandate strategy ${year}`
  const q2 = `"${firmName}" VC fund portfolio companies recent investments fundraising ${year}`

  const [pass1, pass2] = await Promise.all([exaSearchPass(q1, n), exaSearchPass(q2, n)])

  console.log(
    `[VC-RETRIEVAL] Exa dual: pass1 ${pass1.resultCount} hit(s), ${pass1.textBlock.length} chars | pass2 ${pass2.resultCount} hit(s), ${pass2.textBlock.length} chars`,
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
  const sources = [...urlSet]

  const chunks: string[] = []
  if (pass1.textBlock.trim()) chunks.push(`--- Exa pass 1 (thesis / fund profile) ---\n${pass1.textBlock.trim()}`)
  if (pass2.textBlock.trim()) chunks.push(`--- Exa pass 2 (deals / fundraising) ---\n${pass2.textBlock.trim()}`)

  const mergedContext = chunks.join('\n\n')
  const passesWithHits = (pass1.resultCount > 0 ? 1 : 0) + (pass2.resultCount > 0 ? 1 : 0)
  const totalResults = pass1.resultCount + pass2.resultCount

  if (mergedContext.trim().length < 120) {
    console.warn(`[VC-RETRIEVAL] Insufficient text for "${firmName}" (exa hits: ${totalResults}).`)
    return null
  }

  if (passesWithHits < 2) {
    console.warn(
      `[VC-RETRIEVAL] Only ${passesWithHits}/2 Exa passes returned results for "${firmName}".`,
    )
  }

  return {
    mergedContext,
    sources,
    exaTotalResults: totalResults,
    exaPassesWithHits: passesWithHits,
  }
}
