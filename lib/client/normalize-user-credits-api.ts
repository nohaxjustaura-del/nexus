/**
 * Normalize GET /api/user/credits JSON so UI and balance checks treat unlimited accounts consistently.
 */
export function normalizeUserCreditsApiPayload(raw: unknown): {
  credits: number
  isPremium: boolean
  unlimitedCredits: boolean
  premiumExpiresAt: string | null
  purchases: string[]
} {
  if (!raw || typeof raw !== 'object') {
    return {
      credits: 0,
      isPremium: false,
      unlimitedCredits: false,
      premiumExpiresAt: null,
      purchases: [],
    }
  }
  const o = raw as Record<string, unknown>
  const unlimited = o.unlimitedCredits === true
  const n = typeof o.credits === 'number' ? o.credits : 0
  let purchases: string[] = []
  try {
    if (Array.isArray(o.purchases)) purchases = o.purchases as string[]
    else if (typeof o.purchases === 'string') purchases = JSON.parse(o.purchases) as string[]
  } catch {
    purchases = []
  }
  return {
    credits: unlimited ? Number.MAX_SAFE_INTEGER : n,
    isPremium: Boolean(o.isPremium) || unlimited,
    unlimitedCredits: unlimited,
    premiumExpiresAt:
      o.premiumExpiresAt == null
        ? null
        : typeof o.premiumExpiresAt === 'string'
          ? o.premiumExpiresAt
          : null,
    purchases,
  }
}
