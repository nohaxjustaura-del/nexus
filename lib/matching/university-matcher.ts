/**
 * ===============================================================================
 * UNIVERSITY PROGRAMS MATCHER
 * ===============================================================================
 *
 * Pure TypeScript — no LLM, no Exa calls, no database queries.
 *
 * Responsibilities:
 *   matchUniversityPrograms()     → find relevant programs for a given founder
 *   filterOutUniversityPrograms() → split a VC pool into mainstream vs. exclusive
 *
 * Sorting contract (matchUniversityPrograms return order):
 *   1. Student-exclusive matches (eligibility: students_only, university match)
 *   2. Alumni-eligible matches   (eligibility: alumni_included | university_affiliated)
 *   3. Open accelerators         (isOpenAccelerator: true)
 *   Within each tier, order is preserved from UNIVERSITY_PROGRAMS.
 */

import type { UniversityProgram, UniversityProgramMatch, FounderMatchSignal, VCProfile } from './types'
import { UNIVERSITY_PROGRAMS, EXCLUSIVE_PROGRAM_NAMES } from './university-programs-data'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when a program's university/alias list contains the founder's
 * university string as a case-insensitive partial match.
 *
 * "Berkeley" matches "UC Berkeley"; "MIT" matches "Massachusetts Institute of
 * Technology". Empty program.university means the program is pan-university.
 */
function universityMatches(program: UniversityProgram, founderUniversity: string | null): boolean {
  if (!founderUniversity || founderUniversity.trim() === '') return false
  if (program.university === '' && program.aliases.length === 0) return false  // pan-university handled separately

  const needle = founderUniversity.toLowerCase().trim()

  const candidates = [program.university, ...program.aliases].filter(Boolean)
  return candidates.some(
    (name) =>
      name.toLowerCase().includes(needle) || needle.includes(name.toLowerCase()),
  )
}

/**
 * Returns true when a program is available to any student at any university
 * (university === "" and no aliases defined).
 */
function isPanUniversityProgram(program: UniversityProgram): boolean {
  return program.university === '' && program.aliases.length === 0 && !program.isOpenAccelerator
}

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

/**
 * Stage filter — true when the program accepts the founder's stage.
 * An empty stageFocus array means all stages are accepted.
 */
function stageMatches(program: UniversityProgram, founderStage: string): boolean {
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

/**
 * Sector filter — true when at least one founder sector overlaps with the
 * program's sectorFocus. An empty sectorFocus array means all sectors.
 */
/** Profile sectors + pitch-derived themes + keywords so Media/video decks match open programs. */
function founderSectorTokensForPrograms(founder: FounderMatchSignal): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const s of [
    ...founder.sectors,
    ...founder.sectorFocusPhrases,
    ...founder.pitchKeywords,
  ]) {
    const k = String(s).toLowerCase().trim()
    if (k.length < 2 || seen.has(k)) continue
    seen.add(k)
    out.push(k)
  }
  return out
}

function sectorMatches(program: UniversityProgram, founder: FounderMatchSignal): boolean {
  if (program.sectorFocus.length === 0) return true
  const programSectors = program.sectorFocus.map((s) => s.toLowerCase())
  const founderTokens = founderSectorTokensForPrograms(founder)
  return founderTokens.some((fs) => programSectors.includes(fs))
}

/**
 * Computes urgency from a program's deadline string:
 *   "rolling"               → 'rolling'
 *   date within 30 days    → 'apply_now'
 *   date within 90 days    → 'upcoming_deadline'
 *   date further out       → 'rolling'
 */
function computeUrgency(deadline: string): UniversityProgramMatch['urgency'] {
  if (deadline === 'rolling') return 'rolling'

  const deadlineMs = Date.parse(deadline)
  if (isNaN(deadlineMs)) return 'rolling'

  const nowMs = Date.now()
  const daysUntil = (deadlineMs - nowMs) / (1000 * 60 * 60 * 24)

  if (daysUntil <= 30) return 'apply_now'
  if (daysUntil <= 90) return 'upcoming_deadline'
  return 'rolling'
}

/**
 * Builds the human-readable qualification reason sentence.
 */
function buildQualificationReason(
  program: UniversityProgram,
  founder: FounderMatchSignal,
  matchTier: 'student' | 'alumni' | 'open',
): string {
  if (program.isOpenAccelerator) {
    return `Open to all founders regardless of university — ${program.name} is one of the highest-signal applications a founder can make.`
  }

  if (matchTier === 'student') {
    if (isPanUniversityProgram(program)) {
      return `As a current student, you qualify for ${program.name} — this program accepts current students from any university.`
    }
    const uniName = founder.university ?? program.university
    return `You are a current ${uniName} student — ${program.name} is exclusively available to enrolled students.`
  }

  if (matchTier === 'alumni') {
    const uniName = founder.university ?? program.university
    return `As a ${uniName} alumnus/alumna, you qualify for ${program.name}'s alumni track.`
  }

  return `You qualify for ${program.name}.`
}

// ---------------------------------------------------------------------------
// Main export: matchUniversityPrograms
// ---------------------------------------------------------------------------

/**
 * Returns a list of university programs this founder qualifies for.
 *
 * Sorted: student-exclusive first → alumni-eligible → open accelerators.
 * Never returns null — returns an empty array when no programs match.
 */
export function matchUniversityPrograms(
  founder: FounderMatchSignal,
): UniversityProgramMatch[] {
  const studentMatches: UniversityProgramMatch[] = []
  const alumniMatches: UniversityProgramMatch[] = []
  const openMatches: UniversityProgramMatch[] = []

  for (const program of UNIVERSITY_PROGRAMS) {
    // ── Stage & sector filters (apply to every program) ──────────────────
    if (!stageMatches(program, founder.stage)) continue
    if (!sectorMatches(program, founder)) continue

    // ── Open accelerators — no university requirement ─────────────────────
    if (program.isOpenAccelerator) {
      openMatches.push({
        program,
        qualificationReason: buildQualificationReason(program, founder, 'open'),
        urgency: computeUrgency(program.deadline),
      })
      continue
    }

    // ── Pan-university student programs ────────────────────────────────────
    if (isPanUniversityProgram(program)) {
      if (!founder.isStudent) continue  // strict: current students only
      studentMatches.push({
        program,
        qualificationReason: buildQualificationReason(program, founder, 'student'),
        urgency: computeUrgency(program.deadline),
      })
      continue
    }

    // ── University-specific programs ───────────────────────────────────────
    const uniMatch = universityMatches(program, founder.university)
    if (!uniMatch) continue

    if (founder.isStudent) {
      // Students qualify for any eligibility level at their university
      studentMatches.push({
        program,
        qualificationReason: buildQualificationReason(program, founder, 'student'),
        urgency: computeUrgency(program.deadline),
      })
    } else {
      // Non-students qualify only for alumni_included programs
      if (program.eligibility === 'alumni_included') {
        alumniMatches.push({
          program,
          qualificationReason: buildQualificationReason(program, founder, 'alumni'),
          urgency: computeUrgency(program.deadline),
        })
      }
      // university_affiliated requires active enrollment or staff role — skip for non-students
    }
  }

  return [...studentMatches, ...alumniMatches, ...openMatches]
}

// ---------------------------------------------------------------------------
// Main export: filterOutUniversityPrograms
// ---------------------------------------------------------------------------

/**
 * Splits a VC candidate pool into two disjoint sets:
 *
 *   mainstream  — VCs eligible for the main ranking pipeline
 *               (open accelerators such as YC are kept here; they appear in both UI tracks)
 *
 *   exclusive   — VCs that are university-exclusive programs (Dorm Room Fund,
 *               SkyDeck, CMU Swartz, etc.) — rendered only in the university
 *               programs UI section, never in the main ranking card list
 *
 * Matching is case-insensitive by VC name.
 */
export function filterOutUniversityPrograms(vcPool: VCProfile[]): {
  mainstream: VCProfile[]
  exclusive: VCProfile[]
} {
  const mainstream: VCProfile[] = []
  const exclusive: VCProfile[] = []

  for (const vc of vcPool) {
    const vcNameLower = (vc.name ?? '').toLowerCase()
    if (EXCLUSIVE_PROGRAM_NAMES.has(vcNameLower)) {
      exclusive.push(vc)
    } else {
      mainstream.push(vc)
    }
  }

  return { mainstream, exclusive }
}
