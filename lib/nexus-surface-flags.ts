/**
 * NEXUS surface inventory (product spine vs legacy extras)
 *
 * When `NEXT_PUBLIC_NEXUS_LEGACY_EXTRAS` is NOT enabled (`1` / `true`):
 * - **Cut / redirect (middleware):** standalone deck & video analyze pages, resume analysis,
 *   founder network & YC insider pages, legacy `/analysis`, `/video-pitch-upload`, `/founder/resources`.
 * - **API blocked (404):** `/api/analyze-resume`, `/api/yc-insider/*` (founder-facing APIs only).
 * - **Nav / sitemap / admin “More”:** network tab, guest “Network” tab, partner sitemap URLs,
 *   training-data + partner-request admin cards are hidden.
 *
 * Set `NEXT_PUBLIC_NEXUS_LEGACY_EXTRAS=1` to restore all of the above (rollback / internal demos).
 *
 * **Always kept:** `/founder/ai-analysis` (unified + pitch idea), `/founder/matches`, `/founder/discover`,
 * scoring + `runMatchingPipeline` orchestrator, auth, billing, VC flows, admin approvals & directory.
 */

const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

/** Founder/partner legacy surfaces + related APIs. Default: off (focused product). */
export function legacyNexusExtrasEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_NEXUS_LEGACY_EXTRAS
  if (v == null || v.trim() === '') return false
  return TRUTHY.has(v.trim().toLowerCase())
}

/** Non-destructive redirect target for middleware, or null to continue. */
export function nexusLegacyRedirectTarget(pathname: string): string | null {
  if (legacyNexusExtrasEnabled()) return null

  if (pathname === '/analysis' || pathname.startsWith('/analysis/')) {
    return '/founder/ai-analysis'
  }
  if (pathname === '/founder/resume-analysis' || pathname.startsWith('/founder/resume-analysis/')) {
    return '/founder/ai-analysis'
  }
  if (pathname === '/founder/pitch-deck-analysis' || pathname.startsWith('/founder/pitch-deck-analysis/')) {
    return '/founder/ai-analysis'
  }
  if (pathname === '/founder/video-pitch-analysis' || pathname.startsWith('/founder/video-pitch-analysis/')) {
    return '/founder/ai-analysis'
  }
  /** Old short path → standalone video page when legacy extras are on, else unified analyze. */
  if (pathname === '/founder/video-pitch' || pathname.startsWith('/founder/video-pitch/')) {
    return legacyNexusExtrasEnabled() ? '/founder/video-pitch-analysis' : '/founder/ai-analysis'
  }
  if (pathname === '/video-pitch-upload' || pathname.startsWith('/video-pitch-upload/')) {
    return '/founder/ai-analysis'
  }
  if (pathname === '/founder/yc-insider' || pathname.startsWith('/founder/yc-insider/')) {
    return '/founder/discover'
  }
  if (pathname === '/founder/network' || pathname.startsWith('/founder/network/')) {
    return '/founder/discover'
  }
  if (pathname === '/founder/resources' || pathname.startsWith('/founder/resources/')) {
    return legacyNexusExtrasEnabled() ? null : '/founder/ai-analysis'
  }

  return null
}

/** Return true to respond 404 before route handlers (founder legacy APIs only). */
export function nexusLegacyApiBlocked(pathname: string): boolean {
  if (legacyNexusExtrasEnabled()) return false
  if (pathname === '/api/analyze-resume' || pathname.startsWith('/api/analyze-resume/')) {
    return true
  }
  if (pathname === '/api/yc-insider' || pathname.startsWith('/api/yc-insider/')) {
    return true
  }
  return false
}
