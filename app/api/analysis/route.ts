import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AIFundCoach } from '@/lib/ai-coach';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch the most recent founder profile
    // In production, you'd use authentication to get the current user's profile
    const profile = await prisma.founderProfile.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'No profile found. Please complete onboarding first.' },
        { status: 404 }
      );
    }

    // Check if we have cached analysis
    const existingAnalysis = await prisma.analysis.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' }
    });

    // If analysis exists and is recent (within 24 hours), return it
    if (existingAnalysis) {
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      
      if (existingAnalysis.createdAt > dayAgo) {
        return NextResponse.json(existingAnalysis.data);
      }
    }

    // Generate new analysis
    console.log('Generating new analysis for profile:', profile.id);
    
    const startupProfile = {
      founderName: profile.founderName,
      founderBackground: profile.founderBackground,
      founderExperience: profile.founderExperience,
      coFounders: profile.coFounders || undefined,
      startupName: profile.startupName,
      industry: profile.industry,
      stage: profile.stage,
      location: profile.location,
      businessModel: profile.businessModel,
      problemStatement: profile.problemStatement,
      solution: profile.solution,
      uniqueValue: profile.uniqueValue,
      currentTraction: profile.currentTraction,
      revenue: profile.revenue || undefined,
      users: profile.users || undefined,
      growth: profile.growth || undefined,
      fundraisingStage: profile.fundraisingStage,
      targetAmount: profile.targetAmount,
      previousFunding: profile.previousFunding || undefined,
      pitchDeck: profile.pitchDeck || undefined,
      competitors: profile.competitors || undefined,
      futureVision: profile.futureVision
    };

    const analysis = await AIFundCoach.analyzeStartup(startupProfile);

    // Cache the analysis
    await prisma.analysis.create({
      data: {
        profileId: profile.id,
        data: analysis as any
      }
    });

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error generating analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate analysis' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST() {
  try {
    // Force regenerate analysis
    const profile = await prisma.founderProfile.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'No profile found' },
        { status: 404 }
      );
    }

    const startupProfile = {
      founderName: profile.founderName,
      founderBackground: profile.founderBackground,
      founderExperience: profile.founderExperience,
      coFounders: profile.coFounders || undefined,
      startupName: profile.startupName,
      industry: profile.industry,
      stage: profile.stage,
      location: profile.location,
      businessModel: profile.businessModel,
      problemStatement: profile.problemStatement,
      solution: profile.solution,
      uniqueValue: profile.uniqueValue,
      currentTraction: profile.currentTraction,
      revenue: profile.revenue || undefined,
      users: profile.users || undefined,
      growth: profile.growth || undefined,
      fundraisingStage: profile.fundraisingStage,
      targetAmount: profile.targetAmount,
      previousFunding: profile.previousFunding || undefined,
      pitchDeck: profile.pitchDeck || undefined,
      competitors: profile.competitors || undefined,
      futureVision: profile.futureVision
    };

    const analysis = await AIFundCoach.analyzeStartup(startupProfile);

    // Delete old analysis and save new one
    await prisma.analysis.deleteMany({
      where: { profileId: profile.id }
    });

    await prisma.analysis.create({
      data: {
        profileId: profile.id,
        data: analysis as any
      }
    });

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error regenerating analysis:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate analysis' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}


