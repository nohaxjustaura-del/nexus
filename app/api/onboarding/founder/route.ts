import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'


export async function POST(req: NextRequest) {
  console.log('[API /onboarding/founder] POST request received')
  const startTime = Date.now()
  
  try {
    console.log('[API /onboarding/founder] Checking authentication...')
    const user = await getCurrentUser()
    console.log('[API /onboarding/founder] User:', {
      exists: !!user,
      userId: user?.id,
      email: user?.email
    })
    
    if (!user) {
      console.warn('[API /onboarding/founder] Unauthorized - no user found')
      return NextResponse.json({ 
        error: 'Unauthorized', 
        message: 'Please sign in to continue. Your session may have expired.' 
      }, { status: 401 })
    }
    
    if (!user.emailVerified) {
      console.warn('[API /onboarding/founder] Email not verified for user:', user.email)
      return NextResponse.json({ 
        error: 'Email not verified', 
        message: 'Please verify your email address before submitting your profile.' 
      }, { status: 403 })
    }

    console.log('[API /onboarding/founder] Parsing request body...')
    const data = await req.json()
    console.log('[API /onboarding/founder] Received data:', {
      keys: Object.keys(data),
      dataSize: JSON.stringify(data).length,
      dataPreview: Object.fromEntries(
        Object.entries(data).slice(0, 5).map(([k, v]) => [
          k, 
          typeof v === 'string' && v.length > 50 ? v.substring(0, 50) + '...' : v
        ])
      )
    })

    // Map form data to database schema (form fields match schema exactly!)
    console.log('[API /onboarding/founder] Mapping form data to schema...')
    const profileData = {
      founderName: data.founderName || '',
      founderBackground: data.founderBackground || '',
      founderExperience: data.founderExperience || '',
      coFounders: data.coFounders || null,
      startupName: data.startupName || '',
      industry: data.industry || '',
      stage: data.stage || '',
      location: data.location || '',
      businessModel: data.businessModel || '',
      problemStatement: data.problemStatement || '',
      solution: data.solution || '',
      uniqueValue: data.uniqueValue || '',
      currentTraction: data.currentTraction || '',
      revenue: data.revenue || null,
      users: data.users || null,
      growth: data.growth || null,
      fundraisingStage: data.fundraisingStage || '',
      targetAmount: data.targetAmount || '',
      previousFunding: data.previousFunding || null,
      pitchDeck: data.pitchDeck || null,
      competitors: data.competitors || null,
      futureVision: data.futureVision || ''
    }
    
    console.log('[API /onboarding/founder] Profile data prepared:', {
      startupName: profileData.startupName,
      stage: profileData.stage,
      industry: profileData.industry
    })
    
    // Save founder profile to database
    // Note: FounderProfile doesn't have userId, so we'll create a new one each time
    // In production, you might want to link it to user via a separate table
    console.log('[API /onboarding/founder] Creating founder profile...')
    
    // Validate required fields before attempting to save
    const requiredFields: (keyof typeof profileData)[] = [
      'founderName', 'founderBackground', 'founderExperience',
      'startupName', 'industry', 'stage', 'location', 'businessModel',
      'problemStatement', 'solution', 'uniqueValue', 'currentTraction',
      'fundraisingStage', 'targetAmount', 'futureVision'
    ]
    
    const missingFields: string[] = []
    for (const field of requiredFields) {
      const value = profileData[field]
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field)
      }
    }
    
    if (missingFields.length > 0) {
      console.warn('[API /onboarding/founder] Missing required fields:', missingFields)
      return NextResponse.json({ 
        error: 'Validation failed', 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 })
    }
    
    const founderProfile = await db.founderProfile.create({
      data: profileData
    })

    const duration = Date.now() - startTime
    console.log('[API /onboarding/founder] Profile saved successfully:', {
      profileId: founderProfile.id,
      startupName: founderProfile.startupName,
      duration: `${duration}ms`
    })

    return NextResponse.json({ 
      success: true, 
      profile: founderProfile 
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[API /onboarding/founder] Error occurred:', {
      error: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to save profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
