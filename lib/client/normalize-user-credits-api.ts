/**
 * Normalize GET /api/user/credits JSON so UI and balance checks treat unlimited accounts consistently.
 */
export type PitchIdeaWeeklyFreePayload = {
  used: number
  limit: number
  remaining: number
  resetsAt: string
}

export function normalizeUserCreditsApiPayload(raw: unknown): {
  credits: number
  isPremium: boolean
  unlimitedCredits: boolean
  premiumExpiresAt: string | null
  purchases: string[]
  pitchIdeaWeeklyFree: PitchIdeaWeeklyFreePayload | null
} {
  if (!raw || typeof raw !== 'object') {
    return {
      credits: 0,
      isPremium: false,
      unlimitedCredits: false,
      premiumExpiresAt: null,
      purchases: [],
      pitchIdeaWeeklyFree: null,
    }
  }
  const o = raw as Record<string, unknown>
  const unlimited = o.unlimitedCredits === true
  const n = typeof o.credits === 'number' ? o.credits : 0
  let pitchIdeaWeeklyFree: PitchIdeaWeeklyFreePayload | null = null
  const pif = o.pitchIdeaWeeklyFree
  if (pif && typeof pif === 'object') {
    const q = pif as Record<string, unknown>
    const used = typeof q.used === 'number' ? q.used : 0
    const limit = typeof q.limit === 'number' ? q.limit : 0
    const remaining = typeof q.remaining === 'number' ? q.remaining : 0
    const resetsAt = typeof q.resetsAt === 'string' ? q.resetsAt : ''
    if (resetsAt) pitchIdeaWeeklyFree = { used, limit, remaining, resetsAt }
  }
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
    pitchIdeaWeeklyFree,
  }
}
