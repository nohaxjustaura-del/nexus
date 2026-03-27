import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { parseJSON } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// GET: Fetch VC profile (if approved)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if investor profile exists and is verified
    const investor = await db.investor.findUnique({
      where: { email: user.email },
    })

    if (!investor) {
      return NextResponse.json(
        { exists: false },
        { status: 200 }
      )
    }

    return NextResponse.json({
      exists: true,
      verified: investor.verified,
      profile: {
        id: investor.id,
        name: investor.name,
        email: investor.email,
        phone: (investor as any).phone || null,
        marketingOptIn: (investor as any).marketingOptIn || false,
        firmName: investor.firmName,
        checkMin: investor.checkMin,
        checkMax: investor.checkMax,
        fundSize: investor.fundSize,
        stages: parseJSON<string[]>(investor.stages, []),
        sectors: parseJSON<string[]>(investor.sectors, []),
        geoFocus: parseJSON<string[]>(investor.geoFocus, []),
        leadFollow: investor.leadFollow,
        valueAddTags: parseJSON<string[]>(investor.valueAddTags, []),
        personalityType: investor.personalityType,
        decisionSpeed: investor.decisionSpeed,
        applicationUrl: investor.applicationUrl,
        linkedinUrl: investor.linkedinUrl,
        websiteUrl: investor.websiteUrl,
        fundType: investor.fundType,
        thesis: investor.thesis,
        bio: investor.bio || '',
        ownershipTarget: investor.ownershipTarget,
        notableInvestments: parseJSON<string[]>(investor.notableInvestments, []),
        proofPoints: parseJSON<string[]>(investor.proofPoints, []),
      },
    })
  } catch (error: any) {
    console.error('Error fetching VC profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile', message: error?.message },
      { status: 500 }
    )
  }
}

// POST: Update VC profile (only for verified VCs)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await request.json()
    
    // Check if investor exists
    const existingInvestor = await db.investor.findUnique({
      where: { email: user.email },
    })

    if (!existingInvestor) {
      return NextResponse.json(
        { error: 'Investor profile not found. Please claim your profile first.' },
        { status: 404 }
      )
    }

    // Only allow updates if verified
    if (!existingInvestor.verified) {
      return NextResponse.json(
        { error: 'Your profile is pending approval. Please wait for admin verification.' },
        { status: 403 }
      )
    }

    // Update investor profile
    const updatedInvestor = await db.investor.update({
      where: { email: user.email },
      data: {
        name: data.name || existingInvestor.name,
        firmName: data.firmName || existingInvestor.firmName,
        checkMin: data.checkMin ? parseInt(data.checkMin) : existingInvestor.checkMin,
        checkMax: data.checkMax ? parseInt(data.checkMax) : existingInvestor.checkMax,
        fundSize: data.fundSize !== undefined ? data.fundSize : existingInvestor.fundSize,
        stages: data.stages ? JSON.stringify(data.stages) : existingInvestor.stages,
        sectors: data.sectors ? JSON.stringify(data.sectors) : existingInvestor.sectors,
        geoFocus: data.geoFocus ? (Array.isArray(data.geoFocus) ? JSON.stringify(data.geoFocus) : data.geoFocus) : existingInvestor.geoFocus,
        leadFollow: data.leadFollow || existingInvestor.leadFollow,
        valueAddTags: data.valueAddTags ? JSON.stringify(data.valueAddTags) : existingInvestor.valueAddTags,
        personalityType: data.personalityType !== undefined ? data.personalityType : existingInvestor.personalityType,
        decisionSpeed: data.decisionSpeed !== undefined ? data.decisionSpeed : existingInvestor.decisionSpeed,
        applicationUrl: data.applicationUrl || existingInvestor.applicationUrl,
        linkedinUrl: data.linkedinUrl !== undefined ? data.linkedinUrl : existingInvestor.linkedinUrl,
        websiteUrl: data.websiteUrl !== undefined ? data.websiteUrl : existingInvestor.websiteUrl,
        fundType: data.fundType !== undefined ? data.fundType : existingInvestor.fundType,
        thesis: data.thesis !== undefined ? data.thesis : existingInvestor.thesis,
        bio: data.bio !== undefined ? String(data.bio) : existingInvestor.bio,
        ownershipTarget: data.ownershipTarget !== undefined ? data.ownershipTarget : existingInvestor.ownershipTarget,
        notableInvestments:
          data.notableInvestments !== undefined
            ? JSON.stringify(
                Array.isArray(data.notableInvestments)
                  ? data.notableInvestments.map(String)
                  : typeof data.notableInvestments === 'string'
                    ? data.notableInvestments
                        .split('\n')
                        .map((s: string) => s.trim())
                        .filter(Boolean)
                    : []
              )
            : existingInvestor.notableInvestments,
      },
    })

    return NextResponse.json({
      success: true,
      investor: {
        id: updatedInvestor.id,
        email: updatedInvestor.email,
        firmName: updatedInvestor.firmName,
      },
    })
  } catch (error: any) {
    console.error('Error updating VC profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile', message: error?.message },
      { status: 500 }
    )
  }
}

