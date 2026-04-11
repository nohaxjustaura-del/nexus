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
 * Partner network pages (`/founder/network`): admins/dev bypass, accounts approved into the network,
 * verified investors, premium subscribers, or legacy module purchasers.
 */
export function canAccessFounderNetwork(params: {
  isPremium: boolean
  purchasesJson: string | null | undefined
  email?: string | null
  userApprovalStatus?: string | null
  investorVerified?: boolean
}): boolean {
  if (params.email && bypassesAiCredits(params.email)) return true
  if (params.userApprovalStatus === 'approved') return true
  if (params.investorVerified) return true
  if (params.isPremium) return true
  return parsePurchasesJson(params.purchasesJson).length > 0
}
