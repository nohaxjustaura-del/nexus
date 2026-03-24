/**
 * ===============================================================================
 * UNIVERSAL ANALYSIS ENGINE
 * ===============================================================================
 *
 * The "brain" behind every pitch analysis — video, text idea, or slide deck.
 *
 * Takes three inputs:
 *   1. FounderDossier  — comprehensive founder + startup context
 *   2. AnalysisType    — VIDEO | IDEA | DECK (controls whether Execution is scored)
 *   3. DeepMarketContext — real-time Exa market intelligence
 *
 * Outputs a 2026 Institutional Rubric evaluation with bar-style scores (0-100)
 * and 4 high-density bullets per category, each grounded in a concrete data point.
 *
 * Scoring Pillars:
 *   Market Heat        (30%)  — competitive saturation, white-space, funding velocity
 *   Moat Integrity     (25%)  — defensibility against GPT-5/6, inference margins, MCP risks
 *   Founder-Market Fit (20%)  — pedigree, technical depth, domain credibility
 *   Strategic Momentum (25%)  — traction velocity by 2026 standards
 *   Execution          (only VIDEO/DECK) — clarity, communication, presentation quality
 */

import { logger } from "./logger"
import { geminiGenerateJson, hasGeminiKey } from "./gemini"
import { openrouterGenerateJson, hasOpenRouterKey } from "./openrouter"
import { getAIClient } from "./ai"
import type { DeepMarketContext } from "./market-intelligence"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnalysisType = "VIDEO" | "IDEA" | "DECK"

export interface FounderDossier {
  startup: string
  stage: string
  sectors: string[]
  location?: string
  businessModel?: string

  summary: string
  transcript?: string

  education?: string
  university?: string
  isStudent?: boolean
  techBackground?: boolean
  isImmigrant?: boolean
  isVeteran?: boolean
  isUnderrepresented?: boolean
  cofounders?: string
  prevFunding?: string

  revenue?: string | number
  users?: string | number
  growth?: string
  mrr?: string | number
  teamSize?: string | number

  fundingNeed?: number
  valueAddNeeds?: string[]
}

export interface CategoryScore {
  score: number
  bullets: string[]
}

export interface UniversalAnalysisResult {
  categories: {
    market: CategoryScore
    moat: CategoryScore
    founderFit: CategoryScore
    momentum: CategoryScore
    execution: CategoryScore | null
  }
  globalVerdict: string
}

// ---------------------------------------------------------------------------
// Dossier → prompt text
// ---------------------------------------------------------------------------

function dossierToPromptBlock(d: FounderDossier): string {
  const lines: string[] = []

  lines.push(`STARTUP: ${d.startup || "Unknown"}`)
  lines.push(`Stage: ${d.stage || "Unknown"}`)
  if (d.sectors.length > 0) lines.push(`Sectors: ${d.sectors.join(", ")}`)
  if (d.location) lines.push(`Location: ${d.location}`)
  if (d.businessModel) lines.push(`Model: ${d.businessModel}`)

  lines.push("")
  lines.push(`SUMMARY:`)
  lines.push(d.summary || "(no summary provided)")
  if (d.transcript) {
    lines.push("")
    lines.push(`TRANSCRIPT EXCERPT:`)
    lines.push(d.transcript.substring(0, 1500))
  }

  const founderBits: string[] = []
  if (d.education) founderBits.push(`Education: ${d.education}`)
  if (d.university && d.university !== d.education) founderBits.push(`University: ${d.university}`)
  if (d.isStudent) founderBits.push("Currently a student founder")
  if (d.techBackground) founderBits.push("Technical background")
  if (d.isImmigrant) founderBits.push("Immigrant founder")
  if (d.isVeteran) founderBits.push("Veteran founder")
  if (d.isUnderrepresented) founderBits.push("Underrepresented founder")
  if (d.cofounders) founderBits.push(`Co-founders: ${d.cofounders}`)
  if (d.prevFunding && d.prevFunding !== "none") founderBits.push(`Previous funding: ${d.prevFunding}`)
  if (founderBits.length > 0) {
    lines.push("")
    lines.push(`FOUNDER:`)
    lines.push(founderBits.join(". "))
  }

  const tractionBits: string[] = []
  if (d.revenue) tractionBits.push(`Revenue: ${d.revenue}`)
  if (d.users) tractionBits.push(`Users: ${d.users}`)
  if (d.growth) tractionBits.push(`Growth: ${d.growth}`)
  if (d.mrr) tractionBits.push(`MRR: ${d.mrr}`)
  if (d.teamSize) tractionBits.push(`Team size: ${d.teamSize}`)
  if (tractionBits.length > 0) {
    lines.push("")
    lines.push(`TRACTION:`)
    lines.push(tractionBits.join(". "))
  }

  const askBits: string[] = []
  if (d.fundingNeed) askBits.push(`Raising: $${d.fundingNeed}K`)
  if (d.valueAddNeeds && d.valueAddNeeds.length > 0) askBits.push(`Looking for: ${d.valueAddNeeds.join(", ")}`)
  if (askBits.length > 0) {
    lines.push("")
    lines.push(`ASK:`)
    lines.push(askBits.join(". "))
  }

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(type: AnalysisType): string {
  const executionClause = type === "IDEA"
    ? `\n\nEXECUTION PILLAR: This analysis is for a TEXT IDEA submission. Set the "execution" field to null and do NOT include it in your evaluation or globalVerdict.`
    : `\n\nEXECUTION PILLAR (applies to ${type}): Analyze clarity of communication, presentation quality, persuasiveness, and storytelling. Score 0-100 with 4 bullets.`

  return `You are a Principal Analyst at a Tier-1 VC firm. Current Date: March 2026. Your task is to critique a startup using the 2026 Institutional Rubric.

You will receive:
- A FOUNDER DOSSIER with startup details, founder background, traction, and fundraising context.
- A MARKET INTELLIGENCE DOSSIER with real-time Exa search data on competitors, established incumbents, macro catalysts, and failed predecessors.

Evaluation Pillars:

MARKET HEAT (30%): Use the Exa market data to identify if this is a Red Ocean or Blue Ocean. Quote specific competitor names and funding rounds from the SATURATION section. Identify Goliaths from the INCUMBENTS section — name the established giants that already own the customer relationship and assess whether their AI roadmap or recent acquisitions could crush this startup. Reference macro catalysts from the CATALYSTS section. If the market data is thin, flag the uncertainty.

MOAT INTEGRITY (25%): Analyze "Inference Margins" and "Agentic Autonomy." Does this idea survive a GPT-5/6 release? Look for MCP (Model Context Protocol) risks — can a foundation model simply add this as a feature? Evaluate defensibility through data moats, network effects, or regulatory capture.

FOUNDER-MARKET FIT (20%): Does the dossier show the pedigree and technical depth required for this niche? Evaluate education, domain expertise, prior experience, and unique unfair advantages. A Stanford AI PhD building an AI company is different from a non-technical founder in the same space.

STRATEGIC MOMENTUM (25%): Look at the TRACTION section of the dossier. Is the velocity sufficient for 2026 standards? Reference the GRAVEYARD section to identify whether this startup is repeating patterns of failure. Evaluate burn rate implied by team size vs. funding ask.${executionClause}

OUTPUT INSTRUCTIONS:

Return a JSON object. For each category, provide a score (0-100) and exactly 4 "High-Density Bullets."

BULLET RULES:
- Each bullet MUST contain one concrete data point (a specific dollar amount, competitor name, margin estimate, growth figure, or date).
- Each bullet MUST contain one strategic takeaway derived from that data point.
- Bullets should be 1-2 sentences, dense with insight, zero fluff.
- If market data is insufficient, say so explicitly and adjust the score downward.

SCORING CALIBRATION:
- 90-100: Exceptional — clear outlier with strong signals across the board.
- 70-89: Strong — fundable with minor concerns.
- 40-69: Developing — needs specific improvements before funding.
- 0-39: Critical — major red flags or insufficient data to evaluate.

globalVerdict: A single paragraph (3-5 sentences) giving the honest, unvarnished bottom line. Would you write this check? Why or why not?

RETURN FORMAT (strict JSON, no markdown):
{
  "categories": {
    "market": { "score": <number>, "bullets": ["...", "...", "...", "..."] },
    "moat": { "score": <number>, "bullets": ["...", "...", "...", "..."] },
    "founderFit": { "score": <number>, "bullets": ["...", "...", "...", "..."] },
    "momentum": { "score": <number>, "bullets": ["...", "...", "...", "..."] }${type !== "IDEA" ? `,\n    "execution": { "score": <number>, "bullets": ["...", "...", "...", "..."] }` : ""}
  },
  "globalVerdict": "..."
}`
}

// ---------------------------------------------------------------------------
// User prompt
// ---------------------------------------------------------------------------

function buildUserPrompt(
  dossier: FounderDossier,
  market: DeepMarketContext,
  type: AnalysisType,
): string {
  return `ANALYSIS TYPE: ${type}

--- FOUNDER DOSSIER ---
${dossierToPromptBlock(dossier)}

--- MARKET INTELLIGENCE DOSSIER ---
${market.dossier}

Now produce the 2026 Institutional Rubric evaluation. Return ONLY the JSON object.`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the Universal Analysis Engine.
 *
 * @param dossier  Comprehensive founder + startup context
 * @param type     VIDEO | IDEA | DECK — controls whether Execution is scored
 * @param market   Real-time Exa market intelligence from getDeepMarketContext()
 * @returns        Structured scores + bullets + global verdict
 */
export async function runUniversalAnalysis(
  dossier: FounderDossier,
  type: AnalysisType,
  market: DeepMarketContext,
): Promise<UniversalAnalysisResult> {
  logger.log(`[UNIVERSAL-ENGINE] Running ${type} analysis for "${dossier.startup}"`)

  const systemPrompt = buildSystemPrompt(type)
  const userPrompt = buildUserPrompt(dossier, market, type)

  let raw: any

  // Prefer Gemini 2.5 Flash Lite (free, 15 RPM, 1M context window)
  if (hasGeminiKey()) {
    logger.log("[UNIVERSAL-ENGINE] Using Gemini 2.5 Flash Lite (free tier)")
    raw = await geminiGenerateJson<any>({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.4,
      model: "gemini-2.5-flash-lite",
    })
  } else if (hasOpenRouterKey()) {
    logger.log("[UNIVERSAL-ENGINE] Gemini key not found, falling back to OpenRouter")
    raw = await openrouterGenerateJson<any>({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.4,
      model: "google/gemini-2.0-flash-001",
    })
  } else {
    logger.log("[UNIVERSAL-ENGINE] Falling back to direct OpenAI")
    const client = getAIClient()
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt + "\n\nReturn ONLY valid JSON. No markdown, no code blocks." },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content || "{}"
    try {
      raw = JSON.parse(content)
    } catch {
      const first = content.indexOf("{")
      const last = content.lastIndexOf("}")
      if (first >= 0 && last > first) {
        raw = JSON.parse(content.slice(first, last + 1))
      } else {
        throw new Error("Universal Analysis Engine returned unparseable response")
      }
    }
  }

  const result = normalizeResult(raw, type)

  logger.log(
    `[UNIVERSAL-ENGINE] Scores — market:${result.categories.market.score} moat:${result.categories.moat.score} ` +
    `fit:${result.categories.founderFit.score} momentum:${result.categories.momentum.score}` +
    (result.categories.execution ? ` exec:${result.categories.execution.score}` : ""),
  )

  return result
}

// ---------------------------------------------------------------------------
// Normalize / validate raw LLM output
// ---------------------------------------------------------------------------

function ensureCategory(raw: any, key: string): CategoryScore {
  const cat = raw?.categories?.[key]
  return {
    score: clamp(Number(cat?.score) || 0, 0, 100),
    bullets: Array.isArray(cat?.bullets)
      ? cat.bullets.slice(0, 4).map(String)
      : ["Insufficient data to evaluate this category."],
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function normalizeResult(raw: any, type: AnalysisType): UniversalAnalysisResult {
  return {
    categories: {
      market: ensureCategory(raw, "market"),
      moat: ensureCategory(raw, "moat"),
      founderFit: ensureCategory(raw, "founderFit"),
      momentum: ensureCategory(raw, "momentum"),
      execution: type !== "IDEA" ? ensureCategory(raw, "execution") : null,
    },
    globalVerdict: typeof raw?.globalVerdict === "string"
      ? raw.globalVerdict
      : "Analysis complete. Review individual category scores for details.",
  }
}
