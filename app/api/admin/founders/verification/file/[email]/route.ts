import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { downloadStorageObject } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const admin = await getCurrentUser(false)
    if (!admin || !isAdminEmail(admin.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const email = decodeURIComponent(params.email)
    const row = await db.founderVerification.findUnique({
      where: { email },
    })
    if (!row?.url) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (row.url.startsWith('http://') || row.url.startsWith('https://')) {
      return NextResponse.redirect(row.url)
    }

    const { buffer, contentType } = await downloadStorageObject(row.url)
    const fileName = row.url.split('/').pop() || 'id-document'
    const inline = request.nextUrl.searchParams.get('disposition') === 'inline'

    const body = new Uint8Array(buffer)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Disposition': inline
          ? `inline; filename="${fileName.replace(/"/g, '')}"`
          : `attachment; filename="${fileName.replace(/"/g, '')}"`,
        'Content-Length': String(body.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.error('Download founder ID error:', e)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
