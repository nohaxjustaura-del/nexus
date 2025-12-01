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
    // Read from SQLite blob table
    const rows = await (db as any).$queryRawUnsafe?.(
      `SELECT fileName, mimeType, size, data FROM FounderIdFiles WHERE email = ? LIMIT 1`,
      email
    )
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
    if (!row) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    const fileName = row.fileName || 'id-document'
    const mimeType = row.mimeType || 'application/octet-stream'
    const data: Uint8Array = row.data as Uint8Array

    return new NextResponse(Buffer.from(data), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(row.size || (data?.length ?? 0)),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.error('Download founder ID error:', e)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}


