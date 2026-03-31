import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATUSES = new Set(['new', 'in_progress', 'scheduled', 'done', 'declined'])

async function requireAdmin() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) {
    return null
  }
  return user
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = typeof params.id === 'string' ? params.id.trim() : ''
    if (!id) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    let body: { status?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : ''
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const existing = await db.yCInsiderFounderRequest.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await db.yCInsiderFounderRequest.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('Admin partner founder request PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
