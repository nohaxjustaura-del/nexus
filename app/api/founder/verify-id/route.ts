import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { createSupabaseAdminClient, getStorageBucketName } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const founder = await db.founder.findUnique({ where: { email: user.email } })
    if (!founder) {
      return NextResponse.json({ error: 'Founder profile not found' }, { status: 404 })
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

    const arrBuf = await file.arrayBuffer()
    const bytes = new Uint8Array(arrBuf).slice(0, 8)
    const isPdf = file.type === 'application/pdf' && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    const isPng = file.type === 'image/png' && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    const isJpg = file.type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8
    if (!(isPdf || isPng || isJpg)) {
      return NextResponse.json({ error: 'File content check failed' }, { status: 400 })
    }

    const buffer = Buffer.from(arrBuf)
    const supabase = createSupabaseAdminClient()
    const bucket = getStorageBucketName()
    const objectPath = `founder-verification/${founder.id}/${Date.now()}_${sanitizeFilename(file.name)}`

    const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
    })
    if (upErr) {
      console.error('Founder ID storage upload failed:', upErr)
      return NextResponse.json({ error: 'Failed to store document' }, { status: 500 })
    }

    await db.founderVerification.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        url: objectPath,
        status: 'pending',
        submittedAt: new Date(),
      },
      update: {
        url: objectPath,
        status: 'pending',
        submittedAt: new Date(),
        verifiedAt: null,
        reviewerEmail: null,
      },
    })

    return NextResponse.json({ success: true, url: objectPath })
  } catch (error: any) {
    console.error('Founder verify-id error:', error)
    return NextResponse.json({ error: 'Failed to upload ID', message: error?.message }, { status: 500 })
  }
}
