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

    // Check if founder profile exists
    const founder = await db.founder.findUnique({
      where: { email: user.email },
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

    return NextResponse.json({
      exists: true,
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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

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

    // Store optional contact info in a lightweight table (no migration required)
    try {
      await (db as any).$executeRawUnsafe?.(`
        CREATE TABLE IF NOT EXISTS FounderContact (
          email TEXT PRIMARY KEY,
          phone TEXT,
          altEmail TEXT,
          website TEXT,
          linkedin TEXT,
          city TEXT,
          country TEXT,
          cofounders TEXT,
          hoursPerWeek TEXT,
          prevFunding TEXT,
          prevFundingAmount TEXT,
          updatedAt TEXT NOT NULL
        );
      `)
      const nowIso = new Date().toISOString()
      await (db as any).$executeRawUnsafe?.(
        `INSERT INTO FounderContact (email, phone, altEmail, website, linkedin, city, country, cofounders, hoursPerWeek, prevFunding, prevFundingAmount, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET phone=excluded.phone, altEmail=excluded.altEmail, website=excluded.website, linkedin=excluded.linkedin, city=excluded.city, country=excluded.country, cofounders=excluded.cofounders, hoursPerWeek=excluded.hoursPerWeek, prevFunding=excluded.prevFunding, prevFundingAmount=excluded.prevFundingAmount, updatedAt=excluded.updatedAt;`,
        normalizedEmail,
        phone || null,
        altEmail || null,
        website || null,
        linkedin || null,
        city || null,
        country || null,
        cofounders || null,
        hoursPerWeek || null,
        prevFunding || null,
        prevFundingAmount || null,
        nowIso
      )
      // Store preferences in a lightweight table
      // Note: Using Prisma model now, but keeping raw SQL as fallback for migration
      const {
        isImmigrant,
        isUnderrepresented,
        isStudent,
        isVeteran,
      } = data
      
      try {
        await (db as any).founderPrefs.upsert({
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
      } catch (prismaError: any) {
        // Fallback to raw SQL if Prisma model doesn't exist yet
        await (db as any).$executeRawUnsafe?.(`
          CREATE TABLE IF NOT EXISTS FounderPrefs (
            email TEXT PRIMARY KEY,
            geoPreference TEXT,
            decisionSpeedDays TEXT,
            targetOwnershipMax TEXT,
            fundTypePreference TEXT,
            leadPreference TEXT,
            isImmigrant INTEGER DEFAULT 0,
            isUnderrepresented INTEGER DEFAULT 0,
            isStudent INTEGER DEFAULT 0,
            isVeteran INTEGER DEFAULT 0,
            updatedAt TEXT NOT NULL
          );
        `)
        await (db as any).$executeRawUnsafe?.(
          `INSERT INTO FounderPrefs (email, geoPreference, decisionSpeedDays, targetOwnershipMax, fundTypePreference, leadPreference, isImmigrant, isUnderrepresented, isStudent, isVeteran, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET geoPreference=excluded.geoPreference, decisionSpeedDays=excluded.decisionSpeedDays, targetOwnershipMax=excluded.targetOwnershipMax, fundTypePreference=excluded.fundTypePreference, leadPreference=excluded.leadPreference, isImmigrant=excluded.isImmigrant, isUnderrepresented=excluded.isUnderrepresented, isStudent=excluded.isStudent, isVeteran=excluded.isVeteran, updatedAt=excluded.updatedAt;`,
          normalizedEmail,
          geoPreference || null,
          decisionSpeedDays || null,
          targetOwnershipMax || null,
          fundTypePreference || null,
          leadPreference || null,
          isImmigrant ? 1 : 0,
          isUnderrepresented ? 1 : 0,
          isStudent ? 1 : 0,
          isVeteran ? 1 : 0,
          nowIso
        )
      }
    } catch (e) {
      // Non-fatal; continue even if this lightweight store fails
      console.warn('FounderContact upsert skipped:', e)
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
