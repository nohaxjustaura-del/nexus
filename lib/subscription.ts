import { db } from '@/lib/db'
import { grantsUnlimitedCreditsDisplay } from '@/lib/dev-ai-analysis-bypass'
import { SUBSCRIPTION_TIERS, TIER_LIMITS } from '@/lib/constants'

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS]

export interface SubscriptionStatus {
  tier: SubscriptionTier
  isPro: boolean
  isTeam: boolean
  limits: (typeof TIER_LIMITS)[SubscriptionTier]
}

export async function getSubscriptionStatus(userId: string, email?: string | null): Promise<SubscriptionStatus> {
  if (email && grantsUnlimitedCreditsDisplay(email)) {
    return {
      tier: SUBSCRIPTION_TIERS.TEAM,
      isPro: true,
      isTeam: true,
      limits: TIER_LIMITS[SUBSCRIPTION_TIERS.TEAM],
    }
  }

  const userCredits = await (db as any).userCredits.findUnique({
    where: { userId },
  })

  const isPremium = Boolean(userCredits?.isPremium)
  const isTeam = Boolean(userCredits?.isTeam)

  const tier = isTeam
    ? SUBSCRIPTION_TIERS.TEAM
    : isPremium
      ? SUBSCRIPTION_TIERS.PRO
      : SUBSCRIPTION_TIERS.FREE

  return {
    tier,
    isPro: isPremium || isTeam,
    isTeam,
    limits: TIER_LIMITS[tier],
  }
}

export function requiresPro(sub: SubscriptionStatus): boolean {
  return !sub.isPro
}
