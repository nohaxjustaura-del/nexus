import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { extractVcProfileFromText } from '@/lib/vc-profile-extraction'
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function pdfBufferToText(buffer: Buffer): Promise<string> {
  try {
    const pdfParseModule = await import('pdf-parse')
    let pdfParse: unknown = pdfParseModule
    if (typeof pdfParseModule === 'object' && pdfParseModule !== null && 'default' in pdfParseModule) {
      pdfParse = (pdfParseModule as { default: unknown }).default
    }
    if (typeof pdfParse !== 'function') return ''
    const data = await (pdfParse as (b: Buffer) => Promise<{ text?: string }>)(buffer)
    return (data?.text || '').trim()
  } catch (e) {
    logger.warn('[VC-EXTRACT] pdf-parse failed', e instanceof Error ? e.message : e)
    return ''
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request, {
    ...RATE_LIMITS.AI_ANALYSIS,
    identifier: 'vc-extract-from-text',
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''

    let text = ''

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')
      if (file instanceof File) {
        const buf = Buffer.from(await file.arrayBuffer())
        const name = file.name?.toLowerCase() || ''
        if (name.endsWith('.pdf') || file.type === 'application/pdf') {
          text = await pdfBufferToText(buf)
        } else {
          text = buf.toString('utf-8').slice(0, 50_000)
        }
      }
      const pasted = form.get('text')
      if (typeof pasted === 'string' && pasted.trim()) {
        text = [text, pasted.trim()].filter(Boolean).join('\n\n')
      }
    } else {
      const body = await request.json().catch(() => ({}))
      text = typeof body?.text === 'string' ? body.text : ''
    }

    const extracted = await extractVcProfileFromText(text)
    return NextResponse.json({ ok: true, extracted, sourceLength: text.length })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Extraction failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
