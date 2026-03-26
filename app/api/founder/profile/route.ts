import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { sendFounderApplicationReceipt } from '@/lib/email'
import { isKnownUniversity } from '@/lib/universities'

export const dynamic = 'force-dynamic'

// GET: Fetch founder profile
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const sessionEmail = user.email.toLowerCase().trim()

    // Check if founder profile exists (must match auth email — same key as verify-id)
    const founder = await db.founder.findUnique({
      where: { email: sessionEmail },
    }).catch((err) => {
      console.error('Error fetching founder profile:', err)
      return null
    })

    if (!founder) {
      return NextResponse.json(
        { exists: false },
        { status: 200 }
      )
    }

    const founderVerification = await db.founderVerification.findUnique({
      where: { email: sessionEmail },
    }).catch(() => null)

    return NextResponse.json({
      exists: true,
      verification: founderVerification
        ? { uploaded: true, status: founderVerification.status }
        : { uploaded: false, status: null },
      founder: {
        name: founder.name,
        email: founder.email,
        marketingOptIn: (founder as any).marketingOptIn || false,
        age: founder.age,
        education: founder.education,
        gender: founder.gender,
        willingToDropOut: founder.willingToDropOut,
        startupName: founder.startupName,
        stage: founder.stage,
        sectors: (() => {
          try { return JSON.parse(founder.sectors || '[]') } catch { return [] }
        })(),
        businessModel: founder.businessModel,
        location: founder.location,
        fundingNeed: founder.fundingNeed,
        bio: founder.bio,
        pitchDeck: founder.pitchDeck,
        videoPitchUrl: founder.videoPitchUrl,
        linkedinUrl: founder.linkedinUrl,
        ethicsTags: (() => {
          try { return JSON.parse(founder.ethicsTags || '[]') } catch { return [] }
        })(),
        personalityTags: (() => {
          try { return JSON.parse(founder.personalityTags || '[]') } catch { return [] }
        })(),
        valueAddNeeds: (() => {
          try { return JSON.parse(founder.valueAddNeeds || '[]') } catch { return [] }
        })(),
      },
      profile: {
        name: founder.name,
        email: founder.email,
        marketingOptIn: (founder as any).marketingOptIn || false,
        age: founder.age,
        education: founder.education,
        gender: founder.gender,
        willingToDropOut: founder.willingToDropOut,
        startupName: founder.startupName,
        stage: founder.stage,
        sectors: (() => {
          try { return JSON.parse(founder.sectors || '[]') } catch { return [] }
        })(),
        businessModel: founder.businessModel,
        location: founder.location,
        fundingNeed: founder.fundingNeed,
        bio: founder.bio,
        pitchDeck: founder.pitchDeck,
        videoPitchUrl: founder.videoPitchUrl,
        linkedinUrl: founder.linkedinUrl,
        ethicsTags: (() => {
          try { return JSON.parse(founder.ethicsTags || '[]') } catch { return [] }
        })(),
        personalityTags: (() => {
          try { return JSON.parse(founder.personalityTags || '[]') } catch { return [] }
        })(),
        valueAddNeeds: (() => {
          try { return JSON.parse(founder.valueAddNeeds || '[]') } catch { return [] }
        })(),
      },
    })
  } catch (error: any) {
    console.error('Error fetching founder profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile', message: error?.message },
      { status: 500 }
    )
  }
}

// POST: Create or update founder profile
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
    const {
      name,
      email,
      age,
      phone,
      education,
      gender,
      marketingOptIn,
      willingToDropOut,
      startupName,
      stage,
      sectors,
      businessModel,
      location,
      fundingNeed,
      ethicsTags,
      personalityTags,
      valueAddNeeds,
      // optional contact info (stored in a lightweight table)
      altEmail,
      city,
      country,
      cofounders,
      hoursPerWeek,
      prevFunding,
      prevFundingAmount,
      website,
      linkedin,
      // preferences
      geoPreference,
      decisionSpeedDays,
      targetOwnershipMax,
      fundTypePreference,
      leadPreference,
      // Enhanced diversity and background fields
      isImmigrant,
      isUnderrepresented,
      isStudent,
      isVeteran,
      needsImmigrationSupport,
      universityAffiliation,
    } = data

    // Validate required fields
    if (!name || !email || !stage || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, stage, location' },
        { status: 400 }
      )
    }
    // Step 1 required inputs
    if (!age || isNaN(parseInt(age))) {
      return NextResponse.json(
        { error: 'Age is required' },
        { status: 400 }
      )
    }
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone is required' },
        { status: 400 }
      )
    }
    // Education: accept user input (we validate lightly on client). Do not hard‑fail on unknowns.
    if (!education || String(education).trim().length < 2) {
      return NextResponse.json(
        { error: 'Education (university) is required' },
        { status: 400 }
      )
    }

    // Founder row must use the authenticated account email (verify-id and other routes key on session user)
    const sessionEmail = user.email.toLowerCase().trim()
    if (!sessionEmail) {
      return NextResponse.json({ error: 'Account email missing' }, { status: 400 })
    }
    const normalizedEmail = sessionEmail

    const formEmailNorm = email ? String(email).toLowerCase().trim() : ''
    const mergedAltEmail =
      (altEmail && String(altEmail).trim())
        ? String(altEmail).trim()
        : formEmailNorm && formEmailNorm !== sessionEmail
          ? formEmailNorm
          : null

    // Check if founder already exists
    const existingFounder = await db.founder.findUnique({
      where: { email: normalizedEmail },
    })

    const founderData = {
      name,
      email: normalizedEmail,
      age: age ? parseInt(age) : null,
      education: education || null,
      gender: gender || null,
      marketingOptIn: !!marketingOptIn,
      willingToDropOut: willingToDropOut || false,
      startupName: startupName || null,
      stage: stage.toLowerCase(),
      sectors: JSON.stringify(sectors || []),
      businessModel: businessModel || null,
      location,
      fundingNeed: fundingNeed ? parseInt(fundingNeed) : 0,
      ethicsTags: JSON.stringify(ethicsTags || []),
      personalityTags: JSON.stringify(personalityTags || []),
      valueAddNeeds: JSON.stringify(valueAddNeeds || []),
    }

    let founder
    if (existingFounder) {
      // Update existing founder
      founder = await db.founder.update({
        where: { email: normalizedEmail },
        data: founderData,
      })
    } else {
      // Create new founder with graceful fallback if Prisma rejects unknown/legacy fields
      try {
        founder = await db.founder.create({
          data: founderData,
        })
      } catch (e: any) {
        console.warn('founder.create failed, retrying with minimal data set:', e?.message)
        const minimalData: any = {
          name,
          email: normalizedEmail,
          stage: stage.toLowerCase(),
          sectors: JSON.stringify(sectors || []),
          location,
          fundingNeed: fundingNeed ? parseInt(fundingNeed) : 0,
          ethicsTags: JSON.stringify(ethicsTags || []),
          personalityTags: JSON.stringify(personalityTags || []),
          valueAddNeeds: JSON.stringify(valueAddNeeds || []),
        }
        try {
          founder = await (db as any).founder.create({
            data: minimalData,
          })
        } catch (e2: any) {
          console.error('founder.create minimal failed:', e2?.message)
          return NextResponse.json(
            { error: 'Failed to save profile', message: e2?.message || e?.message },
            { status: 500 }
          )
        }
      }
    }

    try {
      await db.founderContact.upsert({
        where: { email: normalizedEmail },
        create: {
          email: normalizedEmail,
          phone: phone || null,
          altEmail: mergedAltEmail,
          website: website || null,
          linkedin: linkedin || null,
          city: city || null,
          country: country || null,
          cofounders: cofounders || null,
          hoursPerWeek: hoursPerWeek || null,
          prevFunding: prevFunding || null,
          prevFundingAmount: prevFundingAmount || null,
        },
        update: {
          phone: phone || null,
          altEmail: mergedAltEmail,
          website: website || null,
          linkedin: linkedin || null,
          city: city || null,
          country: country || null,
          cofounders: cofounders || null,
          hoursPerWeek: hoursPerWeek || null,
          prevFunding: prevFunding || null,
          prevFundingAmount: prevFundingAmount || null,
        },
      })

      const {
        isImmigrant,
        isUnderrepresented,
        isStudent,
        isVeteran,
      } = data

      await db.founderPrefs.upsert({
        where: { email: normalizedEmail },
        create: {
          email: normalizedEmail,
          geoPreference: geoPreference || null,
          decisionSpeedDays: decisionSpeedDays || null,
          targetOwnershipMax: targetOwnershipMax || null,
          fundTypePreference: fundTypePreference || null,
          leadPreference: leadPreference || null,
          isImmigrant: isImmigrant || false,
          isUnderrepresented: isUnderrepresented || false,
          isStudent: isStudent || false,
          isVeteran: isVeteran || false,
        },
        update: {
          geoPreference: geoPreference || null,
          decisionSpeedDays: decisionSpeedDays || null,
          targetOwnershipMax: targetOwnershipMax || null,
          fundTypePreference: fundTypePreference || null,
          leadPreference: leadPreference || null,
          isImmigrant: isImmigrant || false,
          isUnderrepresented: isUnderrepresented || false,
          isStudent: isStudent || false,
          isVeteran: isVeteran || false,
        },
      })
    } catch (e) {
      console.warn('FounderContact / FounderPrefs upsert skipped:', e)
    }

    // Fire-and-forget application receipt email
    try {
      await sendFounderApplicationReceipt(normalizedEmail, name)
    } catch (e) {
      console.warn('sendFounderApplicationReceipt failed:', e)
    }

    // Redirect client to thank-you page via JSON hint
    return NextResponse.json({
      success: true,
      redirect: '/signup/thank-you',
      founder: {
        id: founder.id,
        email: founder.email,
        name: founder.name,
      },
    })
  } catch (error: any) {
    console.error('Error saving founder profile:', error)
    return NextResponse.json(
      { error: 'Failed to save profile', message: error?.message },
      { status: 500 }
    )
  }
}
