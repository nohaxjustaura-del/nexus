/**
 * ===============================================================================
 * SCORING PIPELINE — STEP 4: VAGUENESS AUDITOR
 * ===============================================================================
 *
 * Regex-only audit pass — no LLM, no async, fully deterministic.
 * Operates on the RAW pitch text to catch rhetorical inflation that a
 * fact-extractor might miss (e.g. "AI-powered" doesn't show up in VerifiedFacts
 * because the fact-extractor correctly marks techExplained=false, but the
 * actual phrase still warrants a penalty signal for the score fusion).
 *
 * Each penalty rule fires AT MOST ONCE per pitch, regardless of repetition.
 * This prevents a pitch that says "large market" ten times from accruing
 * 10× the penalty — the problem is the claim, not its frequency.
 *
 * netAdjustment = totalBonus - totalPenalty  (can be negative)
 * The pipeline applies:  finalScore += netAdjustment * 0.10
 *
 * vaguenessRating thresholds (based on totalPenalty only):
 *   CLEAN    < 10
 *   MODERATE 10-25
 *   HEAVY    25-40
 *   RED_FLAG > 40
 */

import type {
  VaguenessPenalty,
  VaguenessBonus,
  VaguenessRating,
  VaguenessAuditResult,
} from "./types"

// ---------------------------------------------------------------------------
// Internal rule shapes (not exported — callers use the result types)
// ---------------------------------------------------------------------------

interface PenaltyRule {
  pattern: RegExp
  /** Original pipe-separated source string — used as the `rule` field in results. */
  source: string
  penalty: number
  reason: string
}

interface BonusRule {
  pattern: RegExp
  bonus: number
  reason: string
}

// ---------------------------------------------------------------------------
// Penalty rules — vague buzzwords with no backing data
// ---------------------------------------------------------------------------

const RAW_VAGUENESS_RULES: Array<{ pattern: string; penalty: number; reason: string }> = [
  {
    pattern: "large market opportunity|massive market|huge market",
    penalty: 8,
    reason: "Market size claimed without specific TAM figure",
  },
  {
    pattern: "experienced team|seasoned team|strong team",
    penalty: 7,
    reason: "Team strength claimed without named credentials",
  },
  {
    pattern: "proprietary technology|proprietary algorithm|proprietary AI",
    penalty: 9,
    reason: "Tech moat claimed without technical explanation",
  },
  {
    pattern: "no real competitors|first mover|no competition",
    penalty: 12,
    reason: "Competitor dismissal — this is never true and signals market naivety",
  },
  {
    pattern: "growing fast|rapid growth|explosive growth",
    penalty: 7,
    reason: "Growth claimed without rate, timeframe, or absolute numbers",
  },
  {
    pattern: "AI.powered|leverages AI|uses AI(?!\\s+(vision|transformer|model|architecture|pipeline|embedding|diffusion|reinforcement|fine.tun))",
    penalty: 6,
    reason: "'AI-powered' without explaining what the AI actually does or why it's defensible",
  },
  {
    pattern: "disrupting|revolutionizing|transforming",
    penalty: 5,
    reason: "Disruption language without specific mechanism",
  },
  {
    pattern: "network effects",
    penalty: 4,
    reason: "Network effects claimed without explaining the specific flywheel",
  },
  {
    pattern: "patent pending|patents pending",
    penalty: 3,
    reason: "Patent pending is not a moat — pending ≠ granted, granted ≠ defensible",
  },
]

// Pre-compile penalty patterns once at module load (case-insensitive)
const VAGUENESS_RULES: PenaltyRule[] = RAW_VAGUENESS_RULES.map(r => ({
  pattern: new RegExp(r.pattern, "i"),
  source:  r.pattern,
  penalty: r.penalty,
  reason:  r.reason,
}))

// ---------------------------------------------------------------------------
// Bonus rules — positive evidence signals
// ---------------------------------------------------------------------------

const RAW_BONUS_RULES: Array<{ pattern: RegExp; bonus: number; reason: string }> = [
  {
    pattern: /\$[\d,]+[KMB]?\s*(ARR|MRR|revenue|in sales)/i,
    bonus: 10,
    reason: "Specific revenue figure stated",
  },
  {
    pattern: /[\d,]+\s*(users|customers|clients|paying)/i,
    bonus: 8,
    reason: "Specific user/customer count",
  },
  {
    pattern: /signed|LOI|letter of intent|pilot with/i,
    bonus: 12,
    reason: "Named customer commitment",
  },
  {
    pattern: /previously (founded|built|sold|exited)/i,
    bonus: 9,
    reason: "Prior exit or founding experience",
  },
  {
    pattern: /\d+%\s*(month|week|MoM|WoW|growth)/i,
    bonus: 8,
    reason: "Specific growth rate with timeframe",
  },
  {
    pattern: /\d[\d,]*\s*(followers|subscribers|community members)/i,
    bonus: 8,
    reason: "Social proof / community traction stated",
  },
  {
    pattern: /(CS|computer science|engineering)\s*(student|degree|background)/i,
    bonus: 6,
    reason: "Technical founder credential stated",
  },
  {
    pattern: /worked with|experience (with|at|in)|background in/i,
    bonus: 5,
    reason: "Domain experience stated",
  },
  {
    pattern: /(waitlist|beta|pilot|early access|prototype|MVP)/i,
    bonus: 7,
    reason: "Early product traction signal",
  },
  {
    pattern: /cuts?\s+.{0,20}\s+(in half|by \d+%|time)/i,
    bonus: 6,
    reason: "Specific value proposition with measurable claim",
  },
]

// Pre-compile into BonusRule objects (pattern already a RegExp)
const BONUS_RULES: BonusRule[] = RAW_BONUS_RULES.map(r => ({
  pattern: r.pattern,
  bonus:   r.bonus,
  reason:  r.reason,
}))

// ---------------------------------------------------------------------------
// Rating threshold computation
// ---------------------------------------------------------------------------

function computeRating(totalPenalty: number): VaguenessRating {
  if (totalPenalty <= 9)  return "CLEAN"
  if (totalPenalty <= 25) return "MODERATE"
  if (totalPenalty <= 40) return "HEAVY"
  return "RED_FLAG"
}

// ---------------------------------------------------------------------------
// Public API — synchronous, no LLM
// ---------------------------------------------------------------------------

/**
 * Step 4 of the scoring pipeline.
 *
 * Runs regex pattern matching on the raw pitch text to find vagueness penalties
 * and positive-evidence bonuses. Fully synchronous and deterministic.
 *
 * Each penalty rule fires at most once, regardless of how many times the
 * matching phrase appears in the pitch.
 *
 * The pipeline applies this result as:
 *   finalScore += netAdjustment * 0.10
 *
 * @param stage  Optional founder stage. Pre-idea / idea / pre-seed pitches
 *               receive a 0.5× penalty multiplier — early-stage founders
 *               legitimately lack revenue figures and named customers.
 *
 * Note: vagueness penalties only apply to founder-stated pitch text. Never
 * pass Exa market research text through this function — external data bypasses
 * the vagueness auditor entirely (per pipeline design).
 */
export function auditVagueness(rawPitch: string, stage?: string): VaguenessAuditResult {
  // Halve penalties for earliest stages — missing revenue/customer data is
  // expected and appropriate, not a signal of rhetorical inflation.
  const normalizedStage = stage?.trim().toLowerCase() ?? ""
  const stageMultiplier =
    !normalizedStage ||
    normalizedStage === "pre-idea" ||
    normalizedStage === "idea"     ||
    normalizedStage === "pre-seed"
      ? 0.5
      : 1.0

  const penaltiesFound: VaguenessPenalty[] = []
  const bonusesFound: VaguenessBonus[]   = []

  // --- Penalty scan ---
  for (const rule of VAGUENESS_RULES) {
    const match = rule.pattern.exec(rawPitch)
    if (match) {
      penaltiesFound.push({
        rule:        rule.source,
        penalty:     rule.penalty,
        reason:      rule.reason,
        matchedText: match[0],
      })
    }
  }

  // --- Bonus scan ---
  for (const rule of BONUS_RULES) {
    if (rule.pattern.test(rawPitch)) {
      bonusesFound.push({
        pattern: rule.pattern.source,
        bonus:   rule.bonus,
        reason:  rule.reason,
      })
    }
  }

  const totalPenalty  = penaltiesFound.reduce((sum, p) => sum + (p.penalty * stageMultiplier), 0)
  const totalBonus    = bonusesFound.reduce((sum, b) => sum + b.bonus, 0)
  const netAdjustment = totalBonus - totalPenalty

  return {
    penaltiesFound,
    bonusesFound,
    totalPenalty,
    totalBonus,
    netAdjustment,
    vaguenessRating: computeRating(totalPenalty),
  }
}
