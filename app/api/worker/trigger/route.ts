/**
 * WORKER TRIGGER API ENDPOINT
 * 
 * Manually trigger specific background jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { researchVCsBatch } from '@/scripts/auto-research-vcs'
import { fetchLatestYCBatch, updateTrendsWithNewBatch } from '@/lib/yc-trends'
import { openrouterGenerateJson } from '@/lib/openrouter'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const user = await getCurrentUser(false)
    if (!user || user.email !== 'nohaxjustaura@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { jobType, params } = await request.json()
    
    logger.info('API', `🎯 Triggering job: ${jobType}`)
    
    let result: any = null
    
    switch (jobType) {
      case 'vc-research':
        // Research specific VCs or top VCs
        const vcsToResearch = params?.vcs || [
          'Sequoia Capital',
          'Andreessen Horowitz',
          'Benchmark',
          'Accel',
          'Y Combinator',
        ]
        
        await researchVCsBatch(vcsToResearch, {
          delayBetweenSearches: 2000,
          maxConcurrent: 2,
        })
        
        result = { updated: vcsToResearch.length }
        break
        
      case 'yc-trends':
        // Fetch and analyze latest YC batch
        const now = new Date()
        const year = now.getFullYear()
        const month = now.getMonth() + 1
        const batch = month >= 1 && month <= 5 
          ? `W${year.toString().slice(2)}` 
          : `S${year.toString().slice(2)}`
        
        const companies = await fetchLatestYCBatch(batch)
        await updateTrendsWithNewBatch(batch, companies)
        
        result = { batch, companies: companies.length }
        break
        
      case 'market-trends':
        // AI-powered market analysis
        const currentDate = new Date().toISOString().split('T')[0]
        
        const analysis = await openrouterGenerateJson({
          system: 'You are a VC market analyst. Return valid JSON.',
          user: `Analyze current startup/VC market trends as of ${currentDate}. Include hot sectors, funding climate, and key signals VCs want.`,
          temperature: 0.3,
          model: 'meta-llama/llama-3.3-70b-instruct',
        })
        
        result = analysis
        break
        
      case 'data-validation':
        // Check data quality
        const issues: string[] = []
        
        const missingThesis = await db.investor.count({
          where: { OR: [{ thesis: null }, { thesis: '' }] },
        })
        if (missingThesis > 0) issues.push(`${missingThesis} VCs missing thesis`)
        
        const invalidCheckSizes = await db.investor.count({
          where: { OR: [{ checkSizeMin: 0 }, { checkSizeMax: 0 }] },
        })
        if (invalidCheckSizes > 0) issues.push(`${invalidCheckSizes} VCs with invalid check sizes`)
        
        result = { issues: issues.length, details: issues }
        break
        
      default:
        return NextResponse.json(
          { error: `Unknown job type: ${jobType}` },
          { status: 400 }
        )
    }
    
    logger.info('API', `✅ Job completed: ${jobType}`)
    
    return NextResponse.json({
      success: true,
      jobType,
      result,
    })
  } catch (error: any) {
    logger.error('API', 'Job failed:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to trigger job' },
      { status: 500 }
    )
  }
}
