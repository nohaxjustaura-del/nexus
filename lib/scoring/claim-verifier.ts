/**
 * ===============================================================================
 * SCORING PIPELINE — STEP 1.5: CLAIM VERIFIER
 * ===============================================================================
 *
 * Cross-references founder-stated claims against Exa market intelligence data.
 * Runs after fact extraction (needs VerifiedFacts) and in parallel with the
 * vagueness auditor (both feed into Phase 2).
 *
 * Uses a single LLM call to compare claims against external evidence.
 * Output feeds into criterion scorer and adversarial bear as additional context.
 *
 * Model: OpenRouter scoring model, temperature 0.1
 */

import { openrouterGenerateJson } from "../openrouter"
import { logger } from "../logger"
import type { VerifiedFacts, MarketIntelligenceData } from "./types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClaimStatus = 'verified' | 'unverified' | 'contradicted' | 'not_checkable'

export interface ClaimVerification {
  claim: string
  status: ClaimStatus
  evidence: string
}

export interface ClaimVerificationResult {
  marketSizeClaim: ClaimVerification | null
  competitorClaim: ClaimVerification | null
  tractionClaim: ClaimVerification | null
  moatClaim: ClaimVerification | null
  missedCompetitors: string[]
  overallCredibility: 'high' | 'medium' | 'low'
  summaryForScoring: string
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  "You are a due diligence analyst. Compare founder claims against external market data. " +
  "For each claim, determine if external evidence SUPPORTS it (verified), CONTRADICTS it " +
  "(contradicted), or simply cannot be checked from the data provided (not_checkable). " +
  "If a claim was not made, mark it null. Be precise — 'unverified' means the claim exists " +
  "but the external data neither confirms nor denies it. Return valid JSON only."

function buildUserPrompt(
  facts: VerifiedFacts,
  market: MarketIntelligenceData,
  rawPitch: string,
): string {
  const pitchExcerpt = rawPitch.substring(0, 4000)
  const dossier = market.dossier?.substring(0, 5000) || "(no external data)"

  return `FOUNDER-STATED CLAIMS (extracted facts):
  Market size: ${facts.market.sizeStated ? facts.market.exactFigure || "claimed but no figure" : "not claimed"}
  Competitors named: [${facts.market.competitorsNamed.join(", ") || "none"}]
  Goliaths identified: [${facts.market.goliathsIdentified.join(", ") || "none"}]
  Traction: ${facts.traction.exactQuote || "none stated"}
  Revenue: ${facts.traction.hasRevenue ? "claimed" : "not claimed"}
  Users: ${facts.traction.hasUsers ? "claimed" : "not claimed"}
  Differentiator: ${facts.product.differentiatorStated ? "claimed" : "not claimed"}
  Tech explained: ${facts.product.techExplained}
  Red flags from fact extraction: ${facts.redFlags.length > 0 ? facts.redFlags.join(", ") : "none"}

PITCH EXCERPT:
${pitchExcerpt}

EXTERNAL MARKET DATA (from Exa search):
${dossier}

YOUR TASK:
1. Compare the founder's market size claim against what the external data says about this market. Is the claim supported?
2. Check if the external data reveals COMPETITORS the founder did NOT mention. List any missed competitors by name.
3. If traction claims exist, check if external data (press, Product Hunt, social mentions) corroborates them.
4. If a moat/differentiation claim exists, check if external data shows others doing the same thing.

Return JSON:
{
  "reasoning": "<3-4 sentences: walk through what the external data reveals vs what the founder claims>",
  "marketSizeClaim": { "claim": "<what founder said>", "status": "verified|unverified|contradicted|not_checkable", "evidence": "<what external data shows>" } or null,
  "competitorClaim": { "claim": "<what founder said about competitors>", "status": "verified|unverified|contradicted|not_checkable", "evidence": "<what external data shows>" } or null,
  "tractionClaim": { "claim": "<traction claim>", "status": "verified|unverified|contradicted|not_checkable", "evidence": "<external corroboration>" } or null,
  "moatClaim": { "claim": "<differentiation claim>", "status": "verified|unverified|contradicted|not_checkable", "evidence": "<competitors doing same>" } or null,
  "missedCompetitors": ["<competitor 1 from Exa that founder didn't mention>", ...],
  "overallCredibility": "high|medium|low"
}`
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

function normalizeClaimVerification(raw: any): ClaimVerification | null {
  if (!raw || typeof raw !== 'object') return null
  const status = String(raw.status || '').toLowerCase()
  if (!['verified', 'unverified', 'contradicted', 'not_checkable'].includes(status)) return null
  return {
    claim: String(raw.claim || ''),
    status: status as ClaimStatus,
    evidence: String(raw.evidence || ''),
  }
}

function buildSummary(result: Omit<ClaimVerificationResult, 'summaryForScoring'>): string {
  const parts: string[] = []

  const allClaims = [result.marketSizeClaim, result.competitorClaim, result.tractionClaim, result.moatClaim]
    .filter((c): c is ClaimVerification => c !== null)

  const contradicted = allClaims.filter(c => c.status === 'contradicted')
  const verified = allClaims.filter(c => c.status === 'verified')

  if (contradicted.length > 0) {
    parts.push(`CONTRADICTED CLAIMS (${contradicted.length}): ${contradicted.map(c => `"${c.claim}" — ${c.evidence}`).join('; ')}`)
  }
  if (verified.length > 0) {
    parts.push(`VERIFIED CLAIMS (${verified.length}): ${verified.map(c => `"${c.claim}"`).join(', ')}`)
  }
  if (result.missedCompetitors.length > 0) {
    parts.push(`COMPETITORS FOUNDER MISSED: ${result.missedCompetitors.join(', ')}`)
  }
  parts.push(`Overall claim credibility: ${result.overallCredibility}`)

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

function fallbackResult(): ClaimVerificationResult {
  return {
    marketSizeClaim: null,
    competitorClaim: null,
    tractionClaim: null,
    moatClaim: null,
    missedCompetitors: [],
    overallCredibility: 'medium',
    summaryForScoring: 'Claim verification unavailable — external data check skipped.',
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Step 1.5 of the scoring pipeline.
 *
 * Cross-references founder claims against Exa market data. Runs after fact
 * extraction and in parallel with vagueness audit. Output feeds into criterion
 * scorer and adversarial bear as additional context.
 *
 * Never throws — returns fallback result on any failure.
 */
export async function verifyClaims(
  facts: VerifiedFacts,
  market: MarketIntelligenceData,
  rawPitch: string,
): Promise<ClaimVerificationResult> {
  if (!market.dossier || market.dossier.trim().length < 50) {
    logger.log("[CLAIM-VERIFIER] Skipping — insufficient market data for verification")
    return fallbackResult()
  }

  logger.log("[CLAIM-VERIFIER] Starting claim verification against Exa data")

  try {
    const raw = await openrouterGenerateJson<any>({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(facts, market, rawPitch),
      temperature: 0.1,
      forceOpenRouter: true,
    })

    const partial = {
      marketSizeClaim: normalizeClaimVerification(raw?.marketSizeClaim),
      competitorClaim: normalizeClaimVerification(raw?.competitorClaim),
      tractionClaim: normalizeClaimVerification(raw?.tractionClaim),
      moatClaim: normalizeClaimVerification(raw?.moatClaim),
      missedCompetitors: Array.isArray(raw?.missedCompetitors)
        ? raw.missedCompetitors.filter((c: any) => typeof c === 'string' && c.trim()).map(String)
        : [],
      overallCredibility: (['high', 'medium', 'low'].includes(String(raw?.overallCredibility || '').toLowerCase())
        ? String(raw.overallCredibility).toLowerCase()
        : 'medium') as 'high' | 'medium' | 'low',
    }

    const result: ClaimVerificationResult = {
      ...partial,
      summaryForScoring: buildSummary(partial),
    }

    logger.log(
      `[CLAIM-VERIFIER] Complete — credibility:${result.overallCredibility} ` +
      `missed_competitors:${result.missedCompetitors.length} ` +
      `market:${result.marketSizeClaim?.status ?? 'n/a'} ` +
      `traction:${result.tractionClaim?.status ?? 'n/a'}`
    )

    return result
  } catch (error: any) {
    logger.error("[CLAIM-VERIFIER]", "Verification failed — using fallback:", error?.message ?? error)
    return fallbackResult()
  }
}
