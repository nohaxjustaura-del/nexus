import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { revalidateVerifiedInvestorCountCache } from '@/lib/investor-public-stats'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) return null
  return user
}

async function approve(emailParam: string) {
  const email = decodeURIComponent(emailParam || '').toLowerCase().trim()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  const investor = await db.investor.updateMany({
    where: { email },
    data: { verified: true },
  })
  if (!investor.count) {
    return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
  }
  revalidateVerifiedInvestorCountCache()
  return NextResponse.json({ success: true })
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return await approve(params.email)
  } catch (e: any) {
    console.error('Approve investor error:', e)
    return NextResponse.json({ error: 'Failed to approve investor' }, { status: 500 })
  }
}

// Convenience for clicking directly in browser
export async function GET(
  req: NextRequest,
  ctx: { params: { email: string } }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const res = await approve(ctx.params.email)
  try {
    const data = await res.clone().json()
    if (data?.success) {
      const url = new URL('/admin/vcs?approved=1', req.nextUrl.origin)
      return NextResponse.redirect(url, { status: 302 })
    }
  } catch {}
  return res
}


