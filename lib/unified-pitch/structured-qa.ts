/**
 * Accelerator-style structured Q&A for unified pitch submissions.
 */

export const STRUCTURED_QA_KEYS = [
  { key: 'problem', label: 'What problem are you solving?' },
  { key: 'targetCustomer', label: 'Who is your target customer?' },
  { key: 'solution', label: 'What is your solution?' },
  { key: 'traction', label: 'What traction do you have so far?' },
  { key: 'team', label: 'Why are you the right team for this?' },
  { key: 'businessModel', label: 'What is your business model?' },
  { key: 'defensibility', label: 'What makes you defensible?' },
] as const

export type StructuredQaKey = (typeof STRUCTURED_QA_KEYS)[number]['key']

export type StructuredQaAnswers = Partial<Record<StructuredQaKey, string>>

export function parseStructuredQaJson(raw: string | null | undefined): StructuredQaAnswers {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return {}
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!o || typeof o !== 'object') return {}
    const out: StructuredQaAnswers = {}
    for (const { key } of STRUCTURED_QA_KEYS) {
      const v = o[key]
      if (typeof v === 'string' && v.trim()) out[key] = v.trim()
    }
    return out
  } catch {
    return {}
  }
}

export function hasAnyStructuredAnswer(answers: StructuredQaAnswers): boolean {
  return STRUCTURED_QA_KEYS.some(({ key }) => !!(answers[key]?.trim()))
}

/** Q&A body only (no section header) — combined builder adds `STRUCTURED Q&A:`. */
export function formatStructuredQaBody(answers: StructuredQaAnswers): string {
  const lines: string[] = []
  for (const { key, label } of STRUCTURED_QA_KEYS) {
    const a = answers[key]?.trim()
    if (a) {
      if (lines.length) lines.push('')
      lines.push(label)
      lines.push(a)
    }
  }
  return lines.join('\n')
}

/** Full block including header (e.g. for storage or reviewer packet). */
export function formatStructuredQaBlock(answers: StructuredQaAnswers): string {
  const body = formatStructuredQaBody(answers)
  if (!body) return ''
  return `STRUCTURED Q&A:\n${body}`
}

export function flattenStructuredQaForValidation(answers: StructuredQaAnswers): string {
  return STRUCTURED_QA_KEYS.map(({ key }) => answers[key]?.trim() || '')
    .filter(Boolean)
    .join('\n\n')
}
