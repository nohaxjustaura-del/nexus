import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Allowed file types and size (images or PDF)
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
]

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    // Optional: we allow upload without auth as long as they have claimId
    // but rate-limit by claim existence and createdAt

    const formData = await request.formData()
    const claimId = formData.get('claimId') as string
    const file = formData.get('file') as File

    if (!claimId || !file) {
      return NextResponse.json(
        { error: 'Missing claimId or file' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PNG, JPG, or PDF.' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max size is 10MB.' },
        { status: 400 }
      )
    }

    const claim = await db.vCClaim.findUnique({ where: { id: claimId } })
    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Security: basic magic-byte check to mitigate spoofed content
    const arrBuf = await file.arrayBuffer()
    const bytes = new Uint8Array(arrBuf).slice(0, 8)
    const isPdf = file.type === 'application/pdf' && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 // %PDF
    const isPng = file.type === 'image/png' && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
    const isJpg = file.type === 'image/jpeg' && bytes[0] === 0xFF && bytes[1] === 0xD8
    if (!(isPdf || isPng || isJpg)) {
      return NextResponse.json(
        { error: 'File content does not match the declared type. Please upload a valid PNG, JPG, or PDF.' },
        { status: 400 }
      )
    }

    // In production, upload to secure storage (e.g., S3/GCS) and store URL.
    // For development, we do not persist files; we mark receipt and log metadata.
    const fakeUrl = `id-upload://${claimId}/${encodeURIComponent(file.name)}`
    console.log('🪪 VC ID Upload Received:', {
      claimId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })

    // Update VCClaim with ID verification status using raw SQL since schema may vary
    await (db as any).$executeRawUnsafe(`
      UPDATE VCClaim 
      SET idStatus = 'pending', 
          idDocumentUrl = ?, 
          idSubmittedAt = ? 
      WHERE id = ?
    `, fakeUrl, new Date().toISOString(), claimId)

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



