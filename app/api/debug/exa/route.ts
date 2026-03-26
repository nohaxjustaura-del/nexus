import Exa from 'exa-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Smoke-test Exa from the running Next.js server (uses EXA_API_KEY from env).
 * Dev-only by default; in production set EXA_DEBUG_ALLOW_PRODUCTION=true to enable.
 */
export async function GET() {
  const allowProd = process.env.EXA_DEBUG_ALLOW_PRODUCTION === 'true'
  if (process.env.NODE_ENV === 'production' && !allowProd) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const key = process.env.EXA_API_KEY?.trim()
  if (!key) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: 'Set EXA_API_KEY in .env.local (or .env), then restart npm run dev.',
    })
  }

  try {
    const exa = new Exa(key)
    const res = await exa.search('venture capital recent seed investment', {
      type: 'auto',
      numResults: 2,
    })
    const results = res.results ?? []
    return NextResponse.json({
      ok: true,
      configured: true,
      resultCount: results.length,
      sampleTitles: results.slice(0, 2).map((r) => r.title ?? '(no title)'),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: message,
      },
      { status: 502 }
    )
  }
}
