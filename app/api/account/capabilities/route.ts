import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canAccessFounderNetwork } from '@/lib/founder-network-access'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    const [founder, investor, userCredits, approval] = await Promise.all([
      db.founder.findUnique({ where: { email: user.email }, select: { id: true } }),
      db.investor.findUnique({ where: { email: user.email }, select: { id: true, verified: true } }),
      db.userCredits.findUnique({
        where: { userId: user.id },
        select: { isPremium: true, purchases: true },
      }),
      db.userApproval.findUnique({
        where: { email: user.email },
        select: { status: true },
      }),
    ])

    const canAccessFounderNetworkFlag = canAccessFounderNetwork({
      isPremium: Boolean(userCredits?.isPremium),
      purchasesJson: userCredits?.purchases ?? null,
      email: user.email,
      userApprovalStatus: approval?.status ?? null,
      investorVerified: Boolean(investor?.verified),
    })

    return NextResponse.json({
      authenticated: true,
      userType: user.userType || 'founder',
      hasFounderProfile: Boolean(founder),
      hasInvestorProfile: Boolean(investor),
      investorVerified: Boolean(investor?.verified),
      canAccessFounderNetwork: canAccessFounderNetworkFlag,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
