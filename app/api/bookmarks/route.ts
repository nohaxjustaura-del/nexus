import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET: Get all bookmarks for the current founder
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const founder = await db.founder.findUnique({
      where: { email: user.email },
    })

    if (!founder) {
      return NextResponse.json(
        { error: 'Founder profile not found' },
        { status: 404 }
      )
    }

    const bookmarks = await db.bookmark.findMany({
      where: { founderId: founder.id },
      include: {
        investor: {
          select: {
            id: true,
            firmName: true,
            name: true,
            checkMin: true,
            checkMax: true,
            stages: true,
            sectors: true,
            applicationUrl: true,
            websiteUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      bookmarks: bookmarks.map(b => ({
        id: b.id,
        notes: b.notes,
        createdAt: b.createdAt,
        investor: b.investor,
      })),
      total: bookmarks.length,
    })
  } catch (error: any) {
    logger.error('[BOOKMARKS] Error fetching bookmarks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks' },
      { status: 500 }
    )
  }
}

// POST: Create or toggle bookmark
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { investorId, notes } = await request.json()

    if (!investorId) {
      return NextResponse.json(
        { error: 'Investor ID is required' },
        { status: 400 }
      )
    }

    const founder = await db.founder.findUnique({
      where: { email: user.email },
    })

    if (!founder) {
      return NextResponse.json(
        { error: 'Founder profile not found' },
        { status: 404 }
      )
    }

    // Check if bookmark already exists
    const existing = await db.bookmark.findUnique({
      where: {
        founderId_investorId: {
          founderId: founder.id,
          investorId,
        },
      },
    })

    if (existing) {
      // Remove bookmark (toggle off)
      await db.bookmark.delete({
        where: { id: existing.id },
      })

      return NextResponse.json({
        bookmarked: false,
        message: 'Bookmark removed',
      })
    }

    // Create bookmark
    const bookmark = await db.bookmark.create({
      data: {
        founderId: founder.id,
        investorId,
        notes: notes || null,
      },
      include: {
        investor: {
          select: {
            id: true,
            firmName: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      bookmarked: true,
      bookmark,
      message: 'Bookmarked successfully',
    })
  } catch (error: any) {
    logger.error('[BOOKMARKS] Error creating bookmark:', error)
    return NextResponse.json(
      { error: 'Failed to create bookmark' },
      { status: 500 }
    )
  }
}

// PATCH: Update bookmark notes
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { bookmarkId, notes } = await request.json()

    if (!bookmarkId) {
      return NextResponse.json(
        { error: 'Bookmark ID is required' },
        { status: 400 }
      )
    }

    const bookmark = await db.bookmark.findUnique({
      where: { id: bookmarkId },
      include: { founder: true },
    })

    if (!bookmark) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      )
    }

    // Verify founder owns this bookmark
    if (bookmark.founder.email !== user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const updated = await db.bookmark.update({
      where: { id: bookmarkId },
      data: { notes: notes || null },
    })

    return NextResponse.json({
      bookmark: updated,
      message: 'Bookmark updated successfully',
    })
  } catch (error: any) {
    logger.error('[BOOKMARKS] Error updating bookmark:', error)
    return NextResponse.json(
      { error: 'Failed to update bookmark' },
      { status: 500 }
    )
  }
}








