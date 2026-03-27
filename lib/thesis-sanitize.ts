/**
 * Drop thesis strings that are really PR / single-deal headlines, not investment mandate.
 * Keeps bots from storing "Fund X acquired a stake in Company Y" as thesis.
 */

/** Phrases that almost always indicate deal news, not mandate (case-insensitive). */
const DEAL_HEADLINE_PATTERNS: RegExp[] = [
  /\b(minority|majority)\s+stake\b/i,
  /\bacquired\s+(a\s+)?(minority|majority)?\s*stake/i,
  /\bhas\s+acquired\b/i,
  /\bacquired\s+a\s+stake/i,
  /\bstake\s+in\s+[A-Z]/i, // "stake in Clinique..."
  /\bparticipated\s+in\s+(the\s+)?[A-Za-z0-9\s\-]+\s+(round|financing|investment)\b/i,
  /\bled\s+(the\s+)?(Series\s+[A-Z]|seed|pre-seed|Series\s+[A-Z]\s+)?\s*(round|financing)\b/i,
  /\bannounces?\s+(a\s+|an\s+|today\s+)?(investment|deal|stake|acquisition)\b/i,
  /\bclosed\s+(a\s+)?(\$[\d.,]+\s*)?(million|billion|M|B)?\s*(round|financing|investment)\b/i,
  /\binvest(ed|s|ing)\s+\$[\d.,]+\s*(million|M|billion|B)?\b/i,
  /\bportfolio\s+company\s+[A-Z]/i,
  /\bIPO\b|\bSPAC\b|\btake[- ]?private\b/i,
  /\bsign(s|ed|ing)?\s+(a\s+)?(definitive\s+)?agreement\b/i,
  /\bmerger\s+with\b|\bacquisition\s+of\b/i,
  /^.{0,120}\b(Fund\s+[IVX0-9]+|Fund\s+[IVX]+)\b.{0,80}\b(acquired|invested|stake)\b/i,
]

/**
 * Single-sentence blurbs that name one portfolio company and little else (common bad extraction).
 */
function looksLikeSingleCompanyDealBlurb(s: string): boolean {
  const t = s.trim()
  if (t.length < 40 || t.length > 500) return false
  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length > 2) return false
  // "..., a leading X" PR tail
  if (/\b(a|an)\s+leading\s+/i.test(t) && /\b(clinic|hospital|provider|company|startup|firm)\b/i.test(t)) {
    return /\b(acquired|stake|invested|investment|round)\b/i.test(t)
  }
  return false
}

export function isDealAnnouncementThesis(text: string): boolean {
  const t = (text || '').trim()
  if (!t) return false
  for (const re of DEAL_HEADLINE_PATTERNS) {
    if (re.test(t)) return true
  }
  if (looksLikeSingleCompanyDealBlurb(t)) return true
  return false
}

const MAX_THESIS_LEN = 4000

/**
 * Returns trimmed thesis or undefined if it should not be stored.
 */
export function sanitizeInvestmentThesis(
  thesis: string | undefined | null,
  _firmName?: string,
): string | undefined {
  if (thesis == null) return undefined
  const t = String(thesis).trim().replace(/\s+/g, ' ')
  if (t.length < 25) return undefined
  if (isDealAnnouncementThesis(t)) return undefined
  return t.slice(0, MAX_THESIS_LEN)
}
