/**
 * ===============================================================================
 * SCORING PIPELINE — STEP 5: TIER CLASSIFIER
 * ===============================================================================
 *
 * Prevents score clustering by forcing the model to anchor against 8 real
 * reference companies before assigning a tier or percentile.
 *
 * The LLM:
 *   1. Names the 2 most similar reference anchors
 *   2. Explains why (specifically)
 *   3. Assigns one of 5 tiers
 *   4. Assigns a percentile within that tier (1-100)
 *
 * All numeric computation happens in TypeScript:
 *   calibratedScore = tierFloor + Math.round((tierPercentile / 100) * tierRange)
 *
 * Tier floors and ranges:
 *   EXCEPTIONAL (85-100): floor=85, range=15
 *   STRONG      (70-84):  floor=70, range=14
 *   DEVELOPING  (45-69):  floor=45, range=24
 *   EARLY       (20-44):  floor=20, range=24
 *   PASS        (0-19):   floor=0,  range=19
 *
 * Model: GPT-4o, temperature 0.2
 *
 * The tier classifier is INDEPENDENT — it does not receive scores from
 * other pipeline passes. It reasons only from verified facts, the pitch
 * summary, reference anchors, and stage context.
 */

import { getAIClient } from "../ai"
import {
  getModelNameForScoring,
  getOllamaKeepAliveParams,
  getOpenRouterClient,
  getScoringLlmClient,
  isUsingOllama,
} from "../openrouter"
import { logger } from "../logger"
import type { VerifiedFacts, ReferenceAnchor, Tier, TierResult } from "./types"

// ---------------------------------------------------------------------------
// Reference anchors — the calibration set
// ---------------------------------------------------------------------------

export const REFERENCE_ANCHORS: ReferenceAnchor[] = [
  // ── Later-stage / growth anchors ────────────────────────────────────────
  {
    name: "Airbnb seed 2009",
    score: 76,
    why: "Strong founder-market fit, creative wedge, unproven market acceptance at the time",
  },
  {
    name: "Stripe seed 2010",
    score: 91,
    why: "Crystal clear pain, technical founders in perfect domain, massive obvious TAM, working product",
  },
  {
    name: "Uber seed 2009",
    score: 72,
    why: "Clear problem, regulatory risk unknown, founder credibility strong, market size debatable initially",
  },
  {
    name: "Pets.com 1999",
    score: 18,
    why: "No unit economics, solved no real pain, logistics ignored, market misread",
  },
  {
    name: "Juicero 2013",
    score: 14,
    why: "Solution looking for a problem, hardware complexity ignored, no real moat",
  },
  {
    name: "Figma seed 2013",
    score: 83,
    why: "Technical moat, clear wedge user, timing with browser capabilities, strong founder domain fit",
  },
  {
    name: "Theranos 2003",
    score: 31,
    why: "Compelling vision but zero technical evidence, claims unverifiable, no domain-credentialed team",
  },
  {
    name: "Average YC W24 company",
    score: 61,
    why: "Solid idea, some traction, competent team, but crowded space with unclear differentiation",
  },
  // ── Early-stage / pre-seed anchors ──────────────────────────────────────
  {
    name: "Instagram at idea stage (2009)",
    score: 82,
    why: "Two Stanford students with clear domain insight, simple focused product vision, no revenue but obvious consumer behavior insight",
  },
  {
    name: "DoorDash pre-seed (2013)",
    score: 79,
    why: "Stanford students, clear local market validation, scrappy execution, obvious pain point with personal experience",
  },
  {
    name: "Snapchat pre-launch (2011)",
    score: 74,
    why: "Stanford students, counterintuitive insight about ephemeral content, no revenue, but founders lived the problem",
  },
  {
    name: "Average failed pre-seed (generic)",
    score: 22,
    why: "No clear problem, no founder-market fit, solution looking for a problem, team has no relevant background",
  },
  {
    name: "Strong pre-seed content tech startup (2024)",
    score: 76,
    why: "CS students with domain expertise in content creation, early social proof, clear market understanding, technically capable team addressing real pain point",
  },
]

// ---------------------------------------------------------------------------
// Tier arithmetic constants
// ---------------------------------------------------------------------------

const TIER_FLOORS: Record<Tier, number> = {
  EXCEPTIONAL: 85,
  STRONG:      70,
  DEVELOPING:  45,
  EARLY:       20,
  PASS:         0,
}

const TIER_RANGES: Record<Tier, number> = {
  EXCEPTIONAL: 15,
  STRONG:      14,
  DEVELOPING:  24,
  EARLY:       24,
  PASS:        19,
}

const TIER_LABELS: Record<Tier, string> = {
  EXCEPTIONAL: "Top 5% — clear outlier, would fast-track",
  STRONG:      "Top 20% — fundable with minor concerns",
  DEVELOPING:  "Middle 50% — needs significant work",
  EARLY:       "Bottom 25% — major gaps",
  PASS:        "Critical red flags",
}

const VALID_TIERS = new Set<string>(["EXCEPTIONAL", "STRONG", "DEVELOPING", "EARLY", "PASS"])

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  "You are a Principal at a Tier-1 VC doing a final calibration check. " +
  "You have seen thousands of pitches. Your job is to prevent grade inflation " +
  "and grade deflation by anchoring scores to real outcomes.\n\n" +
  "You are making an INDEPENDENT assessment. You have not seen any " +
  "other scores for this pitch. Ignore any prior scoring context. " +
  "Compare this pitch ONLY against the reference anchors provided, " +
  "based purely on the evidence in the verified facts and pitch summary.\n\n" +
  "CRITICAL: Compare against anchors at the SAME STAGE as this startup. " +
  "A pre-seed pitch should be compared to pre-seed anchors first. " +
  "Only compare to later-stage anchors if the pitch significantly " +
  "exceeds pre-seed expectations."

function buildAnchorsBlock(): string {
  return REFERENCE_ANCHORS.map(a =>
    `  - "${a.name}" (score: ${a.score}): ${a.why}`,
  ).join("\n")
}

function buildFactsSummary(facts: VerifiedFacts): string {
  const signals: string[] = []

  if (facts.traction.stated && facts.traction.exactQuote)
    signals.push(`Traction: "${facts.traction.exactQuote}"`)
  else
    signals.push("Traction: none stated")

  if (facts.team.domainExperienceQuote)
    signals.push(`Team domain experience: "${facts.team.domainExperienceQuote}"`)
  else
    signals.push("Team domain experience: not named")

  if (facts.team.priorExitsQuote)
    signals.push(`Prior exit: "${facts.team.priorExitsQuote}"`)

  if (facts.market.sizeStated && facts.market.exactFigure)
    signals.push(`Market: ${facts.market.exactFigure}`)
  else
    signals.push("Market size: not stated")

  if (facts.market.competitorsNamed.length > 0)
    signals.push(`Competitors named: ${facts.market.competitorsNamed.join(", ")}`)

  signals.push(
    `Product — differentiator: ${facts.product.differentiatorStated}, ` +
    `tech explained: ${facts.product.techExplained}, ` +
    `wedge customer: ${facts.product.wedgeCustomerNamed}`,
  )

  signals.push(
    `Business model — revenue clear: ${facts.businessModel.revenueModelClear}, ` +
    `pricing mentioned: ${facts.businessModel.pricingMentioned}`,
  )

  if (facts.redFlags.length > 0)
    signals.push(`Unsubstantiated claims: ${facts.redFlags.join(", ")}`)

  return signals.map(s => `  ${s}`).join("\n")
}

function buildUserPrompt(
  facts: VerifiedFacts,
  pitchSummary: string,
  stage: string,
): string {
  const anchorsBlock = buildAnchorsBlock()
  const factsBlock   = buildFactsSummary(facts)
  const tiersList    = (Object.keys(TIER_LABELS) as Tier[]).map(
    t => `  ${t} (${TIER_FLOORS[t]}-${TIER_FLOORS[t] + TIER_RANGES[t]}): ${TIER_LABELS[t]}`,
  ).join("\n")

  return `STAGE CONTEXT: This is a "${stage}" stage startup.
When comparing to reference anchors, prioritize anchors at similar stages.
A pre-seed startup should be compared to pre-seed/early anchors, not to
companies evaluated after achieving product-market fit.

CALIBRATION ANCHORS — real companies with known outcomes:
${anchorsBlock}

STARTUP BEING EVALUATED:

Pitch summary:
${pitchSummary}

Key verified facts:
${factsBlock}

YOUR TASK:

1. Name the 2 reference anchors this startup most closely resembles.
   Choose anchors that match the startup's current stage — use the early-stage
   anchors (Instagram/DoorDash/Snapchat/pre-seed) for pre-seed pitches.
   Use the exact names from the calibration list above.

2. Explain specifically why — cite concrete similarities and differences,
   not vague comparisons. Reference specific fields from the verified facts.

3. Assign a tier from this list:
${tiersList}

4. Assign a percentile WITHIN that tier (1 to 100).
   1 = barely makes the tier. 50 = solidly in the middle. 100 = top of the tier.
   Base your answer purely on how this startup's verified facts and pitch
   compare to the reference anchors. Do not assume any prior scores exist.

Return a JSON object with exactly these fields:
{
  "closestAnchor1": "<exact name from calibration list>",
  "closestAnchor2": "<exact name from calibration list>",
  "anchorRationale": "<specific explanation — 2-4 sentences citing facts>",
  "tier": "EXCEPTIONAL|STRONG|DEVELOPING|EARLY|PASS",
  "tierPercentile": <1-100>
}

No other fields. Return valid JSON only.`
}

// ---------------------------------------------------------------------------
// Score computation
// ---------------------------------------------------------------------------

function computeCalibratedScore(tier: Tier, tierPercentile: number): number {
  const floor = TIER_FLOORS[tier]
  const range = TIER_RANGES[tier]
  return floor + Math.round((tierPercentile / 100) * range)
}

// ---------------------------------------------------------------------------
// Fallback (plan §6j: if tier-classifier fails, pipeline uses avg of other passes)
// ---------------------------------------------------------------------------

function fallbackTierResult(): TierResult {
  return {
    tier: "DEVELOPING",
    tierPercentile: 50,
    calibratedScore: computeCalibratedScore("DEVELOPING", 50),
    closestAnchors: ["Average YC W24 company", "Average YC W24 company"],
    anchorRationale: "Tier classification unavailable — using neutral DEVELOPING fallback.",
    adjustmentFromInputScores: 0,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Step 5 of the scoring pipeline — INDEPENDENT tier classification.
 *
 * Forces the model to anchor against real reference companies before assigning
 * a tier. Computes the final calibrated score in TypeScript from the LLM's
 * tier + tierPercentile answers.
 *
 * This pass is independent of criterion and adversarial scores — it reasons
 * only from verified facts, the pitch summary, and reference anchors.
 *
 * @param facts        Output of extractVerifiedFacts()
 * @param pitchSummary Text summary built by the pipeline (may include Exa data)
 * @param stage        Founder stage — used to select stage-appropriate anchors
 */
export async function classifyTier(
  facts: VerifiedFacts,
  pitchSummary: string,
  stage: string = "pre-seed",
): Promise<TierResult> {
  logger.log(`[TIER-CLASSIFIER] Starting independent tier classification (stage: ${stage})`)

  const client = getScoringLlmClient() ?? getAIClient()
  const model = getModelNameForScoring("gpt-4o")
  const scoringUsesOllama = !getOpenRouterClient() && isUsingOllama()
  const useJsonObject =
    (scoringUsesOllama && process.env.OLLAMA_JSON_STRICT !== "false") ||
    model.includes("gpt")

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: buildUserPrompt(facts, pitchSummary, stage) },
      ],
      temperature: 0.2,
      max_tokens: 1000,
      ...(useJsonObject ? { response_format: { type: "json_object" } } : {}),
      ...(scoringUsesOllama ? getOllamaKeepAliveParams() : {}),
    } as any)

    const content = completion.choices[0]?.message?.content ?? "{}"

    let raw: any
    try {
      raw = JSON.parse(content)
    } catch {
      const first = content.indexOf("{")
      const last  = content.lastIndexOf("}")
      if (first >= 0 && last > first) {
        try { raw = JSON.parse(content.slice(first, last + 1)) } catch { /* fall through */ }
      }
    }

    if (!raw) {
      logger.error("[TIER-CLASSIFIER]", "Could not parse JSON response — using fallback")
      return fallbackTierResult()
    }

    // Validate tier
    const rawTier = String(raw?.tier ?? "").toUpperCase()
    if (!VALID_TIERS.has(rawTier)) {
      logger.error("[TIER-CLASSIFIER]", `Invalid tier "${rawTier}" — using fallback`)
      return fallbackTierResult()
    }
    const tier = rawTier as Tier

    // Clamp tierPercentile to 1-100
    const tierPercentile = Math.max(1, Math.min(100, Math.round(Number(raw?.tierPercentile) || 50)))

    const calibratedScore = computeCalibratedScore(tier, tierPercentile)

    const anchor1 = typeof raw?.closestAnchor1 === "string" && raw.closestAnchor1.trim()
      ? raw.closestAnchor1.trim()
      : "Average YC W24 company"
    const anchor2 = typeof raw?.closestAnchor2 === "string" && raw.closestAnchor2.trim()
      ? raw.closestAnchor2.trim()
      : "Average YC W24 company"

    const result: TierResult = {
      tier,
      tierPercentile,
      calibratedScore,
      closestAnchors: [anchor1, anchor2],
      anchorRationale: typeof raw?.anchorRationale === "string"
        ? raw.anchorRationale
        : "No rationale provided.",
      adjustmentFromInputScores: 0,
    }

    logger.log(
      `[TIER-CLASSIFIER] Complete — tier:${tier} percentile:${tierPercentile} ` +
      `calibrated:${calibratedScore} anchors:["${anchor1}", "${anchor2}"]`,
    )

    return result
  } catch (error: any) {
    logger.error("[TIER-CLASSIFIER]", "LLM call failed — using fallback:", error?.message ?? error)
    return fallbackTierResult()
  }
}
