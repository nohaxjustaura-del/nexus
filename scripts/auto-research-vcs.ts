/**
 * AUTOMATED VC RESEARCH SYSTEM
 *
 * Researches VCs using web search and AI, then updates the database with
 * verified, structured data. Fills ALL investor fields, not just check size.
 */

import { db } from '../lib/db'
import { clearInvestorCache } from '../lib/investor-cache'
import { isInvestorEligibleForWorkers } from '../lib/investor-worker-eligibility'
import { syncInvestorEmbeddingById } from '../lib/vc-embedding-sync'
import { isLikelyRealFirmName } from '../lib/firm-name-quality'
import { openrouterGenerateJson, hasVcLlmConfigured } from '../lib/openrouter'
import { normalizeResearchForDb } from '../lib/vc-research-normalize'
import { gatherVCFirmRetrievalContext, getVcResearchPipelineEnvStatus } from '../lib/vc-research-retrieval'
import {
  classifyVcEntityFromExaContext,
  entityGateIndicatesBogusPublicListing,
  getVcResearchAutoHideBogus,
  getVcResearchEntityGateMode,
  getVcResearchEntitySkipMinConfidence,
  type VcEntityGateResult,
} from '../lib/vc-research-entity-gate'
import { researchApplyContactAndUpdate } from '../lib/vc-apply-contact-research'
import {
  sanitizeInvestmentThesis,
  isDealAnnouncementThesis,
} from '../lib/thesis-sanitize'

/** True if research may write thesis: empty/short slot, or replacing a deal-headline mistaken for thesis. */
export function shouldReplaceStoredThesis(existing: string | null | undefined, incoming?: string | null): boolean {
  const inc = (incoming || '').trim()
  if (!inc || inc.length < 20) return false
  const cur = (existing || '').trim()
  if (!cur || cur.length < 20) return true
  if (isDealAnnouncementThesis(cur)) return true
  return false
}

export interface VCResearchResult {
  firmName: string
  checkSizeMin?: number
  checkSizeMax?: number
  stages?: string[]
  thesis?: string
  bio?: string
  sectors?: string[]
  geography?: string[]
  fundType?: string
  leadFollow?: string
  portfolio?: string[]
  valueAddTags?: string[]
  /** Human-readable AUM / fund size / program economics when stated (e.g. "$120M Fund III") */
  fundSize?: string
  /** Typical decision or application cycle when stated (e.g. "2–4 weeks", "batch deadline Jan") */
  decisionSpeed?: string
  websiteUrl?: string
  linkedinUrl?: string
  applicationUrl?: string
  verified: boolean
  researchDate: Date
  sources?: string[]
}

export type ResearchBatchMode = 'full' | 'thesis' | 'profile'

/** Shared instructions so thesis ≠ deal PR pasted into the DB. */
const THESIS_MANDATE_RULES = `

Investment THESIS = the capital provider's ongoing mandate: stages, sectors, geographies, themes, ticket shape, and how they deploy capital—not a single transaction.

INVALID as thesis (use null instead):
- Any line that is mainly one deal: "acquired a stake", "minority stake in [Company]", "invested in [Company]", "led the Series … round", "announced an investment", "closed a $… round"
- Press-release style with "a leading [clinic/company/provider]…" tied to one name
- Headlines or quotes about one portfolio company

VALID: 3–6 sentences when the sources support it (otherwise shorter), summarizing durable focus for VCs, accelerators, angels, CVC, family offices, grants, or syndicates. Prefer facts tied to recent years when the excerpt mentions them. If the text only supports deal news and not mandate, return null.`

const contextSliceLen = () =>
  Math.min(32000, Math.max(8000, parseInt(process.env.VC_RESEARCH_CONTEXT_CHARS || '24000', 10) || 24000))

/** Smaller slice for local LLMs — less noise, fewer truncated JSON outputs. */
function sliceContextForExtraction(raw: string): string {
  const full = contextSliceLen()
  return raw.substring(0, full)
}

/** Llama often returns article-shaped JSON; salvage a thesis string when possible. */
function normalizeThesisPayload(raw: unknown): Pick<VCResearchResult, 'thesis'> {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  if (typeof o.thesis === 'string' && o.thesis.trim()) {
    const t = sanitizeInvestmentThesis(o.thesis.trim())
    if (t) return { thesis: t }
  }
  if (o.thesis === null) return {}
  if (Array.isArray(o.key_findings) && o.key_findings.length) {
    const s = o.key_findings.map(String).join(' ').trim()
    const t = sanitizeInvestmentThesis(s.slice(0, 4000))
    if (t) return { thesis: t }
  }
  if (typeof o.description === 'string' && o.description.trim().length > 40) {
    const t = sanitizeInvestmentThesis(o.description.trim().slice(0, 4000))
    if (t) return { thesis: t }
  }
  return {}
}

async function extractThesisOnly(
  firmName: string,
  rawContent: string,
): Promise<Pick<VCResearchResult, 'thesis'>> {
  try {
    const ctx = sliceContextForExtraction(rawContent)
    const systemFirst = `You extract the investment THESIS for ONE capital provider (VC fund, accelerator, angel group, CVC, family office, grantmaker, syndicate, etc.) named in the user message.

Your reply MUST be a single JSON object with exactly one key: "thesis".
- "thesis" is either a string (3–6 sentences when evidence allows: stages, sectors, geography, themes, how they engage with founders) or null if the text does not describe a durable mandate.
- Do NOT output article titles, dates, key_findings arrays, or any keys other than "thesis".
${THESIS_MANDATE_RULES}`

    const result = await openrouterGenerateJson<{ thesis: string | null }>({
      system: systemFirst,
      user: `Fund name: "${firmName}"\n\nSource text:\n${ctx}`,
      temperature: 0.15,
      useVcPipeline: true,
      retryOnParseError: true,
    })
    let normalized = normalizeThesisPayload(result)
    if (normalized.thesis) return normalized

    const raw = (result as { thesis?: string | null }).thesis
    const rawStr = typeof raw === 'string' ? raw.trim() : ''
    const salvaged = rawStr ? sanitizeInvestmentThesis(rawStr) : undefined
    if (salvaged) return { thesis: salvaged }

    // Second pass: first answer was empty, too short, or looked like deal PR
    if (rawStr.length >= 28 || isDealAnnouncementThesis(rawStr)) {
      const retry = await openrouterGenerateJson<{ thesis: string | null }>({
        system: `${systemFirst}

STRICT RETRY: If the sources are mostly transaction news, output "thesis": null. Only output a string if you can describe the fund's ongoing strategy (not one company or one round).`,
        user: `Fund name: "${firmName}"\n\nSource text:\n${ctx}`,
        temperature: 0.1,
      useVcPipeline: true,
      retryOnParseError: true,
    })
      normalized = normalizeThesisPayload(retry)
      if (normalized.thesis) return normalized
      const r2 = typeof retry.thesis === 'string' ? sanitizeInvestmentThesis(retry.thesis.trim()) : undefined
      if (r2) return { thesis: r2 }
    }

    return {}
  } catch (e: any) {
    console.error(`   ⚠️ Thesis extraction failed for ${firmName}:`, e.message)
    return {}
  }
}

async function extractProfileFieldsOnly(
  firmName: string,
  rawContent: string,
): Promise<
  Omit<
    Partial<VCResearchResult>,
    'firmName' | 'verified' | 'researchDate' | 'sources' | 'thesis'
  >
> {
  try {
    const result = await openrouterGenerateJson<{
      bio: string
      checkSizeMin: number | null
      checkSizeMax: number | null
      stages: string[]
      sectors: string[]
      geography: string[]
      fundType: string
      leadFollow: string
      portfolio: string[]
      valueAddTags: string[]
      fundSize: string | null
      decisionSpeed: string | null
      websiteUrl: string | null
      linkedinUrl: string | null
      applicationUrl: string | null
    }>({
      system: `Extract structured investor profile data from Exa retrieval — do NOT include thesis.

Return ONE JSON object with EXACTLY these keys and no others:
bio, checkSizeMin, checkSizeMax, stages, sectors, geography, fundType, leadFollow, portfolio, valueAddTags, fundSize, decisionSpeed, websiteUrl, linkedinUrl, applicationUrl
Use null for unknown strings/numbers; use [] for empty arrays. Numbers are check sizes in thousands USD.

Accuracy: only use facts present in the excerpts; prefer the provider's official site, press, or repeated claims. When years or fund vintages appear, favor the most recent credible figure.

Fund types: "Micro VC", "Venture Capital", "Accelerator", "Incubator", "CVC", "Angel Group", "Angel Syndicate", "Family Office", "Growth Equity", "Venture Debt", "Grant program", "Government / nonprofit fund", "University fund", "SPV / Rolling fund"
Lead/follow: "lead", "follow", "either"
Stages: "pre-seed", "seed", "Series A", "Series B", "Series C", "Growth"
fundSize: human-readable if stated (e.g. "$500M Fund IV", "rolling $10M/year")
decisionSpeed: human-readable if stated (e.g. "2–3 weeks", "YC batch cycle")`,
      user: `Firm: "${firmName}". Extract all available data except investment thesis:

${sliceContextForExtraction(rawContent)}`,
      temperature: 0.15,
      useVcPipeline: true,
      retryOnParseError: true,
    })
    return {
      bio: result.bio || undefined,
      checkSizeMin: result.checkSizeMin ?? undefined,
      checkSizeMax: result.checkSizeMax ?? undefined,
      stages: result.stages?.length ? result.stages : undefined,
      sectors: result.sectors?.length ? result.sectors : undefined,
      geography: result.geography?.length ? result.geography : undefined,
      fundType: result.fundType || undefined,
      leadFollow: result.leadFollow || undefined,
      portfolio: result.portfolio?.length ? result.portfolio : undefined,
      valueAddTags: result.valueAddTags?.length ? result.valueAddTags : undefined,
      fundSize: result.fundSize?.trim() || undefined,
      decisionSpeed: result.decisionSpeed?.trim() || undefined,
      websiteUrl: result.websiteUrl || undefined,
      linkedinUrl: result.linkedinUrl || undefined,
      applicationUrl: result.applicationUrl || undefined,
    }
  } catch (e: any) {
    console.error(`   ⚠️ Profile extraction failed for ${firmName}:`, e.message)
    return {}
  }
}

/**
 * Structured extraction from merged dual-Exa retrieval (VC pipeline: Ollama when configured, else OpenRouter).
 */
async function extractWithAI(firmName: string, rawContent: string): Promise<Partial<VCResearchResult>> {
  try {
    const result = await openrouterGenerateJson<{
      thesis: string | null
      bio: string
      checkSizeMin: number | null
      checkSizeMax: number | null
      stages: string[]
      sectors: string[]
      geography: string[]
      fundType: string
      leadFollow: string
      portfolio: string[]
      valueAddTags: string[]
      fundSize: string | null
      decisionSpeed: string | null
      websiteUrl: string | null
      linkedinUrl: string | null
      applicationUrl: string | null
    }>({
      system: `You extract structured data for ONE capital provider from Exa web retrieval (mandate, deal activity, accelerators/angels/CVC/grants). Rules:
- Return accurate JSON only. Do not invent fund sizes, portfolios, URLs, or ticket sizes not supported by the excerpts.
- Prefer facts repeated across sources; when sources conflict, prefer the provider's official site, filings, or primary press.
- Weight recent years more heavily when excerpts mention vintages, closings, or cohort years.
- If unknown, use null for strings/numbers and [] for arrays.
${THESIS_MANDATE_RULES}
- For "thesis": use null if you only see deal headlines and cannot state durable mandate; never paste a single acquisition or stake announcement as thesis.

Fund types: "Micro VC", "Venture Capital", "Accelerator", "Incubator", "CVC", "Angel Group", "Angel Syndicate", "Family Office", "Growth Equity", "Venture Debt", "Grant program", "Government / nonprofit fund", "University fund", "SPV / Rolling fund"
Lead/follow: "lead", "follow", "either"
Stages: "pre-seed", "seed", "Series A", "Series B", "Series C", "Growth" only.`,
      user: `Extract all available data for "${firmName}" from this material:

${sliceContextForExtraction(rawContent)}

Return JSON with: thesis (3–6 sentences when the text supports a real mandate; else null), bio (3–5 sentences: what they are, geography, structure e.g. GP vs program, differentiators only if sourced), checkSizeMin (thousands USD), checkSizeMax (thousands), stages, sectors, geography, fundType, leadFollow, portfolio (company names only, max 25), valueAddTags (concrete operator help: intros, GTM, technical, policy, etc.), fundSize (human-readable AUM / fund / program scale if stated), decisionSpeed (timeline or batch cycle if stated), websiteUrl, linkedinUrl, applicationUrl`,
      temperature: 0.15,
      useVcPipeline: true,
      retryOnParseError: true,
    })

    const thesisSan = sanitizeInvestmentThesis(result.thesis || undefined, firmName)
    let thesisOut = thesisSan

    if (!thesisOut && result.thesis && String(result.thesis).trim().length >= 28) {
      const retry = await openrouterGenerateJson<{ thesis: string | null }>({
        system: `Return ONE JSON object with key "thesis" only.
${THESIS_MANDATE_RULES}
If you cannot produce a mandate summary, use "thesis": null.`,
        user: `Fund: "${firmName}"\n\nSources:\n${sliceContextForExtraction(rawContent)}`,
        temperature: 0.1,
      useVcPipeline: true,
      retryOnParseError: true,
    })
      thesisOut = sanitizeInvestmentThesis(
        typeof retry.thesis === 'string' ? retry.thesis.trim() : undefined,
        firmName,
      )
    }

    return {
      thesis: thesisOut,
      bio: result.bio || undefined,
      checkSizeMin: result.checkSizeMin ?? undefined,
      checkSizeMax: result.checkSizeMax ?? undefined,
      stages: result.stages?.length ? result.stages : undefined,
      sectors: result.sectors?.length ? result.sectors : undefined,
      geography: result.geography?.length ? result.geography : undefined,
      fundType: result.fundType || undefined,
      leadFollow: result.leadFollow || undefined,
      portfolio: result.portfolio?.length ? result.portfolio : undefined,
      valueAddTags: result.valueAddTags?.length ? result.valueAddTags : undefined,
      fundSize: result.fundSize?.trim() || undefined,
      decisionSpeed: result.decisionSpeed?.trim() || undefined,
      websiteUrl: result.websiteUrl || undefined,
      linkedinUrl: result.linkedinUrl || undefined,
      applicationUrl: result.applicationUrl || undefined,
    }
  } catch (error: any) {
    console.error(`   ⚠️ AI extraction failed for ${firmName}:`, error.message)
    return {}
  }
}

export type ResearchVcOptions = {
  /** When set, bogus auto-hide updates this row; otherwise we look up by firmName (case-insensitive). */
  investorId?: string
}

async function tryAutoHideInvestorAfterEntityGate(
  gate: VcEntityGateResult,
  firmName: string,
  investorId?: string,
): Promise<boolean> {
  if (!getVcResearchAutoHideBogus()) return false
  if (!entityGateIndicatesBogusPublicListing(gate)) return false
  let id = investorId
  if (!id) {
    const row = await db.investor.findFirst({
      where: { firmName: { equals: firmName, mode: 'insensitive' } },
      select: { id: true },
    })
    id = row?.id
  }
  if (!id) return false
  await db.investor.update({
    where: { id },
    data: { isPublic: false, discoverable: false },
  })
  clearInvestorCache()
  console.log(
    `   🚫 Auto-hidden (entity gate): "${firmName}" — ${gate.name_kind} / ${gate.entity_kind} (${gate.confidence}%)`,
  )
  return true
}

/**
 * Research a single VC firm (dual-Exa + OpenRouter). Mode limits extraction/application.
 */
async function researchVC(
  firmName: string,
  mode: ResearchBatchMode = 'full',
  opts?: ResearchVcOptions,
): Promise<VCResearchResult | null> {
  const label = mode === 'full' ? 'Researching' : mode === 'thesis' ? 'Thesis refresh' : 'Profile refresh'
  console.log(`\n🔍 ${label}: ${firmName}`)

  try {
    if (!isInvestorEligibleForWorkers(firmName)) {
      console.log(
        `   ⏭️ Skipping — firm name not eligible for workers (generic, bogus, or article-style title): ${firmName}`,
      )
      return null
    }

    if (!hasVcLlmConfigured()) {
      console.error(
        `   ⚠️ Set OPENROUTER_API_KEY or Ollama (OLLAMA_BASE_URL + OLLAMA_MODEL / OLLAMA_VC_MODEL) for extraction. Exa supplies text.`,
      )
      return null
    }

    const pipe = getVcResearchPipelineEnvStatus()
    if (!pipe.exa) {
      console.warn(`   ⚠️ EXA_API_KEY missing — VC research retrieval will fail.`)
    }
    console.log(`   🤖 Extraction LLM: ${pipe.vcLlmBackend} (OpenRouter=${pipe.openrouter}, Ollama=${pipe.ollama})`)

    const snapshot = await gatherVCFirmRetrievalContext(firmName)
    if (!snapshot) {
      console.log(`   ⚠️ No retrieval context (check EXA_API_KEY and quotas)`)
      return null
    }

    console.log(
      `   📚 Context: Exa ${snapshot.exaTotalResults} result(s), ${snapshot.exaPassesWithHits}/3 passes, ${snapshot.mergedContext.length} chars`,
    )

    const gateMode = getVcResearchEntityGateMode()
    const gate = await classifyVcEntityFromExaContext(
      firmName,
      snapshot.mergedContext,
      snapshot.exaTotalResults,
    )
    if (gate) {
      console.log(
        `   🧭 Entity gate: ${gate.entity_kind} | name: ${gate.name_kind} | extract=${gate.should_run_full_extraction} (${gate.confidence}%)`,
      )
      if (gate.canonical_name_hint) {
        console.log(`   🧭 Canonical name hint: ${gate.canonical_name_hint}`)
      }
      if (gate.rationale_one_line) {
        console.log(`   🧭 ${gate.rationale_one_line}`)
      }
      const hidden = await tryAutoHideInvestorAfterEntityGate(gate, firmName, opts?.investorId)
      if (hidden) {
        console.log(`   ⏭️ Skipping enrichment — row auto-hidden (bogus listing)`)
        return null
      }
      const minC = getVcResearchEntitySkipMinConfidence()
      if (
        gateMode === 'enforce' &&
        !gate.should_run_full_extraction &&
        gate.confidence >= minC
      ) {
        console.log(`   ⏭️ Skipping enrichment — entity gate (enforce, confidence ≥ ${minC})`)
        return null
      }
    }

    const base = {
      firmName,
      verified: true,
      researchDate: new Date(),
      sources: snapshot.sources,
    }

    if (mode === 'thesis') {
      const { thesis } = await extractThesisOnly(firmName, snapshot.mergedContext)
      console.log(`   ✅ Thesis: ${thesis ? `${thesis.slice(0, 80)}…` : 'none'}`)
      return { ...base, thesis }
    }

    if (mode === 'profile') {
      const fields = await extractProfileFieldsOnly(firmName, snapshot.mergedContext)
      console.log(
        `   ✅ Profile: checks ${fields.checkSizeMin != null ? 'yes' : 'no'}, ${fields.stages?.length || 0} stages, ${fields.portfolio?.length || 0} portfolio`,
      )
      return { ...base, ...fields }
    }

    const aiExtracted = await extractWithAI(firmName, snapshot.mergedContext)
    const result: VCResearchResult = { ...base, ...aiExtracted }
    console.log(`   ✅ Found: ${result.checkSizeMin ? `$${result.checkSizeMin}K-$${result.checkSizeMax}K` : 'check size unknown'}, ${result.stages?.length || 0} stages, ${result.portfolio?.length || 0} portfolio cos`)
    return result
  } catch (error: any) {
    console.error(`   ❌ Error researching ${firmName}:`, error.message)
    return null
  }
}

/**
 * Update VC in database  -  only fills in missing fields, never overwrites
 * existing good data with potentially worse AI-extracted data.
 */
async function loadInvestorRowForUpdate(firmName: string, investorRowId?: string | null) {
  if (investorRowId) {
    return db.investor.findUnique({ where: { id: investorRowId } })
  }
  return db.investor.findFirst({
    where: { firmName: { equals: firmName, mode: 'insensitive' } },
  })
}

/** Apply only thesis (+ verified). */
export async function updateVCInDatabaseThesisOnly(
  research: VCResearchResult,
  investorRowId?: string | null,
): Promise<boolean> {
  try {
    if (!isLikelyRealFirmName(research.firmName)) {
      console.log(`   ⚠️ Skipping low-quality firm name: ${research.firmName}`)
      return false
    }
    const existing = await loadInvestorRowForUpdate(research.firmName, investorRowId)
    if (!existing) {
      console.log(`   ⚠️ VC not found in database: ${research.firmName}`)
      return false
    }
    const updateData: Record<string, unknown> = { verified: true }
    const curThesis = (existing.thesis || '').trim()
    const nextThesis = sanitizeInvestmentThesis(research.thesis)
    if (isDealAnnouncementThesis(curThesis)) {
      updateData.thesis = nextThesis ?? null
    } else if (nextThesis && shouldReplaceStoredThesis(existing.thesis, nextThesis)) {
      updateData.thesis = nextThesis
    }
    const fieldsUpdated = Object.keys(updateData).length > 1 ? 1 : 0
    if (fieldsUpdated > 0) {
      await db.investor.update({ where: { id: existing.id }, data: updateData })
      console.log(`   ✅ Updated thesis for ${research.firmName}`)
    } else {
      await db.investor.update({ where: { id: existing.id }, data: { verified: true } })
      console.log(`   ℹ️ No thesis slot to fill for ${research.firmName}`)
    }
    if (fieldsUpdated > 0) {
      await syncInvestorEmbeddingById(existing.id)
    }
    return true
  } catch (error: any) {
    console.error(`   ❌ Error updating database:`, error.message)
    return false
  }
}

/** Apply profile fields only — never touches thesis. */
export async function updateVCInDatabaseProfileOnly(
  research: VCResearchResult,
  investorRowId?: string | null,
): Promise<boolean> {
  try {
    if (!isLikelyRealFirmName(research.firmName)) {
      console.log(`   ⚠️ Skipping low-quality firm name: ${research.firmName}`)
      return false
    }
    const existing = await loadInvestorRowForUpdate(research.firmName, investorRowId)
    if (!existing) {
      console.log(`   ⚠️ VC not found in database: ${research.firmName}`)
      return false
    }
    const updateData: any = {}

    if (research.checkSizeMin && existing.checkSizeMin === 0) {
      updateData.checkSizeMin = research.checkSizeMin
    }
    if (research.checkSizeMax && existing.checkSizeMax === 0) {
      updateData.checkSizeMax = research.checkSizeMax
    }
    if (research.stages?.length && existing.stages === '[]') {
      updateData.stages = JSON.stringify(research.stages)
    }
    if (research.bio && (!existing.bio || existing.bio.length < 20)) {
      updateData.bio = research.bio
    }
    if (research.sectors?.length && existing.sectors === '[]') {
      updateData.sectors = JSON.stringify(research.sectors)
    }
    if (research.geography?.length) {
      const existingGeo = existing.geography || '[]'
      if (existingGeo === '[]') {
        updateData.geography = JSON.stringify(research.geography)
      }
    }
    if (research.fundType && existing.fundType === 'Venture Capital') {
      updateData.fundType = research.fundType
    }
    if (research.leadFollow && existing.leadFollow === 'either') {
      updateData.leadFollow = research.leadFollow
    }
    if (research.portfolio?.length && (!existing.portfolio || existing.portfolio === '[]')) {
      updateData.portfolio = JSON.stringify(research.portfolio)
    }
    if (research.valueAddTags?.length && existing.valueAddTags === '[]') {
      updateData.valueAddTags = JSON.stringify(research.valueAddTags)
    }
    if (research.websiteUrl && !existing.websiteUrl) {
      updateData.websiteUrl = research.websiteUrl
    }
    if (research.linkedinUrl && !existing.linkedinUrl) {
      updateData.linkedinUrl = research.linkedinUrl
    }
    if (research.applicationUrl && !existing.applicationUrl) {
      updateData.applicationUrl = research.applicationUrl
    }
    if (research.fundSize?.trim() && !existing.fundSize?.trim()) {
      updateData.fundSize = research.fundSize.trim().slice(0, 500)
    }
    if (research.decisionSpeed?.trim() && !existing.decisionSpeed?.trim()) {
      updateData.decisionSpeed = research.decisionSpeed.trim().slice(0, 500)
    }
    updateData.verified = true
    const fieldsUpdated = Object.keys(updateData).length - 1
    if (fieldsUpdated > 0) {
      await db.investor.update({ where: { id: existing.id }, data: updateData })
      console.log(`   ✅ Updated ${fieldsUpdated} profile fields for ${research.firmName}`)
    } else {
      await db.investor.update({ where: { id: existing.id }, data: { verified: true } })
      console.log(`   ℹ️ No empty profile fields for ${research.firmName}`)
    }
    if (fieldsUpdated > 0) {
      await syncInvestorEmbeddingById(existing.id)
    }
    return true
  } catch (error: any) {
    console.error(`   ❌ Error updating database:`, error.message)
    return false
  }
}

async function updateVCInDatabase(
  research: VCResearchResult,
  investorRowId?: string | null,
): Promise<boolean> {
  try {
    if (!isLikelyRealFirmName(research.firmName)) {
      console.log(`   ⚠️ Skipping low-quality firm name: ${research.firmName}`)
      return false
    }
    const existing = await loadInvestorRowForUpdate(research.firmName, investorRowId)

    if (!existing) {
      console.log(`   ⚠️ VC not found in database: ${research.firmName}`)
      return false
    }

    const updateData: any = {}

    // Only fill fields that are currently empty/default
    if (research.checkSizeMin && existing.checkSizeMin === 0) {
      updateData.checkSizeMin = research.checkSizeMin
    }
    if (research.checkSizeMax && existing.checkSizeMax === 0) {
      updateData.checkSizeMax = research.checkSizeMax
    }
    if (research.stages?.length && existing.stages === '[]') {
      updateData.stages = JSON.stringify(research.stages)
    }
    const curThesis = (existing.thesis || '').trim()
    const nextThesis = sanitizeInvestmentThesis(research.thesis)
    if (isDealAnnouncementThesis(curThesis)) {
      updateData.thesis = nextThesis ?? null
    } else if (nextThesis && shouldReplaceStoredThesis(existing.thesis, nextThesis)) {
      updateData.thesis = nextThesis
    }
    if (research.bio && (!existing.bio || existing.bio.length < 20)) {
      updateData.bio = research.bio
    }
    if (research.sectors?.length && existing.sectors === '[]') {
      updateData.sectors = JSON.stringify(research.sectors)
    }
    if (research.geography?.length) {
      const existingGeo = existing.geography || '[]'
      if (existingGeo === '[]') {
        updateData.geography = JSON.stringify(research.geography)
      }
    }
    if (research.fundType && existing.fundType === 'Venture Capital') {
      updateData.fundType = research.fundType
    }
    if (research.leadFollow && existing.leadFollow === 'either') {
      updateData.leadFollow = research.leadFollow
    }
    if (research.portfolio?.length && (!existing.portfolio || existing.portfolio === '[]')) {
      updateData.portfolio = JSON.stringify(research.portfolio)
    }
    if (research.valueAddTags?.length && existing.valueAddTags === '[]') {
      updateData.valueAddTags = JSON.stringify(research.valueAddTags)
    }
    if (research.websiteUrl && !existing.websiteUrl) {
      updateData.websiteUrl = research.websiteUrl
    }
    if (research.linkedinUrl && !existing.linkedinUrl) {
      updateData.linkedinUrl = research.linkedinUrl
    }
    if (research.applicationUrl && !existing.applicationUrl) {
      updateData.applicationUrl = research.applicationUrl
    }
    if (research.fundSize?.trim() && !existing.fundSize?.trim()) {
      updateData.fundSize = research.fundSize.trim().slice(0, 500)
    }
    if (research.decisionSpeed?.trim() && !existing.decisionSpeed?.trim()) {
      updateData.decisionSpeed = research.decisionSpeed.trim().slice(0, 500)
    }

    // Always mark as verified and update timestamp
    updateData.verified = true

    const fieldsUpdated = Object.keys(updateData).length - 1 // minus verified
    if (fieldsUpdated > 0) {
      await db.investor.update({
        where: { id: existing.id },
        data: updateData,
      })
      console.log(`   ✅ Updated ${fieldsUpdated} fields for ${research.firmName}`)
    } else {
      console.log(`   ℹ️ No empty fields to fill for ${research.firmName}`)
      // Still touch updatedAt so we don't re-research next cycle
      await db.investor.update({
        where: { id: existing.id },
        data: { verified: true },
      })
    }

    if (fieldsUpdated > 0) {
      await syncInvestorEmbeddingById(existing.id)
    }

    return true
  } catch (error: any) {
    console.error(`   ❌ Error updating database:`, error.message)
    return false
  }
}

export type ResearchVcBatchOptions = {
  delayBetweenSearches?: number
  maxConcurrent?: number
  mode?: ResearchBatchMode
  /**
   * When true (default), only resolve rows with isPublic=true (Discover corpus). Skips Exa/LLM if none.
   * Set false only for internal jobs that must touch non-public rows.
   */
  discoverCorpusOnly?: boolean
}

/**
 * Research multiple VCs (batch processing)
 */
async function researchVCsBatch(
  firmNames: string[],
  options: ResearchVcBatchOptions = {},
): Promise<void> {
  const {
    delayBetweenSearches = 2000,
    maxConcurrent = 3,
    mode = 'full',
    discoverCorpusOnly = true,
  } = options

  console.log(`\n🚀 Starting batch research: ${firmNames.length} VCs (mode=${mode})`)
  console.log(
    `   Delay: ${delayBetweenSearches}ms, Max concurrent: ${maxConcurrent}, discover corpus only: ${discoverCorpusOnly}\n`,
  )

  let updated = 0
  let failed = 0

  const apply = async (research: VCResearchResult, rowId: string) => {
    const n = normalizeResearchForDb(research)
    if (mode === 'thesis') return updateVCInDatabaseThesisOnly(n, rowId)
    if (mode === 'profile') return updateVCInDatabaseProfileOnly(n, rowId)
    return updateVCInDatabase(n, rowId)
  }

  for (let i = 0; i < firmNames.length; i += maxConcurrent) {
    const batch = firmNames.slice(i, i + maxConcurrent)

    const results = await Promise.all(
      batch.map(async (firmName) => {
        const inv = await db.investor.findFirst({
          where: discoverCorpusOnly
            ? { firmName: { equals: firmName, mode: 'insensitive' }, isPublic: true }
            : { firmName: { equals: firmName, mode: 'insensitive' } },
          select: { id: true },
        })
        if (discoverCorpusOnly && !inv) {
          console.log(`   ⏭️ Skipping — no public (Discover) investor row for "${firmName}"`)
          return { firmName, success: false }
        }
        const research = await researchVC(firmName, mode, { investorId: inv?.id })
        if (!research) {
          return { firmName, success: false }
        }

        if (!inv?.id) {
          console.log(`   ⏭️ Skipping apply — could not resolve investor row for "${firmName}"`)
          return { firmName, success: false }
        }

        const ok = await apply(research, inv.id)

        if (ok) {
          try {
            await researchApplyContactAndUpdate(firmName, { overwrite: false, investorId: inv.id })
          } catch (err) {
            console.error(`[VC-RESEARCH] Apply/contact enrichment failed for ${firmName}:`, err)
          }
        }

        return { firmName, success: ok }
      })
    )

    results.forEach(({ success }) => {
      if (success) updated++
      else failed++
    })

    if (i + maxConcurrent < firmNames.length) {
      console.log(`\n⏳ Waiting ${delayBetweenSearches}ms before next batch...`)
      await new Promise(resolve => setTimeout(resolve, delayBetweenSearches))
    }
  }

  console.log(`\n📊 Batch Research Complete:`)
  console.log(`   ✅ Updated: ${updated}`)
  console.log(`   ❌ Failed: ${failed}`)
  if (firmNames.length > 0) {
    console.log(`   📈 Success rate: ${((updated / firmNames.length) * 100).toFixed(1)}%`)
  }
}

/**
 * Main function  -  can be called from CLI or scheduled
 */
async function main() {
  const args = process.argv.slice(2)

  if (args[0] === '--batch') {
    const topVCs = [
      'Benchmark', 'Accel', 'First Round Capital', 'Lightspeed Venture Partners',
      'Index Ventures', 'Greylock Partners', 'Bessemer Venture Partners',
      'General Catalyst', 'NEA', 'Insight Partners',
    ]
    await researchVCsBatch(topVCs, { delayBetweenSearches: 2000, maxConcurrent: 2 })
  } else if (args[0] === '--all') {
    console.log('⚠️ Researching public (Discover) investors only  -  this will take hours!')
    const allVCs = await db.investor.findMany({
      where: { isPublic: true },
      select: { firmName: true },
      orderBy: { updatedAt: 'asc' },
    })
    const eligibleNames = allVCs.map((vc) => vc.firmName).filter((n) => isInvestorEligibleForWorkers(n))
    const skipped = allVCs.length - eligibleNames.length
    if (skipped > 0) {
      console.log(
        `⏭️ Skipping ${skipped} investor(s) — firm name not eligible for worker spend (no Exa/LLM). Run worker:hide-low-quality to de-public junk still marked public.`,
      )
    }
    await researchVCsBatch(eligibleNames, {
      delayBetweenSearches: 3000,
      maxConcurrent: 1,
    })
  } else if (args[0]) {
    const inv = await db.investor.findFirst({
      where: { firmName: { equals: args[0], mode: 'insensitive' }, isPublic: true },
      select: { id: true },
    })
    if (!inv) {
      console.log(
        `⏭️ No public investor found for "${args[0]}". CLI only enriches isPublic=true rows (Discover).`,
      )
      return
    }
    const research = await researchVC(args[0], 'full', { investorId: inv.id })
    if (research) {
      await updateVCInDatabase(normalizeResearchForDb(research), inv.id)
      try {
        await researchApplyContactAndUpdate(args[0], { investorId: inv.id })
      } catch (err) {
        console.error(`[VC-RESEARCH] Apply/contact enrichment failed:`, err)
      }
    }
  } else {
    console.log(`
Usage:
  npm run research-vcs -- --batch    # Research top 10 VCs
  npm run research-vcs -- --all      # Public (Discover) investors only; eligible names; see worker:hide-low-quality
  npm run research-vcs -- "VC Name"  # One public investor by name (isPublic=true only)

Enrichment + auto-hide (entity classifier runs when gate not off or AUTO_HIDE_BOGUS=1):
  VC_RESEARCH_ENTITY_GATE=observe|enforce|off
  VC_RESEARCH_AUTO_HIDE_BOGUS=1   # set isPublic/discoverable false when gate marks bogus listing

Continuous daemon: npm run research-worker
Env: VC_RESEARCH_INTERVAL_MINUTES, VC_RESEARCH_BATCH_SIZE
    `)
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
    .finally(async () => {
      await db.$disconnect()
    })
}

export { researchVC, researchVCsBatch, updateVCInDatabase }
