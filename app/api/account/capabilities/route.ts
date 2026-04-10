import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canAccessFounderResources } from '@/lib/founder-resources-access'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    const [founder, investor, userCredits] = await Promise.all([
      db.founder.findUnique({ where: { email: user.email }, select: { id: true } }),
      db.investor.findUnique({ where: { email: user.email }, select: { id: true, verified: true } }),
      db.userCredits.findUnique({
        where: { userId: user.id },
        select: { isPremium: true, purchases: true },
      }),
    ])

    const canAccessFounderResourcesFlag = canAccessFounderResources({
      isPremium: Boolean(userCredits?.isPremium),
      purchasesJson: userCredits?.purchases ?? null,
      email: user.email,
    })

    return NextResponse.json({
      authenticated: true,
      userType: user.userType || 'founder',
      hasFounderProfile: Boolean(founder),
      hasInvestorProfile: Boolean(investor),
      investorVerified: Boolean(investor?.verified),
      canAccessFounderResources: canAccessFounderResourcesFlag,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
