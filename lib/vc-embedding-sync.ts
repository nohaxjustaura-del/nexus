import { db } from '@/lib/db'
import { parseJSON } from '@/lib/utils'
import {
  EMBEDDING_DIMENSIONS,
  generateVCEmbedding,
} from '@/lib/embeddings'

/**
 * After research workers update an investor row, refresh their Voyage embedding in Prisma.
 * Skips private rows, missing VOYAGE_API_KEY, or when disabled via VC_SYNC_EMBEDDING_AFTER_RESEARCH=0.
 *
 * FAISS still refreshes on the scheduled embeddings job (or npm run embeddings:rebuild); this
 * keeps the DB column and in-memory ranking aligned without waiting up to 24h.
 */
export async function syncInvestorEmbeddingById(
  investorId: string,
  options?: { force?: boolean },
): Promise<void> {
  const disabled =
    process.env.VC_SYNC_EMBEDDING_AFTER_RESEARCH === '0' ||
    process.env.VC_SYNC_EMBEDDING_AFTER_RESEARCH === 'false'
  if (disabled && !options?.force) return
  if (!process.env.VOYAGE_API_KEY?.trim()) return

  try {
    const investor = await db.investor.findUnique({
      where: { id: investorId },
      select: {
        id: true,
        firmName: true,
        fundType: true,
        stages: true,
        sectors: true,
        geography: true,
        geoFocus: true,
        checkSizeMin: true,
        checkSizeMax: true,
        leadFollow: true,
        thesis: true,
        valueAddTags: true,
        portfolio: true,
        notableInvestments: true,
        isPublic: true,
      },
    })

    if (!investor?.isPublic) return

    const embedding = await generateVCEmbedding({
      firmName: investor.firmName ?? 'Unknown',
      fundType: investor.fundType,
      stages: parseJSON<string[]>(investor.stages, []),
      sectors: parseJSON<string[]>(investor.sectors, []),
      geography: parseJSON<string[]>(investor.geography || investor.geoFocus, []),
      checkSizeMin: investor.checkSizeMin,
      checkSizeMax: investor.checkSizeMax,
      leadFollow: investor.leadFollow,
      thesis: investor.thesis || undefined,
      valueAddTags: parseJSON<string[]>(investor.valueAddTags, []),
      portfolio: parseJSON<{ name?: string; company?: string }[] | string[]>(investor.portfolio, [])
        .map((p) => (typeof p === 'string' ? p : p.name || p.company))
        .filter((s): s is string => Boolean(s)),
      notableInvestments: parseJSON<string[]>(investor.notableInvestments, []),
    })

    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      console.warn(
        `[vc-embedding-sync] skip ${investor.firmName}: expected ${EMBEDDING_DIMENSIONS} dims, got ${embedding.length}`,
      )
      return
    }

    await db.investor.update({
      where: { id: investorId },
      data: { embedding: JSON.stringify(embedding) },
    })
  } catch (e) {
    console.warn(
      '[vc-embedding-sync]',
      investorId,
      e instanceof Error ? e.message : e,
    )
  }
}
