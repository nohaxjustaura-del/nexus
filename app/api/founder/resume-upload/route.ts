import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { createSupabaseAdminClient, getStorageBucketName } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf']

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200)
}

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
      return NextResponse.json(
        { error: 'Please upload a PDF resume (max 10MB).' },
        { status: 400 },
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const arrBuf = await file.arrayBuffer()
    const bytes = new Uint8Array(arrBuf).slice(0, 5)
    const isPdf =
      file.type === 'application/pdf' &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    if (!isPdf) {
      return NextResponse.json({ error: 'File content check failed' }, { status: 400 })
    }

    const buffer = Buffer.from(arrBuf)
    const supabase = createSupabaseAdminClient()
    const bucket = getStorageBucketName()
    const objectPath = `founder-resumes/${user.id}/${Date.now()}_${sanitizeFilename(file.name)}`

    const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })
    if (upErr) {
      console.error('Founder resume storage upload failed:', upErr)
      return NextResponse.json({ error: 'Failed to store resume' }, { status: 500 })
    }

    const sessionEmail = user.email.toLowerCase().trim()
    await db.founder.updateMany({
      where: { email: sessionEmail },
      data: { resumeUrl: objectPath },
    })

    return NextResponse.json({
      success: true,
      resumeUrl: objectPath,
      fileName: file.name,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Founder resume upload error:', error)
    return NextResponse.json({ error: 'Failed to upload resume', message }, { status: 500 })
  }
}
