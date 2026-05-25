import { db } from '@/lib/db'
import type { User as PrismaUser } from '@prisma/client'
import { isAdminEmail } from '@/lib/constants'
import { isUnlimitedCreditsEmail } from '@/lib/unlimited-credits'
import { isTestSuperAccountEmail } from '@/lib/test-super-account'

/** HttpOnly cookie set by POST /api/dev/ai-bypass/bootstrap (local dev only). */
export const DEV_AI_BYPASS_COOKIE = 'nexus_dev_ai_bypass_uid'

const DEFAULT_BYPASS_EMAIL = 'dev-ai-bypass@localhost.nexus'

export function isDevAiAnalysisBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DEV_AI_ANALYSIS_BYPASS === 'true'
  )
}

export function getDevAiBypassEmail(): string {
  return (process.env.DEV_AI_ANALYSIS_BYPASS_EMAIL || DEFAULT_BYPASS_EMAIL).toLowerCase().trim()
}

/** Admin, UNLIMITED_CREDITS_EMAIL list, or dev AI-bypass sandbox — no credit charges. */
export function bypassesAiCredits(email: string | null | undefined): boolean {
  if (!email) return false
  if (isAdminEmail(email)) return true
  if (isUnlimitedCreditsEmail(email)) return true
  if (isTestSuperAccountEmail(email)) return true
  if (isDevAiAnalysisBypassEnabled() && email.trim().toLowerCase() === getDevAiBypassEmail()) {
    return true
  }
  return false
}

/**
 * True when this user should be charged AI analysis credits.
 * Keep in sync with portal access: admins/unlimited/dev-bypass never pay; everyone else follows subscription/tier in route handlers.
 */
export function shouldEnforceAiCredits(email: string | null | undefined): boolean {
  return !bypassesAiCredits(email)
}

/** Same rule as /api/user/credits admin branch (unlimited display + skip deductions). */
export function grantsUnlimitedCreditsDisplay(email: string | null | undefined): boolean {
  return bypassesAiCredits(email)
}

export async function getOrCreateDevAiBypassUser(): Promise<PrismaUser> {
  const email = getDevAiBypassEmail()
  let user = await db.user.findUnique({ where: { email } })
  if (!user) {
    user = await db.user.create({
      data: {
        email,
        emailVerified: true,
        userType: 'founder',
        onboardingCompleted: true,
      },
    })
  }
  const founder = await db.founder.findUnique({ where: { email } })
  if (!founder) {
    await db.founder.create({
      data: {
        email,
        name: 'Dev AI Analysis',
        stage: 'idea',
        sectors: JSON.stringify([]),
        location: 'Local',
        countryCode: 'US',
        regionCode: 'CA',
        fundingNeed: 0,
        ethicsTags: JSON.stringify([]),
        personalityTags: JSON.stringify([]),
        valueAddNeeds: JSON.stringify([]),
      },
    })
  }
  return user
}

export function isLocalDevRequest(request: Request): boolean {
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? ''
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}
