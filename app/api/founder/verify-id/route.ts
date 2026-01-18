import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    // Basic magic-byte checks
    const arrBuf = await file.arrayBuffer()
    const bytes = new Uint8Array(arrBuf).slice(0, 8)
    const isPdf = file.type === 'application/pdf' && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    const isPng = file.type === 'image/png' && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
    const isJpg = file.type === 'image/jpeg' && bytes[0] === 0xFF && bytes[1] === 0xD8
    if (!(isPdf || isPng || isJpg)) {
      return NextResponse.json({ error: 'File content check failed' }, { status: 400 })
    }

    // Store file bytes in a lightweight SQLite table so admins can download
    const fakeUrl = `founder-id://${encodeURIComponent(user.email || 'unknown')}/${encodeURIComponent(file.name)}`
    console.log('🪪 Founder ID Upload:', { email: user.email, fileName: file.name, type: file.type, size: file.size, fakeUrl })

    // Persist to local SQLite (BLOB)
    try {
      await (db as any).$executeRawUnsafe?.(`
        CREATE TABLE IF NOT EXISTS FounderIdFiles (
          email TEXT PRIMARY KEY,
          fileName TEXT NOT NULL,
          mimeType TEXT NOT NULL,
          size INTEGER NOT NULL,
          data BLOB NOT NULL,
          createdAt TEXT NOT NULL
        );
      `)
      const buf = Buffer.from(arrBuf)
      const nowIso = new Date().toISOString()
      // Use REPLACE to upsert
      await (db as any).$executeRawUnsafe?.(
        `INSERT OR REPLACE INTO FounderIdFiles (email, fileName, mimeType, size, data, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        user.email!, file.name, file.type, file.size, buf as any, nowIso
      )
    } catch (blobErr) {
      console.warn('FounderIdFiles store failed:', blobErr)
    }

    // Ensure verification table and insert/update
    await (db as any).$executeRawUnsafe?.(`
      CREATE TABLE IF NOT EXISTS FounderVerification (
        email TEXT PRIMARY KEY,
        url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        submittedAt TEXT NOT NULL,
        verifiedAt TEXT,
        reviewerEmail TEXT
      );
    `)
    const now = new Date().toISOString()
    await (db as any).$executeRawUnsafe?.(
      `INSERT INTO FounderVerification (email, url, status, submittedAt)
       VALUES (?, ?, 'pending', ?)
       ON CONFLICT(email) DO UPDATE SET url=excluded.url, status='pending', submittedAt=excluded.submittedAt;`,
      user.email!, fakeUrl, now
    )

    return NextResponse.json({ success: true, url: fakeUrl })
  } catch (error: any) {
    console.error('Founder verify-id error:', error)
    return NextResponse.json({ error: 'Failed to upload ID', message: error?.message }, { status: 500 })
  }
}


