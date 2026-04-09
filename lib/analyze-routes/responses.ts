import { NextResponse } from 'next/server'

const JSON_UTF8 = { 'Content-Type': 'application/json; charset=utf-8' } as const

export function analyzeUnauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: JSON_UTF8 })
}

export function analyzeFounderNotFoundResponse(extra?: Record<string, unknown>) {
  return NextResponse.json(
    { error: 'Founder profile not found. Please complete onboarding first.', ...extra },
    { status: 404, headers: JSON_UTF8 },
  )
}
