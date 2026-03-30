/**
 * Check sizes are stored in two places on `Investor`: legacy `checkMin`/`checkMax`
 * (thousands USD) and matching `checkSizeMin`/`checkSizeMax` (thousands USD).
 * When legacy is 0–0, fall back to standardized fields for filtering/display logic.
 */
export function investorCheckRangeThousands(inv: {
  checkMin?: number | null
  checkMax?: number | null
  checkSizeMin?: number | null
  checkSizeMax?: number | null
}): { minK: number; maxK: number } {
  let minK = Number(inv.checkMin ?? 0)
  let maxK = Number(inv.checkMax ?? 0)
  if (minK <= 0 && maxK <= 0) {
    minK = Number(inv.checkSizeMin ?? 0)
    maxK = Number(inv.checkSizeMax ?? 0)
  }
  return { minK, maxK }
}

/** No usable min/max — do not exclude from funding overlap filters. */
export function investorHasUnknownCheckSize(inv: {
  checkMin?: number | null
  checkMax?: number | null
  checkSizeMin?: number | null
  checkSizeMax?: number | null
}): boolean {
  const { minK, maxK } = investorCheckRangeThousands(inv)
  return minK <= 0 && maxK <= 0
}
