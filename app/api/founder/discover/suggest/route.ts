import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { parseJSON } from '@/lib/utils'
import {
  discoverSuggestScore,
  discoverSuggestWhereClause,
  discoverSearchTokens,
} from '@/lib/discover-investor-search'

export const dynamic = 'force-dynamic'

const MAX_QUERY_LEN = 160
const CANDIDATE_TAKE = 48
const RETURN_LIMIT = 12

function sectorsSubtitle(sectorsJson: string | null): string {
  if (!sectorsJson?.trim()) return ''
  const arr = parseJSON<string[]>(sectorsJson, [])
  if (!Array.isArray(arr) || arr.length === 0) return ''
  return arr
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ')
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(false)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = (request.nextUrl.searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }
  if (q.length > MAX_QUERY_LEN) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 })
  }

  const where = discoverSuggestWhereClause(q)
  if (!where) {
    return NextResponse.json({ suggestions: [] })
  }

  const tokens = discoverSearchTokens(q)
  if (tokens.length === 0) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const rows = await db.investor.findMany({
      where,
      select: {
        id: true,
        firmName: true,
        name: true,
        sectors: true,
        stages: true,
        verified: true,
        discoverable: true,
      },
      take: CANDIDATE_TAKE,
      orderBy: [{ verified: 'desc' }, { discoverable: 'desc' }, { createdAt: 'desc' }],
    })

    const sorted = [...rows].sort((a, b) => discoverSuggestScore(b, q) - discoverSuggestScore(a, q))
    const suggestions = sorted.slice(0, RETURN_LIMIT).map((r) => {
      const sectorLine = sectorsSubtitle(r.sectors)
      const partner = (r.name || '').trim()
      const firm = (r.firmName || '').trim() || 'Unknown firm'
      const subtitle = [partner && partner !== firm ? partner : '', sectorLine].filter(Boolean).join(' · ')
      return {
        id: r.id,
        firmName: firm,
        partnerName: partner || null,
        subtitle: subtitle || undefined,
        verified: Boolean(r.verified),
      }
    })

    const res = NextResponse.json({ suggestions })
    res.headers.set('Cache-Control', 'private, no-store')
    return res
  } catch (e) {
    console.error('[discover/suggest]', e)
    return NextResponse.json({ suggestions: [], error: 'Suggest failed' }, { status: 200 })
  }
}
