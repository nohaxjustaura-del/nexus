import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { downloadStorageObject } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
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

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.error('Download founder ID error:', e)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}
