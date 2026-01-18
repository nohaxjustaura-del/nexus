import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  generatePitchEmbedding,
  rankVCsForPitch,
  cosineSimilarity,
  type RankedVC,
} from '@/lib/embeddings'
import { parseJSON } from '@/lib/utils'

const SMART_MATCH_COST = 50 // Credits required for smart matching

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to use Smart Match' },
        { status: 401 }
      )
    }

    // Get user
    const user = await prisma.founder.findUnique({
      where: { email: session.user.email },
      select: { id: true, credits: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check credits
    if (user.credits < SMART_MATCH_COST) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          message: `Smart Match requires ${SMART_MATCH_COST} credits. You have ${user.credits}.`,
          required: SMART_MATCH_COST,
          available: user.credits,
        },
        { status: 402 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { pitchData, analysisId, topK = 20 } = body

    if (!pitchData) {
      return NextResponse.json(
        { error: 'Missing pitch data', message: 'Please provide pitch data for matching' },
        { status: 400 }
      )
    }

    // Build pitch features from analysis data
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

    // Generate pitch embedding
    console.log('Generating pitch embedding...')
    const pitchEmbedding = await generatePitchEmbedding(pitchFeatures)

    // Get all VCs with their data
    console.log('Fetching VCs...')
    const investors = await prisma.investor.findMany({
      where: {
        verified: true,
        isPublic: true,
      },
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
        leadFollow: true,
        thesis: true,
        valueAddTags: true,
        portfolio: true,
        notableInvestments: true,
        embedding: true, // We'll store embeddings in DB
      },
    })

    console.log(`Found ${investors.length} investors`)

    // For VCs without embeddings, we'll calculate on-the-fly (slower but works)
    // In production, you'd pre-generate all VC embeddings
    const vcEmbeddings: Array<{
      id: string
      firmName: string
      embedding: number[]
      metadata: any
    }> = []

    for (const investor of investors) {
      let embedding: number[]

      // Check if we have a stored embedding
      if (investor.embedding) {
        try {
          embedding = JSON.parse(investor.embedding as string)
        } catch {
          // If parsing fails, we'll generate it
          embedding = await generateVCEmbeddingForInvestor(investor)
        }
      } else {
        // Generate embedding on-the-fly
        embedding = await generateVCEmbeddingForInvestor(investor)
      }

      vcEmbeddings.push({
        id: investor.id,
        firmName: investor.firmName,
        embedding,
        metadata: {
          stages: parseJSON<string[]>(investor.stages, []),
          sectors: parseJSON<string[]>(investor.sectors, []),
          geography: parseJSON<string[]>(investor.geography || investor.geoFocus, []),
          checkSize:
            investor.checkSizeMin && investor.checkSizeMax
              ? `$${investor.checkSizeMin}K-$${investor.checkSizeMax}K`
              : undefined,
          fundType: investor.fundType,
        },
      })
    }

    // Rank VCs by similarity
    // Try FAISS first (much faster), fall back to in-memory if unavailable
    console.log('Ranking VCs...')
    let rankedVCs: RankedVC[]
    try {
      // Try FAISS service first (faster, no need to load all VC embeddings)
      rankedVCs = await rankVCsForPitch(pitchEmbedding, [], topK, true)
      console.log(`✅ FAISS ranking complete: ${rankedVCs.length} matches`)
    } catch (faissError) {
      // Fall back to in-memory ranking if FAISS unavailable
      console.log('⚠️ FAISS unavailable, using in-memory ranking')
      rankedVCs = await rankVCsForPitch(pitchEmbedding, vcEmbeddings, topK, false)
    }

    // Deduct credits
    await prisma.founder.update({
      where: { id: user.id },
      data: { credits: { decrement: SMART_MATCH_COST } },
    })

    // Store match results if analysisId provided
    if (analysisId) {
      await prisma.aIAnalysisReport.update({
        where: { id: analysisId },
        data: {
          smartMatchResults: JSON.stringify(rankedVCs),
        },
      })
    }

    // Log credit usage
    await prisma.creditTransaction.create({
      data: {
        founderId: user.id,
        amount: -SMART_MATCH_COST,
        type: 'smart_match',
        description: 'Smart Match: AI-powered VC ranking',
      },
    })

    return NextResponse.json({
      success: true,
      matches: rankedVCs,
      creditsUsed: SMART_MATCH_COST,
      creditsRemaining: user.credits - SMART_MATCH_COST,
    })
  } catch (error: any) {
    console.error('Smart Match error:', error)
    return NextResponse.json(
      {
        error: 'Smart Match failed',
        message: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// Helper function to generate VC embedding from investor data
async function generateVCEmbeddingForInvestor(investor: any): Promise<number[]> {
  const { generateVCEmbedding } = await import('@/lib/embeddings')
  
  const vcProfile = {
    firmName: investor.firmName,
    fundType: investor.fundType,
    stages: parseJSON<string[]>(investor.stages, []),
    sectors: parseJSON<string[]>(investor.sectors, []),
    geography: parseJSON<string[]>(investor.geography || investor.geoFocus, []),
    checkSizeMin: investor.checkSizeMin,
    checkSizeMax: investor.checkSizeMax,
    leadFollow: investor.leadFollow,
    thesis: investor.thesis,
    valueAddTags: parseJSON<string[]>(investor.valueAddTags, []),
    portfolio: parseJSON<any[]>(investor.portfolio, []).map((p: any) => 
      typeof p === 'string' ? p : p.name || p.company
    ).filter(Boolean),
    notableInvestments: parseJSON<string[]>(investor.notableInvestments, []),
  }

  return generateVCEmbedding(vcProfile)
}
