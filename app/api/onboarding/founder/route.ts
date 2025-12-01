import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()

    // Save founder profile to database
    const founderProfile = await db.founderProfile.upsert({
      where: { userId: session.user.id },
      update: {
        // Personal Info
        fullName: data.fullName,
        pronouns: data.pronouns,
        location: data.location,
        linkedin: data.linkedin,
        twitter: data.twitter,
        
        // Background
        founderType: data.founderType,
        previousRole: data.previousRole,
        technicalSkills: JSON.stringify(data.technicalSkills),
        businessSkills: JSON.stringify(data.businessSkills),
        previousCompanies: data.previousCompanies,
        notableAchievements: data.notableAchievements,
        yearsOfExperience: data.yearsOfExperience,
        
        // Startup
        companyName: data.companyName,
        oneLiner: data.oneLiner,
        problemSolving: data.problemSolving,
        solution: data.solution,
        targetCustomer: data.targetCustomer,
        sectors: JSON.stringify(data.sectors),
        businessModel: data.businessModel,
        moat: data.moat,
        
        // Traction
        stage: data.stage,
        hasRevenue: data.hasRevenue,
        mrr: data.mrr,
        users: data.users,
        growth: data.growth,
        keyMetrics: data.keyMetrics,
        teamSize: data.teamSize,
        
        // Fundraising
        fundraisingStage: data.fundraisingStage,
        amountRaising: data.amountRaising,
        useOfFunds: data.useOfFunds,
        timeline: data.timeline,
        previousFunding: data.previousFunding,
        
        // Optional Demographics
        optInDemographics: data.optInDemographics,
        gender: data.gender,
        ethnicity: JSON.stringify(data.ethnicity),
        isImmigrant: data.isImmigrant,
        isFirstGen: data.isFirstGen,
        isStudent: data.isStudent,
        isLGBTQ: data.isLGBTQ,
        
        profileComplete: true,
        updatedAt: new Date()
      },
      create: {
        userId: session.user.id,
        fullName: data.fullName,
        pronouns: data.pronouns,
        location: data.location,
        linkedin: data.linkedin,
        twitter: data.twitter,
        founderType: data.founderType,
        previousRole: data.previousRole,
        technicalSkills: JSON.stringify(data.technicalSkills),
        businessSkills: JSON.stringify(data.businessSkills),
        previousCompanies: data.previousCompanies,
        notableAchievements: data.notableAchievements,
        yearsOfExperience: data.yearsOfExperience,
        companyName: data.companyName,
        oneLiner: data.oneLiner,
        problemSolving: data.problemSolving,
        solution: data.solution,
        targetCustomer: data.targetCustomer,
        sectors: JSON.stringify(data.sectors),
        businessModel: data.businessModel,
        moat: data.moat,
        stage: data.stage,
        hasRevenue: data.hasRevenue,
        mrr: data.mrr,
        users: data.users,
        growth: data.growth,
        keyMetrics: data.keyMetrics,
        teamSize: data.teamSize,
        fundraisingStage: data.fundraisingStage,
        amountRaising: data.amountRaising,
        useOfFunds: data.useOfFunds,
        timeline: data.timeline,
        previousFunding: data.previousFunding,
        optInDemographics: data.optInDemographics,
        gender: data.gender,
        ethnicity: JSON.stringify(data.ethnicity),
        isImmigrant: data.isImmigrant,
        isFirstGen: data.isFirstGen,
        isStudent: data.isStudent,
        isLGBTQ: data.isLGBTQ,
        profileComplete: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      profile: founderProfile 
    })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    )
  }
}


