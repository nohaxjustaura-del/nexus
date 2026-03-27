import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    const [founder, investor] = await Promise.all([
      db.founder.findUnique({ where: { email: user.email }, select: { id: true } }),
      db.investor.findUnique({ where: { email: user.email }, select: { id: true, verified: true } }),
    ])

    return NextResponse.json({
      authenticated: true,
      userType: user.userType || 'founder',
      hasFounderProfile: Boolean(founder),
      hasInvestorProfile: Boolean(investor),
      investorVerified: Boolean(investor?.verified),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
