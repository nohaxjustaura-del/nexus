import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const investor = await db.investor.findUnique({ where: { email: user.email } })
    if (!investor) return NextResponse.json({ exists: false })

    const parse = (s: string | null) => {
      try { return JSON.parse(s || '[]') } catch { return [] }
    }
    const parseFounderFocus = (s: string | null) => {
      const parsed = parse(s)
      if (Array.isArray(parsed)) return parsed
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()]
      return []
    }

    return NextResponse.json({
      exists: true,
      verified: investor.verified,
      onboardingCompleted: investor.onboardingCompleted,
      profile: {
        id: investor.id,
        name: investor.name,
        email: investor.email,
        firmName: investor.firmName,
        bio: investor.bio,
        fundType: investor.fundType,
        fundSize: investor.fundSize,
        stages: parse(investor.stages),
        sectors: parse(investor.sectors),
        checkMin: investor.checkMin,
        checkMax: investor.checkMax,
        geoFocus: parse(investor.geoFocus),
        geography: parse(investor.geography),
        thesis: investor.thesis,
        leadFollow: investor.leadFollow,
        decisionSpeed: investor.decisionSpeed,
        personalityType: investor.personalityType,
        investmentApproach: investor.investmentApproach,
        coInvestPreference: investor.coInvestPreference,
        valueAddTags: parse(investor.valueAddTags),
        ethicsTags: parse(investor.ethicsTags),
        founderFocus: parseFounderFocus(investor.founderFocus),
        notableInvestments: parse(investor.notableInvestments),
        portfolio: parse(investor.portfolio),
        linkedinUrl: investor.linkedinUrl,
        websiteUrl: investor.websiteUrl,
        applicationUrl: investor.applicationUrl,
        totalInvestments: investor.totalInvestments,
        capitalDeployed: investor.capitalDeployed,
        yearsInvesting: investor.yearsInvesting,
        photoUrl: investor.photoUrl,
        verified: investor.verified,
      },
    })
  } catch (err: any) {
    console.error('[INVESTOR-PROFILE] GET error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      name, firmName, fundType, fundSize, stages, sectors, checkMin, checkMax,
      geoFocus, thesis, leadFollow, decisionSpeed, personalityType, investmentApproach,
      coInvestPreference, valueAddTags, ethicsTags, founderFocus, notableInvestments,
      linkedinUrl, websiteUrl, applicationUrl, totalInvestments, capitalDeployed,
      yearsInvesting, bio,
    } = body

    if (!name?.trim() || !firmName?.trim()) {
      return NextResponse.json({ error: 'Name and firm name are required' }, { status: 400 })
    }

    const data: Record<string, unknown> = {
      name: name.trim(),
      firmName: firmName.trim(),
      bio: bio?.trim() || '',
      fundType: fundType || 'Venture Capital',
      fundSize: fundSize || null,
      stages: JSON.stringify(stages || []),
      sectors: JSON.stringify(sectors || []),
      checkMin: Number(checkMin) || 0,
      checkMax: Number(checkMax) || 0,
      checkSizeMin: Number(checkMin) || 0,
      checkSizeMax: Number(checkMax) || 0,
      geoFocus: JSON.stringify(geoFocus || []),
      geography: JSON.stringify(geoFocus || []),
      thesis: thesis?.trim() || null,
      leadFollow: leadFollow || 'either',
      decisionSpeed: decisionSpeed || null,
      personalityType: personalityType || null,
      investmentApproach: investmentApproach || null,
      coInvestPreference: coInvestPreference || null,
      valueAddTags: JSON.stringify(valueAddTags || []),
      ethicsTags: JSON.stringify(ethicsTags || []),
      founderFocus: JSON.stringify(founderFocus || []),
      notableInvestments: JSON.stringify(notableInvestments || []),
      linkedinUrl: linkedinUrl || null,
      websiteUrl: websiteUrl || null,
      applicationUrl: applicationUrl || null,
      totalInvestments: totalInvestments != null ? Number(totalInvestments) : null,
      capitalDeployed: capitalDeployed || null,
      yearsInvesting: yearsInvesting != null ? Number(yearsInvesting) : null,
      onboardingCompleted: true,
      profileComplete: true,
      isPublic: true,
      discoverable: true,
    }

    const existing = await db.investor.findUnique({ where: { email: user.email } })

    if (existing) {
      await db.investor.update({ where: { email: user.email }, data })
    } else {
      await db.investor.create({ data: { email: user.email, ...data } as any })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[INVESTOR-PROFILE] POST error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to save' }, { status: 500 })
  }
}
