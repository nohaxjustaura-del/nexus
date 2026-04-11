/**
 * Founder identity tags + thesis-affinity phrases for VC matching.
 * DB flags first; pitch text uses conservative first-person / explicit phrases only.
 */

import type { ComprehensiveFounderContext } from '@/lib/founder-context'

const TAG = {
  student: 'student',
  immigrant: 'immigrant',
  underrepresented: 'underrepresented',
  veteran: 'veteran',
  woman_founder: 'woman_founder',
  lgbtq: 'lgbtq',
} as const

/** True when pitch/Q&A explicitly says the speaker is a current student. */
export function inferStudentFromText(pitchBlob: string): boolean {
  const t = pitchBlob.toLowerCase()
  if (!t.trim()) return false
  if (/\bi(?:'m|\s+am)\s+(a\s+)?(college\s+|university\s+)?student\b/.test(t)) return true
  if (/\bwe(?:'re|\s+are)\s+(all\s+)?(college\s+|university\s+)?students\b/.test(t)) return true
  if (/\bcurrent\s+(under)?graduate\s+student\b/.test(t)) return true
  if (/\bundergrad(uate)?\s+at\b/.test(t) && /\b(university|college)\b/.test(t)) return true
  if (/\bph\.?d\.?\s+student\b/.test(t)) return true
  if (/\bmba\s+student\b/.test(t)) return true
  if (/\bi(?:'m|\s+am)\s+studying\s+at\b/.test(t)) return true
  if (/\benrolled\s+at\b/.test(t) && /\b(university|college|institute)\b/.test(t)) return true
  return false
}

function addPhrases(set: Set<string>, ...phrases: string[]) {
  for (const p of phrases) {
    const s = p.toLowerCase().trim()
    if (s.length >= 3) set.add(s)
  }
}

/**
 * Derives identity tags and short thesis phrases for overlap with VC thesis text
 * (Step 5c, ranker, Exa tail, gates, niche matcher).
 *
 * Sources (in priority order):
 *   1. Structured booleans from FounderPrefs / ComprehensiveFounderContext
 *   2. Conservative first-person regex from pitch text
 */
export function buildFounderIdentitySignals(
  founder: ComprehensiveFounderContext,
  pitchBlob: string,
): { identityTags: string[]; thesisAffinityPhrases: string[] } {
  const tags = new Set<string>()
  const phrases = new Set<string>()
  const t = pitchBlob.toLowerCase()

  // ── Structured DB flags (highest confidence) ──────────────────────────

  if (founder.isWoman) {
    tags.add(TAG.woman_founder)
    addPhrases(phrases, 'women founders', 'female founders', 'women-led', 'female founder')
  }
  if (founder.isImmigrant) {
    tags.add(TAG.immigrant)
    addPhrases(phrases, 'immigrant founders', 'international founders', 'immigrant founder')
  }
  if (founder.isUnderrepresented) {
    tags.add(TAG.underrepresented)
    addPhrases(phrases, 'underrepresented founders', 'diverse founders', 'minority founders')
  }
  if (founder.isBipoc) {
    tags.add(TAG.underrepresented)
    addPhrases(phrases, 'bipoc founders', 'underrepresented founders', 'diverse founders')
  }
  if (founder.isVeteran) {
    tags.add(TAG.veteran)
    addPhrases(phrases, 'veteran founders', 'military veterans')
  }
  if (founder.isLgbtq) {
    tags.add(TAG.lgbtq)
    addPhrases(phrases, 'lgbtq founders', 'lgbt founders')
  }
  if (founder.isStudent || inferStudentFromText(pitchBlob)) {
    tags.add(TAG.student)
    addPhrases(phrases, 'student founders', 'student founder', 'university founders')
  }

  // Gender fallback (for founders who set Founder.gender but not FounderPrefs.isWoman)
  if (!founder.isWoman) {
    const g = (founder.gender ?? '').toLowerCase().trim()
    if (g === 'female' || g === 'woman') {
      tags.add(TAG.woman_founder)
      addPhrases(phrases, 'women founders', 'female founders', 'women-led', 'female founder')
    }
  }

  // ── Pitch text inference (conservative first-person patterns) ─────────

  if (/\b(i(?:'m|\s+am)\s+)?a\s+woman\s+founder\b/.test(t) || /\bfemale\s+founder\b/.test(t)) {
    tags.add(TAG.woman_founder)
    addPhrases(phrases, 'women founders', 'female founders')
  }
  if (/\b(i\s+)?immigrated\s+to\b/.test(t) || /\bfirst-?generation\s+immigrant\b/.test(t)) {
    tags.add(TAG.immigrant)
    addPhrases(phrases, 'immigrant founders', 'international founder')
  }
  if (/\bfirst-?gen(eration)?\s+(college\s+)?student\b/.test(t) || /\bfirst-?gen\s+founder\b/.test(t)) {
    tags.add(TAG.underrepresented)
    addPhrases(phrases, 'first-generation founders', 'first generation college')
  }
  if (/\bunderrepresented\s+founder\b/.test(t) || /\bblack\s+founder\b/.test(t) || /\blatinx?\s+founder\b/.test(t)) {
    tags.add(TAG.underrepresented)
    addPhrases(phrases, 'underrepresented founders', 'diverse founders')
  }
  if (/\b(i(?:'m|\s+am)\s+)?a\s+veteran\b/.test(t) || /\bmilitary\s+veteran\b/.test(t)) {
    tags.add(TAG.veteran)
    addPhrases(phrases, 'veteran founders')
  }
  if (
    /\b(i(?:'m|\s+am)\s+)?(a\s+)?(gay|lesbian|transgender|trans\s+woman|trans\s+man|queer|non-?binary)\b/.test(t) ||
    /\blgbtq\+?\b/.test(t)
  ) {
    tags.add(TAG.lgbtq)
    addPhrases(phrases, 'lgbtq founders', 'lgbt founders')
  }

  const identityTags = [...tags].sort()
  const thesisAffinityPhrases = [...phrases].sort()
  return { identityTags, thesisAffinityPhrases }
}
