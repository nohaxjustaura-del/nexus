/**
 * ===============================================================================
 * NICHE PROGRAM MATCHER
 * ===============================================================================
 *
 * Matches founders to niche-focused VC programs based on identity tags
 * (women, immigrant, veteran, LGBTQ+, underrepresented). Mirrors the
 * university-matcher.ts pattern: pure TypeScript, sync, no I/O.
 *
 * Also provides filterOutNicheExclusivePrograms() to split niche-exclusive
 * VCs from the mainstream ranking pool (same pattern as university programs).
 */

import type { FounderMatchSignal, NicheProgram, NicheProgramMatch, NicheFocusTag, VCProfile } from './types'
import { NICHE_PROGRAMS, EXCLUSIVE_NICHE_NAMES } from './niche-programs-data'

// ---------------------------------------------------------------------------
// Identity tag → NicheFocusTag mapping
// ---------------------------------------------------------------------------

const TAG_TO_FOCUS: Record<string, NicheFocusTag> = {
  woman_founder: 'women',
  immigrant: 'immigrant',
  veteran: 'veteran',
  lgbtq: 'lgbtq',
  underrepresented: 'underrepresented',
}

/**
 * Derive which NicheFocusTags the founder qualifies for from their identityTags.
 */
function founderFocusTags(founder: FounderMatchSignal): Set<NicheFocusTag> {
  const out = new Set<NicheFocusTag>()
  for (const tag of founder.identityTags) {
    const mapped = TAG_TO_FOCUS[tag]
    if (mapped) out.add(mapped)
  }
  return out
}

// ---------------------------------------------------------------------------
// Stage + sector helpers (shared logic with university matcher)
// ---------------------------------------------------------------------------

function normalizeStage(s: string): string {
  return s.toLowerCase().trim().replace(/[\s_-]+/g, '-')
}

const STAGE_EXPANSION: Record<string, string[]> = {
  'idea':      ['pre-seed', 'seed'],
  'mvp':       ['pre-seed', 'seed'],
  'revenue':   ['seed', 'pre-seed'],
  'seed':      ['seed', 'pre-seed'],
  'pre-seed':  ['pre-seed', 'seed'],
  'series-a':  ['series-a', 'seed'],
  'seriesa':   ['series-a', 'seed'],
}

function stageMatches(program: NicheProgram, founderStage: string): boolean {
  if (program.stageFocus.length === 0) return true
  const needle = normalizeStage(founderStage)
  const focus = program.stageFocus.map(normalizeStage)
  if (focus.some((s) => s === needle)) return true
  const expanded = STAGE_EXPANSION[needle]
  if (expanded) {
    return expanded.some((exp) => focus.includes(exp))
  }
  return false
}

function sectorMatches(program: NicheProgram, founder: FounderMatchSignal): boolean {
  if (program.sectorFocus.length === 0) return true
  const programSectors = program.sectorFocus.map((s) => s.toLowerCase())
  const founderTokens = new Set([
    ...founder.sectors.map((s) => s.toLowerCase()),
    ...founder.sectorFocusPhrases.map((s) => s.toLowerCase()),
  ])
  return programSectors.some((ps) => founderTokens.has(ps))
}

// ---------------------------------------------------------------------------
// Urgency computation
// ---------------------------------------------------------------------------

function computeUrgency(deadline: string): NicheProgramMatch['urgency'] {
  if (deadline === 'rolling') return 'rolling'
  const deadlineMs = Date.parse(deadline)
  if (isNaN(deadlineMs)) return 'rolling'
  const daysUntil = (deadlineMs - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysUntil <= 30) return 'apply_now'
  if (daysUntil <= 90) return 'upcoming_deadline'
  return 'rolling'
}

// ---------------------------------------------------------------------------
// Qualification reason builder
// ---------------------------------------------------------------------------

const FOCUS_LABEL: Record<NicheFocusTag, string> = {
  women: 'a woman founder',
  immigrant: 'an immigrant founder',
  veteran: 'a veteran',
  lgbtq: 'an LGBTQ+ founder',
  underrepresented: 'an underrepresented founder',
}

function buildQualificationReason(
  program: NicheProgram,
  matchedTags: NicheFocusTag[],
): string {
  if (matchedTags.length === 0) return `You may qualify for ${program.name}.`

  const tagLabels = matchedTags.map((t) => FOCUS_LABEL[t])
  const tagStr = tagLabels.length === 1
    ? tagLabels[0]
    : `${tagLabels.slice(0, -1).join(', ')} and ${tagLabels[tagLabels.length - 1]}`

  return `As ${tagStr}, you qualify for ${program.name} — ${program.description}`
}

// ---------------------------------------------------------------------------
// Main export: matchNichePrograms
// ---------------------------------------------------------------------------

/**
 * Returns niche-focused programs this founder qualifies for, based on their
 * identity tags. Programs are filtered by stage and sector, then ordered by
 * the number of matching focus tags (most relevant first).
 *
 * Returns an empty array when the founder has no relevant identity tags or
 * no programs match their stage/sector.
 */
export function matchNichePrograms(
  founder: FounderMatchSignal,
): NicheProgramMatch[] {
  const founderTags = founderFocusTags(founder)
  if (founderTags.size === 0) return []

  const matches: NicheProgramMatch[] = []

  for (const program of NICHE_PROGRAMS) {
    if (!stageMatches(program, founder.stage)) continue
    if (!sectorMatches(program, founder)) continue

    // Compute overlap between founder tags and program focus tags
    const matchedTags = program.focusTags.filter((ft) => founderTags.has(ft))
    if (matchedTags.length === 0) continue

    matches.push({
      program,
      matchedTags,
      qualificationReason: buildQualificationReason(program, matchedTags),
      urgency: computeUrgency(program.deadline),
    })
  }

  // Sort: most matching tags first, then urgency (apply_now > upcoming > rolling)
  const urgencyOrder = { apply_now: 0, upcoming_deadline: 1, rolling: 2 }
  matches.sort((a, b) => {
    const tagDiff = b.matchedTags.length - a.matchedTags.length
    if (tagDiff !== 0) return tagDiff
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  })

  return matches
}

// ---------------------------------------------------------------------------
// Pool split: filter out niche-exclusive VCs from the main ranking pool
// ---------------------------------------------------------------------------

/**
 * Splits a VC candidate pool into two disjoint sets:
 *
 *   mainstream  — VCs eligible for the main ranking pipeline
 *   exclusive   — VCs that are niche-exclusive programs (e.g. Female Founders
 *                 Fund, Backstage Capital) — rendered only in the niche
 *                 programs UI section, never in the main ranking card list
 *
 * VCs with alsoInMainPool=true (e.g. Harlem Capital, Precursor) remain in
 * mainstream and also appear in the niche section.
 */
export function filterOutNicheExclusivePrograms(vcPool: VCProfile[]): {
  mainstream: VCProfile[]
  exclusive: VCProfile[]
} {
  const mainstream: VCProfile[] = []
  const exclusive: VCProfile[] = []

  for (const vc of vcPool) {
    const vcNameLower = (vc.name ?? '').toLowerCase()
    const firmNameLower = (vc.firmName ?? '').toLowerCase()
    if (EXCLUSIVE_NICHE_NAMES.has(vcNameLower) || EXCLUSIVE_NICHE_NAMES.has(firmNameLower)) {
      exclusive.push(vc)
    } else {
      mainstream.push(vc)
    }
  }

  return { mainstream, exclusive }
}
