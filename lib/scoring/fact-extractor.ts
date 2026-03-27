/**
 * ===============================================================================
 * SCORING PIPELINE — STEP 1: FACT EXTRACTOR
 * ===============================================================================
 *
 * Extracts ONLY verifiable claims from a startup pitch.
 * Never infers, never gives benefit of the doubt.
 *
 * Model: DeepSeek Chat via OpenRouter (free), temperature 0.1
 * Input:  raw pitch text + FounderContext (structured profile data)
 * Output: VerifiedFacts — every field is either a concrete quote/value or null/false
 */

import { openrouterGenerateJson } from "../openrouter"
import { logger } from "../logger"
import { emptyFacts } from "./types"
import type { FounderContext, VerifiedFacts } from "./types"

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  "You are a fact-checker, not an analyst. Extract only what is explicitly stated. " +
  "If a claim is not backed by a specific name, number, or quote, mark it as not stated. " +
  "Never infer. Never give benefit of the doubt. Return valid JSON only."

const JSON_SCHEMA = `{
  "traction": {
    "stated": <true if any specific traction metric is mentioned, else false>,
    "exactQuote": <verbatim quote of the single most specific traction claim, or null>,
    "hasRevenue": <true only if a specific revenue figure or named paying customers are mentioned>,
    "hasUsers": <true only if a specific user or customer count is mentioned>,
    "hasGrowthRate": <true only if a growth rate with an explicit timeframe is mentioned>
  },
  "team": {
    "stated": <true if team credentials are mentioned with specifics — named role, company, or degree>,
    "domainExperienceQuote": <verbatim quote of domain experience naming a role or company, or null>,
    "priorExitsQuote": <verbatim quote of a prior exit, acquisition, or founding, or null>,
    "technicalDepthQuote": <verbatim quote explaining specific technical work beyond 'AI-powered', or null>
  },
  "market": {
    "sizeStated": <true only if a specific numeric market size figure (TAM/SAM/SOM) is given>,
    "exactFigure": <the specific market size figure as literally stated, e.g. "$4.2B TAM", or null>,
    "competitorsNamed": <array of specifically named competitor companies — empty array if none named>,
    "goliathsIdentified": <array of large incumbent companies explicitly mentioned — empty array if none>
  },
  "product": {
    "differentiatorStated": <true if a specific technical or structural differentiator is named, not just claimed>,
    "techExplained": <true if the underlying technology is explained beyond generic labels like 'AI-powered' or 'proprietary'>,
    "wedgeCustomerNamed": <true if a specific customer segment, job title, company type, or named customer is identified>
  },
  "businessModel": {
    "revenueModelClear": <true if how the company makes money is explicitly stated, e.g. SaaS subscription, transaction fee>,
    "unitEconomicsStated": <true if CAC, LTV, gross margin, or unit-level economics with numbers are mentioned>,
    "pricingMentioned": <true if specific pricing such as '$X per month' or '$Y per seat' is mentioned>
  },
  "redFlags": <array of vague buzzword phrases found WITH NO backing data — scan for: 'large market', 'massive market', 'proprietary tech', 'proprietary algorithm', 'experienced team', 'strong team', 'no real competitors', 'first mover', 'growing fast', 'rapid growth', 'AI-powered', 'disruptive', 'revolutionary', 'transforming' — only include a phrase if it appears WITHOUT specific evidence supporting it>
}`

const UNIFIED_FACT_NOTE =
  "This pitch was submitted from multiple sources (STRUCTURED Q&A, PITCH DECK, VIDEO TRANSCRIPT). " +
  "Gaps in one source may be covered by another — evaluate holistically. " +
  "Extract verified facts from EVERY present section with equal weight; do not stop after the first section. " +
  "Scan the full pitch text below from start to end."

function buildUserPrompt(pitch: string, ctx: FounderContext, pitchType: string = "PITCH"): string {
  const profileLines: string[] = []

  if (ctx.startupName)           profileLines.push(`Startup name: ${ctx.startupName}`)
  if (ctx.stage)                 profileLines.push(`Stage: ${ctx.stage}`)
  if (ctx.sectors?.length)       profileLines.push(`Sectors: ${ctx.sectors.join(", ")}`)
  if (ctx.location)              profileLines.push(`Location: ${ctx.location}`)
  if (ctx.businessModel)         profileLines.push(`Business model (from profile): ${ctx.businessModel}`)
  if (ctx.education)             profileLines.push(`Education: ${ctx.education}`)
  if (ctx.universityAffiliation) profileLines.push(`University: ${ctx.universityAffiliation}`)
  if (ctx.techBackground)        profileLines.push(`Technical background: yes`)
  if (ctx.isStudent)             profileLines.push(`Currently a student founder`)
  if (ctx.cofounders)            profileLines.push(`Co-founders: ${ctx.cofounders}`)
  if (ctx.prevFunding && ctx.prevFunding !== "none") profileLines.push(`Previous funding: ${ctx.prevFunding}`)
  if (ctx.revenue)               profileLines.push(`Revenue on profile: ${ctx.revenue}`)
  if (ctx.users)                 profileLines.push(`Users on profile: ${ctx.users}`)
  if (ctx.growthRate)            profileLines.push(`Growth rate on profile: ${ctx.growthRate}`)
  if (ctx.teamSize)              profileLines.push(`Team size: ${ctx.teamSize}`)
  if (ctx.fundingNeed)           profileLines.push(`Raising: $${ctx.fundingNeed}K`)
  if (ctx.bio)                   profileLines.push(`Bio: ${ctx.bio.substring(0, 400)}`)

  const unifiedHeader =
    pitchType === "UNIFIED"
      ? `${UNIFIED_FACT_NOTE}

The pitch contains labeled sections: STRUCTURED Q&A:, PITCH DECK:, and/or VIDEO TRANSCRIPT:. Treat all sections as equally valid evidence for fact extraction.

`
      : ""

  const pitchLabel =
    pitchType === "UNIFIED"
      ? "MULTI-SOURCE PITCH TEXT (extract facts from ALL sections — full scan required):"
      : "PITCH TEXT (primary source — extract facts from here):"

  return `${unifiedHeader}FOUNDER PROFILE (structured data — use as supporting context only):
${profileLines.length > 0 ? profileLines.join("\n") : "(no additional profile data)"}

${pitchLabel}
${pitch.substring(0, 15000)}

Do NOT score anything. Do NOT evaluate quality. Only extract verifiable facts.
For each field, if the information is absent or vague, return null or false.
Vague phrases like 'strong traction' or 'big market' count as NOT STATED.

Return a JSON object with this exact shape:
${JSON_SCHEMA}`
}

// ---------------------------------------------------------------------------
// Normalise raw LLM output into a typed VerifiedFacts object
// ---------------------------------------------------------------------------

function normalizeRaw(raw: any): VerifiedFacts {
  return {
    traction: {
      stated:        Boolean(raw?.traction?.stated),
      exactQuote:    typeof raw?.traction?.exactQuote === "string" ? raw.traction.exactQuote : null,
      hasRevenue:    Boolean(raw?.traction?.hasRevenue),
      hasUsers:      Boolean(raw?.traction?.hasUsers),
      hasGrowthRate: Boolean(raw?.traction?.hasGrowthRate),
    },
    team: {
      stated:                Boolean(raw?.team?.stated),
      domainExperienceQuote: typeof raw?.team?.domainExperienceQuote === "string" ? raw.team.domainExperienceQuote : null,
      priorExitsQuote:       typeof raw?.team?.priorExitsQuote === "string"       ? raw.team.priorExitsQuote       : null,
      technicalDepthQuote:   typeof raw?.team?.technicalDepthQuote === "string"   ? raw.team.technicalDepthQuote   : null,
    },
    market: {
      sizeStated:          Boolean(raw?.market?.sizeStated),
      exactFigure:         typeof raw?.market?.exactFigure === "string" ? raw.market.exactFigure : null,
      competitorsNamed:    Array.isArray(raw?.market?.competitorsNamed)   ? raw.market.competitorsNamed.map(String)   : [],
      goliathsIdentified:  Array.isArray(raw?.market?.goliathsIdentified) ? raw.market.goliathsIdentified.map(String) : [],
    },
    product: {
      differentiatorStated: Boolean(raw?.product?.differentiatorStated),
      techExplained:        Boolean(raw?.product?.techExplained),
      wedgeCustomerNamed:   Boolean(raw?.product?.wedgeCustomerNamed),
    },
    businessModel: {
      revenueModelClear:    Boolean(raw?.businessModel?.revenueModelClear),
      unitEconomicsStated:  Boolean(raw?.businessModel?.unitEconomicsStated),
      pricingMentioned:     Boolean(raw?.businessModel?.pricingMentioned),
    },
    redFlags: Array.isArray(raw?.redFlags) ? raw.redFlags.map(String) : [],
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Step 1 of the scoring pipeline.
 *
 * Extracts only what is explicitly and verifiably stated in the pitch.
 * On any failure returns a conservative all-false/null object so downstream
 * passes can still run with a penalty bias rather than crashing.
 */
export async function extractVerifiedFacts(
  pitch: string,
  founderContext: FounderContext,
  pitchType: string = "PITCH",
): Promise<VerifiedFacts> {
  logger.log("[FACT-EXTRACTOR] Starting fact extraction")

  try {
    const raw = await openrouterGenerateJson<any>({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(pitch, founderContext, pitchType),
      temperature: 0.1,
    })

    const facts = normalizeRaw(raw)

    // ── DEBUG: extracted facts ─────────────────────────────────────────────
    console.log(`\n${"═".repeat(72)}`)
    console.log(`  FACT EXTRACTOR — VERIFIED FACTS`)
    console.log(`${"═".repeat(72)}`)
    console.log(`  TRACTION`)
    console.log(`    stated:        ${facts.traction.stated}`)
    console.log(`    exactQuote:    ${facts.traction.exactQuote ?? "(none)"}`)
    console.log(`    hasRevenue:    ${facts.traction.hasRevenue}`)
    console.log(`    hasUsers:      ${facts.traction.hasUsers}`)
    console.log(`    hasGrowthRate: ${facts.traction.hasGrowthRate}`)
    console.log(`  TEAM`)
    console.log(`    stated:              ${facts.team.stated}`)
    console.log(`    domainExperience:    ${facts.team.domainExperienceQuote ?? "(none)"}`)
    console.log(`    priorExits:          ${facts.team.priorExitsQuote ?? "(none)"}`)
    console.log(`    technicalDepth:      ${facts.team.technicalDepthQuote ?? "(none)"}`)
    console.log(`  MARKET`)
    console.log(`    sizeStated:          ${facts.market.sizeStated}`)
    console.log(`    exactFigure:         ${facts.market.exactFigure ?? "(none)"}`)
    console.log(`    competitors named:   [${facts.market.competitorsNamed.join(", ") || "none"}]`)
    console.log(`    goliaths:            [${facts.market.goliathsIdentified.join(", ") || "none"}]`)
    console.log(`  PRODUCT`)
    console.log(`    differentiatorStated: ${facts.product.differentiatorStated}`)
    console.log(`    techExplained:        ${facts.product.techExplained}`)
    console.log(`    wedgeCustomerNamed:   ${facts.product.wedgeCustomerNamed}`)
    console.log(`  BUSINESS MODEL`)
    console.log(`    revenueModelClear:    ${facts.businessModel.revenueModelClear}`)
    console.log(`    unitEconomicsStated:  ${facts.businessModel.unitEconomicsStated}`)
    console.log(`    pricingMentioned:     ${facts.businessModel.pricingMentioned}`)
    if (facts.redFlags.length > 0) {
      console.log(`  RED FLAGS (${facts.redFlags.length}): ${facts.redFlags.join(" | ")}`)
    } else {
      console.log(`  RED FLAGS: none`)
    }
    console.log(`${"═".repeat(72)}\n`)
    // ── END DEBUG ──────────────────────────────────────────────────────────

    logger.log(
      `[FACT-EXTRACTOR] Complete — ` +
      `traction:${facts.traction.stated} team:${facts.team.stated} ` +
      `market:${facts.market.sizeStated} competitors:${facts.market.competitorsNamed.length} ` +
      `redFlags:${facts.redFlags.length}`,
    )

    return facts
  } catch (error: any) {
    logger.error("[FACT-EXTRACTOR]", "Extraction failed — returning empty facts:", error?.message ?? error)
    return emptyFacts()
  }
}
