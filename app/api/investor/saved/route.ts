import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const VALID_STAGES = new Set(['saved', 'contacted', 'meeting', 'closed'])

async function getInvestorBySession() {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const investor = await db.investor.findUnique({ where: { email: user.email } })
  if (!investor) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }

  return { investor }
}

export async function GET() {
  try {
    const { investor, error } = await getInvestorBySession()
    if (error) return error

    const bookmarks = await (db as any).investorFounderBookmark.findMany({
      where: { investorId: investor.id },
      include: {
        founder: {
          select: {
            id: true,
            name: true,
            startupName: true,
            stage: true,
            sectors: true,
            location: true,
            fundingNeed: true,
            bio: true,
            linkedinUrl: true,
            websiteUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const founderIds = bookmarks.map((bookmark: any) => bookmark.founderId)
    const progressRows = founderIds.length
      ? await (db as any).investorFounderProgress.findMany({
          where: {
            investorId: investor.id,
            founderId: { in: founderIds },
          },
        })
      : []

    const progressByFounderId = new Map<string, any>(
      progressRows.map((row: any) => [row.founderId, row]),
    )

    const saved = bookmarks.map((bookmark: any) => {
      const progress = progressByFounderId.get(bookmark.founderId)
      return {
        bookmarkId: bookmark.id,
        founderId: bookmark.founderId,
        savedAt: bookmark.createdAt,
        founder: bookmark.founder,
        progress: {
          stage: progress?.stage ?? 'saved',
          notes: progress?.notes ?? '',
          updatedAt: progress?.updatedAt ?? bookmark.createdAt,
        },
      }
    })

    return NextResponse.json({ saved })
  } catch (err: any) {
    console.error('[INVESTOR-SAVED] GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { investor, error } = await getInvestorBySession()
    if (error) return error

    const { founderId, stage, notes } = await request.json()
    if (!founderId) return NextResponse.json({ error: 'founderId required' }, { status: 400 })

    if (stage != null && !VALID_STAGES.has(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const bookmark = await (db as any).investorFounderBookmark.findUnique({
      where: {
        investorId_founderId: {
          investorId: investor.id,
          founderId,
        },
      },
      select: { id: true },
    })

    if (!bookmark) {
      return NextResponse.json({ error: 'Founder is not saved' }, { status: 404 })
    }

    const updateData: Record<string, any> = {}
    if (stage != null) updateData.stage = stage
    if (notes != null) updateData.notes = typeof notes === 'string' ? notes : ''

    const progress = await (db as any).investorFounderProgress.upsert({
      where: {
        investorId_founderId: {
          investorId: investor.id,
          founderId,
        },
      },
      create: {
        investorId: investor.id,
        founderId,
        stage: stage ?? 'saved',
        notes: typeof notes === 'string' ? notes : null,
      },
      update: updateData,
    })

    return NextResponse.json({
      success: true,
      progress: {
        founderId,
        stage: progress.stage,
        notes: progress.notes ?? '',
        updatedAt: progress.updatedAt,
      },
    })
  } catch (err: any) {
    console.error('[INVESTOR-SAVED] PATCH error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
