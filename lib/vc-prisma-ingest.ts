import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { isLikelyRealFirmName } from '@/lib/firm-name-quality'
import {
  normalizeResearchForDb,
  sanitizeCheckSizeThousandsForInt4,
} from '@/lib/vc-research-normalize'
import type { VCResearchResult } from '../scripts/auto-research-vcs'
import { researchVC, updateVCInDatabase } from '../scripts/auto-research-vcs'
import { syncInvestorEmbeddingById } from '@/lib/vc-embedding-sync'
import { canonicalInvestorKey } from '@/lib/investor-canonical-key'

function placeholderEmail(firmName: string): string {
  const slug = firmName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 48)
  const suffix = randomBytes(3).toString('hex')
  return `vc.${slug || 'firm'}.${suffix}@placeholder.invalid`
}

/**
 * Create a new Prisma Investor from scraped research (firm not in DB yet).
 */
export async function createInvestorFromResearch(research: VCResearchResult): Promise<{ id: string } | null> {
  let email = placeholderEmail(research.firmName)
  for (let attempt = 0; attempt < 8; attempt++) {
    const taken = await db.investor.findUnique({ where: { email }, select: { id: true } })
    if (!taken) break
    email = placeholderEmail(`${research.firmName}-${attempt}`)
  }

  const stages = research.stages?.length ? research.stages : ['seed']
  const sectors = research.sectors?.length ? research.sectors : ['technology']
  const geography = research.geography?.length ? research.geography : []

  const checkMin = sanitizeCheckSizeThousandsForInt4(research.checkSizeMin) ?? 0
  const checkMax = sanitizeCheckSizeThousandsForInt4(research.checkSizeMax) ?? 0

  const inv = await db.investor.create({
    data: {
      email,
      name: `${research.firmName} Team`,
      firmName: research.firmName,
      verified: research.verified,
      bio: research.bio || `${research.firmName} (${research.fundType || 'Venture Capital'})`,
      thesis: research.thesis ?? null,
      stages: JSON.stringify(stages),
      sectors: JSON.stringify(sectors),
      geoFocus: JSON.stringify(geography),
      geography: JSON.stringify(geography),
      checkMin,
      checkMax,
      checkSizeMin: checkMin,
      checkSizeMax: checkMax,
      fundType: research.fundType || 'Venture Capital',
      leadFollow: research.leadFollow || 'either',
      portfolio: research.portfolio?.length ? JSON.stringify(research.portfolio) : null,
      valueAddTags: research.valueAddTags?.length ? JSON.stringify(research.valueAddTags) : JSON.stringify([]),
      ethicsTags: JSON.stringify([]),
      websiteUrl: research.websiteUrl ?? null,
      website: research.websiteUrl ?? null,
      linkedinUrl: research.linkedinUrl ?? null,
      applicationUrl: research.applicationUrl ?? null,
      fundSize: research.fundSize?.trim().slice(0, 500) || null,
      decisionSpeed: research.decisionSpeed?.trim().slice(0, 500) || null,
      isPublic: true,
      discoverable: true,
    },
  })

  return { id: inv.id }
}

/**
 * Research a firm, create Prisma row if missing, else patch empty fields; returns latest investor row.
 */
export async function ingestFirmToPrisma(firmName: string): Promise<{
  investor: Awaited<ReturnType<typeof db.investor.findUnique>>
  research: VCResearchResult | null
  isNew: boolean
}> {
  const raw = await researchVC(firmName.trim())
  if (!raw) {
    return { investor: null, research: null, isNew: false }
  }

  const research = normalizeResearchForDb(raw)
  if (!isLikelyRealFirmName(research.firmName)) {
    console.warn(`[VC-INGEST] Skipping low-quality discovered name: "${research.firmName}"`)
    return { investor: null, research: null, isNew: false }
  }

  let existing = await db.investor.findFirst({
    where: { firmName: { equals: research.firmName, mode: 'insensitive' } },
  })

  if (!existing) {
    const k = canonicalInvestorKey(research.firmName)
    const rows = await db.investor.findMany({
      select: {
        id: true,
        firmName: true,
        isPublic: true,
        discoverable: true,
        createdAt: true,
      },
    })
    const hits = rows.filter((r) => canonicalInvestorKey(r.firmName) === k)
    hits.sort((a, b) => {
      if (a.isPublic !== b.isPublic) return a.isPublic ? -1 : 1
      if (a.discoverable !== b.discoverable) return a.discoverable ? -1 : 1
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
    existing = hits[0] ?? null
  }

  let isNew = false
  if (existing) {
    const researchForUpdate = { ...research, firmName: existing.firmName }
    await updateVCInDatabase(researchForUpdate, existing.id)
  } else {
    await createInvestorFromResearch(research)
    isNew = true
  }

  const investor = existing
    ? await db.investor.findUnique({ where: { id: existing.id } })
    : await db.investor.findFirst({
        where: { firmName: { equals: research.firmName, mode: 'insensitive' } },
      })

  if (investor?.isPublic) {
    await syncInvestorEmbeddingById(investor.id)
  }

  return { investor, research, isNew }
}
