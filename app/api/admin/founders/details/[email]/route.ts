import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const email = decodeURIComponent(params.email)
    const founder = await db.founder.findUnique({ where: { email } })
    const user = await db.user.findUnique({ where: { email } }).catch(() => null)

    const contact = await db.founderContact.findUnique({ where: { email } }).catch(() => null)
    const verification = await db.founderVerification.findUnique({ where: { email } }).catch(() => null)

    return NextResponse.json({
      email,
      user,
      founder,
      contact,
      verification,
    })
  } catch (e: any) {
    console.error('Admin founder details error:', e)
    return NextResponse.json({ error: 'Failed to fetch founder details' }, { status: 500 })
  }
}
