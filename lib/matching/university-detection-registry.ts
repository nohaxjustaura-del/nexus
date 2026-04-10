/**
 * Data-backed university resolution for matching + program eligibility.
 * Order: high-specific legacy rules → program alias groups (includes + at/from).
 */

import { UNIVERSITY_PROGRAMS } from './university-programs-data'

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export type ProgramUniversityGroup = { canonical: string; aliases: string[] }

/** Unique canonical schools from curated programs + merged aliases (lowercased). */
export function buildProgramUniversityGroups(): ProgramUniversityGroup[] {
  const m = new Map<string, Set<string>>()
  for (const p of UNIVERSITY_PROGRAMS) {
    const u = p.university?.trim()
    if (!u) continue
    if (!m.has(u)) m.set(u, new Set())
    const s = m.get(u)!
    s.add(u)
    for (const a of p.aliases) {
      const x = a.trim()
      if (x) s.add(x)
    }
  }
  return [...m.entries()].map(([canonical, set]) => ({
    canonical,
    aliases: [...set].map((x) => x.toLowerCase()).sort((a, b) => b.length - a.length),
  }))
}

const PROGRAM_GROUPS = buildProgramUniversityGroups()

/**
 * Match pitch/education/bio text to a canonical university name.
 * `t` must already be lowercased.
 */
export function detectUniversityFromRegistry(t: string): string | undefined {
  if (!t.trim()) return undefined

  if (/\bbrown\s+university\b/.test(t) || /\bbrown\s+univ\.?\b/.test(t)) return 'Brown University'
  if (/\bbrown\s+u\.?\b/.test(t)) return 'Brown University'
  if (/\b(at|from)\s+brown(?:\s+university)?\b/.test(t)) return 'Brown University'
  if (/\bbrown\b/.test(t) && /\bclass of\s+['']?2[0-2]\d{2}\b/.test(t)) return 'Brown University'
  if (/\bbrown[\s,]+['']2[0-2]\d{2}\b/.test(t)) return 'Brown University'
  if (/\bru\b/.test(t) && /\bbrown\b/.test(t) && /(student|undergraduate|graduate|class of|alumni)/.test(t)) {
    return 'Brown University'
  }

  if (t.includes('uc berkeley') || t.includes('university of california, berkeley')) return 'UC Berkeley'
  if (/\bberkeley\b/.test(t) && (t.includes('haas') || t.includes('cal ') || t.endsWith(' cal'))) {
    return 'UC Berkeley'
  }
  if (
    /\b(at|from)\s+cal\b/.test(t) &&
    /\b(berkeley|haas|student|alumni|undergraduate|graduate)\b/.test(t)
  ) {
    return 'UC Berkeley'
  }

  if (t.includes('stanford')) return 'Stanford University'
  if (t.includes('massachusetts institute') || /\bmit\b/.test(t)) return 'MIT'
  if (t.includes('harvard')) return 'Harvard'
  if (t.includes('carnegie mellon') || /\bcmu\b/.test(t)) return 'Carnegie Mellon University'
  if (t.includes('yale')) return 'Yale University'
  if (t.includes('princeton')) return 'Princeton University'
  if (t.includes('columbia university') || /\bcolumbia\b/.test(t)) return 'Columbia University'
  if (t.includes('upenn') || t.includes('university of pennsylvania') || t.includes('wharton')) {
    return 'University of Pennsylvania'
  }
  if (t.includes('cornell')) return 'Cornell University'
  if (t.includes('duke university') || (/\bduke\b/.test(t) && /(student|alumni|class of)/.test(t))) {
    return 'Duke University'
  }
  if (t.includes('northwestern university') || (/\bnorthwestern\b/.test(t) && /(student|alumni|kellogg|mccormick)/.test(t))) {
    return 'Northwestern University'
  }
  if (t.includes('dartmouth')) return 'Dartmouth College'
  if (t.includes('university of texas at austin') || /\but austin\b/.test(t) || /\butexas\b/.test(t)) {
    return 'University of Texas at Austin'
  }
  if (t.includes('university of michigan') || /\bumich\b/.test(t)) return 'University of Michigan'
  if (t.includes('university of illinois') || /\buiuc\b/.test(t)) return 'University of Illinois Urbana-Champaign'
  if (t.includes('georgia institute of technology') || /\bgeorgia tech\b/.test(t) || /\bgatech\b/.test(t)) {
    return 'Georgia Institute of Technology'
  }
  if (t.includes('university of washington') || (/\buw\b/.test(t) && /\bseattle\b/.test(t))) {
    return 'University of Washington'
  }
  if (/\busc\b/.test(t) && /(university of southern california|marshall)/.test(t)) {
    return 'University of Southern California'
  }
  if (t.includes('ucla') || t.includes('university of california, los angeles')) return 'UCLA'
  if (t.includes('new york university') || (/\bnyu\b/.test(t) && /(student|alumni|stern)/.test(t))) {
    return 'New York University'
  }
  if (t.includes('university of waterloo') || /\bwaterloo\b/.test(t)) return 'University of Waterloo'
  if (t.includes('university of oxford') || (/\boxford\b/.test(t) && /(student|matriculation)/.test(t))) {
    return 'University of Oxford'
  }
  if (t.includes('university of cambridge') || (/\bcambridge\b/.test(t) && /(student|trinity|kings college)/.test(t))) {
    return 'University of Cambridge'
  }

  for (const { canonical, aliases } of PROGRAM_GROUPS) {
    for (const a of aliases) {
      if (a.length >= 5 && t.includes(a)) return canonical
    }
  }
  for (const { canonical, aliases } of PROGRAM_GROUPS) {
    for (const a of aliases) {
      if (a.length >= 3 && a.length <= 4) {
        if (new RegExp(`\\b(at|from)\\s+${escapeRe(a)}\\b`, 'i').test(t)) return canonical
      }
    }
  }

  return undefined
}
