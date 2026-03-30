/**
 * ===============================================================================
 * SCORING PIPELINE — STEP 3: ADVERSARIAL SCORER
 * ===============================================================================
 *
 * Runs two opposing LLM passes simultaneously:
 *   Pass A (Bull) — a partner who wants to WIN the deal
 *   Pass B (Bear) — a skeptical GP hunting for the fatal flaw
 *
 * Both receive the same VerifiedFacts + pitchSummary. The pitchSummary is built
 * by the pipeline orchestrator and should include key Exa market findings so the
 * bear case can challenge founder claims against external data (e.g. founder says
 * "no competitors" but Exa found 3 funded rivals).
 *
 * Model: DeepSeek Chat via OpenRouter (free), temperature 0.3 (both passes)
 * Passes run in parallel via Promise.all().
 *
 * blendedScore = bullScore × stageWeight.bull + (100-bearScore) × stageWeight.bear
 *   Early stages weight the bull case more heavily (0.65-0.70)
 *   Later stages weight the bear case more heavily (0.55-0.65)
 * conviction   = HIGH >70 | MEDIUM 50-70 | LOW 30-50 | PASS <30
 */

import { openrouterGenerateJson } from "../openrouter"
import { logger } from "../logger"
import type {
  VerifiedFacts,
  BullResult,
  BearResult,
  AdversarialConviction,
  AdversarialResult,
} from "./types"

// ---------------------------------------------------------------------------
// Shared fact formatter — narrative bullet style for the persuasion context
// ---------------------------------------------------------------------------

function formatFactsForAdversarial(facts: VerifiedFacts): string {
  const lines: string[] = ["VERIFIED FACTS (extracted without inference):"]

  // Traction
  if (facts.traction.stated && facts.traction.exactQuote) {
    lines.push(`  Traction: "${facts.traction.exactQuote}"`)
  } else {
    lines.push("  Traction: no specific traction figures stated")
  }
  if (facts.traction.hasRevenue)    lines.push("  - Has specific revenue figure")
  if (facts.traction.hasUsers)      lines.push("  - Has specific user/customer count")
  if (facts.traction.hasGrowthRate) lines.push("  - Has growth rate with timeframe")

  // Team
  if (facts.team.domainExperienceQuote)
    lines.push(`  Domain experience: "${facts.team.domainExperienceQuote}"`)
  else
    lines.push("  Domain experience: not named")

  if (facts.team.priorExitsQuote)
    lines.push(`  Prior exit/founding: "${facts.team.priorExitsQuote}"`)
  else
    lines.push("  Prior exit: none stated")

  if (facts.team.technicalDepthQuote)
    lines.push(`  Technical depth: "${facts.team.technicalDepthQuote}"`)
  else
    lines.push("  Technical depth: not explained")

  // Market
  if (facts.market.sizeStated && facts.market.exactFigure)
    lines.push(`  Market size: ${facts.market.exactFigure}`)
  else
    lines.push("  Market size: not stated with specific figure")

  if (facts.market.competitorsNamed.length > 0)
    lines.push(`  Competitors named: ${facts.market.competitorsNamed.join(", ")}`)
  else
    lines.push("  Competitors named: none")

  if (facts.market.goliathsIdentified.length > 0)
    lines.push(`  Large incumbents identified: ${facts.market.goliathsIdentified.join(", ")}`)

  // Product
  lines.push(
    `  Differentiator stated: ${facts.product.differentiatorStated} | ` +
    `Tech explained: ${facts.product.techExplained} | ` +
    `Wedge customer named: ${facts.product.wedgeCustomerNamed}`,
  )

  // Business model
  lines.push(
    `  Revenue model clear: ${facts.businessModel.revenueModelClear} | ` +
    `Unit economics stated: ${facts.businessModel.unitEconomicsStated} | ` +
    `Pricing mentioned: ${facts.businessModel.pricingMentioned}`,
  )

  // Red flags
  if (facts.redFlags.length > 0)
    lines.push(`  Vague claims (no backing data): ${facts.redFlags.join(" | ")}`)

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Pass A — Bull case
// ---------------------------------------------------------------------------

const BULL_SYSTEM =
  "You are a partner at a top-tier VC firm who just saw a deal you want to WIN. " +
  "You are competitive, optimistic, and looking for reasons to write this check. " +
  "Your job is to make the strongest possible investment case.\n\n" +

  "CALIBRATION — your bullScore should reflect realistic conviction:\n" +
  "  90-100: You would fight the partnership to lead this round. Clear path to $1B+. " +
  "Reserved for exceptional founder + massive market + early traction + timing advantage.\n" +
  "  70-89: Strong deal you'd champion. Multiple clear strengths, manageable risks.\n" +
  "  50-69: Interesting — worth a second meeting. Some good signals but needs more evidence.\n" +
  "  30-49: Has one compelling element but too many unknowns to get excited.\n" +
  "  0-29: You struggle to find a compelling investment thesis from the evidence.\n\n" +

  "Think through your reasoning FIRST, then score. Identify the single strongest " +
  "signal and build the case outward from there."

function buildBullUserPrompt(facts: VerifiedFacts, pitchSummary: string): string {
  return `${formatFactsForAdversarial(facts)}

PITCH SUMMARY:
${pitchSummary}

You want to WIN this deal. Construct the strongest possible investment case using only the facts above.
Even if facts are sparse, find the best plausible story.

Return a JSON object with exactly these fields:
{
  "reasoning": "<3-5 sentences: Walk through the key signals step by step. What is the founder's unfair advantage? What market dynamics favor them? What traction signals, even if early, suggest momentum? Build the investment thesis from evidence before scoring.>",
  "fundReturnerCase": "<the specific scenario where this returns the fund — be concrete about the path to $1B+>",
  "keyInsights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "bullScore": <0-100: how excited are you to champion this deal internally?>,
  "winProbability": <0-100: chance this becomes a $100M+ company>
}

IMPORTANT: Write your "reasoning" FIRST before assigning scores. Let the evidence build the case, then score accordingly. Exactly 3 keyInsights. No other fields. Return valid JSON only.`
}

function safeNumber(val: unknown, fallback: number): number {
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

function normalizeBullResult(raw: any): BullResult {
  return {
    fundReturnerCase: typeof raw?.fundReturnerCase === "string"
      ? raw.fundReturnerCase
      : "Fund-returner case unavailable.",
    keyInsights: Array.isArray(raw?.keyInsights)
      ? raw.keyInsights.slice(0, 3).map(String)
      : ["Analysis unavailable."],
    bullScore:      clamp(safeNumber(raw?.bullScore,      40), 0, 100),
    winProbability: clamp(safeNumber(raw?.winProbability, 15), 0, 100),
  }
}

export async function getBullScore(
  facts: VerifiedFacts,
  pitchSummary: string,
): Promise<BullResult> {
  try {
    const raw = await openrouterGenerateJson<any>({
      system: BULL_SYSTEM,
      user: buildBullUserPrompt(facts, pitchSummary),
      temperature: 0.3,
      forceOpenRouter: true,
    })
    return normalizeBullResult(raw)
  } catch (error: any) {
    logger.error("[ADVERSARIAL-BULL]", "LLM call failed — using fallback:", error?.message ?? error)
    return fallbackBullResult()
  }
}

// ---------------------------------------------------------------------------
// Pass B — Bear case
// ---------------------------------------------------------------------------

function buildBearSystem(stage: string): string {
  return (
    "You are a skeptical GP who has passed on 10,000 pitches and seen most fail. " +
    "You are looking for the specific reasons this will fail. You are not mean — " +
    "you are rigorous. Your job is to find the fatal flaw.\n\n" +
    "STAGE-ADJUSTED RISK ASSESSMENT:\n" +
    `You are evaluating a ${stage} stage startup.\n\n` +
    "At this stage, the following are EXPECTED CONDITIONS, not red flags.\n" +
    "Do NOT include these in your risk assessment:\n" +
    "  pre-idea/idea/pre-seed:\n" +
    "    - No formal revenue model or pricing yet\n" +
    "    - No prior founder exits\n" +
    "    - Limited or no named competitors (founder may not know them yet)\n" +
    "    - Small or no team\n" +
    "    - No unit economics\n" +
    "    - Seed funding not yet raised\n\n" +
    "  seed:\n" +
    "    - No revenue model locked in\n" +
    "    - No named prior exits required\n" +
    "    - Unit economics still being discovered\n" +
    "    - Team still small (< 10 people)\n\n" +
    "  series-a:\n" +
    "    - Unit economics not yet fully optimized\n" +
    "    - International expansion not started\n" +
    "    - Some key hires still to be made\n\n" +
    "  revenue/growth:\n" +
    "    - Not yet profitable (growth-stage companies reinvest)\n" +
    "    - Still refining go-to-market channels\n\n" +
    "TRUE red flags at ANY stage:\n" +
    "    - No working product or prototype\n" +
    "    - Zero founder-market fit evidence\n" +
    "    - No evidence anyone wants this\n" +
    "    - Fundamental market misunderstanding\n" +
    "    - Team has zero relevant background\n" +
    "    - Product has been tested and shown not to work\n\n" +
    "Score bearScore relative to stage-appropriate expectations only.\n" +
    `A ${stage} startup without a revenue model is a NORMAL condition —\n` +
    "score it as 0 risk on that dimension.\n" +
    "Only flag what is genuinely anomalous or dangerous for this stage."
  )
}

function buildBearUserPrompt(facts: VerifiedFacts, pitchSummary: string): string {
  // Surface any incumbent threats and vague claims prominently for the bear analyst
  const goliathNote = facts.market.goliathsIdentified.length > 0
    ? `\nNote: these large incumbents are already identified in this space: ${facts.market.goliathsIdentified.join(", ")}.`
    : ""

  const vaguenessNote = facts.redFlags.length > 0
    ? `\nNote: the following claims have NO backing data: ${facts.redFlags.join(", ")}.`
    : ""

  return `${formatFactsForAdversarial(facts)}

PITCH SUMMARY:
${pitchSummary}
${goliathNote}${vaguenessNote}

Find the fatal flaws. Be specific and rigorous, not mean.
A NULL or false field means the founder did NOT state it — treat absence of evidence as a real risk.

Return a JSON object with exactly these fields:
{
  "reasoning": "<3-5 sentences: Walk through the risks step by step. What are the STAGE-APPROPRIATE gaps vs genuinely dangerous signals? Distinguish between 'hasn't gotten there yet' (normal) and 'fundamental problem' (red flag). Consider: Is the market real? Can this team execute? Is the timing right? Does any single risk dominate?>",
  "likelyDeathScenario": "<the single most probable failure mode in 18 months — be specific>",
  "incumbentThreat": "<which large company kills this and the exact mechanism — name the company>",
  "founderRiskFlags": ["<risk 1>", "<risk 2>", ...],
  "bearScore": <0-100: how risky is this? 100 = certain failure>,
  "gaveUpTooEarlyRisk": <true if this is the kind of idea VCs later regret passing on, else false>
}

IMPORTANT: Write your "reasoning" FIRST. Think through stage-appropriate expectations before assigning bearScore. A pre-seed startup without revenue is NORMAL, not a risk. No other fields. Return valid JSON only.`
}

function normalizeBearResult(raw: any): BearResult {
  return {
    likelyDeathScenario: typeof raw?.likelyDeathScenario === "string"
      ? raw.likelyDeathScenario
      : "Failure scenario unavailable.",
    incumbentThreat: typeof raw?.incumbentThreat === "string"
      ? raw.incumbentThreat
      : "Incumbent analysis unavailable.",
    founderRiskFlags: Array.isArray(raw?.founderRiskFlags)
      ? raw.founderRiskFlags.map(String)
      : ["Analysis unavailable."],
    bearScore:         clamp(safeNumber(raw?.bearScore, 60), 0, 100),
    gaveUpTooEarlyRisk: Boolean(raw?.gaveUpTooEarlyRisk),
  }
}

export async function getBearScore(
  facts: VerifiedFacts,
  pitchSummary: string,
  stage: string = 'pre-seed',
): Promise<BearResult> {
  try {
    const raw = await openrouterGenerateJson<any>({
      system: buildBearSystem(stage),
      user: buildBearUserPrompt(facts, pitchSummary),
      temperature: 0.3,
      forceOpenRouter: true,
    })
    return normalizeBearResult(raw)
  } catch (error: any) {
    logger.error("[ADVERSARIAL-BEAR]", "LLM call failed — using fallback:", error?.message ?? error)
    return fallbackBearResult()
  }
}

// ---------------------------------------------------------------------------
// Blended export
// ---------------------------------------------------------------------------

/**
 * Runs bull and bear passes in parallel and blends the results.
 *
 * The pitchSummary should be built by the pipeline orchestrator to include both
 * a description of the startup and any key Exa market findings, so the bear case
 * can surface contradictions between founder claims and external data.
 */
export async function getAdversarialScore(
  facts: VerifiedFacts,
  pitchSummary: string,
  stage: string = 'pre-seed',
): Promise<AdversarialResult> {
  logger.log(`[ADVERSARIAL-SCORER] Starting bull and bear passes in parallel (stage: ${stage})`)

  const [bullResult, bearResult] = await Promise.all([
    getBullScore(facts, pitchSummary),
    getBearScore(facts, pitchSummary, stage),
  ])

  const stageWeights: Record<string, { bull: number; bear: number }> = {
    'pre-idea': { bull: 0.70, bear: 0.30 },
    'idea':     { bull: 0.70, bear: 0.30 },
    'pre-seed': { bull: 0.65, bear: 0.35 },
    'seed':     { bull: 0.55, bear: 0.45 },
    'series-a': { bull: 0.45, bear: 0.55 },
    'revenue':  { bull: 0.40, bear: 0.60 },
    'growth':   { bull: 0.35, bear: 0.65 },
  }

  const weights = stageWeights[stage] ?? { bull: 0.55, bear: 0.45 }
  const blendedScore = Math.round(
    bullResult.bullScore * weights.bull +
    (100 - bearResult.bearScore) * weights.bear,
  )

  const conviction: AdversarialConviction =
    blendedScore > 70  ? "HIGH"   :
    blendedScore >= 50 ? "MEDIUM" :
    blendedScore >= 30 ? "LOW"    :
    "PASS"

  logger.log(
    `[ADVERSARIAL-SCORER] Complete — bull:${bullResult.bullScore} bear:${bearResult.bearScore} ` +
    `blended:${blendedScore} conviction:${conviction} weights:bull=${weights.bull}/bear=${weights.bear}`,
  )

  return { bullResult, bearResult, blendedScore, conviction }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function fallbackBullResult(): BullResult {
  return {
    fundReturnerCase: "Bull case analysis unavailable.",
    keyInsights: ["Analysis unavailable."],
    bullScore: 40,
    winProbability: 15,
  }
}

function fallbackBearResult(): BearResult {
  return {
    likelyDeathScenario: "Bear case analysis unavailable.",
    incumbentThreat: "Incumbent analysis unavailable.",
    founderRiskFlags: ["Analysis unavailable."],
    bearScore: 60,
    gaveUpTooEarlyRisk: false,
  }
}
