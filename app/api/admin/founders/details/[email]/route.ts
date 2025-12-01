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
    const user = await db.user.findUnique({ where: { email } }).catch(() => null as any)

    // Lightweight tables
    let contact: any = null
    let verification: any = null
    try {
      const rows = await (db as any).$queryRawUnsafe?.(
        `SELECT phone, altEmail, website, linkedin, city, country, cofounders, hoursPerWeek, prevFunding, prevFundingAmount, updatedAt
         FROM FounderContact WHERE email = ? LIMIT 1`,
        email
      )
      contact = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    } catch {}
    try {
      const rows = await (db as any).$queryRawUnsafe?.(
        `SELECT url, status, submittedAt, verifiedAt, reviewerEmail FROM FounderVerification WHERE email = ? LIMIT 1`,
        email
      )
      verification = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    } catch {}

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


