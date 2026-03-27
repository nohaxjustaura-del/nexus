/**
 * ===============================================================================
 * SCORING PIPELINE — MASTER ORCHESTRATOR
 * ===============================================================================
 *
 * Runs all 5 scoring passes in the optimal dependency order and fuses the
 * results into a single FinalScoringResult.
 *
 * Execution phases:
 *
 *   Phase 1 (parallel):
 *     extractVerifiedFacts()  — DeepSeek, temp 0.1
 *     auditVagueness()        — sync regex, no LLM
 *
 *   Phase 2 (parallel, needs Phase 1 — all three are independent):
 *     scoreByCriteria()       — DeepSeek, temp 0.1
 *     getAdversarialScore()   — 2× DeepSeek, temp 0.3 (bull + bear in parallel)
 *     classifyTier()          — GPT-4o, temp 0.2 (independent, no score inputs)
 *
 *   Phase 3 (needs Phase 2):
 *     generateCategoryDescriptions() — DeepSeek
 *
 *   Phase 4 — Score fusion (TypeScript only, no LLM):
 *     Full:     catDescAvg*0.25 + criterion*0.20 + adversarial*0.30 + tier*0.25 + vagueness(±10)
 *     Fallback: criterion*0.30 + adversarial*0.40 + tier*0.30 + vagueness(±10)
 *
 * Error resilience (plan §6j):
 *   Each pass has its own internal fallback so it never throws. If Phase 2
 *   results look like fallbacks, the pipeline substitutes the failed pass's
 *   0-100 contribution with the average of the successful passes. Vagueness
 *   audit cannot fail (pure regex).
 *
 * Total LLM calls per run: 5 (fact, criterion, bull, bear, tier).
 * Estimated latency: 8-14 s (3 sequential phases with internal parallelism).
 */

import { logger } from "../logger"
import { openrouterGenerateJson } from "../openrouter"
import { extractVerifiedFacts } from "./fact-extractor"
import { auditVagueness } from "./vagueness-auditor"
import { scoreByCriteria, CATEGORY_MAX } from "./criterion-scorer"
import { getAdversarialScore } from "./adversarial-scorer"
import { classifyTier } from "./tier-classifier"
import { emptyFacts } from "./types"
import type {
  FounderContext,
  MarketIntelligenceData,
  VerifiedFacts,
  CriterionResult,
  CriterionScoreResult,
  AdversarialResult,
  TierResult,
  AdversarialConviction,
  CategoryDescriptions,
  FinalScoringResult,
} from "./types"

// ---------------------------------------------------------------------------
// Pitch summary builder
// ---------------------------------------------------------------------------

/**
 * Builds the pitchSummary string passed to the adversarial scorer and
 * tier classifier (both Phase 2, running in parallel).
 *
 * Structured so every LLM pass receives:
 *   - Explicit stage (never omitted — defaults to "pre-seed")
 *   - All traction signals including non-revenue ones
 *   - Founder background and domain credibility quote
 *   - 3000-char Exa excerpt (meaningful context without overwhelming token budget)
 *
 * The criterion scorer always receives the FULL dossier directly via its own
 * MarketIntelligenceData parameter — no truncation there.
 */
function buildPitchSummary(
  facts: VerifiedFacts,
  ctx: FounderContext,
  market: MarketIntelligenceData,
): string {
  const founderSectors = ctx.sectors?.length ? ctx.sectors : ["Unknown"]

  const tractionLines: string[] = []
  if (facts.traction.exactQuote) tractionLines.push(facts.traction.exactQuote)
  tractionLines.push(`Revenue: ${facts.traction.hasRevenue ? "Stated" : "Not stated"}`)
  tractionLines.push(`Users: ${facts.traction.hasUsers ? "Stated" : "Not stated"}`)
  tractionLines.push(`Growth rate: ${facts.traction.hasGrowthRate ? "Stated" : "Not stated"}`)
  if (facts.market.competitorsNamed.length > 0)
    tractionLines.push(`Competitors named: ${facts.market.competitorsNamed.join(", ")}`)
  if (facts.market.goliathsIdentified.length > 0)
    tractionLines.push(`Incumbents identified: ${facts.market.goliathsIdentified.join(", ")}`)
  if (facts.market.exactFigure)
    tractionLines.push(`Market figure: ${facts.market.exactFigure}`)

  const exaExcerpt = market.dossier
    ? market.dossier.substring(0, 3000)
    : "Not available"

  return `STARTUP: ${ctx.startupName || "Unknown"}
STAGE: ${ctx.stage || "pre-seed"}
SECTORS: ${founderSectors.join(", ")}
FUNDING ASK: ${ctx.fundingNeed ? `$${ctx.fundingNeed}K` : "Not stated"}

FOUNDER BACKGROUND:
${ctx.bio || "Not provided"}

TRACTION (any signals):
${tractionLines.join("\n")}
Domain credibility: ${facts.team.domainExperienceQuote || "Not stated"}

MARKET CONTEXT (from Exa):
${exaExcerpt}`.trim()
}

// ---------------------------------------------------------------------------
// Category score normalisation (criterion raw → 0-100)
// ---------------------------------------------------------------------------

function normalizeCategoryScores(
  criterionResult: CriterionScoreResult,
): FinalScoringResult["categoryScores"] {
  const s = criterionResult.scoreByCategory
  const norm = (raw: number, max: number) =>
    Math.max(0, Math.min(100, Math.round((raw / max) * 100)))

  return {
    market:        norm(s.market         ?? 0, CATEGORY_MAX.market),
    team:          norm(s.team           ?? 0, CATEGORY_MAX.team),
    traction:      norm(s.traction       ?? 0, CATEGORY_MAX.traction),
    product:       norm(s.product        ?? 0, CATEGORY_MAX.product),
    businessModel: norm(s.business_model ?? 0, CATEGORY_MAX.business_model),
    vision:        norm(s.vision         ?? 0, CATEGORY_MAX.vision),
    crossSection:  norm(s.cross_section  ?? 0, CATEGORY_MAX.cross_section),
  }
}

const FALLBACK_CATEGORY_SCORES: FinalScoringResult["categoryScores"] = {
  market: 50, team: 50, traction: 50, product: 50, businessModel: 50, vision: 50, crossSection: 50,
}

// ---------------------------------------------------------------------------
// Phase 4 — Category description generation (Gemini, runs after scoring)
// ---------------------------------------------------------------------------

const DESCRIPTION_SYSTEM_PROMPT =
`You are a Principal Analyst at a Tier-1 VC firm. Current Date: March 2026. Your task is to critique a startup using the 2026 Institutional Rubric.

BULLET RULES:
- Each bullet MUST contain one concrete data point (a specific dollar amount, competitor name, margin estimate, growth figure, or date)
- Each bullet MUST contain one strategic takeaway derived from that data point
- Bullets should be 1-2 sentences, dense with insight, zero fluff
- If market data is insufficient, say so explicitly

STAGE AWARENESS:
- Evaluate this startup relative to its stage
- A pre-seed startup with strong domain expertise and early traction signals deserves recognition of that potential
- Score and describe what this could become, not just what it is today

SCORING CALIBRATION:
- 90-100: Exceptional — clear outlier, strong signals across the board
- 70-89: Strong — fundable with minor concerns
- 40-69: Developing — needs specific improvements
- 0-39: Critical — major red flags`

/** Normalise one raw category object from the LLM against a fallback. */
function normalizeCategoryDesc(
  raw: any,
  key: string,
  fallback: CategoryDescriptions[keyof Omit<CategoryDescriptions, 'globalVerdict'>],
): { score: number; bullets: string[]; summary: string } {
  const cat = raw?.[key]
  return {
    score:   typeof cat?.score === "number"
      ? Math.max(0, Math.min(100, Math.round(cat.score)))
      : (fallback as any).score,
    bullets: Array.isArray(cat?.bullets) && cat.bullets.length > 0
      ? cat.bullets.slice(0, 4).map(String)
      : (fallback as any).bullets,
    summary: typeof cat?.summary === "string" && cat.summary.trim()
      ? cat.summary.trim()
      : (fallback as any).summary,
  }
}

/** Builds a fallback CategoryDescriptions from adversarial data + score tiers. */
function buildFallbackDescriptions(
  categoryScores: FinalScoringResult["categoryScores"],
  adversarialResult: AdversarialResult | null,
  globalVerdict: string,
): CategoryDescriptions {
  const ok  = (s: string | undefined) => !!(s && !s.toLowerCase().includes("unavailable"))
  const bull = adversarialResult?.bullResult
  const bear = adversarialResult?.bearResult

  function fallbackBullets(
    category: "market" | "moat" | "founderFit" | "momentum",
    score: number,
  ): string[] {
    const tier =
      score >= 80 ? "strong" :
      score >= 60 ? "moderate" :
      score >= 40 ? "developing" : "early"

    if (bull && bear) {
      switch (category) {
        case "market": {
          const out: string[] = []
          const insight = bull.keyInsights.find(s => s.length > 10)
          if (insight)                  out.push(`✓ ${insight}`)
          if (ok(bear.incumbentThreat)) out.push(`~ Incumbent risk: ${bear.incumbentThreat}`)
          if (out.length < 2)           out.push(`Market opportunity appears ${tier} based on pitch content.`)
          return out.slice(0, 3)
        }
        case "moat": {
          const out: string[] = []
          const insight = bull.keyInsights[1] ?? bull.keyInsights[0]
          if (insight)                        out.push(`✓ ${insight}`)
          if (ok(bear.likelyDeathScenario))   out.push(`✗ ${bear.likelyDeathScenario}`)
          if (out.length < 2)                 out.push(`Product defensibility is ${tier} based on the stated approach.`)
          return out.slice(0, 3)
        }
        case "founderFit": {
          const out: string[] = bear.founderRiskFlags
            .filter(f => f.length > 5).slice(0, 2).map(f => `~ ${f}`)
          const positive = bull.keyInsights.slice(-1)[0]
          if (positive) out.push(`✓ ${positive}`)
          if (out.length === 0) out.push(`Founder-market fit is ${tier} based on background presented.`)
          return out.slice(0, 3)
        }
        case "momentum": {
          const out: string[] = []
          if (ok(bull.fundReturnerCase))    out.push(`✓ ${bull.fundReturnerCase}`)
          if (ok(bear.likelyDeathScenario)) out.push(`✗ ${bear.likelyDeathScenario}`)
          if (out.length < 2)               out.push(`Traction signals are ${tier} based on the metrics presented.`)
          return out.slice(0, 3)
        }
      }
    }

    const TIER_DESC: Record<string, Record<string, string>> = {
      market:     { strong: "Market opportunity is well-defined and large enough for a fund-returning outcome.", moderate: "Market opportunity is plausible but size or timing evidence needs strengthening.", developing: "Market scope is unclear — add TAM data and name specific competitors.", early: "Provide a concrete market size figure and identify direct competitors." },
      moat:       { strong: "Product differentiation is clearly articulated and technically defensible.", moderate: "Some product uniqueness is visible, but deeper technical moat evidence would help.", developing: "Differentiation claims need technical backing beyond high-level descriptions.", early: "Explain specifically how your product survives a well-funded competitor entering the space." },
      founderFit: { strong: "Founder background demonstrates strong domain expertise for this problem.", moderate: "Some domain relevance is evident, but direct experience or prior outcomes could be stronger.", developing: "Add named roles, companies, or domain-specific experiences to strengthen founder narrative.", early: "Cite specific prior experiences that uniquely qualify you to solve this problem." },
      momentum:   { strong: "Traction signals are concrete and demonstrate real market demand.", moderate: "Early traction is visible but specific metrics (MRR, users, growth rate) would increase confidence.", developing: "Name paying customers, revenue figures, or signed LOIs to demonstrate momentum.", early: "Any traction metric — even a pilot customer or LOI — would significantly improve this score." },
    }
    return [TIER_DESC[category]?.[tier] ?? "Analysis data unavailable for this category."]
  }

  return {
    market:     { score: categoryScores.market,    bullets: fallbackBullets("market",     categoryScores.market),    summary: "Market analysis based on available signals." },
    moat:       { score: categoryScores.product,   bullets: fallbackBullets("moat",       categoryScores.product),   summary: "Moat analysis based on available signals." },
    founderFit: { score: categoryScores.team,      bullets: fallbackBullets("founderFit", categoryScores.team),      summary: "Founder fit analysis based on available signals." },
    momentum:   { score: categoryScores.traction,  bullets: fallbackBullets("momentum",   categoryScores.traction),  summary: "Momentum analysis based on available signals." },
    globalVerdict,
  }
}

/**
 * Phase 4 of the pipeline — generates rich, Exa-grounded category descriptions
 * using the exact 2026 Institutional Rubric prompt from the original universal
 * analysis engine. Runs after all scoring passes so it has full context.
 *
 * Never throws. On any failure returns the adversarial-derived fallback.
 */
async function generateCategoryDescriptions(
  market: MarketIntelligenceData,
  founder: FounderContext,
  pitchSummary: string,
  pitchType: string,
  adversarialResult: AdversarialResult | null,
  categoryScores: FinalScoringResult["categoryScores"],
  globalVerdict: string,
): Promise<CategoryDescriptions> {
  const fallback = buildFallbackDescriptions(categoryScores, adversarialResult, globalVerdict)

  const unifiedNote =
    pitchType === "UNIFIED"
      ? `

MULTI-SOURCE NOTE: This pitch may include structured Q&A, deck text, and/or a video transcript. Gaps in one source may be covered by another — evaluate holistically.
`
      : ""

  const userPrompt =
`ANALYSIS TYPE: ${pitchType}${unifiedNote}

--- FOUNDER DOSSIER ---
${pitchSummary}

--- MARKET INTELLIGENCE DOSSIER ---
${market.dossier || "(No market intelligence available)"}

Generate descriptions for these four categories. For each provide:
- score: 0-100 (stage-adjusted)
- bullets: 3-4 bullets each with a concrete data point AND strategic takeaway
- summary: one sentence bottom line

Categories:
1. MARKET HEAT (30%): Red/blue ocean analysis using the Exa data. Name specific competitors and funding rounds from the dossier. Identify Goliaths that own the customer relationship.

2. MOAT INTEGRITY (25%): Does this survive GPT-5/6? Look for MCP risks. Evaluate data moats, network effects, regulatory capture. Be specific to this startup's actual approach.

3. FOUNDER-MARKET FIT (20%): Pedigree and technical depth for this niche. A CS student at Brown building a content platform with 15K followers and startup marketing experience IS founder-market fit — recognize it.

4. STRATEGIC MOMENTUM (25%): Traction velocity by 2026 standards. Reference the GRAVEYARD section for failure patterns. Stage-adjust: pre-seed momentum looks different from seed momentum.

5. globalVerdict: 3-5 sentence honest bottom line. Would you write this check? Evaluate potential, not just current state.

Return valid JSON:
{
  "market":     { "score": 0-100, "bullets": ["...", "..."], "summary": "..." },
  "moat":       { "score": 0-100, "bullets": ["...", "..."], "summary": "..." },
  "founderFit": { "score": 0-100, "bullets": ["...", "..."], "summary": "..." },
  "momentum":   { "score": 0-100, "bullets": ["...", "..."], "summary": "..." },
  "globalVerdict": "..."
}`

  try {
    const raw = await openrouterGenerateJson<any>({
      system: DESCRIPTION_SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.4,
      forceOpenRouter: true,
    })

    const descriptions: CategoryDescriptions = {
      market:     normalizeCategoryDesc(raw, "market",     fallback.market),
      moat:       normalizeCategoryDesc(raw, "moat",       fallback.moat),
      founderFit: normalizeCategoryDesc(raw, "founderFit", fallback.founderFit),
      momentum:   normalizeCategoryDesc(raw, "momentum",   fallback.momentum),
      globalVerdict: typeof raw?.globalVerdict === "string" && raw.globalVerdict.trim()
        ? raw.globalVerdict.trim()
        : fallback.globalVerdict,
    }

    logger.log(
      `[SCORING-PIPELINE] Descriptions — ` +
      `market:${descriptions.market.score} moat:${descriptions.moat.score} ` +
      `fit:${descriptions.founderFit.score} momentum:${descriptions.momentum.score}`,
    )

    return descriptions
  } catch (error: any) {
    logger.error("[SCORING-PIPELINE]", "category descriptions failed — using fallback:", error?.message ?? error)
    return fallback
  }
}

// ---------------------------------------------------------------------------
// Conviction derivation (fallback when adversarial result unavailable)
// ---------------------------------------------------------------------------

function convictionFromScore(score: number): AdversarialConviction {
  if (score > 70)  return "HIGH"
  if (score >= 50) return "MEDIUM"
  if (score >= 30) return "LOW"
  return "PASS"
}

/**
 * Keep analyst prose while preventing score drift in the UI/logs.
 * Some model-written verdicts include stale numeric claims that can conflict
 * with the deterministic finalScore computed in TypeScript.
 */
function removeInlineScoreClaims(verdict: string): string {
  if (!verdict) return ""
  return verdict
    // "With a score of 58..." / "score: 58/100" / "scored 58"
    .replace(/\bwith a score of\s+\d{1,3}(?:\/100)?\b[.,;:]?/gi, "")
    .replace(/\bscore\s*[:=]?\s*\d{1,3}(?:\/100)?\b[.,;:]?/gi, "")
    .replace(/\bscored\s+\d{1,3}(?:\/100)?\b[.,;:]?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function buildCalibratedVerdict(
  modelVerdict: string,
  finalScore: number,
  tier: string,
  conviction: AdversarialConviction,
): string {
  const lead = `Calibrated outcome: ${finalScore}/100 (${tier}, ${conviction} conviction).`
  const cleaned = removeInlineScoreClaims(modelVerdict)
  if (!cleaned) return lead
  return `${lead} ${cleaned}`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs the full multi-pass scoring pipeline.
 *
 * @param rawPitch           The raw pitch text as submitted by the founder
 * @param founderContext     Complete founder profile from the database
 * @param marketIntelligence Pre-fetched Exa/Tavily market research
 * @param pitchType          "VIDEO" | "DECK" | "IDEA" | "UNIFIED" | … — fact-extractor + description prompts (default "PITCH")
 */
export async function runScoringPipeline(
  rawPitch: string,
  founderContext: FounderContext,
  marketIntelligence: MarketIntelligenceData,
  pitchType: string = "PITCH",
): Promise<FinalScoringResult> {
  const startTime = Date.now()
  const passesCompleted: string[] = []

  logger.log(`[SCORING-PIPELINE] Starting pipeline for "${founderContext.startupName ?? "unknown"}"`)

  // -------------------------------------------------------------------------
  // Phase 1 — fact extraction (async) + vagueness audit (sync) in parallel
  // -------------------------------------------------------------------------

  const stage = founderContext.stage?.trim() || "pre-seed"

  const [factsResult, vaguenessAudit] = await Promise.all([
    extractVerifiedFacts(rawPitch, founderContext, pitchType).then(f => {
      passesCompleted.push("fact-extraction")
      return f
    }),
    Promise.resolve(auditVagueness(rawPitch, stage)).then(v => {
      passesCompleted.push("vagueness-audit")
      return v
    }),
  ])

  // fact-extractor always returns emptyFacts() on failure — never throws
  const facts: VerifiedFacts = factsResult

  // Build pitch summary once — used by adversarial scorer and tier classifier (both Phase 2)
  const pitchSummary = buildPitchSummary(facts, founderContext, marketIntelligence)

  // -------------------------------------------------------------------------
  // Phase 2 — criterion + adversarial + tier classification (all independent, parallel)
  // -------------------------------------------------------------------------

  const [criterionSettled, adversarialSettled, tierSettled] = await Promise.allSettled([
    scoreByCriteria(facts, marketIntelligence, stage),
    getAdversarialScore(facts, pitchSummary, stage),
    classifyTier(facts, pitchSummary, stage),
  ])

  const criterionResult: CriterionScoreResult | null =
    criterionSettled.status === "fulfilled"
      ? (passesCompleted.push("criterion-scoring"), criterionSettled.value)
      : (logger.error("[SCORING-PIPELINE]", "criterion-scorer rejected:", (criterionSettled as PromiseRejectedResult).reason), null)

  const adversarialResult: AdversarialResult | null =
    adversarialSettled.status === "fulfilled"
      ? (passesCompleted.push("adversarial-scoring"), adversarialSettled.value)
      : (logger.error("[SCORING-PIPELINE]", "adversarial-scorer rejected:", (adversarialSettled as PromiseRejectedResult).reason), null)

  let tierResult: TierResult | null =
    tierSettled.status === "fulfilled"
      ? (passesCompleted.push("tier-classification"), tierSettled.value)
      : (logger.error("[SCORING-PIPELINE]", "tier-classifier rejected:", (tierSettled as PromiseRejectedResult).reason), null)

  // Normalize criterion score to 0-100 for score fusion
  const criterionNormalized: number | null = criterionResult
    ? Math.max(0, Math.round((criterionResult.rawScore / criterionResult.maxPossible) * 100))
    : null

  const adversarialBlended: number | null = adversarialResult?.blendedScore ?? null

  const tierCalibrated: number | null = tierResult?.calibratedScore ?? null

  // -------------------------------------------------------------------------
  // Error resilience — substitute failed passes with average of available scores
  // -------------------------------------------------------------------------

  const available = [criterionNormalized, adversarialBlended, tierCalibrated]
    .filter((s): s is number => s !== null)

  const substitution = available.length > 0
    ? Math.round(available.reduce((a, b) => a + b) / available.length)
    : 50

  const cFinal = criterionNormalized ?? substitution
  const aFinal = adversarialBlended  ?? substitution
  const tFinal = tierCalibrated      ?? substitution

  if (criterionNormalized  === null) logger.warn("[SCORING-PIPELINE]", `criterion substituted with ${substitution}`)
  if (adversarialBlended   === null) logger.warn("[SCORING-PIPELINE]", `adversarial substituted with ${substitution}`)
  if (tierCalibrated       === null) logger.warn("[SCORING-PIPELINE]", `tier substituted with ${substitution}`)

  // -------------------------------------------------------------------------
  // Assemble numeric output fields
  // -------------------------------------------------------------------------

  const categoryScores = criterionResult
    ? normalizeCategoryScores(criterionResult)
    : FALLBACK_CATEGORY_SCORES

  const criterionDetails: CriterionResult[] = criterionResult?.criterionResults ?? []

  const bullCase            = adversarialResult?.bullResult.fundReturnerCase      ?? "Bull case unavailable."
  const bearCase            = adversarialResult?.bearResult.incumbentThreat       ?? "Bear case unavailable."
  const likelyDeathScenario = adversarialResult?.bearResult.likelyDeathScenario   ?? "Failure scenario unavailable."
  const closestComps        = tierResult?.closestAnchors                          ?? ["Average YC W24 company", "Average YC W24 company"] as [string, string]
  const tier                = tierResult?.tier ?? "DEVELOPING"

  const globalVerdict = [bullCase, likelyDeathScenario]
    .filter(s => !s.includes("unavailable"))
    .join(" However, ") || "Analysis complete. Review individual scores for details."

  // -------------------------------------------------------------------------
  // Phase 3 — Rich category descriptions (needs Phase 2 results)
  // -------------------------------------------------------------------------

  let categoryDescriptions: CategoryDescriptions
  let categoryDescsFailed = false
  try {
    categoryDescriptions = await generateCategoryDescriptions(
      marketIntelligence,
      founderContext,
      pitchSummary,
      pitchType,
      adversarialResult,
      categoryScores,
      globalVerdict,
    )
    passesCompleted.push("category-descriptions")
  } catch (error: any) {
    logger.error("[SCORING-PIPELINE]", "category descriptions phase rejected:", error?.message ?? error)
    categoryDescriptions = buildFallbackDescriptions(categoryScores, adversarialResult, globalVerdict)
    categoryDescsFailed = true
  }

  // -------------------------------------------------------------------------
  // Phase 4 — Score fusion (all arithmetic, no LLM)
  // -------------------------------------------------------------------------

  const categoryDescAvg: number | null = !categoryDescsFailed
    ? Math.round(
        (categoryDescriptions.market.score +
         categoryDescriptions.moat.score +
         categoryDescriptions.founderFit.score +
         categoryDescriptions.momentum.score) / 4,
      )
    : null

  let finalScore: number
  let vaguenessAdjustment: number
  const conviction = adversarialResult?.conviction ?? convictionFromScore(cFinal)

  vaguenessAdjustment = Math.max(-10, Math.min(10,
    vaguenessAudit.netAdjustment * 0.15,
  ))

  if (categoryDescAvg !== null) {
    // Full formula (weights sum to 1.0): 0.25 + 0.20 + 0.30 + 0.25 = 1.00
    const rawFusion =
      categoryDescAvg * 0.25 +
      cFinal          * 0.20 +
      aFinal          * 0.30 +
      tFinal          * 0.25

    finalScore = Math.round(
      Math.max(8, Math.min(100, rawFusion + vaguenessAdjustment)),
    )
  } else {
    // Fallback formula (weights sum to 1.0): 0.30 + 0.40 + 0.30 = 1.00
    const rawFusion =
      cFinal * 0.30 +
      aFinal * 0.40 +
      tFinal * 0.30

    finalScore = Math.round(
      Math.max(8, Math.min(100, rawFusion + vaguenessAdjustment)),
    )
  }

  // Ensure verdict text is always aligned with the deterministic fused score.
  const calibratedVerdict = buildCalibratedVerdict(
    categoryDescriptions.globalVerdict,
    finalScore,
    tier,
    conviction,
  )
  categoryDescriptions = {
    ...categoryDescriptions,
    globalVerdict: calibratedVerdict,
  }

  // rubricCompatible now driven entirely by the Exa-grounded description pass
  const rubricCompatible: FinalScoringResult["rubricCompatible"] = {
    categories: {
      market:     { score: categoryDescriptions.market.score,     bullets: categoryDescriptions.market.bullets,     summary: categoryDescriptions.market.summary },
      moat:       { score: categoryDescriptions.moat.score,       bullets: categoryDescriptions.moat.bullets,       summary: categoryDescriptions.moat.summary },
      founderFit: { score: categoryDescriptions.founderFit.score, bullets: categoryDescriptions.founderFit.bullets, summary: categoryDescriptions.founderFit.summary },
      momentum:   { score: categoryDescriptions.momentum.score,   bullets: categoryDescriptions.momentum.bullets,   summary: categoryDescriptions.momentum.summary },
      execution:  null,
    },
    globalVerdict: categoryDescriptions.globalVerdict,
  }

  const scoringDurationMs = Date.now() - startTime

  // ── DEBUG: final score fusion + descriptions ──────────────────────────────
  const formulaUsed = categoryDescAvg !== null ? 'full' : 'fallback'
  console.log(`\n${"═".repeat(72)}`)
  console.log(`  SCORING PIPELINE — FINAL FUSION (formula: ${formulaUsed})`)
  console.log(`${"═".repeat(72)}`)
  console.log(`\n  INPUTS:`)
  if (categoryDescAvg !== null) {
    console.log(`    Category desc avg (Exa):      ${categoryDescAvg}                  → ×0.25 = ${Math.round(categoryDescAvg * 0.25)}`)
  }
  const cWeight = categoryDescAvg !== null ? 0.20 : 0.30
  const aWeight = categoryDescAvg !== null ? 0.30 : 0.40
  const tWeight = categoryDescAvg !== null ? 0.25 : 0.30
  console.log(`    Criterion score (normalized): ${criterionNormalized ?? "FAILED → substituted"} → ×${cWeight} = ${Math.round(cFinal * cWeight)}`)
  console.log(`    Adversarial blended:          ${adversarialBlended  ?? "FAILED → substituted"} → ×${aWeight} = ${Math.round(aFinal * aWeight)}`)
  console.log(`    Tier calibrated:              ${tierCalibrated      ?? "FAILED → substituted"} → ×${tWeight} = ${Math.round(tFinal * tWeight)}`)
  console.log(`    Vagueness adjustment:         ${vaguenessAudit.netAdjustment}               → capped: ${vaguenessAdjustment}`)
  console.log(`\n  STAGE: ${stage}  |  PITCH TYPE: ${pitchType}`)
  console.log(`  CATEGORY SCORES (0-100, from criterion pass):`)
  console.log(`    Market:         ${categoryScores.market}`)
  console.log(`    Team:           ${categoryScores.team}`)
  console.log(`    Traction:       ${categoryScores.traction}`)
  console.log(`    Product:        ${categoryScores.product}`)
  console.log(`    Business Model: ${categoryScores.businessModel}`)
  console.log(`    Vision:         ${categoryScores.vision}`)
  console.log(`    Cross-Section:  ${categoryScores.crossSection}`)
  console.log(`\n  TIER: ${tier}  |  CONVICTION: ${conviction}`)
  console.log(`  CLOSEST COMPS: ${closestComps.join(" vs ")}`)
  console.log(`\n  VAGUENESS FLAGS (${vaguenessAudit.penaltiesFound.length}):`)
  vaguenessAudit.penaltiesFound.forEach(p => console.log(`    ✗ "${p.matchedText}" → ${p.penalty} pts  (${p.reason})`))
  console.log(`  EVIDENCE BONUSES (${vaguenessAudit.bonusesFound.length}):`)
  vaguenessAudit.bonusesFound.forEach(b => console.log(`    ✓ "${b.pattern}" → +${b.bonus} pts  (${b.reason})`))
  console.log(`\n  ★ FINAL SCORE: ${finalScore}/100`)
  console.log(`  GLOBAL VERDICT: ${categoryDescriptions.globalVerdict}`)
  console.log(`\n  CATEGORY DESCRIPTIONS (Phase 3):`)
  console.log(`    MARKET HEAT      (score ${categoryDescriptions.market.score}): "${categoryDescriptions.market.summary}"`)
  categoryDescriptions.market.bullets.forEach(b => console.log(`      • ${b}`))
  console.log(`    MOAT INTEGRITY   (score ${categoryDescriptions.moat.score}): "${categoryDescriptions.moat.summary}"`)
  categoryDescriptions.moat.bullets.forEach(b => console.log(`      • ${b}`))
  console.log(`    FOUNDER-MKT FIT  (score ${categoryDescriptions.founderFit.score}): "${categoryDescriptions.founderFit.summary}"`)
  categoryDescriptions.founderFit.bullets.forEach(b => console.log(`      • ${b}`))
  console.log(`    STRATEGIC MOMEN  (score ${categoryDescriptions.momentum.score}): "${categoryDescriptions.momentum.summary}"`)
  categoryDescriptions.momentum.bullets.forEach(b => console.log(`      • ${b}`))
  console.log(`  Duration: ${scoringDurationMs}ms  |  Passes: [${passesCompleted.join(", ")}]`)
  console.log(`${"═".repeat(72)}\n`)
  // ── END DEBUG ─────────────────────────────────────────────────────────────

  logger.log(
    `[SCORING-PIPELINE] Complete in ${scoringDurationMs}ms — ` +
    `final:${finalScore} tier:${tier} conviction:${conviction} ` +
    `passes:[${passesCompleted.join(", ")}]`,
  )

  return {
    finalScore,
    scoreBreakdown: {
      categoryDescContribution: categoryDescAvg !== null
        ? Math.round(categoryDescAvg * 0.25) : null,
      criterionContribution:   Math.round(cFinal * (categoryDescAvg !== null ? 0.20 : 0.30)),
      adversarialContribution: Math.round(aFinal * (categoryDescAvg !== null ? 0.30 : 0.40)),
      tierContribution:        Math.round(tFinal * (categoryDescAvg !== null ? 0.25 : 0.30)),
      vaguenessAdjustment,
      categoryDescAvg,
      formulaUsed: categoryDescAvg !== null ? 'full' : 'fallback',
    },
    tier,
    conviction,
    categoryScores,
    bullCase,
    bearCase,
    likelyDeathScenario,
    closestComps,
    criterionDetails,
    vaguenessFlags: vaguenessAudit.penaltiesFound.map(p => ({
      text:    p.matchedText,
      penalty: p.penalty,
      reason:  p.reason,
    })),
    evidenceBonuses: vaguenessAudit.bonusesFound.map(b => ({
      text:   b.pattern,
      bonus:  b.bonus,
      reason: b.reason,
    })),
    redFlags: facts.redFlags,
    categoryDescriptions,
    pipelineVersion: "2.0",
    scoringDurationMs,
    passesCompleted,
    rubricCompatible,
  }
}
