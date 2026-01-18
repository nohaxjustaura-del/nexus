import { NextRequest, NextResponse } from 'next/server'
import { extractResumeFeatures, ResumeFeatures } from '@/lib/ai'
import { db } from '@/lib/db'
import { intelligentMatchVCs, analyzeResumeContext, recommendFellowships } from '@/lib/intelligent-matching'
import { parseJSON } from '@/lib/utils'
import { validateResume, validateFile } from '@/lib/resume-validator'
import { loadReferenceResume, extractReferencePatterns } from '@/lib/resume-reference'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { smartParseResume } from '@/lib/resume-analysis/parsing'
import { extractSkills, extractExperiences, extractKeywords } from '@/lib/resume-analysis/extraction'
import { identifyGaps, resumeHasMetrics, generateSmartSuggestions } from '@/lib/resume-analysis/analysis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Resume analysis has been disabled - we cannot effectively use resumes to match founders with VCs
  return NextResponse.json(
    { 
      error: 'Feature Disabled',
      message: 'Resume analysis is no longer available. Please use Video Pitch or Pitch Deck analysis instead.',
      redirect: '/founder/video-pitch'
    },
    { status: 410 } // 410 Gone - resource no longer available
  )
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Feature Disabled',
    message: 'Resume analysis is no longer available. Please use Video Pitch or Pitch Deck analysis instead.'
  })
}
