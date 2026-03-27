import type { Investor } from '@prisma/client'
import { db } from './db'

function parseJsonArray(raw: string | null | undefined, fallback: unknown[] = []): unknown[] {
  if (raw == null || raw === '') return fallback
  try {
    const v = JSON.parse(raw) as unknown
    return Array.isArray(v) ? v : fallback
  } catch {
    return fallback
  }
}

export type UpsertVcDirectoryOptions = {
  researchSources?: unknown
}

export type UpsertVcDirectoryResult = { ok: true } | { ok: false; error: string }

/**
 * Upsert a Prisma Investor row into Supabase `vc_directory` via PostgREST (service role).
 */
export async function upsertInvestorToVcDirectory(
  investor: Investor,
  options?: UpsertVcDirectoryOptions,
): Promise<UpsertVcDirectoryResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const table = (process.env.SUPABASE_VC_TABLE || 'vc_directory').trim()

  if (!url || !key) {
    return {
      ok: false,
      error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    }
  }

  const row = {
    id: investor.id,
    firm_name: investor.firmName,
    email: investor.email,
    name: investor.name,
    thesis: investor.thesis ?? '',
    bio: investor.bio ?? '',
    website_url: investor.websiteUrl || investor.website || null,
    linkedin_url: investor.linkedinUrl ?? null,
    application_url: investor.applicationUrl ?? null,
    check_size_min: investor.checkSizeMin ?? investor.checkMin ?? 0,
    check_size_max: investor.checkSizeMax ?? investor.checkMax ?? 0,
    fund_type: investor.fundType ?? null,
    lead_follow: investor.leadFollow ?? null,
    verified: investor.verified,
    stages: parseJsonArray(investor.stages),
    sectors: parseJsonArray(investor.sectors),
    geography: parseJsonArray(investor.geography),
    portfolio: parseJsonArray(investor.portfolio),
    value_add_tags: parseJsonArray(investor.valueAddTags),
    research_sources: options?.researchSources ?? null,
    prisma_updated_at: investor.updatedAt?.toISOString?.() ?? null,
    synced_at: new Date().toISOString(),
  }

  const endpoint = `${url}/rest/v1/${table}`
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    })

    if (!res.ok) {
      const text = await res.text()
      let msg = text || res.statusText
      if (res.status === 404 || /schema cache/i.test(text)) {
        msg += ` For default table vc_directory: npm run db:vc-directory (DATABASE_URL must point at this Supabase Postgres), or run supabase/vc_directory.sql in the Supabase SQL editor, then reload the API schema if needed.`
      }
      return { ok: false, error: msg }
    }
    return { ok: true }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: message }
  }
}

export type SyncRecentVcDirectoryResult = {
  skipped: boolean
  reason?: string
  upserted: number
  failed: number
  examined: number
}

/**
 * Upserts recently updated public/discoverable investors into Supabase `vc_directory`.
 * Uses a lookback window so discover/ingest failures can be healed on the next tick without full-table scans.
 */
export async function syncRecentPublicDiscoverableToVcDirectory(options?: {
  lookbackMs?: number
  maxRows?: number
  delayBetweenUpsertsMs?: number
}): Promise<SyncRecentVcDirectoryResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    return {
      skipped: true,
      reason: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
      upserted: 0,
      failed: 0,
      examined: 0,
    }
  }

  const lookbackMs = options?.lookbackMs ?? 50 * 60 * 60 * 1000
  const maxRows = Math.min(400, Math.max(15, options?.maxRows ?? 120))
  const delayMs = Math.max(0, options?.delayBetweenUpsertsMs ?? 75)

  const since = new Date(Date.now() - lookbackMs)
  const rows = await db.investor.findMany({
    where: {
      isPublic: true,
      discoverable: true,
      updatedAt: { gte: since },
    },
    orderBy: { updatedAt: 'desc' },
    take: maxRows,
  })

  let upserted = 0
  let failed = 0
  for (const inv of rows) {
    const r = await upsertInvestorToVcDirectory(inv)
    if (r.ok) upserted++
    else failed++
    if (delayMs) await new Promise((res) => setTimeout(res, delayMs))
  }

  return {
    skipped: false,
    upserted,
    failed,
    examined: rows.length,
  }
}
