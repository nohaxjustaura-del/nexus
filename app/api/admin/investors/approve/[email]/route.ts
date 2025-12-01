import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
  return NextResponse.json({ success: true })
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
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


