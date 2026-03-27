/**
 * ===============================================================================
 * GATE REASONER — VC MATCHING PIPELINE v3
 * ===============================================================================
 *
 * Asks Gemini 12 binary gate questions about a (VC, founder) pair.
 * The LLM's ONLY job is YES / NO / UNCLEAR + one evidence sentence per gate.
 * Labels, scores, and narratives are computed by downstream TypeScript modules.
 *
 * Model: gemini-2.0-flash (1 500 RPD free tier, adequate for batch matching)
 *        Override via GEMINI_GATE_MODEL env var if you have 2.5 Flash access.
 * Temperature: 0.1 — evidence extraction, not creative writing.
 */

import { geminiGenerateJson } from '@/lib/gemini'
import type {
  FounderMatchSignal,
  GateAnswer,
  GateAnswers,
  GateResult,
  VCExaBundle,
  VCProfile,
} from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Model used for gate reasoning.
 *  gemini-2.5-flash-lite: GA as of 2025-07, cost-efficient, fast reasoning.
 *  Override via GEMINI_GATE_MODEL env var (e.g. 'gemini-2.5-flash' for heavier tasks). */
const GATE_MODEL = process.env.GEMINI_GATE_MODEL ?? 'gemini-2.5-flash-lite'

// ---------------------------------------------------------------------------
// Fallback builder
// ---------------------------------------------------------------------------

function allUnclear(reason: string): GateAnswers {
  const u: GateResult = { answer: 'UNCLEAR', evidence: reason }
  return {
    Q1: u, Q2: u, Q3: u,
    Q4: u, Q5: u, Q6: u,
    Q7: u, Q8: u, Q9: u,
    Q10: u, Q11: u, Q12: u,
  }
}

// ---------------------------------------------------------------------------
// PART 1 — Prompt Builder
// ---------------------------------------------------------------------------

function renderSnippetList(
  snippets: VCExaBundle['revealedThesis'],
  tag: string,
): string {
  if (snippets.length === 0) return '(No results found for this query)'
  return snippets
    .map((s, i) => {
      const age = s.monthsAgo !== null ? `${s.monthsAgo.toFixed(1)} months ago` : 'date unknown'
      return `[${tag}${i + 1}] "${s.title}" (${age})\n  ${s.snippet}`
    })
    .join('\n\n')
}

/**
 * Builds the full Gemini prompt for the 12 gate questions.
 * Uses `firmName` for evidence searches (that's what news articles quote).
 */
function buildGatePrompt(
  vc: VCProfile,
  bundle: VCExaBundle,
  founder: FounderMatchSignal,
): string {
  return `You are evaluating whether ${vc.firmName} is likely to invest in a specific founder.
You have real-time evidence from web searches conducted today.

RULES:
1. Answer based ONLY on the evidence snippets provided below
2. Do NOT use your general knowledge about this VC
3. If the evidence does not clearly answer a question: answer UNCLEAR
4. For evidence citations: name the specific snippet title or quote a short phrase — never fabricate
5. Be skeptical — UNCLEAR is better than a confident wrong answer

────────────────────────────────────────────────────────────────
FOUNDER PROFILE:
Stage: ${founder.stage}
Primary sector: ${founder.primarySector}
All sectors: ${founder.sectors.join(', ')}
Founder archetype: ${founder.founderArchetype}
Traction: ${founder.tractionTier}
Location: ${founder.location}
Key strengths: ${founder.keyStrengths.length > 0 ? founder.keyStrengths.join(', ') : 'none listed'}

────────────────────────────────────────────────────────────────
EVIDENCE — RECENT INVESTMENT ACTIVITY (last 6 months):
${renderSnippetList(bundle.revealedThesis, 'R')}

EVIDENCE — STATED THESIS AND CONVICTION (last 12 months):
${renderSnippetList(bundle.statedConviction, 'T')}

EVIDENCE — SECTOR AND STAGE SPECIFIC ACTIVITY (last 6 months):
${renderSnippetList(bundle.founderSpecific, 'S')}

────────────────────────────────────────────────────────────────
Answer each question with YES, NO, or UNCLEAR.
For each answer provide one sentence of evidence citing a specific snippet by its tag (e.g. [R1], [T2]) or explaining what evidence is missing.

THESIS ALIGNMENT:
Q1: Does their revealed portfolio (Evidence R1-R5) contain at least one company in ${founder.primarySector} within the last 6 months?
Q2: Does their stated thesis (Evidence T1-T5) explicitly mention ${founder.primarySector} or a directly adjacent sector?
Q3: Is ${founder.stage} stage represented in their recent deals?

FOUNDER ARCHETYPE FIT:
Q4: Have they backed a ${founder.founderArchetype} founder before, based on available evidence?
Q5: Does this founder's background (${founder.founderArchetype}, ${founder.tractionTier} traction) match the pattern of their most recent investments?
Q6: Is there any explicit signal in the evidence that they avoid ${founder.founderArchetype} founders?

DEPLOYMENT STATUS:
Q7: Is there evidence of a new investment made in the last 3 months?
Q8: Is there evidence of a new fund announcement in the last 12 months?
Q9: Is there any signal of reduced activity (no deals in 6+ months, sabbatical, fund winding down)?

PORTFOLIO GAP ANALYSIS:
Q10: Is there a direct competitor to this founder (${founder.primarySector} + ${founder.stage}) already in their portfolio?
Q11: Is there an adjacent company in their portfolio suggesting they want more exposure to ${founder.primarySector}?
Q12: Does their portfolio show a clear gap that this founder would fill?

Return ONLY valid JSON. No preamble. No explanation outside the JSON.
{
  "answers": {
    "Q1":  { "answer": "YES|NO|UNCLEAR", "evidence": "..." },
    "Q2":  { "answer": "YES|NO|UNCLEAR", "evidence": "..." },
    "Q3":  { "answer": "YES|NO|UNCLEAR", "evidence": "..." },
    "Q4":  { "answer": "YES|NO|UNCLEAR", "evidence": "..." },
    "Q5":  { "answer": "YES|NO|UNCLEAR", "evidence": "..." },
    "Q6":  { "answer": "YES|NO|UNCLEAR", "evidence": "..." },
    "Q7":  { "answer": "YES|NO|UNCLEAR", "evidence": "..." },
    "Q8":  { "answer": "YES|NO|UNCLEAR", "evidence": "..." },
    "Q9":  { "answer": "YES|NO|UNCLEAR", "evidence": "..." },
    "Q10": { "answer": "YES|NO|UNCLEAR", "evidence": "..." },
    "Q11": { "answer": "YES|NO|UNCLEAR", "evidence": "..." },
    "Q12": { "answer": "YES|NO|UNCLEAR", "evidence": "..." }
  }
}`
}

// ---------------------------------------------------------------------------
// PART 2 — Gemini Caller
// ---------------------------------------------------------------------------

const VALID_ANSWERS = new Set<GateAnswer>(['YES', 'NO', 'UNCLEAR'])

/** Coerces a raw answer string to a valid GateAnswer, defaulting to UNCLEAR. */
function coerceAnswer(raw: unknown): GateAnswer {
  if (typeof raw === 'string' && VALID_ANSWERS.has(raw as GateAnswer)) {
    return raw as GateAnswer
  }
  return 'UNCLEAR'
}

/** Safely extracts a GateResult from a parsed answer object. */
function extractGateResult(raw: unknown, questionKey: string): GateResult {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    return {
      answer: coerceAnswer(obj.answer),
      evidence:
        typeof obj.evidence === 'string' && obj.evidence.trim()
          ? obj.evidence.trim()
          : `No evidence provided for ${questionKey}`,
    }
  }
  return { answer: 'UNCLEAR', evidence: `Malformed answer object for ${questionKey}` }
}

async function callGeminiGates(prompt: string): Promise<GateAnswers> {
  interface RawResponse {
    answers?: Record<string, unknown>
  }

  let parsed: RawResponse
  try {
    parsed = await geminiGenerateJson<RawResponse>({
      user: prompt,
      model: GATE_MODEL,
      temperature: 0.1,
    })
  } catch {
    return allUnclear('Gemini response could not be parsed')
  }

  if (!parsed?.answers || typeof parsed.answers !== 'object') {
    return allUnclear('Gemini response could not be parsed')
  }

  const a = parsed.answers

  return {
    Q1:  extractGateResult(a['Q1'],  'Q1'),
    Q2:  extractGateResult(a['Q2'],  'Q2'),
    Q3:  extractGateResult(a['Q3'],  'Q3'),
    Q4:  extractGateResult(a['Q4'],  'Q4'),
    Q5:  extractGateResult(a['Q5'],  'Q5'),
    Q6:  extractGateResult(a['Q6'],  'Q6'),
    Q7:  extractGateResult(a['Q7'],  'Q7'),
    Q8:  extractGateResult(a['Q8'],  'Q8'),
    Q9:  extractGateResult(a['Q9'],  'Q9'),
    Q10: extractGateResult(a['Q10'], 'Q10'),
    Q11: extractGateResult(a['Q11'], 'Q11'),
    Q12: extractGateResult(a['Q12'], 'Q12'),
  }
}

// ---------------------------------------------------------------------------
// PART 3 — Main Export
// ---------------------------------------------------------------------------

/**
 * Runs the 12-gate reasoning pass for a single (VC, founder) pair.
 *
 * Never throws. On any error returns all-UNCLEAR so downstream scoring
 * can still compute a LOW-confidence result rather than crashing the pipeline.
 */
export async function reasonGates(
  vc: VCProfile,
  bundle: VCExaBundle,
  founder: FounderMatchSignal,
): Promise<GateAnswers> {
  try {
    const prompt = buildGatePrompt(vc, bundle, founder)
    return await callGeminiGates(prompt)
  } catch (err) {
    console.error(`[gate-reasoner] Failed for VC "${vc.firmName}":`, err)
    return allUnclear('Gate reasoning failed — all questions defaulted to UNCLEAR')
  }
}
