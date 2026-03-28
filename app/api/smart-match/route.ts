import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  generatePitchEmbedding,
  investorsToRankableEmbeddings,
  rankVCsForPitch,
  type RankedVC,
} from '@/lib/embeddings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { bypassesAiCredits } from '@/lib/dev-ai-analysis-bypass'

const SMART_MATCH_COST = 50

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to use Smart Match' },
        { status: 401 },
      )
    }

    const founder = await db.founder.findUnique({
      where: { email: user.email },
      select: { id: true },
    })

    if (!founder) {
      return NextResponse.json({ error: 'Founder profile not found' }, { status: 404 })
    }

    let userCredits = await db.userCredits.findUnique({
      where: { userId: user.id },
    })
    if (!userCredits) {
      userCredits = await db.userCredits.create({
        data: { userId: user.id, credits: 0, isPremium: false },
      })
    }

    const skipCreditCost = bypassesAiCredits(user.email)
    if (!skipCreditCost && !userCredits.isPremium && (userCredits.credits ?? 0) < SMART_MATCH_COST) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          message: `Smart Match requires ${SMART_MATCH_COST} credits. You have ${userCredits.credits ?? 0}.`,
          required: SMART_MATCH_COST,
          available: userCredits.credits ?? 0,
        },
        { status: 402 },
      )
    }

    const body = await req.json()
    const { pitchData, topK = 20 } = body

    if (!pitchData) {
      return NextResponse.json(
        { error: 'Missing pitch data', message: 'Please provide pitch data for matching' },
        { status: 400 },
      )
    }

    const pitchFeatures = {
      companyName: pitchData.companyName || pitchData.company_name,
      oneLineSummary: pitchData.oneLineSummary || pitchData.one_line_summary || pitchData.summary,
      stage: pitchData.stage,
      sectorPrimary: pitchData.sectorPrimary || pitchData.sector_primary || pitchData.sector,
      sectorSecondary: pitchData.sectorSecondary || pitchData.sector_secondary || [],
      problemStatement: pitchData.problemStatement || pitchData.problem_statement || pitchData.problem,
      solutionDescription: pitchData.solutionDescription || pitchData.solution_description || pitchData.solution,
      targetCustomer: pitchData.targetCustomer || pitchData.target_customer,
      geography: pitchData.geography,
      businessModel: pitchData.businessModel || pitchData.business_model,
      traction: pitchData.traction,
      keyTechnologies: pitchData.keyTechnologies || pitchData.key_technologies || [],
      competitiveMoat: pitchData.competitiveMoat || pitchData.competitive_moat || [],
      keywords: pitchData.keywords || [],
    }

    const pitchEmbedding = await generatePitchEmbedding(pitchFeatures)

    let rankedVCs: RankedVC[]
    try {
      rankedVCs = await rankVCsForPitch(pitchEmbedding, [], topK, true)
    } catch {
      const investors = await db.investor.findMany({
        where: { isPublic: true },
        select: {
          id: true,
          firmName: true,
          fundType: true,
          stages: true,
          sectors: true,
          geography: true,
          geoFocus: true,
          checkSizeMin: true,
          checkSizeMax: true,
          embedding: true,
        },
      })
      const vcEmbeddings = investorsToRankableEmbeddings(investors, pitchEmbedding.length)
      if (vcEmbeddings.length === 0) {
        return NextResponse.json(
          {
            error: 'Smart Match unavailable',
            message:
              'FAISS vector search failed and no stored VC embeddings match the current model. Check FAISS_SERVICE_URL or run npm run generate-vc-embeddings.',
          },
          { status: 503 },
        )
      }
      rankedVCs = await rankVCsForPitch(pitchEmbedding, vcEmbeddings, topK, false)
    }

    let creditsRemaining = userCredits.credits ?? 0
    if (!skipCreditCost && !userCredits.isPremium) {
      const updated = await db.userCredits.update({
        where: { userId: user.id },
        data: { credits: { decrement: SMART_MATCH_COST } },
      })
      creditsRemaining = updated.credits ?? 0
    }

    return NextResponse.json({
      success: true,
      matches: rankedVCs,
      creditsUsed: skipCreditCost || userCredits.isPremium ? 0 : SMART_MATCH_COST,
      creditsRemaining,
    })
  } catch (error: any) {
    console.error('Smart Match error:', error)
    return NextResponse.json(
      {
        error: 'Smart Match failed',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
