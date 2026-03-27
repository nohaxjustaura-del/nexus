/**
 * ===============================================================================
 * SCORING PIPELINE — STEP 2: CRITERION SCORER
 * ===============================================================================
 *
 * Evaluates 24 binary/ternary criteria against VerifiedFacts.
 * The LLM answers YES / PARTIAL / NO for each criterion — it never produces
 * a final score. All arithmetic is computed in TypeScript.
 *
 * Categories (7 positive + 1 penalty):
 *   Market (30), Team (30), Traction (25 capped), Product (28),
 *   Business Model (20), Vision (15), Cross-Section (20)
 *
 * Traction cap: traction_1+2+3+4 are summed then clamped to 25.
 * maxPossible:  175 (before typical penalties).
 *
 * Model: DeepSeek Chat via OpenRouter (free), temperature 0.1
 * Input:  VerifiedFacts + MarketIntelligenceData (Exa dossier)
 * Output: CriterionScoreResult
 */

import { openrouterGenerateJson } from "../openrouter"
import { logger } from "../logger"
import type {
  VerifiedFacts,
  MarketIntelligenceData,
  Criterion,
  CriterionAnswer,
  CriterionResult,
  CriterionScoreResult,
} from "./types"

// ---------------------------------------------------------------------------
// Build criteria (stage-aware — some hints interpolate the stage parameter)
// ---------------------------------------------------------------------------

export function buildCriteria(stage: string): Criterion[] {
  return [
    // ── MARKET (max 30 pts) ───────────────────────────────────────────────
    {
      id: 'market_1',
      category: 'market',
      question: 'Is this a real market where buyers already spend money today, not a future imagined category?',
      points: { YES: 8, PARTIAL: 4, NO: 0 },
      evaluationHint:
        'Look for evidence of existing spend, current solutions being paid for, or active buyer behavior. ' +
        '"Content creation tools" is a real market. "AI-native workflow orchestration for the future of work" is not yet real.',
    },
    {
      id: 'market_2',
      category: 'market',
      question: 'Is the market large enough that strong execution could justify venture interest, adjusted for this stage?',
      points: { YES: 8, PARTIAL: 4, NO: 0 },
      evaluationHint:
        `Stage-tiered threshold:\n` +
        `  pre-idea/idea/pre-seed: Could this plausibly reach $100M+ addressable market?\n` +
        `  seed: Could 0.1% share = $5M+ ARR?\n` +
        `  series-a and above: Could 0.1% share = $10M+ ARR?\n` +
        `  Apply the threshold for stage: ${stage}.\n` +
        `  PARTIAL if market size is implied but not supported.`,
    },
    {
      id: 'market_3',
      category: 'market',
      question: 'Does the founder show appropriate competitive awareness for this market?',
      points: { YES: 7, PARTIAL: 3, NO: 0 },
      evaluationHint:
        `Use this logic in order:\n` +
        `  1. If market.competitorsNamed is non-empty AND Exa confirms competitors exist: YES\n` +
        `  2. If Exa market research shows NO clear competitors in the space: YES (blue ocean)\n` +
        `  3. If Exa market research shows competitors BUT market.competitorsNamed is empty: NO\n` +
        `  4. If Exa data is unavailable or thin: PARTIAL\n` +
        `  Never penalize for not naming competitors if Exa found none.`,
    },
    {
      id: 'market_4',
      category: 'market',
      question: 'Is there a credible "why now" — a timing catalyst, technology shift, regulation change, or behavior change that makes this the right moment?',
      points: { YES: 7, PARTIAL: 3, NO: 0 },
      evaluationHint:
        'Look for: AI capability inflection, post-pandemic behavior shifts, new regulation, platform changes, cost curve changes. ' +
        'Generic "AI is growing" does not count. Specific catalysts do.',
    },

    // ── TEAM (max 30 pts) ─────────────────────────────────────────────────
    {
      id: 'team_1',
      category: 'team',
      question: 'Does the founder demonstrate direct domain experience — lived the problem, worked in the space, or has credible personal insight into the customer pain?',
      points: { YES: 10, PARTIAL: 5, NO: 0 },
      evaluationHint:
        'Personal experience as a user counts. Prior work in the industry counts. ' +
        'Having 15K followers as a content creator building a content tool counts. ' +
        'Generic "passion for the space" does not count.',
    },
    {
      id: 'team_2',
      category: 'team',
      question: 'Is there technical depth on the team appropriate for what they are building?',
      points: { YES: 8, PARTIAL: 4, NO: 0 },
      evaluationHint:
        'ANY of these count as YES:\n' +
        '  - CS or engineering degree (current student counts)\n' +
        '  - CTO or technical co-founder title\n' +
        '  - Named technical role at a prior company\n' +
        '  - Specific technical skills mentioned (ML, systems, infrastructure)\n' +
        '  - Prior technical products built\n' +
        'PARTIAL = technical background implied but not specified.\n' +
        'Check team.technicalDepthQuote AND check if the transcript mentions ' +
        'CS student, CTO, engineering background — these are strong signals.',
    },
    {
      id: 'team_3',
      category: 'team',
      question: 'Do the founders have complementary skills that fit the company they are building?',
      points: { YES: 7, PARTIAL: 3, NO: 0 },
      evaluationHint:
        'A business/domain founder paired with a technical founder for a technical product = YES. ' +
        'A solo founder covering both adequately = PARTIAL. ' +
        'Two founders with identical non-technical backgrounds building a technical product = NO.',
    },
    {
      id: 'team_4',
      category: 'team',
      question: 'Does the founder-market fit story feel specific and earned rather than generic?',
      points: { YES: 5, PARTIAL: 2, NO: 0 },
      evaluationHint:
        'Specific personal story + relevant experience = YES. ' +
        '"We are passionate about this space" with no backing = NO. ' +
        'A founder who is clearly the target customer = YES.',
    },

    // ── TRACTION (max 25 pts — enforce cap in TypeScript) ─────────────────
    {
      id: 'traction_1',
      category: 'traction',
      question: 'Is there evidence of real market pull appropriate for this stage?',
      points: { YES: 15, PARTIAL: 9, NO: 0 },
      evaluationHint:
        `Stage-graduated evidence thresholds:\n` +
        `  pre-idea/idea: YES = any external validation (interviews, waitlist, LOI)\n` +
        `  pre-seed: YES = paying clients OR active pilots OR 500+ real users\n` +
        `             PARTIAL = social following, community, informal interest\n` +
        `  seed: YES = revenue or 500+ active users with retention signal\n` +
        `        PARTIAL = pilots only, no revenue yet\n` +
        `  series-a+: YES = meaningful MRR with growth rate\n` +
        `  Apply for stage: ${stage}.\n` +
        `  traction.exactQuote showing two paying startup clients at pre-seed = YES.`,
    },
    {
      id: 'traction_2',
      category: 'traction',
      question: 'Is there a specific concrete metric stated — any kind of real number?',
      points: { YES: 10, PARTIAL: 4, NO: 0 },
      evaluationHint:
        'ANY number counts: revenue, users, views, followers, growth rate, pilot count, conversion rate, NPS. ' +
        'PARTIAL = vague quantitative language without a specific figure. ' +
        'The goal is specificity, not metric type.',
    },
    {
      id: 'traction_3',
      category: 'traction',
      question: 'Has the product been used to produce real output for real customers or users?',
      points: { YES: 8, PARTIAL: 3, NO: 0 },
      evaluationHint:
        'Working product that has generated deliverables = YES. Live product with users = YES. ' +
        'Prototype with internal testing only = PARTIAL. Idea stage with no product = NO. ' +
        'Video content produced for paying clients = YES.',
    },
    {
      id: 'traction_4',
      category: 'traction',
      question: 'Are the founders measuring signals that actually matter for their stage, not just vanity metrics?',
      points: { YES: 5, PARTIAL: 2, NO: 0 },
      evaluationHint:
        'At pre-seed: client count, product usage, qualitative feedback = meaningful. ' +
        'At seed: retention, conversion, MRR = meaningful. ' +
        'Follower count at any stage past seed = vanity unless directly tied to business model. ' +
        'PARTIAL if metric mix is reasonable but incomplete.',
    },

    // ── PRODUCT (max 28 pts) ──────────────────────────────────────────────
    {
      id: 'product_1',
      category: 'product',
      question: 'Is a product differentiator clearly claimed, even if not yet technically explained?',
      points: { YES: 6, PARTIAL: 3, NO: 0 },
      evaluationHint:
        'A specific functional claim counts as YES even without technical depth. ' +
        '"Cuts video production time in half" = YES. "Better than existing tools" = PARTIAL. ' +
        'No differentiation claim at all = NO. Do not require technical explanation here — that is product_2.',
    },
    {
      id: 'product_2',
      category: 'product',
      question: 'Is the technical mechanism behind the differentiator explained well enough to be believable?',
      points: { YES: 8, PARTIAL: 3, NO: 0 },
      evaluationHint:
        'How does it actually work? A specific technical explanation = YES. ' +
        'A vague gesture at AI/ML = PARTIAL. No explanation whatsoever = NO. ' +
        'For early-stage pitches, reduce penalty: pre-seed NO counts as 0 not a flag.',
    },
    {
      id: 'product_3',
      category: 'product',
      question: 'Would this product still have meaningful value if a frontier AI model added similar functionality natively?',
      points: { YES: 8, PARTIAL: 4, NO: 0 },
      evaluationHint:
        'Look for: workflow integration, proprietary data, customer relationships, switching costs, speed/specialization advantages. ' +
        'A thin wrapper on an API with no workflow lock-in = NO. A deeply embedded workflow tool = YES.',
    },
    {
      id: 'product_4',
      category: 'product',
      question: 'Has the product been embedded into a real customer workflow in a way that begins to create switching cost?',
      points: { YES: 6, PARTIAL: 3, NO: 0 },
      evaluationHint:
        "Running a client's ongoing content = embedded workflow = YES. " +
        'A one-time tool usage = NO. Partial integration into a recurring process = PARTIAL.',
    },

    // ── BUSINESS MODEL (max 20 pts) ───────────────────────────────────────
    {
      id: 'biz_1',
      category: 'business_model',
      question: 'Is the revenue model explicitly stated or clearly implied by the business description?',
      points: { YES: 8, PARTIAL: 4, NO: 0 },
      evaluationHint:
        'Explicit = price mentioned, subscription/transaction/service described. ' +
        'Implied = "done for you service" implies retainer, "marketplace" implies take rate. ' +
        'No model implied at all = NO. Give PARTIAL credit for implied models — do not require explicit pricing at pre-seed.',
    },
    {
      id: 'biz_2',
      category: 'business_model',
      question: 'Is it clear who actually pays — the buyer — and why they would open their wallet?',
      points: { YES: 7, PARTIAL: 3, NO: 0 },
      evaluationHint:
        'Distinguish buyer from end user. "Startups pay for content creation services" is clear. ' +
        '"We help creators" is unclear about who pays. A B2B2C model should identify the business buyer.',
    },
    {
      id: 'biz_3',
      category: 'business_model',
      question: 'Is the funding ask proportional to the stage and what the company plans to do with the capital?',
      points: { YES: 5, PARTIAL: 2, NO: 0 },
      evaluationHint:
        'Pre-seed asking $500K-$2M for MVP and initial traction = YES. ' +
        'Pre-seed asking $20M = NO. No ask stated = PARTIAL (not stated ≠ wrong, just unevaluable).',
    },

    // ── VISION (max 15 pts) ───────────────────────────────────────────────
    {
      id: 'vision_1',
      category: 'vision',
      question: 'Does the founder articulate a vision larger than the initial product or service?',
      points: { YES: 8, PARTIAL: 4, NO: 0 },
      evaluationHint:
        'Is there a sense of where this goes beyond the current offering? A platform play, a category creation, ' +
        'a larger market unlock? The initial product is the wedge — the vision is what it becomes. PARTIAL if implied but not stated.',
    },
    {
      id: 'vision_2',
      category: 'vision',
      question: 'Is the company entering through a narrow, believable wedge before expanding broader?',
      points: { YES: 7, PARTIAL: 3, NO: 0 },
      evaluationHint:
        '"Startups who need video content" is a credible narrow wedge. "All content creators everywhere" is too broad to start. ' +
        'A specific initial customer + expansion path = YES. Starting too broad with no clear wedge = NO.',
    },

    // ── CROSS-SECTION (max 20 pts) ────────────────────────────────────────
    {
      id: 'cross_1',
      category: 'cross_section',
      question: 'Would a smart investor likely want to take a second meeting with this company today?',
      points: { YES: 6, PARTIAL: 3, NO: 0 },
      evaluationHint:
        'Holistic judgment. Even if the pitch has gaps, is there enough signal — team, market, early traction, insight — ' +
        'that a rational investor would want to learn more? This is the single most important question.',
    },
    {
      id: 'cross_2',
      category: 'cross_section',
      question: "Is the company's weakest area realistically fixable within the next 60-90 days?",
      points: { YES: 5, PARTIAL: 2, NO: 0 },
      evaluationHint:
        'Missing revenue model? Fixable. Missing technical co-founder? Hard to fix. No market? Not fixable. ' +
        'No traction yet but product exists? Fixable. Score honestly — this separates fundable-now from fundable-later.',
    },
    {
      id: 'cross_3',
      category: 'cross_section',
      question: 'Does the pitch contain at least one element strong enough to genuinely excite a domain-relevant investor?',
      points: { YES: 5, PARTIAL: 2, NO: 0 },
      evaluationHint:
        'Not just "interesting" — genuinely exciting. Exceptional traction for stage, remarkable founder insight, ' +
        'unique timing advantage, or clear unfair advantage. If you cannot name the exciting element, score NO.',
    },
    {
      id: 'cross_4',
      category: 'cross_section',
      question: 'Is this company early but directionally promising — showing the right signals for its stage even if not yet complete?',
      points: { YES: 4, PARTIAL: 2, NO: 0 },
      evaluationHint:
        'This is the potential question. A pre-seed startup should not be held to Series A standards. ' +
        'Are the signals — team quality, problem clarity, early traction, market awareness — pointing in the right direction for this stage?',
    },

    // ── PENALTIES (subtracted from total) ────────────────────────────────
    {
      id: 'penalty_1',
      category: 'penalty',
      question: 'Is the pitch specific enough to evaluate, or could this exact description apply to 100 different companies?',
      points: { YES: 0, PARTIAL: -5, NO: -15 },
      evaluationHint:
        'A pitch with named clients, specific metrics, and a clear product claim is specific. ' +
        'A pitch that says "we use AI to help businesses grow" is generic. ' +
        'Score YES if specific, PARTIAL if somewhat generic, NO if completely interchangeable.',
    },
    {
      id: 'penalty_2',
      category: 'penalty',
      question: 'Does the pitch avoid hype language and unsupported superlatives?',
      points: { YES: 0, PARTIAL: -5, NO: -12 },
      evaluationHint:
        'Penalize: "revolutionary", "massive market" without numbers, "no real competitors" when Exa found some, ' +
        '"proprietary AI" without explanation, "disrupting" without mechanism. ' +
        'PARTIAL = some hype but mostly grounded. NO = hype-heavy throughout.',
    },
  ]
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  "You are a rigorous investment analyst. You will be given structured facts already extracted " +
  "from a startup pitch plus Exa market research. Evaluate each criterion by answering YES, PARTIAL, " +
  "or NO based ONLY on the evidence provided. Do not infer. Do not give benefit of the doubt. " +
  "Give exactly one sentence of justification per criterion, citing the specific field or quote " +
  "that supports your answer. Do NOT produce any final score or total. Return valid JSON only."

function formatFactsAsText(facts: VerifiedFacts): string {
  const lines: string[] = ["FOUNDER-STATED FACTS:"]

  lines.push(`  traction.stated:        ${facts.traction.stated}`)
  lines.push(`  traction.exactQuote:    ${facts.traction.exactQuote ?? "(none)"}`)
  lines.push(`  traction.hasRevenue:    ${facts.traction.hasRevenue}`)
  lines.push(`  traction.hasUsers:      ${facts.traction.hasUsers}`)
  lines.push(`  traction.hasGrowthRate: ${facts.traction.hasGrowthRate}`)

  lines.push(`  team.stated:                  ${facts.team.stated}`)
  lines.push(`  team.domainExperienceQuote:   ${facts.team.domainExperienceQuote ?? "(none)"}`)
  lines.push(`  team.priorExitsQuote:         ${facts.team.priorExitsQuote ?? "(none)"}`)
  lines.push(`  team.technicalDepthQuote:     ${facts.team.technicalDepthQuote ?? "(none)"}`)

  lines.push(`  market.sizeStated:         ${facts.market.sizeStated}`)
  lines.push(`  market.exactFigure:        ${facts.market.exactFigure ?? "(none)"}`)
  lines.push(`  market.competitorsNamed:   [${facts.market.competitorsNamed.join(", ") || "none"}]`)
  lines.push(`  market.goliathsIdentified: [${facts.market.goliathsIdentified.join(", ") || "none"}]`)

  lines.push(`  product.differentiatorStated: ${facts.product.differentiatorStated}`)
  lines.push(`  product.techExplained:        ${facts.product.techExplained}`)
  lines.push(`  product.wedgeCustomerNamed:   ${facts.product.wedgeCustomerNamed}`)

  lines.push(`  businessModel.revenueModelClear:   ${facts.businessModel.revenueModelClear}`)
  lines.push(`  businessModel.unitEconomicsStated: ${facts.businessModel.unitEconomicsStated}`)
  lines.push(`  businessModel.pricingMentioned:    ${facts.businessModel.pricingMentioned}`)

  lines.push(
    `  redFlags (${facts.redFlags.length}): ${facts.redFlags.length ? facts.redFlags.join(" | ") : "(none)"}`,
  )

  return lines.join("\n")
}

function buildUserPrompt(criteria: Criterion[], facts: VerifiedFacts, market: MarketIntelligenceData, stage: string): string {
  const criteriaBlock = criteria.map(c =>
    `[${c.id}] ${c.question}\n` +
    `  Points — YES: ${c.points.YES}, PARTIAL: ${c.points.PARTIAL}, NO: ${c.points.NO}\n` +
    `  Evaluation hint: ${c.evaluationHint}`
  ).join("\n\n")

  const stageContext = `STAGE CONTEXT: This founder is at the "${stage}" stage.
Evaluate all criteria relative to what is reasonable and impressive FOR THIS STAGE. A pre-seed founder with 15K social followers and domain expertise is demonstrating strong traction signals for their stage. A seed founder with $50K MRR is demonstrating strong traction for their stage. Do not penalize early-stage founders for not having metrics that are only expected at later stages.

STAGE CALIBRATION GUIDE:
- pre-idea / idea: Strong = clear problem insight + domain expertise
- pre-seed: Strong = early users OR domain credibility + working prototype
- seed: Strong = some revenue OR 1000+ users + clear growth signal
- series-a: Strong = $100K+ MRR + proven retention
- revenue / growth: Strong = significant MRR + clear unit economics`

  return `${stageContext}

---

${formatFactsAsText(facts)}

EXA MARKET RESEARCH (external — not founder-stated):
${market.dossier || "(no market intelligence available)"}

---

Evaluate each of the following ${criteria.length} criteria.
For each criterion, answer YES, PARTIAL, or NO, and give exactly one sentence of justification.
Do NOT produce a total score or any numeric summary.

${criteriaBlock}

Return a JSON object with this exact shape:
{
  "answers": [
    { "id": "<criterion_id>", "answer": "YES|PARTIAL|NO", "justification": "<one sentence>" },
    ...
  ]
}`
}

// ---------------------------------------------------------------------------
// Parse LLM output into a per-id map
// ---------------------------------------------------------------------------

function parseLLMAnswers(
  raw: any,
): Map<string, { answer: CriterionAnswer; justification: string }> {
  const result = new Map<string, { answer: CriterionAnswer; justification: string }>()
  if (!Array.isArray(raw?.answers)) return result

  for (const item of raw.answers) {
    const id = String(item?.id ?? "")
    const rawAnswer = String(item?.answer ?? "").toUpperCase()
    const answer: CriterionAnswer =
      rawAnswer === "YES" ? "YES" :
      rawAnswer === "PARTIAL" ? "PARTIAL" :
      "NO"
    result.set(id, {
      answer,
      justification: String(item?.justification ?? "No justification provided."),
    })
  }
  return result
}

// ---------------------------------------------------------------------------
// Score computation — all arithmetic, no LLM
// ---------------------------------------------------------------------------

const TRACTION_IDS = new Set(["traction_1", "traction_2", "traction_3", "traction_4"])
const TRACTION_CAP = 25

const CATEGORY_IDS: Record<string, Set<string>> = {
  market:         new Set(["market_1",  "market_2",  "market_3",  "market_4"]),
  team:           new Set(["team_1",    "team_2",    "team_3",    "team_4"]),
  traction:       TRACTION_IDS,
  product:        new Set(["product_1", "product_2", "product_3", "product_4"]),
  business_model: new Set(["biz_1",     "biz_2",     "biz_3"]),
  vision:         new Set(["vision_1",  "vision_2"]),
  cross_section:  new Set(["cross_1",   "cross_2",   "cross_3",   "cross_4"]),
}

export const CATEGORY_MAX: Record<string, number> = {
  market: 30, team: 30, traction: 25, product: 28,
  business_model: 20, vision: 15, cross_section: 20,
}

const MAX_POSSIBLE = 175

function computeScores(results: CriterionResult[]): Omit<CriterionScoreResult, "criterionResults"> {
  const byId = new Map(results.map(r => [r.id, r]))

  const categoryTotals: Record<string, number> = {
    market: 0, team: 0, traction: 0, product: 0,
    business_model: 0, vision: 0, cross_section: 0,
  }

  for (const [cat, ids] of Object.entries(CATEGORY_IDS)) {
    for (const id of ids) {
      categoryTotals[cat] += byId.get(id)?.pointsAwarded ?? 0
    }
  }

  categoryTotals.traction = Math.min(categoryTotals.traction, TRACTION_CAP)

  const penalty1 = byId.get("penalty_1")?.pointsAwarded ?? 0
  const penalty2 = byId.get("penalty_2")?.pointsAwarded ?? 0
  const penaltiesApplied = Math.abs(penalty1) + Math.abs(penalty2)

  const positiveScore = Object.values(categoryTotals).reduce((a, b) => a + b, 0)
  const rawScore = positiveScore - penaltiesApplied

  return {
    rawScore,
    maxPossible: MAX_POSSIBLE,
    scoreByCategory: { ...categoryTotals, penalties: -penaltiesApplied },
    penaltiesApplied,
  }
}

// ---------------------------------------------------------------------------
// Fallback — used when the LLM call fails entirely
// ---------------------------------------------------------------------------

function fallbackScoreResult(): CriterionScoreResult {
  return {
    criterionResults: [],
    rawScore: 74,
    maxPossible: MAX_POSSIBLE,
    scoreByCategory: {
      market: 15, team: 15, traction: 12, product: 14,
      business_model: 10, vision: 7, cross_section: 10,
      penalties: -9,
    },
    penaltiesApplied: 9,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Step 2 of the scoring pipeline.
 *
 * Builds stage-aware criteria, feeds VerifiedFacts and Exa market research to
 * DeepSeek, receives YES/PARTIAL/NO per criterion, then computes all numeric
 * scores in TypeScript.
 */
export async function scoreByCriteria(
  facts: VerifiedFacts,
  marketIntelligence: MarketIntelligenceData,
  stage: string,
): Promise<CriterionScoreResult> {
  logger.log(`[CRITERION-SCORER] Starting criterion evaluation (stage: ${stage})`)

  const criteria = buildCriteria(stage)

  let llmAnswers: Map<string, { answer: CriterionAnswer; justification: string }>

  try {
    const raw = await openrouterGenerateJson<any>({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(criteria, facts, marketIntelligence, stage),
      temperature: 0.1,
    })

    llmAnswers = parseLLMAnswers(raw)
  } catch (error: any) {
    logger.error("[CRITERION-SCORER]", "LLM call failed — using fallback:", error?.message ?? error)
    return fallbackScoreResult()
  }

  const criterionResults: CriterionResult[] = []

  for (const c of criteria) {
    const answered = llmAnswers.get(c.id) ?? { answer: "NO" as CriterionAnswer, justification: "Not evaluated." }
    criterionResults.push({
      id: c.id,
      answer: answered.answer,
      justification: answered.justification,
      pointsAwarded: c.points[answered.answer],
    })
  }

  const scores = computeScores(criterionResults)

  // ── DEBUG: full criterion Q&A table ──────────────────────────────────────
  const CATEGORY_LABELS: Record<string, string> = {
    market: "MARKET", team: "TEAM", traction: "TRACTION",
    product: "PRODUCT", business_model: "BUSINESS MODEL",
    vision: "VISION", cross_section: "CROSS-SECTION", penalty: "PENALTIES",
  }
  const ANSWER_ICON: Record<string, string> = { YES: "\u2705", PARTIAL: "\uD83D\uDFE1", NO: "\u274C" }

  const groupedLines: string[] = []
  let lastCat = ""
  for (const r of criterionResults) {
    const criterion = criteria.find(c => c.id === r.id)!
    const cat = criterion?.category ?? "penalty"
    if (cat !== lastCat) {
      groupedLines.push(`\n  ── ${CATEGORY_LABELS[cat] ?? cat.toUpperCase()} ──`)
      lastCat = cat
    }
    const icon = ANSWER_ICON[r.answer] ?? "\u2B1C"
    const pts = r.pointsAwarded >= 0 ? `+${r.pointsAwarded}` : `${r.pointsAwarded}`
    groupedLines.push(`  ${icon} [${pts}pts] ${criterion?.question ?? r.id}`)
    groupedLines.push(`       → ${r.justification}`)
  }

  console.log(`\n${"═".repeat(72)}`)
  console.log(`  CRITERION SCORER — FULL Q&A`)
  console.log(`${"═".repeat(72)}${groupedLines.join("\n")}`)
  console.log(`\n  ── CATEGORY TOTALS ──`)
  console.log(`  Market:         ${scores.scoreByCategory.market}/${CATEGORY_MAX.market}`)
  console.log(`  Team:           ${scores.scoreByCategory.team}/${CATEGORY_MAX.team}`)
  console.log(`  Traction:       ${scores.scoreByCategory.traction}/${CATEGORY_MAX.traction} (capped)`)
  console.log(`  Product:        ${scores.scoreByCategory.product}/${CATEGORY_MAX.product}`)
  console.log(`  Business Model: ${scores.scoreByCategory.business_model}/${CATEGORY_MAX.business_model}`)
  console.log(`  Vision:         ${scores.scoreByCategory.vision}/${CATEGORY_MAX.vision}`)
  console.log(`  Cross-Section:  ${scores.scoreByCategory.cross_section}/${CATEGORY_MAX.cross_section}`)
  console.log(`  Penalties:      ${scores.scoreByCategory.penalties}`)
  console.log(`  RAW SCORE:      ${scores.rawScore} / ${scores.maxPossible}  (normalized: ${Math.round((scores.rawScore / scores.maxPossible) * 100)}/100)`)
  console.log(`${"═".repeat(72)}\n`)
  // ── END DEBUG ─────────────────────────────────────────────────────────────

  logger.log(
    `[CRITERION-SCORER] Complete — rawScore:${scores.rawScore}/${scores.maxPossible} ` +
    `penalties:${scores.penaltiesApplied} ` +
    `market:${scores.scoreByCategory.market} team:${scores.scoreByCategory.team} ` +
    `traction:${scores.scoreByCategory.traction} product:${scores.scoreByCategory.product} ` +
    `biz:${scores.scoreByCategory.business_model} vision:${scores.scoreByCategory.vision} ` +
    `cross:${scores.scoreByCategory.cross_section}`,
  )

  return { criterionResults, ...scores }
}
