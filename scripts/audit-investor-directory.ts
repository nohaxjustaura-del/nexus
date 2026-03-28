#!/usr/bin/env tsx
/**
 * Read-only Investor directory quality report.
 * Run: npx tsx scripts/audit-investor-directory.ts
 *       npx tsx scripts/audit-investor-directory.ts --json > audit-report.json
 */

import { db } from '../lib/db'

const JSON_FIELDS = [
  'stages',
  'sectors',
  'geoFocus',
  'geography',
  'portfolio',
  'valueAddTags',
  'ethicsTags',
  'notableInvestments',
  'proofPoints',
  'embedding',
] as const

type JsonField = (typeof JSON_FIELDS)[number]

function parseCli() {
  return { json: process.argv.includes('--json') }
}

function tryParseJson(raw: string | null | undefined, field: JsonField): { ok: true } | { ok: false; error: string } {
  if (raw == null || raw === '') {
    if (field === 'embedding' || field === 'portfolio' || field === 'notableInvestments' || field === 'proofPoints') {
      return { ok: true }
    }
    return { ok: false, error: 'empty' }
  }
  try {
    const v = JSON.parse(raw)
    if (field === 'embedding') {
      if (!Array.isArray(v)) return { ok: false, error: 'not_array' }
      return { ok: true }
    }
    if (!Array.isArray(v)) return { ok: false, error: 'not_json_array' }
    return { ok: true }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

function norm(s: string) {
  return s.trim().toLowerCase()
}

function looksSyntheticEmail(email: string) {
  const e = email.toLowerCase()
  return (
    e.includes('@placeholder') ||
    e.includes('@example.') ||
    e.includes('noreply@') ||
    e.includes('@faiss.') ||
    e.includes('@imported.') ||
    /\+duplicate\d*@/i.test(e)
  )
}

/** checkMin/Max in thousands vs checkSizeMin/Max in USD — flag if both sides non-zero and far apart */
function checkSizeMismatch(checkMin: number, checkMax: number, checkSizeMin: number, checkSizeMax: number) {
  const k2usd = (k: number) => k * 1000
  const usdMin = k2usd(checkMin)
  const usdMax = k2usd(checkMax)
  if (checkSizeMin <= 0 && checkSizeMax <= 0) return false
  if (checkMin <= 0 && checkMax <= 0) return false
  const tol = 0.25
  const minClose =
    checkSizeMin <= 0 ||
    usdMin <= 0 ||
    Math.abs(usdMin - checkSizeMin) / Math.max(usdMin, checkSizeMin, 1) <= tol
  const maxClose =
    checkSizeMax <= 0 ||
    usdMax <= 0 ||
    Math.abs(usdMax - checkSizeMax) / Math.max(usdMax, checkSizeMax, 1) <= tol
  return !(minClose && maxClose)
}

async function main() {
  const { json } = parseCli()

  const investors = await db.investor.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      firmName: true,
      verified: true,
      isPublic: true,
      thesis: true,
      websiteUrl: true,
      website: true,
      stages: true,
      sectors: true,
      geoFocus: true,
      geography: true,
      portfolio: true,
      valueAddTags: true,
      ethicsTags: true,
      notableInvestments: true,
      proofPoints: true,
      embedding: true,
      checkMin: true,
      checkMax: true,
      checkSizeMin: true,
      checkSizeMax: true,
    },
  })

  const byFirm = new Map<string, { id: string; firmName: string }[]>()
  for (const inv of investors) {
    const key = norm(inv.firmName)
    if (!key) continue
    const list = byFirm.get(key) ?? []
    list.push({ id: inv.id, firmName: inv.firmName })
    byFirm.set(key, list)
  }
  const duplicateGroups = [...byFirm.entries()].filter(([, rows]) => rows.length > 1)

  const nameEqualsFirm: typeof investors = []
  const syntheticEmail: typeof investors = []
  const invalidJson: { id: string; firmName: string; field: JsonField; error: string }[] = []
  const invalidJsonByField: Record<string, number> = {}
  const checkMismatch: typeof investors = []
  const weakVerifiedPublic: {
    id: string
    firmName: string
    reasons: string[]
  }[] = []

  for (const inv of investors) {
    if (norm(inv.name) === norm(inv.firmName) && inv.name.trim().length > 0) {
      nameEqualsFirm.push(inv)
    }
    if (looksSyntheticEmail(inv.email)) {
      syntheticEmail.push(inv)
    }

    for (const field of JSON_FIELDS) {
      const raw = inv[field as keyof typeof inv] as string | null | undefined
      const r = tryParseJson(raw ?? null, field)
      if (!r.ok) {
        invalidJson.push({ id: inv.id, firmName: inv.firmName, field, error: r.error })
        invalidJsonByField[field] = (invalidJsonByField[field] ?? 0) + 1
      }
    }

    if (checkSizeMismatch(inv.checkMin, inv.checkMax, inv.checkSizeMin, inv.checkSizeMax)) {
      checkMismatch.push(inv)
    }

    if (inv.verified && inv.isPublic) {
      const reasons: string[] = []
      if (!inv.thesis || !inv.thesis.trim()) reasons.push('missing_thesis')
      const hasSite = Boolean((inv.websiteUrl && inv.websiteUrl.trim()) || (inv.website && inv.website.trim()))
      if (!hasSite) reasons.push('missing_website')
      let stagesOk = false
      let sectorsOk = false
      try {
        const st = JSON.parse(inv.stages)
        stagesOk = Array.isArray(st) && st.length > 0
      } catch {
        reasons.push('stages_not_json')
      }
      try {
        const se = JSON.parse(inv.sectors)
        sectorsOk = Array.isArray(se) && se.length > 0
      } catch {
        reasons.push('sectors_not_json')
      }
      if (!stagesOk && !reasons.includes('stages_not_json')) reasons.push('empty_stages')
      if (!sectorsOk && !reasons.includes('sectors_not_json')) reasons.push('empty_sectors')
      if (reasons.length) weakVerifiedPublic.push({ id: inv.id, firmName: inv.firmName, reasons })
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalInvestors: investors.length,
    duplicateFirmNameGroups: duplicateGroups.length,
    duplicateFirmNames: duplicateGroups.map(([k, rows]) => ({
      normalizedKey: k,
      count: rows.length,
      ids: rows.map((r) => r.id),
      firmNames: [...new Set(rows.map((r) => r.firmName))],
    })),
    nameEqualsFirmNameCount: nameEqualsFirm.length,
    nameEqualsFirmNameSample: nameEqualsFirm.slice(0, 30).map((i) => ({
      id: i.id,
      firmName: i.firmName,
      email: i.email,
    })),
    syntheticEmailCount: syntheticEmail.length,
    syntheticEmailsSample: syntheticEmail.slice(0, 30).map((i) => ({
      id: i.id,
      firmName: i.firmName,
      email: i.email,
    })),
    invalidJsonFieldCount: invalidJson.length,
    invalidJsonByField,
    invalidJsonSample: invalidJson.slice(0, 50),
    checkSizeFieldMismatchCount: checkMismatch.length,
    checkSizeMismatchSample: checkMismatch.slice(0, 25).map((i) => ({
      id: i.id,
      firmName: i.firmName,
      checkMin: i.checkMin,
      checkMax: i.checkMax,
      checkSizeMin: i.checkSizeMin,
      checkSizeMax: i.checkSizeMax,
    })),
    weakVerifiedPublicCount: weakVerifiedPublic.length,
    weakVerifiedPublicSample: weakVerifiedPublic.slice(0, 40),
  }

  if (json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log('Investor directory audit (read-only)\n')
  console.log(`Total investors:              ${report.totalInvestors}`)
  console.log(`Duplicate firmName groups:    ${report.duplicateFirmNameGroups}`)
  console.log(`name === firmName (placeholder): ${report.nameEqualsFirmNameCount}`)
  console.log(`Synthetic-ish emails:         ${report.syntheticEmailCount}`)
  console.log(`Invalid JSON fields:          ${report.invalidJsonFieldCount}`)
  if (Object.keys(report.invalidJsonByField).length) {
    const breakdown = Object.entries(report.invalidJsonByField)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join(', ')
    console.log(`  by field: ${breakdown}`)
  }
  console.log(`checkMin/Max vs checkSize mismatch: ${report.checkSizeFieldMismatchCount}`)
  console.log(`verified+public weak profile:     ${report.weakVerifiedPublicCount}`)
  console.log('')

  if (duplicateGroups.length) {
    console.log('--- Duplicate firm names (first 15 groups) ---')
    for (const d of report.duplicateFirmNames.slice(0, 15)) {
      console.log(`  ${d.count}x "${d.firmNames[0]}" → ids: ${d.ids.join(', ')}`)
    }
    console.log('')
  }

  if (report.invalidJsonSample.length) {
    console.log('--- Invalid JSON (first 20) ---')
    for (const row of report.invalidJsonSample.slice(0, 20)) {
      console.log(`  ${row.firmName} [${row.field}]: ${row.error}`)
    }
    console.log('')
  }

  if (report.weakVerifiedPublicSample.length) {
    console.log('--- Weak verified+public (first 15) ---')
    for (const w of report.weakVerifiedPublicSample.slice(0, 15)) {
      console.log(`  ${w.firmName}: ${w.reasons.join(', ')}`)
    }
  }

  console.log('\nRe-run with --json for full machine-readable report.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
