import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) return null
  return user
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const claims = await db.vCClaim.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ claims })
  } catch (error) {
    console.error('Error fetching VC claims:', error)
    return NextResponse.json(
      { error: 'Failed to fetch VC claims' },
      { status: 500 }
    )
  }
}














