import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const investor = await db.investor.findUnique({ where: { email: user.email } })
    if (!investor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const bookmarks = await (db as any).investorFounderBookmark.findMany({
      where: { investorId: investor.id },
      include: { founder: { select: { id: true, name: true, startupName: true, stage: true, sectors: true, location: true, fundingNeed: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      bookmarks: bookmarks.map((b: any) => ({
        id: b.id,
        founderId: b.founderId,
        notes: b.notes,
        createdAt: b.createdAt,
        founder: b.founder,
      })),
    })
  } catch (err: any) {
    console.error('[INVESTOR-BOOKMARKS] GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const investor = await db.investor.findUnique({ where: { email: user.email } })
    if (!investor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { founderId, notes } = await request.json()
    if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })

    const existing = await (db as any).investorFounderBookmark.findUnique({
      where: { investorId_founderId: { investorId: investor.id, founderId } },
    })

    if (existing) {
      await (db as any).investorFounderBookmark.delete({
        where: { id: existing.id },
      })
      await (db as any).investorFounderProgress.deleteMany({
        where: { investorId: investor.id, founderId },
      })
      return NextResponse.json({ bookmarked: false })
    }

    await (db as any).investorFounderBookmark.create({
      data: { investorId: investor.id, founderId, notes: notes || null },
    })

    await (db as any).investorFounderProgress.upsert({
      where: {
        investorId_founderId: {
          investorId: investor.id,
          founderId,
        },
      },
      create: {
        investorId: investor.id,
        founderId,
        stage: 'saved',
        notes: notes || null,
      },
      update: {},
    })

    return NextResponse.json({ bookmarked: true })
  } catch (err: any) {
    console.error('[INVESTOR-BOOKMARKS] POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
