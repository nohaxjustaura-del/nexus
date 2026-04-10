/**
 * Single source of truth for founder profile completeness.
 * - UI mode: founders who meet the discover core bar are 100% (no false "finish profile" nags).
 * - Analytical mode: optional fields (bio, deck, video, LinkedIn) still count — used for AI context, not nagging.
 */

export type FounderLikeForCompleteness = {
  name?: string | null
  startupName?: string | null
  bio?: string | null
  stage?: string | null
  sectors?: unknown
  location?: string | null
  fundingNeed?: number | null
  pitchDeck?: string | null
  videoPitchUrl?: string | null
  linkedinUrl?: string | null
  /** From FounderContact — onboarding often saves LinkedIn here only */
  linkedin?: string | null
}

export function normalizeFounderSectorsForCompleteness(sectors: unknown): string[] {
  if (Array.isArray(sectors)) {
    return sectors.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
  }
  if (typeof sectors === 'string' && sectors.trim()) {
    try {
      const parsed = JSON.parse(sectors) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      }
    } catch {
      /* ignore */
    }
  }
  return []
}

function linkedinFilled(f: FounderLikeForCompleteness): boolean {
  return Boolean(f.linkedinUrl?.trim() || f.linkedin?.trim())
}

/** Same bar as discover page: name, stage, location, at least one sector */
export function isFounderCoreProfileComplete(f: FounderLikeForCompleteness | null | undefined): boolean {
  if (!f) return false
  const sectors = normalizeFounderSectorsForCompleteness(f.sectors)
  return Boolean(f.name?.trim() && f.stage?.trim() && f.location?.trim() && sectors.length > 0)
}

/** Richness score for AI / internal use (no verification shortcut). */
export function computeFounderProfileCompletenessPercentAnalytical(
  f: FounderLikeForCompleteness | null | undefined
): number {
  if (!f) return 0
  const sectorsOk = normalizeFounderSectorsForCompleteness(f.sectors).length > 0
  const parts = [
    Boolean(f.name?.trim()),
    Boolean(f.stage?.trim()),
    Boolean(f.location?.trim()),
    sectorsOk,
    Boolean(f.startupName?.trim()),
    f.fundingNeed !== undefined && f.fundingNeed !== null,
    Boolean(f.bio?.trim()),
    Boolean(f.pitchDeck?.trim()),
    Boolean(f.videoPitchUrl?.trim()),
    linkedinFilled(f),
  ]
  return Math.round((parts.filter(Boolean).length / parts.length) * 100)
}

/**
 * Hub / banners — founders who meet the discover core bar are treated as profile-complete.
 */
export function computeFounderProfileCompletenessPercentUi(
  f: FounderLikeForCompleteness | null | undefined,
  _verificationStatus?: string | null
): number {
  if (!f) return 0
  if (isFounderCoreProfileComplete(f)) {
    return 100
  }
  return computeFounderProfileCompletenessPercentAnalytical(f)
}
