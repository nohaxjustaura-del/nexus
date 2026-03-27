import { revalidateTag, unstable_cache } from 'next/cache'
import { db } from '@/lib/db'

/** Tag for `revalidateTag` when investor rows affect verified counts (admin verify, approve, delete). */
export const VERIFIED_INVESTOR_COUNT_CACHE_TAG = 'verified-investor-count'

/** Cached verified investor count for marketing copy (revalidates periodically and on tag). */
export const getVerifiedInvestorCount = unstable_cache(
  async () => db.investor.count({ where: { verified: true } }),
  ['verified-investor-count'],
  { revalidate: 120, tags: [VERIFIED_INVESTOR_COUNT_CACHE_TAG] }
)

export function revalidateVerifiedInvestorCountCache() {
  revalidateTag(VERIFIED_INVESTOR_COUNT_CACHE_TAG)
}

export function formatVerifiedInvestorCount(n: number): string {
  return n.toLocaleString('en-US')
}
