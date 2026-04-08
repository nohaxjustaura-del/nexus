/**
 * Second-pass LLM on top of Exa context: is this string a real capital provider / VC-style org,
 * or a headline, listicle, generic label, or wrong entity? Complements heuristic
 * isInvestorEligibleForWorkers / isLikelyRealFirmName with retrieval-grounded judgment.
 *
 * Env:
 *   VC_RESEARCH_ENTITY_GATE=off|observe|enforce
 *     off      — no extra LLM call (default for minimal cost)
 *     observe  — run classifier, log only, always continue enrichment
 *     enforce  — skip full extraction when model says should_run_full_extraction=false with high confidence
 *   VC_RESEARCH_ENTITY_SKIP_MIN_CONFIDENCE=0-100 (default 72) — enforce mode only
 *   VC_RESEARCH_ENTITY_CONTEXT_CHARS=max chars of Exa bundle passed to classifier (default 12000)
 *   VC_RESEARCH_AUTO_HIDE_BOGUS=1 — after classification, set isPublic=false & discoverable=false when
 *     the model indicates a bogus headline/non-fund (requires running the classifier: set ENTITY_GATE
 *     to observe/enforce OR enable auto-hide alone — see shouldRunVcEntityClassification).
 */

import { openrouterGenerateJson, hasVcLlmConfigured } from './openrouter'

export type VcEntityGateResult = {
  entity_kind:
    | 'venture_capital_firm'
    | 'accelerator'
    | 'micro_vc'
    | 'angel_group'
    | 'cvc'
    | 'family_office'
    | 'other_capital_provider'
    | 'not_a_capital_provider'
    | 'unclear'
  name_kind: 'legitimate_firm_name' | 'headline_or_article_title' | 'generic_fragment' | 'ambiguous'
  /** 0–100 model confidence in this classification */
  confidence: number
  /** If false, snippets describe a non-fund, wrong entity, or junk title — do not waste full extraction */
  should_run_full_extraction: boolean
  /** When the input name is wrong but snippets point to a real fund, optional better label */
  canonical_name_hint: string | null
  rationale_one_line: string
}

function contextChars(): number {
  const n = parseInt(process.env.VC_RESEARCH_ENTITY_CONTEXT_CHARS || '12000', 10)
  return Math.min(20000, Math.max(2000, Number.isFinite(n) && n > 0 ? n : 12000))
}

export function getVcResearchEntityGateMode(): 'off' | 'observe' | 'enforce' {
  const raw = (process.env.VC_RESEARCH_ENTITY_GATE || 'off').trim().toLowerCase()
  if (raw === 'observe' || raw === 'log') return 'observe'
  if (raw === 'enforce' || raw === 'strict' || raw === 'skip') return 'enforce'
  return 'off'
}

export function getVcResearchEntitySkipMinConfidence(): number {
  const n = parseInt(process.env.VC_RESEARCH_ENTITY_SKIP_MIN_CONFIDENCE || '72', 10)
  return Math.min(100, Math.max(50, Number.isFinite(n) && n > 0 ? n : 72))
}

/** When true, run Exa+LLM entity classification even if VC_RESEARCH_ENTITY_GATE=off (for auto-hide only). */
export function getVcResearchAutoHideBogus(): boolean {
  const raw = process.env.VC_RESEARCH_AUTO_HIDE_BOGUS?.trim().toLowerCase()
  if (raw === '1' || raw === 'true' || raw === 'yes') return true
  return false
}

/** True if we should call the entity classifier (gate logging/enforce OR auto-hide on bogus). */
export function shouldRunVcEntityClassification(): boolean {
  return getVcResearchEntityGateMode() !== 'off' || getVcResearchAutoHideBogus()
}

/**
 * Strong signal to remove a public listing: junk name or not a fund, with high confidence.
 * Used with VC_RESEARCH_AUTO_HIDE_BOGUS after classifyVcEntityFromExaContext.
 */
export function entityGateIndicatesBogusPublicListing(gate: VcEntityGateResult): boolean {
  const minC = getVcResearchEntitySkipMinConfidence()
  if (gate.confidence < minC) return false
  if (gate.should_run_full_extraction) return false
  if (gate.name_kind === 'headline_or_article_title' || gate.name_kind === 'generic_fragment') {
    return true
  }
  if (gate.entity_kind === 'not_a_capital_provider') return true
  return false
}

/**
 * Classify whether enrichment should run. Returns null if classification skipped, no LLM, or context too thin.
 */
export async function classifyVcEntityFromExaContext(
  firmName: string,
  mergedExaContext: string,
  exaTotalResults: number,
): Promise<VcEntityGateResult | null> {
  if (!shouldRunVcEntityClassification()) return null

  if (!hasVcLlmConfigured()) {
    return null
  }

  if (exaTotalResults < 1 || mergedExaContext.trim().length < 400) {
    return null
  }

  const cap = contextChars()
  const exaText = mergedExaContext.slice(0, cap)

  const raw = await openrouterGenerateJson<VcEntityGateResult>({
    system: `You are a senior venture-data analyst. Given a PROPOSED firm name and web search excerpts (Exa), decide whether this is a real, identifiable capital provider worth a structured VC profile (venture fund, micro-VC, accelerator with fund, CVC arm, notable angel group, family office that invests in startups, etc.) versus junk.

Name assessment (name_kind):
- legitimate_firm_name: a plausible fund/brand name used in the wild
- headline_or_article_title: reads like a news headline, blog title, listicle ("Top 10…"), podcast, or sentence—not a firm name
- generic_fragment: "Biotech VC", "Seed Fund", asset-class soup, or placeholder
- ambiguous: mixed signals

Entity (entity_kind): pick the best fit; use not_a_capital_provider if excerpts are clearly about something else (e.g. a product, unrelated company, or no such fund).

should_run_full_extraction:
- true if enriching a DB row for this name is sensible (real org or strong match to a named fund in excerpts)
- false if the name is bogus/headline OR excerpts show no such fund OR only irrelevant hits

confidence: 0–100 your confidence in should_run_full_extraction and name_kind.

canonical_name_hint: if the input name is wrong but excerpts clearly name one fund, give that exact name; else null.

Return ONE JSON object with keys exactly:
entity_kind, name_kind, confidence (number), should_run_full_extraction (boolean), canonical_name_hint (string or null), rationale_one_line (string, max 200 chars).`,
    user: `Proposed firm name (from our database or ingest): "${firmName}"

WEB EXCERPTS (may be incomplete or noisy; cite only what supports your judgment):
${exaText}`,
    temperature: 0.1,
    maxTokens: 700,
    retryOnParseError: true,
    useVcPipeline: true,
  })

  const confidence = Math.min(100, Math.max(0, Math.round(Number(raw.confidence) || 0)))
  return {
    entity_kind: raw.entity_kind ?? 'unclear',
    name_kind: raw.name_kind ?? 'ambiguous',
    confidence,
    should_run_full_extraction: !!raw.should_run_full_extraction,
    canonical_name_hint:
      typeof raw.canonical_name_hint === 'string' && raw.canonical_name_hint.trim()
        ? raw.canonical_name_hint.trim().slice(0, 200)
        : null,
    rationale_one_line: String(raw.rationale_one_line || '').slice(0, 280),
  }
}
