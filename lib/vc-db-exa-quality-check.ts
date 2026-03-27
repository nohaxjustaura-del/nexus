/**
 * Cross-check a Prisma Investor row against fresh Exa retrieval + the configured LLM
 * (e.g. Ollama OLLAMA_MODEL=qwen2.5:7b with LLM_PREFER_OLLAMA=1).
 *
 * Used by the data-validation worker when WORKER_VALIDATION_EXA_SAMPLE > 0.
 */

import { gatherVCFirmRetrievalContext } from './vc-research-retrieval'
import { openrouterGenerateJson, hasVcLlmConfigured, getVcExtractionModel } from './openrouter'
import { isLikelyRealFirmName } from './firm-name-quality'

export type InvestorExaValidationPick = {
  firmName: string
  thesis: string | null
  bio: string
  checkSizeMin: number
  checkSizeMax: number
  stages: string
  sectors: string
  geography: string
  fundType: string
  portfolio: string | null
  websiteUrl: string | null
}

export type VcDbExaQualityResult = {
  firmName: string
  exaTotalResults: number
  exaPassesWithHits: number
  score: number
  aligned: boolean
  issues: string[]
  summary?: string
  skippedReason?: string
}

function contextCap(): number {
  const n = parseInt(process.env.VC_VALIDATION_EXA_CONTEXT_CHARS || '12000', 10)
  return Math.min(20000, Math.max(4000, Number.isFinite(n) && n > 0 ? n : 12000))
}

function buildDbSnapshot(inv: InvestorExaValidationPick): string {
  const thesis = (inv.thesis || '').trim().slice(0, 2500)
  const bio = (inv.bio || '').trim().slice(0, 2000)
  return [
    `thesis: ${thesis || '(empty)'}`,
    `bio: ${bio || '(empty)'}`,
    `checkSizeMin/Max (thousands USD): ${inv.checkSizeMin} / ${inv.checkSizeMax}`,
    `stages (JSON): ${inv.stages || '[]'}`,
    `sectors (JSON): ${inv.sectors || '[]'}`,
    `geography (JSON): ${inv.geography || '[]'}`,
    `fundType: ${inv.fundType}`,
    `portfolio (JSON): ${(inv.portfolio || '').slice(0, 4000) || 'null'}`,
    `websiteUrl: ${inv.websiteUrl || 'null'}`,
  ].join('\n')
}

/**
 * Returns null if the firm name fails quality gate (caller should skip quietly).
 */
export async function verifyInvestorAgainstExa(
  inv: InvestorExaValidationPick,
): Promise<VcDbExaQualityResult | null> {
  if (!isLikelyRealFirmName(inv.firmName)) return null

  if (!process.env.EXA_API_KEY?.trim()) {
    return {
      firmName: inv.firmName,
      exaTotalResults: 0,
      exaPassesWithHits: 0,
      score: 0,
      aligned: false,
      issues: ['EXA_API_KEY not set'],
      skippedReason: 'no_exa',
    }
  }

  if (!hasVcLlmConfigured()) {
    return {
      firmName: inv.firmName,
      exaTotalResults: 0,
      exaPassesWithHits: 0,
      score: 0,
      aligned: false,
      issues: ['No LLM configured (OLLAMA_BASE_URL+OLLAMA_MODEL or OPENROUTER_API_KEY)'],
      skippedReason: 'no_llm',
    }
  }

  const snap = await gatherVCFirmRetrievalContext(inv.firmName)
  if (!snap) {
    return {
      firmName: inv.firmName,
      exaTotalResults: 0,
      exaPassesWithHits: 0,
      score: 0,
      aligned: false,
      issues: ['Insufficient Exa retrieval context for this firm'],
      skippedReason: 'thin_exa',
    }
  }

  const exaText = snap.mergedContext.slice(0, contextCap())
  const dbSnap = buildDbSnapshot(inv)

  const judgment = await openrouterGenerateJson<{
    score: number
    aligned: boolean
    issues: string[]
    summary?: string
  }>({
    system: `You validate whether a DATABASE record for ONE venture capital firm is consistent with fresh web search excerpts (Exa).

Rules:
- Only flag clear contradictions: wrong firm confused with a similarly named company, check sizes that contradict explicit figures in the excerpts, thesis clearly describing a different fund.
- Empty or generic DB fields are OK when excerpts are thin.
- score: integer 0–100 (100 = strong agreement; 70+ = broadly consistent).
- aligned: true only if score >= 70 AND there is no severe contradiction (e.g. wrong firm).
- issues: short strings; use [] if none.

Return ONE JSON object with keys: score, aligned, issues (array of strings), summary (optional one sentence). No other keys.`,
    user: `Firm name: "${inv.firmName}"

DATABASE RECORD:
${dbSnap}

WEB EXCERPTS (Exa — use only as evidence; they may be incomplete):
${exaText}`,
    temperature: 0.15,
    model: getVcExtractionModel(),
    maxTokens: 900,
    retryOnParseError: true,
  })

  const score = Math.min(100, Math.max(0, Math.round(Number(judgment.score) || 0)))
  const issues = Array.isArray(judgment.issues) ? judgment.issues.map((x) => String(x)) : []

  return {
    firmName: inv.firmName,
    exaTotalResults: snap.exaTotalResults,
    exaPassesWithHits: snap.exaPassesWithHits,
    score,
    aligned: !!judgment.aligned,
    issues,
    summary: typeof judgment.summary === 'string' ? judgment.summary : undefined,
  }
}
