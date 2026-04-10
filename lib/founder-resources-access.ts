import { bypassesAiCredits } from '@/lib/dev-ai-analysis-bypass'

export function parsePurchasesJson(purchases: string | null | undefined): string[] {
  if (!purchases) return []
  try {
    const parsed = JSON.parse(purchases as string)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

/**
 * Partner resources pages: premium subscribers, legacy module buyers, or admin-style bypass.
 */
export function canAccessFounderResources(params: {
  isPremium: boolean
  purchasesJson: string | null | undefined
  email?: string | null
}): boolean {
  if (params.email && bypassesAiCredits(params.email)) return true
  if (params.isPremium) return true
  return parsePurchasesJson(params.purchasesJson).length > 0
}
