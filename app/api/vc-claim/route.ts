import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toInt(value: any, fallback: number = 0) {
  const n = parseInt(String(value), 10)
  return Number.isFinite(n) ? n : fallback
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    const body = await request.json()

    const {
      name,
      email,
      firmName,
      checkMin,
      checkMax,
      fundSize,
      stages,
      sectors,
      geoFocus,
      leadFollow = 'either',
      valueAddTags = [],
      personalityType = '',
      decisionSpeed = '',
      applicationUrl,
      linkedinUrl = '',
      websiteUrl = '',
    } = body || {}

    // Minimal validation
    if (!name || !email || !firmName || !applicationUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!Array.isArray(stages) || !Array.isArray(sectors)) {
      return NextResponse.json(
        { error: 'Stages and sectors must be arrays' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    // If an unverified claim already exists for this email, block duplicates
    const existing = await db.investor.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, verified: true, firmName: true }
    })
    if (existing && existing.verified === false) {
      return NextResponse.json(
        { error: 'You already have a pending VC profile under review. We’ll notify you when approved.' },
        { status: 409 }
      )
    }

    // Create or update investor record (unverified profile acts as the claim)
    const investor = await db.investor.upsert({
      where: { email: normalizedEmail },
      update: {
        name,
        firmName,
        verified: false,
        stages: JSON.stringify(stages),
        checkMin: toInt(checkMin),
        checkMax: toInt(checkMax),
        sectors: JSON.stringify(sectors),
        geoFocus: JSON.stringify(
          typeof geoFocus === 'string' ? geoFocus.split(',').map((s: string) => s.trim()).filter(Boolean) : geoFocus || []
        ),
        leadFollow,
        fundSize: fundSize || null,
        notableInvestments: null,
        linkedinUrl: linkedinUrl || null,
        websiteUrl: websiteUrl || null,
        applicationUrl: applicationUrl || null,
        valueAddTags: JSON.stringify(valueAddTags || []),
        ethicsTags: JSON.stringify([]),
        personalityType: personalityType || null,
        decisionSpeed: decisionSpeed || null,
      },
      create: {
        email: normalizedEmail,
        name,
        firmName,
        verified: false,
        stages: JSON.stringify(stages),
        checkMin: toInt(checkMin),
        checkMax: toInt(checkMax),
        sectors: JSON.stringify(sectors),
        geoFocus: JSON.stringify(
          typeof geoFocus === 'string' ? geoFocus.split(',').map((s: string) => s.trim()).filter(Boolean) : geoFocus || []
        ),
        leadFollow,
        fundSize: fundSize || null,
        notableInvestments: null,
        linkedinUrl: linkedinUrl || null,
        websiteUrl: websiteUrl || null,
        applicationUrl: applicationUrl || null,
        valueAddTags: JSON.stringify(valueAddTags || []),
        ethicsTags: JSON.stringify([]),
        personalityType: personalityType || null,
        decisionSpeed: decisionSpeed || null,
      },
    })

    // Fire-and-forget confirmation email
    try {
      // @ts-ignore - dynamic import with path alias
      const emailMod: any = await import('@/lib/email')
      if (emailMod?.sendVCClaimReceipt) {
        await emailMod.sendVCClaimReceipt(email, name, firmName)
      }
    } catch (e) {
      // non-blocking
      console.warn('sendVCClaimReceipt failed:', e)
    }

    return NextResponse.json({ success: true, investorId: investor.id })
  } catch (error: any) {
    console.error('VC claim error:', error)
    return NextResponse.json(
      { error: 'Failed to submit claim request', message: error?.message },
      { status: 500 }
    )
  }
}


