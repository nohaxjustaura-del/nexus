/**
 * Targeted Exa retrieval + LLM extraction for official apply/intake and
 * contact URLs plus key public contact channels (LinkedIn, Twitter,
 * Crunchbase, and email when clearly official).
 *
 * Worker layout (this job is on-demand only — not part of
 * lib/background-worker.ts timers):
 * - CLI: `npm run worker:apply-contact-urls` → scripts/vc-apply-contact-worker.ts
 * - HTTP: POST /api/worker/trigger { jobType: "vc-apply-contact-research", params?: { limit, overwrite, vcs } }
 * - Admin UI: /admin/worker → “Apply / contact URL refresh”
 * - Timer maintenance + discover: npm run workers:all (does not include this; run separately when healing links)
 * Related: general VC research uses scripts/auto-research-vcs.ts + lib/vc-research-retrieval.ts (broader thesis/profile).
 */

import { db } from '@/lib/db'
import { openrouterGenerateJson, hasVcLlmConfigured } from '@/lib/openrouter'
import { analyzeInvestorLinks } from '@/lib/vc-link-quality'
import { hasExaApiKey } from '@/lib/exa-keys'
import {
  ExaResearchQuotaBlockedError,
  exaPassesRequireWorkerStop,
  exaSearchPass,
  getVcResearchPipelineEnvStatus,
} from '@/lib/vc-research-retrieval'
import { syncInvestorEmbeddingById } from '@/lib/vc-embedding-sync'
import { isInvestorEligibleForWorkers } from '@/lib/investor-worker-eligibility'

export type ApplyContactExtraction = {
  applicationUrl: string | null
  websiteUrl: string | null
  linkedinUrl: string | null
  twitterUrl: string | null
  crunchbaseUrl: string | null
  email: string | null
  /** 1 sentence: why these URLs were chosen or null */
  rationale: string | null
}

/** Host/path patterns that are almost never real founder apply flows. */
export function isSuspiciousInvestorUrl(raw: string | null | undefined): boolean {
  if (raw == null || !String(raw).trim()) return true
  const s = String(raw).trim().toLowerCase()
  if (s === 'null' || s === 'n/a' || s === 'not stated' || s === 'none' || s.startsWith('pitch us'))
    return true
  let u: URL
  try {
    u = new URL(s.startsWith('http') ? s : `https://${s}`)
  } catch {
    return true
  }
  const host = u.hostname.toLowerCase()
  const path = u.pathname.toLowerCase()
  if (/^mailto:/i.test(raw)) return true

  const badHost =
    /globenewswire|prnewswire|businesswire|seekingalpha|\.gov\.au\/|tenders\.gov|austender/i.test(
      host,
    ) || /news\.yahoo|finance\.yahoo\/news/i.test(host + path)
  const badPath =
    /\/news\/|press-release|\/tag\/|\.pdf$/i.test(path) &&
    !/apply|pitch|founder|startup|company\/apply|contact/i.test(path)

  if (badHost || badPath) return true
  if (host.includes('linkedin.com') && path.includes('/posts/')) return true
  if (host.includes('twitter.com') || host === 'x.com') return true
  if (host.includes('facebook.com')) return true
  return false
}

function exaNumResults(): number {
  return Math.min(
    10,
    Math.max(4, parseInt(process.env.VC_APPLY_CONTACT_EXA_NUM_RESULTS || '6', 10) || 6),
  )
}

function sliceContext(raw: string): string {
  const max = Math.min(28000, Math.max(6000, parseInt(process.env.VC_APPLY_CONTACT_CONTEXT_CHARS || '16000', 10) || 16000))
  return raw.slice(0, max)
}

/**
 * Exa retrieval for contact + social:
 * - Primary pass: official site / contact / apply / program pages (broad query).
 * - Secondary pass: social/profile directories (LinkedIn, Twitter/X, Crunchbase).
 *
 * This keeps Exa calls to 2 per firm while still aggressively targeting all
 * important public contact channels.
 */
export async function gatherApplyContactRetrievalContext(firmName: string): Promise<{
  mergedContext: string
  sources: string[]
  exaTotalResults: number
  exaPassesWithHits: number
} | null> {
  if (!hasExaApiKey()) {
    console.error('[APPLY-CONTACT] Exa keys missing (EXA_API_KEYS or EXA_API_KEY; lib/exa-keys.ts)')
    return null
  }
  const n = exaNumResults()
  const year = new Date().getFullYear()

  // Primary: official presence, contact, apply/program pages, and common program hosts.
  const qMain = `"${firmName}" (official OR homepage OR contact OR \"get in touch\" OR team OR founders OR partners OR apply OR application OR pitch OR program OR accelerator OR fellowship OR intake OR cohort OR \"contact us\" OR \"get funding\" OR typeform OR airtable)`

  // Secondary: explicit social/profile directories that often host public VC profiles.
  const qProfiles = `"${firmName}" (linkedin.com/company OR twitter.com OR x.com OR crunchbase.com/organization OR crunchbase.com/organization/${firmName.replace(/"/g, '')})`

  const [passMain, passProfiles] = await Promise.all([
    exaSearchPass(qMain, n),
    exaSearchPass(qProfiles, Math.min(5, n)),
  ])

  const { stop, reason } = exaPassesRequireWorkerStop([passMain, passProfiles])
  if (stop && reason) {
    console.warn(`[APPLY-CONTACT] Exa quota/cooldown — stopping contact retrieval for "${firmName}" (${reason}).`)
    throw new ExaResearchQuotaBlockedError(reason)
  }

  const urlSet = new Set<string>()
  for (const u of [...passMain.urls, ...passProfiles.urls]) {
    try {
      if (/^https?:\/\//i.test(u)) urlSet.add(new URL(u).toString())
    } catch {
      /* skip */
    }
  }
  const sources = [...urlSet]

  const chunks: string[] = []
  if (passMain.textBlock.trim()) {
    chunks.push(`--- Official site / contact / apply ---\n${passMain.textBlock.trim()}`)
  }
  if (passProfiles.textBlock.trim()) {
    chunks.push(`--- Social / profiles (LinkedIn, Twitter/X, Crunchbase) ---\n${passProfiles.textBlock.trim()}`)
  }

  const mergedContext = chunks.join('\n\n')
  const passesWithHits =
    (passMain.resultCount > 0 ? 1 : 0) + (passProfiles.resultCount > 0 ? 1 : 0)
  const totalResults = passMain.resultCount + passProfiles.resultCount

  console.log(
    `[APPLY-CONTACT] Exa (${year}): main ${passMain.resultCount} | profiles ${passProfiles.resultCount} | sources ${sources.length}`,
  )

  if (mergedContext.trim().length < 80) {
    console.warn(`[APPLY-CONTACT] Insufficient text for "${firmName}"`)
    return null
  }

  return {
    mergedContext,
    sources,
    exaTotalResults: totalResults,
    exaPassesWithHits: passesWithHits,
  }
}

async function extractApplyContactUrls(
  firmName: string,
  rawContent: string,
): Promise<ApplyContactExtraction | null> {
  if (!hasVcLlmConfigured()) return null
  try {
    const result = await openrouterGenerateJson<ApplyContactExtraction>({
      system: `You extract ONLY verifiable outreach and contact details for ONE capital provider (VC, accelerator, angel group, CVC, grant program, etc.).

Return ONE JSON object with keys: applicationUrl, websiteUrl, linkedinUrl, twitterUrl, crunchbaseUrl, email, rationale (each string or null).

You MUST optimize for accuracy and consistency over guessing:
- When in doubt, return null instead of a speculative value.
- Prefer URLs and emails that are consistently supported across multiple excerpts.
- Prefer URLs that share the same obvious firm domain when there are conflicting candidates.

Rules:
- Use ONLY URLs that appear in the excerpts or are obviously the official domain described there. Do NOT invent URLs.
- applicationUrl: A page where founders apply, submit a pitch, join a cohort, or open official intake (including trusted form hosts like typeform.com / airtable.com / forms.gle ONLY if the snippet ties the form to this org). Use null if no explicit apply/intake URL is supported by the text.
- websiteUrl: The official program or fund homepage (not news articles, not third-party directories unless the excerpt is only that — prefer null over guessing).
- linkedinUrl: linkedin.com/company/... for this org only; null if not in excerpts.
- twitterUrl: twitter.com/... or x.com/... profile for this org only (not tweets); null if not clearly present.
- crunchbaseUrl: crunchbase.com/organization/... or profile that clearly refers to this org; null if not clearly present.
- email: A generic, official contact or apply email (e.g. "apply@firm.com", "hello@firm.com", "invest@firm.com") that clearly belongs to this org; NEVER a personal founder email or unrelated address.
- rationale: One short sentence citing what in the text supports the URLs, or null.

NEVER use: press wires (GlobeNewswire, PRNewswire), generic news sites, government tender portals, PDF-only unless it is clearly the apply pack, social posts as URLs, or "mailto:" links directly.`,
      user: `Firm: "${firmName}"\n\nSource text:\n${sliceContext(rawContent)}`,
      temperature: 0.1,
      useVcPipeline: true,
      retryOnParseError: true,
    })
    return {
      applicationUrl: result.applicationUrl?.trim() || null,
      websiteUrl: result.websiteUrl?.trim() || null,
      linkedinUrl: result.linkedinUrl?.trim() || null,
      twitterUrl: result.twitterUrl?.trim() || null,
      crunchbaseUrl: result.crunchbaseUrl?.trim() || null,
      email: result.email?.trim() || null,
      rationale: result.rationale?.trim() || null,
    }
  } catch (e) {
    console.error(`[APPLY-CONTACT] LLM extract failed for ${firmName}:`, e)
    return null
  }
}

function validatedUrls(x: ApplyContactExtraction): {
  applicationUrl: string | null
  websiteUrl: string | null
  linkedinUrl: string | null
  twitterUrl: string | null
  crunchbaseUrl: string | null
  email: string | null
} {
  const app = x.applicationUrl && !isSuspiciousInvestorUrl(x.applicationUrl) ? x.applicationUrl : null
  const web = x.websiteUrl && !isSuspiciousInvestorUrl(x.websiteUrl) ? x.websiteUrl : null
  let linked = x.linkedinUrl && !isSuspiciousInvestorUrl(x.linkedinUrl) ? x.linkedinUrl : null
  if (linked && !/\/company\//i.test(linked)) linked = null
  if (linked) {
    const a = analyzeInvestorLinks({ linkedinUrl: linked })
    linked = a.safeLinkedin
  }
  const appA = analyzeInvestorLinks({ applicationUrl: app || undefined })
  const webA = analyzeInvestorLinks({ websiteUrl: web || undefined })
  return {
    applicationUrl: appA.safeApplication,
    websiteUrl: webA.safeWebsite,
    linkedinUrl: linked,
    twitterUrl: x.twitterUrl && !isSuspiciousInvestorUrl(x.twitterUrl) ? x.twitterUrl : null,
    crunchbaseUrl:
      x.crunchbaseUrl && !isSuspiciousInvestorUrl(x.crunchbaseUrl) ? x.crunchbaseUrl : null,
    email: x.email && x.email.includes('@') ? x.email : null,
  }
}

function shouldWriteField(
  existing: string | null | undefined,
  incoming: string | null,
  overwrite: boolean,
): boolean {
  if (!incoming) return false
  const cur = (existing || '').trim()
  if (!cur) return true
  if (cur === incoming) return false
  if (overwrite) return true
  return isSuspiciousInvestorUrl(cur)
}

export type ApplyContactResearchResult = ApplyContactExtraction & {
  firmName: string
  sources: string[]
  validated: ReturnType<typeof validatedUrls>
}

/**
 * Run Exa + LLM for one firm; does not write DB.
 */
export async function researchApplyContactForFirm(firmName: string): Promise<ApplyContactResearchResult | null> {
  if (!isInvestorEligibleForWorkers(firmName)) {
    console.log(`[APPLY-CONTACT] Skip ineligible firm name (hidden or generic/article-style): ${firmName}`)
    return null
  }
  const snap = await gatherApplyContactRetrievalContext(firmName)
  if (!snap) return null
  const extracted = await extractApplyContactUrls(firmName, snap.mergedContext)
  if (!extracted) return null
  const validated = validatedUrls(extracted)
  return {
    firmName,
    ...extracted,
    sources: snap.sources,
    validated,
  }
}

export type ApplyContactUpdateOptions = {
  /** When true, replace non-empty URLs if the new value validates; default fills empties + replaces suspicious URLs only */
  overwrite?: boolean
  /** When set, update this row only (avoids duplicate firmName ambiguity). */
  investorId?: string
}

/**
 * Run research and persist applicationUrl, websiteUrl, linkedinUrl when allowed.
 */
export async function researchApplyContactAndUpdate(
  firmName: string,
  options: ApplyContactUpdateOptions = {},
): Promise<{ ok: boolean; updatedFields: string[]; rationale: string | null }> {
  const { overwrite = false, investorId } = options
  if (!isInvestorEligibleForWorkers(firmName)) {
    return { ok: false, updatedFields: [], rationale: null }
  }
  const pipe = getVcResearchPipelineEnvStatus()
  if (!pipe.exa || !pipe.llm) {
    console.error('[APPLY-CONTACT] Need Exa (EXA_API_KEYS or EXA_API_KEY) and LLM (OpenRouter or Ollama)')
    return { ok: false, updatedFields: [], rationale: null }
  }

  const result = await researchApplyContactForFirm(firmName)
  if (!result) return { ok: false, updatedFields: [], rationale: null }

  const existing = investorId
    ? await db.investor.findUnique({ where: { id: investorId } })
    : await db.investor.findFirst({
        where: { firmName: { equals: firmName, mode: 'insensitive' }, isPublic: true },
      })
  if (!existing) {
    console.log(`[APPLY-CONTACT] Not in DB (or no public row): ${firmName}`)
    return { ok: false, updatedFields: [], rationale: result.rationale }
  }

  const v = result.validated
  const updateData: Record<string, string> = {}
  const updatedFields: string[] = []

  if (shouldWriteField(existing.applicationUrl, v.applicationUrl, overwrite)) {
    updateData.applicationUrl = v.applicationUrl!
    updatedFields.push('applicationUrl')
  }
  if (shouldWriteField(existing.websiteUrl, v.websiteUrl, overwrite)) {
    updateData.websiteUrl = v.websiteUrl!
    updatedFields.push('websiteUrl')
  }
  if (shouldWriteField(existing.linkedinUrl, v.linkedinUrl, overwrite)) {
    updateData.linkedinUrl = v.linkedinUrl!
    updatedFields.push('linkedinUrl')
  }

  if (shouldWriteField(existing.twitterUrl, v.twitterUrl, overwrite)) {
    updateData.twitterUrl = v.twitterUrl!
    updatedFields.push('twitterUrl')
  }

  if (shouldWriteField(existing.crunchbaseUrl, v.crunchbaseUrl, overwrite)) {
    updateData.crunchbaseUrl = v.crunchbaseUrl!
    updatedFields.push('crunchbaseUrl')
  }

  if (!existing.email && v.email) {
    updateData.email = v.email
    updatedFields.push('email')
  }

  if (updatedFields.length === 0) {
    console.log(`   [APPLY-CONTACT] No URL slots to update: ${firmName}`)
    return { ok: true, updatedFields: [], rationale: result.rationale }
  }

  await db.investor.update({
    where: { id: existing.id },
    data: updateData,
  })
  console.log(`   ✅ [APPLY-CONTACT] ${firmName} → ${updatedFields.join(', ')}`)
  await syncInvestorEmbeddingById(existing.id)
  return { ok: true, updatedFields, rationale: result.rationale }
}

export async function runApplyContactBatch(params: {
  firmNames?: string[]
  /** When firmNames omitted, pick this many rows needing URLs */
  limit?: number
  overwrite?: boolean
  delayBetweenMs?: number
  maxConcurrent?: number
}): Promise<{ processed: number; rowsUpdated: number; errors: number }> {
  let names = params.firmNames?.filter(Boolean) ?? []
  const limit = Math.min(200, Math.max(1, params.limit ?? 15))
  const delay = Math.max(300, params.delayBetweenMs ?? 2500)
  const maxConcurrent = Math.min(4, Math.max(1, params.maxConcurrent ?? 2))
  const overwrite = params.overwrite ?? false

  if (names.length === 0) {
    const rows = await db.investor.findMany({
      where: {
        isPublic: true,
        discoverable: true,
        OR: [
          { applicationUrl: null },
          { applicationUrl: '' },
          { websiteUrl: null },
          { websiteUrl: '' },
          { linkedinUrl: null },
          { linkedinUrl: '' },
        ],
      },
      select: { firmName: true, applicationUrl: true, websiteUrl: true },
      take: limit * 2,
      orderBy: { updatedAt: 'asc' },
    })
    names = rows
      .filter((r) => isInvestorEligibleForWorkers(r.firmName))
      .filter(
        (r) =>
          !r.applicationUrl?.trim() ||
          !r.websiteUrl?.trim() ||
          isSuspiciousInvestorUrl(r.applicationUrl) ||
          isSuspiciousInvestorUrl(r.websiteUrl),
      )
      .slice(0, limit)
      .map((r) => r.firmName)
  }

  let processed = 0
  let rowsUpdated = 0
  let errors = 0

  outer: for (let i = 0; i < names.length; i += maxConcurrent) {
    const chunk = names.slice(i, i + maxConcurrent)
    const batchResults = await Promise.all(
      chunk.map(async (firmName) => {
        try {
          const r = await researchApplyContactAndUpdate(firmName, { overwrite })
          return {
            exaBlocked: false as const,
            err: false as const,
            updatedCount: r.updatedFields.length,
          }
        } catch (e) {
          if (e instanceof ExaResearchQuotaBlockedError) {
            return { exaBlocked: true as const, err: false as const, updatedCount: 0 }
          }
          console.error(`[APPLY-CONTACT] Batch error ${firmName}:`, e)
          return { exaBlocked: false as const, err: true as const, updatedCount: 0 }
        }
      }),
    )

    for (const b of batchResults) {
      processed++
      if (b.exaBlocked) {
        console.error('[APPLY-CONTACT] 🛑 Exa quota/cooldown — stopping batch (remaining firms skipped)')
        break outer
      }
      if (b.err) errors++
      if (b.updatedCount > 0) rowsUpdated++
    }

    if (i + maxConcurrent < names.length) await new Promise((r) => setTimeout(r, delay))
  }

  return { processed, rowsUpdated, errors }
}
