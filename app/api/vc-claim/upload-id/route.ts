import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
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
    const formData = await request.formData()
    const claimId = formData.get('claimId') as string
    const file = formData.get('file') as File

    if (!claimId || !file) {
      return NextResponse.json({ error: 'Missing claimId or file' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PNG, JPG, or PDF.' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max size is 10MB.' }, { status: 400 })
    }

    const claim = await db.vCClaim.findUnique({ where: { id: claimId } })
    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    const arrBuf = await file.arrayBuffer()
    const bytes = new Uint8Array(arrBuf).slice(0, 8)
    const isPdf = file.type === 'application/pdf' && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    const isPng = file.type === 'image/png' && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    const isJpg = file.type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8
    if (!(isPdf || isPng || isJpg)) {
      return NextResponse.json(
        { error: 'File content does not match the declared type. Please upload a valid PNG, JPG, or PDF.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(arrBuf)
    const supabase = createSupabaseAdminClient()
    const bucket = getStorageBucketName()
    const objectPath = `vc-claims/${claimId}/${Date.now()}_${sanitizeFilename(file.name)}`

    const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    })
    if (upErr) {
      console.error('VC claim ID upload failed:', upErr)
      return NextResponse.json({ error: 'Failed to store document' }, { status: 500 })
    }

    await db.vCClaim.update({
      where: { id: claimId },
      data: {
        idVerificationUrl: objectPath,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'ID received. We will verify within 24 hours.',
    })
  } catch (error: any) {
    console.error('ID upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload ID', message: error?.message },
      { status: 500 }
    )
  }
}
