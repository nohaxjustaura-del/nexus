import type { Prisma } from '@prisma/client'
import { evaluateInvestorPristine, type PristineInvestorInput } from './investor-pristine-gate'

/**
 * Who gets written into faiss-data (JSONL + embeddings + vc_index.faiss).
 *
 * Env: FAISS_INDEX_FILTER (default: public_discoverable)
 * - public_discoverable — verified + isPublic + discoverable + has embedding (match / discover corpus)
 * - pristine — same DB prefilter, then keep only rows that pass evaluateInvestorPristine() (~strict quality bar)
 * - legacy_verified_embedded — old build-faiss-index: verified + embedding (no public/discoverable)
 * - legacy_verified_all — old rebuild-faiss-index: verified only (re-embeds everyone)
 */
export type FaissIndexFilterMode =
  | 'public_discoverable'
  | 'pristine'
  | 'legacy_verified_embedded'
  | 'legacy_verified_all'

export function getFaissIndexFilterMode(): FaissIndexFilterMode {
  const raw = (process.env.FAISS_INDEX_FILTER || 'public_discoverable').trim().toLowerCase()
  if (raw === 'pristine') return 'pristine'
  if (raw === 'legacy_verified_embedded') return 'legacy_verified_embedded'
  if (raw === 'legacy_verified_all') return 'legacy_verified_all'
  if (raw === 'public_discoverable') return 'public_discoverable'
  if (raw) {
    console.warn(
      `[faiss-index-filter] Unknown FAISS_INDEX_FILTER="${process.env.FAISS_INDEX_FILTER}" — using public_discoverable`,
    )
  }
  return 'public_discoverable'
}

/** build-faiss-index: only rows that already have stored vectors. */
export function prismaWhereForFaissIndexBuild(mode: FaissIndexFilterMode): Prisma.InvestorWhereInput {
  switch (mode) {
    case 'public_discoverable':
    case 'pristine':
      return {
        verified: true,
        isPublic: true,
        discoverable: true,
        embedding: { not: null },
      }
    case 'legacy_verified_embedded':
      return { verified: true, embedding: { not: null } }
    case 'legacy_verified_all':
      return { verified: true }
    default:
      return {
        verified: true,
        isPublic: true,
        discoverable: true,
        embedding: { not: null },
      }
  }
}

/** rebuild-faiss-index: re-embed from profile text — embedding may be missing until regenerated. */
export function prismaWhereForFaissIndexRebuild(mode: FaissIndexFilterMode): Prisma.InvestorWhereInput {
  switch (mode) {
    case 'public_discoverable':
    case 'pristine':
      return { verified: true, isPublic: true, discoverable: true }
    case 'legacy_verified_embedded':
      return { verified: true, embedding: { not: null } }
    case 'legacy_verified_all':
      return { verified: true }
    default:
      return { verified: true, isPublic: true, discoverable: true }
  }
}

/** Select needed for evaluateInvestorPristine (same shape as scripts/enforce-investor-pristine.ts). */
export const investorSelectForPristine: Prisma.InvestorSelect = {
  id: true,
  firmName: true,
  email: true,
  thesis: true,
  bio: true,
  checkSizeMin: true,
  checkSizeMax: true,
  checkMin: true,
  checkMax: true,
  stages: true,
  sectors: true,
  geography: true,
  geoFocus: true,
  fundType: true,
  leadFollow: true,
  portfolio: true,
  valueAddTags: true,
  notableInvestments: true,
  websiteUrl: true,
  linkedinUrl: true,
  applicationUrl: true,
  embedding: true,
  isPublic: true,
  discoverable: true,
}

export type InvestorRowForPristine = Prisma.InvestorGetPayload<{ select: typeof investorSelectForPristine }>

export function rowToPristineInput(r: InvestorRowForPristine): PristineInvestorInput {
  return r as unknown as PristineInvestorInput
}

export function filterToPristineOk(
  rows: InvestorRowForPristine[],
  options?: { ignoreEmbedding?: boolean },
): InvestorRowForPristine[] {
  return rows.filter((r) =>
    evaluateInvestorPristine(rowToPristineInput(r), {
      ignoreEmbedding: options?.ignoreEmbedding,
    }).ok,
  )
}

export function logFaissIndexCohort(
  mode: FaissIndexFilterMode,
  fromDb: number,
  afterPristine?: number,
): void {
  if (mode === 'pristine' && afterPristine !== undefined) {
    console.log(
      `ℹ️  FAISS_INDEX_FILTER=pristine: ${fromDb} from DB (verified+public+discoverable+embedding) → ${afterPristine} pass pristine gate\n`,
    )
  } else {
    console.log(`ℹ️  FAISS_INDEX_FILTER=${mode}: ${fromDb} investor(s)\n`)
  }
}
