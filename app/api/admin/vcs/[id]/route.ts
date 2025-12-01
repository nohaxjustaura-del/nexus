import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// DELETE /api/admin/vcs/[id] → hard-delete investor and cascading relations
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const investorId = params.id
    if (!investorId) {
      return NextResponse.json({ error: 'Missing investor id' }, { status: 400 })
    }

    // Ensure it exists
    const existing = await db.investor.findUnique({ where: { id: investorId } })
    if (!existing) {
      return NextResponse.json({ error: 'Investor not found' }, { status: 404 })
    }

    await db.investor.delete({
      where: { id: investorId },
    })

    console.log(`🗑️ Deleted investor ${existing.firmName} (${existing.email})`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting investor:', error)
    return NextResponse.json(
      { error: 'Failed to delete investor' },
      { status: 500 }
    )
  }
}



