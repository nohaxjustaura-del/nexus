/**
 * Attach the founder's saved startup name to analysis FormData so the server
 * buckets `FounderAnalysisSummary` by name-at-submit-time (avoids stale DB reads
 * and prevents a single "" row from tracking the live profile name on investor cards).
 */
export async function appendVentureNameToAnalysisFormData(formData: FormData): Promise<void> {
  try {
    const res = await fetch('/api/founder/profile', { credentials: 'include' })
    if (!res.ok) return
    const data = (await res.json()) as {
      exists?: boolean
      profile?: { startupName?: string | null }
      founder?: { startupName?: string | null }
    }
    if (!data?.exists) return
    const profile = data.profile ?? data.founder
    const raw = profile?.startupName
    const name = typeof raw === 'string' ? raw.trim() : ''
    if (name.length > 0) formData.set('ventureName', name)
  } catch {
    /* omit field; server falls back to DB */
  }
}
