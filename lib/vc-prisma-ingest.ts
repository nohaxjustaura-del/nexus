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
      isPublic: true,
      discoverable: true,
    },
  })

  await syncInvestorEmbeddingById(inv.id)

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

  const existing = await db.investor.findFirst({
    where: { firmName: { equals: research.firmName, mode: 'insensitive' } },
  })

  let isNew = false
  if (existing) {
    await updateVCInDatabase(research)
  } else {
    await createInvestorFromResearch(research)
    isNew = true
  }

  const investor = await db.investor.findFirst({
    where: { firmName: { equals: research.firmName, mode: 'insensitive' } },
  })

  return { investor, research, isNew }
}
