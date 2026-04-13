import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { invalidateFounderContextCache } from '@/lib/founder-context'
import { getUserFromRequest } from '@/lib/auth'
import { notifyAdminsNewFounderSignup, sendFounderApplicationReceipt } from '@/lib/email'
import { parseFounderGeoRequest } from '@/lib/geo/parse-founder-geo'
import type { Founder, FounderContact, FounderPrefs } from '@prisma/client'
import { PrismaClientValidationError } from '@prisma/client/runtime/library'

export const dynamic = 'force-dynamic'

/** Stale `node_modules/.prisma` after schema adds `countryCode` / `regionCode` — regenerate client. */
function responseIfStaleFounderGeoPrisma(e: unknown): NextResponse | null {
  if (!(e instanceof PrismaClientValidationError)) return null
  const m = e.message
  if (!m.includes('Unknown argument')) return null
  if (!m.includes('countryCode') && !m.includes('regionCode')) return null
  return NextResponse.json(
    {
      error: 'Prisma client out of date',
      message:
        'Regenerate the Prisma client and apply migrations: run `npx prisma generate`, then `npx prisma migrate deploy` (or `npx prisma db push` for local dev), and restart `npm run dev`.',
    },
    { status: 503 },
  )
}

/** Map stored lowercase stage to onboarding UI labels (Step2 STAGES). */
function displayStageFromDb(dbStage: string): string {
  const k = dbStage.toLowerCase().trim().replace(/\s+/g, ' ')
  const map: Record<string, string> = {
    idea: 'Idea',
    mvp: 'MVP',
    revenue: 'Revenue',
    'pre-seed': 'Pre-Seed',
    preseed: 'Pre-Seed',
    seed: 'Seed',
    'series a': 'Series A',
    seriesa: 'Series A',
  }
  return map[k] || dbStage
}

function founderRowToPublicFields(founder: Founder, contact: FounderContact | null, prefs: FounderPrefs | null) {
  const sectors = (() => {
    try { return JSON.parse(founder.sectors || '[]') } catch { return [] }
  })() as string[]
  const ethicsTags = (() => {
    try { return JSON.parse(founder.ethicsTags || '[]') } catch { return [] }
  })() as string[]
  const personalityTags = (() => {
    try { return JSON.parse(founder.personalityTags || '[]') } catch { return [] }
  })() as string[]
  const valueAddNeeds = (() => {
    try { return JSON.parse(founder.valueAddNeeds || '[]') } catch { return [] }
  })() as string[]

  return {
    name: founder.name,
    email: founder.email,
    marketingOptIn: founder.marketingOptIn || false,
    age: founder.age,
    education: founder.education,
    gender: founder.gender,
    willingToDropOut: founder.willingToDropOut,
    startupName: founder.startupName,
    stage: displayStageFromDb(founder.stage),
    sectors,
    businessModel: founder.businessModel,
    location: founder.location,
    countryCode: founder.countryCode ?? '',
    regionCode: founder.regionCode ?? '',
    fundingNeed: founder.fundingNeed,
    bio: founder.bio,
    pitchDeck: founder.pitchDeck,
    videoPitchUrl: founder.videoPitchUrl,
    linkedinUrl: founder.linkedinUrl,
    ethicsTags,
    personalityTags,
    valueAddNeeds,
    phone: contact?.phone ?? '',
    altEmail: contact?.altEmail ?? '',
    website: contact?.website ?? '',
    linkedin: contact?.linkedin ?? '',
    geoPreference: (prefs?.geoPreference as 'us-only' | 'remote-ok') || 'us-only',
    decisionSpeedDays: prefs?.decisionSpeedDays ?? '',
    targetOwnershipMax: prefs?.targetOwnershipMax ?? '',
    fundTypePreference: (prefs?.fundTypePreference as 'accelerator' | 'institutional' | 'either') || 'either',
    leadPreference: (prefs?.leadPreference as 'never' | 'sometimes' | 'usually') || 'sometimes',
    isImmigrant: prefs?.isImmigrant ?? false,
    isUnderrepresented: prefs?.isUnderrepresented ?? false,
    isStudent: prefs?.isStudent ?? false,
    isVeteran: prefs?.isVeteran ?? false,
    isWoman: prefs?.isWoman ?? ((founder.gender ?? '').toLowerCase().trim() === 'female' || (founder.gender ?? '').toLowerCase().trim() === 'woman'),
    isLgbtq: prefs?.isLgbtq ?? false,
    isBipoc: prefs?.isBipoc ?? false,
    needsImmigrationSupport: prefs?.needsImmigrationSupport ?? false,
  }
}

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

    // Check if founder profile exists (must match auth email; same key as verify-id)
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

    const contact = await db.founderContact.findUnique({
      where: { email: sessionEmail },
    }).catch(() => null)

    const founderPrefs = await db.founderPrefs.findUnique({
      where: { email: sessionEmail },
    }).catch(() => null)

    const publicFields = founderRowToPublicFields(founder, contact, founderPrefs)

    return NextResponse.json({
      exists: true,
      verification: founderVerification
        ? { uploaded: true, status: founderVerification.status }
        : { uploaded: false, status: null },
      founder: publicFields,
      profile: publicFields,
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
    const geoParsed = parseFounderGeoRequest(data)
    if (!geoParsed.ok) {
      return NextResponse.json({ error: geoParsed.message }, { status: 400 })
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
    const isNewFounder = !existingFounder

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
      countryCode: geoParsed.countryCode,
      regionCode: geoParsed.regionCode,
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
          countryCode: geoParsed.countryCode,
          regionCode: geoParsed.regionCode,
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

      const genderLow = (gender ?? '').toLowerCase().trim()
      const isWomanResolved =
        data.isWoman === true || genderLow === 'female' || genderLow === 'woman'

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
          isWoman: isWomanResolved,
          isLgbtq: data.isLgbtq || false,
          isBipoc: data.isBipoc || false,
          needsImmigrationSupport: needsImmigrationSupport || false,
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
          isWoman: isWomanResolved,
          isLgbtq: data.isLgbtq || false,
          isBipoc: data.isBipoc || false,
          needsImmigrationSupport: needsImmigrationSupport || false,
        },
      })
      invalidateFounderContextCache(normalizedEmail)
    } catch (e) {
      console.warn('FounderContact / FounderPrefs upsert skipped:', e)
    }

    // Fire-and-forget application receipt email
    try {
      await sendFounderApplicationReceipt(normalizedEmail, name)
    } catch (e) {
      console.warn('sendFounderApplicationReceipt failed:', e)
    }

    if (isNewFounder) {
      try {
        await notifyAdminsNewFounderSignup({
          name,
          email: normalizedEmail,
          startupName: startupName || null,
          stage: String(stage),
          location,
          phone: phone ? String(phone) : null,
        })
      } catch (e) {
        console.warn('notifyAdminsNewFounderSignup failed:', e)
      }
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
  } catch (error: unknown) {
    console.error('Error saving founder profile:', error)
    const stale = responseIfStaleFounderGeoPrisma(error)
    if (stale) return stale
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to save profile', message },
      { status: 500 },
    )
  }
}

// PATCH: Update existing founder profile (account settings; no application email)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionEmail = user.email.toLowerCase().trim()
    if (!sessionEmail) {
      return NextResponse.json({ error: 'Account email missing' }, { status: 400 })
    }

    const existingFounder = await db.founder.findUnique({
      where: { email: sessionEmail },
    })

    if (!existingFounder) {
      return NextResponse.json(
        { error: 'No founder profile yet. Complete onboarding first.' },
        { status: 404 }
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
      altEmail,
      city,
      country,
      cofounders,
      hoursPerWeek,
      prevFunding,
      prevFundingAmount,
      website,
      linkedin,
      geoPreference,
      decisionSpeedDays,
      targetOwnershipMax,
      fundTypePreference,
      leadPreference,
      isImmigrant,
      isUnderrepresented,
      isStudent,
      isVeteran,
    } = data

    if (!name || !email || !stage || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, stage, location' },
        { status: 400 }
      )
    }
    const geoParsedPatch = parseFounderGeoRequest(data)
    if (!geoParsedPatch.ok) {
      return NextResponse.json({ error: geoParsedPatch.message }, { status: 400 })
    }
    if (!age || isNaN(parseInt(String(age), 10))) {
      return NextResponse.json({ error: 'Age is required' }, { status: 400 })
    }
    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 })
    }
    if (!education || String(education).trim().length < 2) {
      return NextResponse.json(
        { error: 'Education (university) is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = sessionEmail
    const formEmailNorm = email ? String(email).toLowerCase().trim() : ''
    const mergedAltEmail =
      altEmail && String(altEmail).trim()
        ? String(altEmail).trim()
        : formEmailNorm && formEmailNorm !== sessionEmail
          ? formEmailNorm
          : null

    const founderData = {
      name,
      email: normalizedEmail,
      age: age ? parseInt(String(age), 10) : null,
      education: education || null,
      gender: gender || null,
      marketingOptIn: !!marketingOptIn,
      willingToDropOut: willingToDropOut || false,
      startupName: startupName || null,
      stage: String(stage).toLowerCase(),
      sectors: JSON.stringify(sectors || []),
      businessModel: businessModel || null,
      location,
      countryCode: geoParsedPatch.countryCode,
      regionCode: geoParsedPatch.regionCode,
      fundingNeed: fundingNeed ? parseInt(String(fundingNeed), 10) : 0,
      ethicsTags: JSON.stringify(ethicsTags || []),
      personalityTags: JSON.stringify(personalityTags || []),
      valueAddNeeds: JSON.stringify(valueAddNeeds || []),
    }

    const founder = await db.founder.update({
      where: { email: normalizedEmail },
      data: founderData,
    })

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

      const patchGenderLow = (gender ?? '').toLowerCase().trim()
      const patchDerivedIsWoman = patchGenderLow === 'female' || patchGenderLow === 'woman'
      const isWomanResolved = data.isWoman === true || patchDerivedIsWoman

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
          isWoman: isWomanResolved,
          isLgbtq: data.isLgbtq || false,
          isBipoc: data.isBipoc || false,
          needsImmigrationSupport: data.needsImmigrationSupport || false,
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
          isWoman: isWomanResolved,
          isLgbtq: data.isLgbtq || false,
          isBipoc: data.isBipoc || false,
          needsImmigrationSupport: data.needsImmigrationSupport || false,
        },
      })
      invalidateFounderContextCache(normalizedEmail)
    } catch (e) {
      console.warn('FounderContact / FounderPrefs upsert skipped:', e)
    }

    return NextResponse.json({
      success: true,
      founder: {
        id: founder.id,
        email: founder.email,
        name: founder.name,
      },
    })
  } catch (error: unknown) {
    console.error('Error updating founder profile:', error)
    const stale = responseIfStaleFounderGeoPrisma(error)
    if (stale) return stale
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to update profile', message },
      { status: 500 },
    )
  }
}
