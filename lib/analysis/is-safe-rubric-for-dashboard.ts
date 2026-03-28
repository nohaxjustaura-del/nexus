import type { CategoryScore, UniversalAnalysisResult } from '@/lib/universal-analysis-engine'

/** True when `raw` is safe to pass to `AnalysisDashboard` (4 core sections + optional execution). */
export function isSafeRubricForDashboard(raw: unknown): raw is UniversalAnalysisResult {
  if (raw == null || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  if (typeof o.globalVerdict !== 'string') return false
  const cat = o.categories
  if (cat == null || typeof cat !== 'object') return false
  const c = cat as Record<string, unknown>
  for (const k of ['market', 'moat', 'founderFit', 'momentum'] as const) {
    const x = c[k]
    if (x == null || typeof x !== 'object') return false
    const row = x as Record<string, unknown>
    if (typeof row.score !== 'number' || !Number.isFinite(row.score)) return false
    if (!Array.isArray(row.bullets)) return false
  }
  const ex = c.execution
  if (ex != null && typeof ex === 'object') {
    const row = ex as Record<string, unknown>
    if (typeof row.score !== 'number' || !Array.isArray(row.bullets)) return false
  }
  return true
}

const RUBRIC_LABELS: Record<string, string> = {
  market: 'Market',
  moat: 'Moat',
  founderFit: 'Founder fit',
  momentum: 'Momentum',
}

function normalizeBullets(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const out = raw.map(String).map((s) => s.trim()).filter(Boolean)
    if (out.length > 0) return out
  }
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
  return [
    'Narrative bullets were not stored for this category; the score is from your saved analysis.',
  ]
}

/**
 * Repairs partial `rubricAnalysis` from DB/API (e.g. missing globalVerdict or non-array bullets)
 * so the dashboard can render the same four pillars as right after a run.
 */
function repairRubricFromPartial(raw: unknown): UniversalAnalysisResult | null {
  if (raw == null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const cat = o.categories
  if (cat == null || typeof cat !== 'object') return null
  const c = cat as Record<string, unknown>

  function row(key: 'market' | 'moat' | 'founderFit' | 'momentum'): CategoryScore | null {
    const x = c[key]
    if (x == null || typeof x !== 'object') return null
    const r = x as Record<string, unknown>
    const sc = r.score
    if (typeof sc !== 'number' || !Number.isFinite(sc)) return null
    return {
      score: Math.max(0, Math.min(100, Math.round(sc))),
      bullets: normalizeBullets(r.bullets),
    }
  }

  const market = row('market')
  const moat = row('moat')
  const founderFit = row('founderFit')
  const momentum = row('momentum')
  if (!market || !moat || !founderFit || !momentum) return null

  let execution: CategoryScore | null = null
  const ex = c.execution
  if (ex != null && typeof ex === 'object') {
    const xr = ex as Record<string, unknown>
    if (typeof xr.score === 'number' && Number.isFinite(xr.score)) {
      execution = {
        score: Math.max(0, Math.min(100, Math.round(xr.score))),
        bullets: normalizeBullets(xr.bullets),
      }
    }
  }

  const gv =
    typeof o.globalVerdict === 'string' && o.globalVerdict.trim().length > 0
      ? o.globalVerdict.trim()
      : 'Scores from your saved analysis. Expand each pillar for details.'

  return {
    categories: { market, moat, founderFit, momentum, execution },
    globalVerdict: gv,
  }
}

function rubricFromCategoryScores(
  cs: unknown,
  globalVerdictFallback: string,
): UniversalAnalysisResult | null {
  if (cs == null || typeof cs !== 'object') return null
  const o = cs as Record<string, unknown>
  const n = (k: string): number | null => {
    const v = o[k]
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null
  }
  const market = n('market')
  const team = n('team')
  const traction = n('traction')
  const product = n('product')
  if (market === null || team === null || traction === null || product === null) return null

  const stub = (title: string) => [
    `${title}: score preserved from this saved analysis. Run a new analysis for full narrative bullets.`,
  ]

  const gv =
    globalVerdictFallback.trim().length > 0
      ? globalVerdictFallback.trim()
      : 'Category scores reconstructed from saved pipeline data.'

  return {
    categories: {
      market: { score: market, bullets: stub('Market') },
      moat: { score: product, bullets: stub('Moat / product') },
      founderFit: { score: team, bullets: stub('Founder fit') },
      momentum: { score: traction, bullets: stub('Momentum') },
      execution: null,
    },
    globalVerdict: gv,
  }
}

/**
 * Resolves rubric data for `AnalysisDashboard` from a stored API/DB `result` object.
 * Handles strict validation failures by repairing bullets/verdict or falling back to `categoryScores`.
 */
export function resolveRubricForDashboard(
  result: Record<string, unknown> | null | undefined,
): UniversalAnalysisResult | null {
  if (!result || typeof result !== 'object') return null
  const rubric = result.rubricAnalysis
  if (isSafeRubricForDashboard(rubric)) return rubric
  const repaired = repairRubricFromPartial(rubric)
  if (repaired) return repaired

  let gvFallback = ''
  if (typeof result.globalVerdict === 'string') gvFallback = result.globalVerdict
  else if (rubric != null && typeof rubric === 'object') {
    const g = (rubric as Record<string, unknown>).globalVerdict
    if (typeof g === 'string') gvFallback = g
  }

  return rubricFromCategoryScores(result.categoryScores, gvFallback)
}

/** Compact scores for list rows (four core rubric sections). */
export function getRubricSectionScores(
  raw: unknown,
): { key: string; label: string; score: number }[] | null {
  if (!isSafeRubricForDashboard(raw)) return null
  const cats = raw.categories
  return (['market', 'moat', 'founderFit', 'momentum'] as const).map((key) => ({
    key,
    label: RUBRIC_LABELS[key] ?? key,
    score: Math.round(cats[key]!.score),
  }))
}

/** Section badges on My analyses — uses the same resolution as the full report. */
export function getRubricSectionScoresFromResult(
  result: Record<string, unknown> | null | undefined,
): { key: string; label: string; score: number }[] | null {
  const resolved = resolveRubricForDashboard(result ?? null)
  if (!resolved) return null
  const cats = resolved.categories
  return (['market', 'moat', 'founderFit', 'momentum'] as const).map((key) => ({
    key,
    label: RUBRIC_LABELS[key] ?? key,
    score: Math.round(cats[key].score),
  }))
}

/** VC rows for `SmartMatchResults` across stored/API shapes. */
export function pickMatchesArray(result: Record<string, unknown> | null | undefined): unknown[] {
  if (!result || typeof result !== 'object') return []
  const m = result.matches
  const mv = result.matchedVCs
  if (Array.isArray(m) && m.length > 0) return m
  if (Array.isArray(mv) && mv.length > 0) return mv
  return []
}
