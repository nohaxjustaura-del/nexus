import { NextResponse } from 'next/server'

type MetricBody = {
  name?: string
  value?: number
  rating?: string
  pathname?: string
  userAgent?: string
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  const body = (
    contentType.includes('application/json')
      ? await request.json().catch(() => ({}))
      : JSON.parse(await request.text().catch(() => '{}'))
  ) as MetricBody
  const payload = {
    name: typeof body.name === 'string' ? body.name : 'unknown',
    value: typeof body.value === 'number' ? body.value : -1,
    rating: typeof body.rating === 'string' ? body.rating : 'unknown',
    pathname: typeof body.pathname === 'string' ? body.pathname : 'unknown',
    userAgent:
      typeof body.userAgent === 'string'
        ? body.userAgent
        : request.headers.get('user-agent') ?? 'unknown',
    timestamp: new Date().toISOString(),
  }

  if (process.env.NODE_ENV === 'production') {
    console.log('[web-vitals]', payload)
    if (payload.rating === 'poor') {
      console.warn('[web-vitals][poor]', payload)
    }
  }

  return NextResponse.json({ ok: true })
}
