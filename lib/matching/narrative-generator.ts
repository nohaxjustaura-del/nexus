/**
 * ===============================================================================
 * NARRATIVE GENERATOR (VC MATCHING PIPELINE v3)
 * ===============================================================================
 *
 * Generates evidence-first briefing narratives for each ranked VC using
 * VC pipeline routing: local Ollama when `OLLAMA_BASE_URL` is set, else OpenRouter (`OPENROUTER_VC_EXTRACTION_MODEL`).
 * Writing task, not reasoning; temperature 0.3.
 *
 * The LLM receives dimension labels and gate evidence strings as its only
 * source of truth. It is explicitly forbidden from using its background
 * knowledge about the VC.
 *
 * On any failure, a deterministic TypeScript fallback is returned using
 * the gate evidence strings directly (no second LLM call, never throws).
 */

import { openrouterGenerateJson } from '@/lib/openrouter'
import type {
  EnrichedExaSnippet,
  FounderMatchSignal,
  InvestmentLabel,
  InvestmentLikelihoodResult,
  MatchNarrative,
  VCExaBundle,
  VCProfile,
} from './types'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DEPLOYMENT_LABEL_ENGLISH: Record<InvestmentLabel, string> = {
  'HIGH':         'Actively deploying capital with recent fund activity.',
  'MEDIUM-HIGH':  'Appears to be actively deploying based on available signals.',
  'MEDIUM':       'Deployment activity appears moderate; verify before outreach.',
  'LOW-MEDIUM':   'Limited data on current deployment activity.',
  'LOW':          'This investor may not be actively deploying capital.',
}

/** Combines all three bundle arrays and returns the N most recent snippets. */
function topRecentSnippets(bundle: VCExaBundle, n: number): EnrichedExaSnippet[] {
  const all = [
    ...bundle.revealedThesis,
    ...bundle.statedConviction,
    ...bundle.founderSpecific,
  ]
  // Ascending monthsAgo = most recent first; null dates go to the end
  return all
    .sort((a, b) => {
      if (a.monthsAgo === null && b.monthsAgo === null) return 0
      if (a.monthsAgo === null) return 1
      if (b.monthsAgo === null) return -1
      return a.monthsAgo - b.monthsAgo
    })
    .slice(0, n)
}

/** Renders all 12 gate answers for the prompt. */
function renderGateAnswers(g: InvestmentLikelihoodResult['gateAnswers']): string {
  const pairs: [string, string][] = [
    ['Q1  (sector in portfolio last 6mo)', `${g.Q1.answer}: ${g.Q1.evidence}`],
    ['Q2  (stated thesis mentions sector)', `${g.Q2.answer}: ${g.Q2.evidence}`],
    ['Q3  (stage represented in deals)', `${g.Q3.answer}: ${g.Q3.evidence}`],
    ['Q4  (backed this archetype before)', `${g.Q4.answer}: ${g.Q4.evidence}`],
    ['Q5  (archetype matches recent deals)', `${g.Q5.answer}: ${g.Q5.evidence}`],
    ['Q6  (avoidance signal for archetype)', `${g.Q6.answer}: ${g.Q6.evidence}`],
    ['Q7  (new investment last 3 months)', `${g.Q7.answer}: ${g.Q7.evidence}`],
    ['Q8  (new fund last 12 months)', `${g.Q8.answer}: ${g.Q8.evidence}`],
    ['Q9  (inactivity signal)', `${g.Q9.answer}: ${g.Q9.evidence}`],
    ['Q10 (direct competitor in portfolio)', `${g.Q10.answer}: ${g.Q10.evidence}`],
    ['Q11 (adjacent company suggesting appetite)', `${g.Q11.answer}: ${g.Q11.evidence}`],
    ['Q12 (portfolio gap this founder fills)', `${g.Q12.answer}: ${g.Q12.evidence}`],
  ]
  return pairs.map(([q, a]) => `  ${q}:\n    ${a}`).join('\n')
}

/** Renders top recent snippets as a numbered list for the prompt. */
function renderRecentSnippets(snippets: EnrichedExaSnippet[]): string {
  if (snippets.length === 0) return '  (no recent snippets available)'
  return snippets
    .map((s, i) => {
      const age = s.monthsAgo !== null ? `${s.monthsAgo.toFixed(1)} months ago` : 'date unknown'
      return `  ${i + 1}. "${s.title}" (${age})\n     ${s.snippet}`
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a VC analyst writing a briefing memo for a founder about a specific investor. Your job is to tell them exactly why this VC is or isn't right for them, what to say, and when to reach out.

STRICT RULES:
1. Every claim must trace to a specific piece of evidence provided
2. Never use: "strong alignment", "great fit", "exciting", "seems like", "appears to", "might be"
3. If fit is weak, say so directly; do not sugarcoat
4. Be specific: name actual companies, quote actual thesis language, reference actual dates from the evidence
5. Maximum 3 sentences per section
6. If you cannot cite specific evidence for a claim, do not make it`

function buildUserPrompt(
  vc: VCProfile,
  likelihood: InvestmentLikelihoodResult,
  bundle: VCExaBundle,
  founder: FounderMatchSignal,
): string {
  const recent = topRecentSnippets(bundle, 3)
  const dl = likelihood.dimensionLabels

  return `INVESTOR: ${vc.firmName} (${vc.fundType ?? 'Venture Capital'})
OVERALL INVESTMENT LIKELIHOOD: ${likelihood.label}${likelihood.hardVeto ? ' [HARD VETO: do not apply]' : ''}

DIMENSION LABELS (derived from gate evidence, not scores):
  Thesis alignment:      ${dl.thesisAlignment}
  Founder archetype fit: ${dl.founderArchetype}
  Deployment status:     ${dl.deploymentLikelihood}
  Portfolio gap:         ${dl.portfolioGap}

GATE ANSWERS AND EVIDENCE:
${renderGateAnswers(likelihood.gateAnswers)}

TOP 3 MOST RECENT EVIDENCE SNIPPETS:
${renderRecentSnippets(recent)}

FOUNDER PROFILE:
  Stage:      ${founder.stage}
  Sector:     ${founder.primarySector} (also: ${founder.sectors.join(', ')})
  Archetype:  ${founder.founderArchetype}
  Traction:   ${founder.tractionTier}
  Location:   ${founder.location}

Based on the gate evidence and dimension labels above, write a briefing memo in this exact JSON format:
{
  "whyApply": "2-3 sentences citing specific deals or thesis quotes from the gate evidence. If likelihood is LOW or LOW-MEDIUM, lead with the honest reason why it is a weak match.",
  "bestApproach": "2-3 sentences referencing their actual stated thesis language. Tell the founder specifically what angle to use in outreach based on the evidence.",
  "timing": "1-2 sentences based on the deployment label and most recent snippet date. Be specific about recency.",
  "redFlag": ${likelihood.hardVeto || dl.deploymentLikelihood === 'LOW' || likelihood.confidence === 'LOW'
    ? '"One direct sentence about the biggest risk or data gap. Never soften it."'
    : 'null'
  },
  "confidenceNote": ${likelihood.confidence === 'LOW'
    ? '"One sentence explaining what data was missing."'
    : 'null'
  }
}`
}

// ---------------------------------------------------------------------------
// Fallback builder (pure TypeScript; used when GPT call fails)
// ---------------------------------------------------------------------------

function buildFallback(
  vc: VCProfile,
  likelihood: InvestmentLikelihoodResult,
): MatchNarrative {
  const g = likelihood.gateAnswers

  // whyApply: first non-UNCLEAR evidence from Q1 or Q2
  const whyApplyEvidence =
    g.Q1.answer !== 'UNCLEAR' ? g.Q1.evidence :
    g.Q2.answer !== 'UNCLEAR' ? g.Q2.evidence :
    `No clear thesis alignment evidence found for ${vc.firmName}.`

  // timing: plain-English deployment status
  const timing = DEPLOYMENT_LABEL_ENGLISH[likelihood.dimensionLabels.deploymentLikelihood]

  // redFlag: only if hard veto or inactivity
  let redFlag: string | null = null
  if (likelihood.hardVeto && likelihood.vetoReason === 'competitor_in_portfolio') {
    redFlag = `${vc.firmName} has a direct competitor to your startup in their portfolio; do not apply.`
  } else if (likelihood.vetoReason === 'vc_likely_inactive') {
    redFlag = `${vc.firmName} shows signals of reduced investment activity; verify they are still deploying before reaching out.`
  }

  return {
    whyApply: whyApplyEvidence,
    bestApproach: `Research ${vc.firmName}'s recent portfolio before reaching out and tailor your message to their stated thesis.`,
    timing,
    redFlag,
    confidenceNote: 'Limited data available for this investor; treat this match as tentative.',
  }
}

// ---------------------------------------------------------------------------
// Parsed response validator
// ---------------------------------------------------------------------------

function validateNarrative(raw: unknown, fallback: MatchNarrative): MatchNarrative {
  if (!raw || typeof raw !== 'object') return fallback
  const r = raw as Record<string, unknown>

  return {
    whyApply: typeof r.whyApply === 'string' && r.whyApply.trim()
      ? r.whyApply.trim()
      : fallback.whyApply,
    bestApproach: typeof r.bestApproach === 'string' && r.bestApproach.trim()
      ? r.bestApproach.trim()
      : fallback.bestApproach,
    timing: typeof r.timing === 'string' && r.timing.trim()
      ? r.timing.trim()
      : fallback.timing,
    redFlag: typeof r.redFlag === 'string' && r.redFlag.trim()
      ? r.redFlag.trim()
      : null,
    confidenceNote: typeof r.confidenceNote === 'string' && r.confidenceNote.trim()
      ? r.confidenceNote.trim()
      : null,
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generates an evidence-first MatchNarrative for a single ranked VC.
 *
 * Never throws; returns a deterministic TypeScript fallback if the LLM
 * fails or returns unparseable output.
 */
export async function generateMatchNarrative(
  vc: VCProfile,
  likelihood: InvestmentLikelihoodResult,
  bundle: VCExaBundle,
  founder: FounderMatchSignal,
): Promise<MatchNarrative> {
  const fallback = buildFallback(vc, likelihood)

  try {
    const raw = await openrouterGenerateJson<unknown>({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(vc, likelihood, bundle, founder),
      temperature: 0.3,
      useVcPipeline: true,
    })

    return validateNarrative(raw, fallback)
  } catch (err) {
    console.error(`[narrative-generator] LLM failed for "${vc.firmName}":`, err)
    return fallback
  }
}
