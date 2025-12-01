import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { analyzeVideoPitch, VideoPitchFeatures } from '@/lib/ai'
import { intelligentMatchVCs } from '@/lib/intelligent-matching'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Validate file
function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 500 * 1024 * 1024 // 500MB
  const allowedTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime']
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 500MB' }
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only MP4, MOV, and WebM video files are supported' }
  }
  
  return { valid: true }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get founder profile
    const founder = await db.founder.findUnique({
      where: { email: user.email },
    }).catch((err) => {
      console.error('Error fetching founder:', err)
      return null
    })

    if (!founder) {
      return NextResponse.json(
        { error: 'Founder profile not found. Please complete onboarding first.' },
        { status: 404 }
      )
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formError: any) {
      return NextResponse.json({ 
        error: 'Invalid Request',
        message: 'Could not parse form data.',
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const file = formData.get('file') as File
    const paymentVerified = formData.get('paymentVerified') === 'true'
    const sessionId = (formData.get('sessionId') as string) || null
    const reviewType = (formData.get('reviewType') as string) || 'ai'
    const reviewerId = formData.get('reviewerId') as string | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check and deduct credits based on review type
    const CREDIT_COST = reviewType === 'reviewer' ? 100 : 50
    const ADMIN_EMAIL = 'nohaxjustaura@gmail.com'
    
    // Skip credit check for admin
    if (user.email !== ADMIN_EMAIL) {
      let userCredits = await (db as any).userCredits.findUnique({
        where: { userId: user.id },
      })
      
      if (!userCredits) {
        userCredits = await (db as any).userCredits.create({
          data: {
            userId: user.id,
            credits: 0,
            isPremium: false,
          },
        })
      }
      
      if (!userCredits.isPremium && userCredits.credits < CREDIT_COST) {
        return NextResponse.json({
          error: `Insufficient credits. ${reviewType === 'reviewer' ? 'VC-Accepted Reviewer Review' : 'AI Video Pitch Analysis'} costs ${CREDIT_COST} credits. You have ${userCredits.credits} credits.`,
          requiresPayment: true,
          creditCost: CREDIT_COST,
          currentCredits: userCredits.credits,
        }, { status: 402 })
      }
      
      // Deduct credits if not premium
      if (!userCredits.isPremium) {
        await (db as any).userCredits.update({
          where: { userId: user.id },
          data: {
            credits: userCredits.credits - CREDIT_COST,
          },
        })
      }
    }

    // Require payment verification (beta: $0 but still need checkout)
    if (!paymentVerified) {
      return NextResponse.json({
        error: 'Payment required',
        requiresPayment: true,
        amount: 0,
        message: 'Please complete checkout before analysis.',
      }, { status: 402 })
    }

    // Validate file
    const fileValidation = validateFile(file)
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    // For now, we'll simulate video transcription
    // In production, use a service like OpenAI Whisper API, Google Speech-to-Text, or AssemblyAI
    // For MVP, we'll extract text from filename or use a placeholder
    let transcript: string
    let transcriptText: string
    
    try {
      // TODO: Integrate with video transcription service
      // For now, create a placeholder transcript
      // In production, use: OpenAI Whisper API, AssemblyAI, or Google Speech-to-Text
      transcriptText = `[Video transcription would appear here. In production, integrate with OpenAI Whisper API or similar service to transcribe the video audio.]
      
This is a placeholder transcript. To enable full video transcription:
1. Set up OpenAI Whisper API or AssemblyAI
2. Upload video to storage (S3, Cloudinary, etc.)
3. Transcribe audio from video
4. Use transcript for AI analysis

For now, please provide a text description of your pitch or upload a pitch deck instead.`
      
      transcript = transcriptText.substring(0, 1000) // Summary
    } catch (readError: any) {
      return NextResponse.json({ 
        error: 'File Read Error',
        message: 'Could not process video file.',
        details: readError?.message,
      }, { status: 400 })
    }

    // Handle reviewer review vs AI analysis
    if (reviewType === 'reviewer') {
      // Create a review request for a reviewer
      let assignedReviewerId = reviewerId
      
      // If no reviewer selected, assign best available
      if (!assignedReviewerId) {
        const availableReviewer = await (db as any).reviewer.findFirst({
          where: {
            active: true,
            verified: true,
            vcAccepted: true,
          },
          orderBy: [
            { averageRating: 'desc' },
            { totalReviews: 'asc' }, // Prefer reviewers with fewer reviews for load balancing
          ],
        })
        assignedReviewerId = availableReviewer?.id
      }
      
      if (!assignedReviewerId) {
        return NextResponse.json({
          error: 'No reviewers available',
          message: 'No reviewers are currently available. Please try AI analysis instead.',
        }, { status: 503 })
      }
      
      // Save video pitch first
      const videoPitch = await (db as any).videoPitch.create({
        data: {
          founderId: founder.id,
          fileName: file.name,
          fileUrl: '', // In production, upload to storage
          fileType: file.type.split('/')[1] || 'mp4',
          fileSize: file.size,
          transcript: transcriptText.substring(0, 1000),
          transcriptText: transcriptText.substring(0, 50000),
        },
      })
      
      // Create review request
      const review = await (db as any).videoPitchReview.create({
        data: {
          videoPitchId: videoPitch.id,
          reviewerId: assignedReviewerId,
          status: 'pending',
        },
      })
      
      return NextResponse.json({
        success: true,
        reviewId: review.id,
        videoPitchId: videoPitch.id,
        message: 'Your video pitch has been submitted for review. You will receive an email when the review is complete (typically 2-3 days).',
        reviewer: await (db as any).reviewer.findUnique({
          where: { id: assignedReviewerId },
          select: { name: true, acceptedVC: true },
        }),
      })
    }

    // AI Analysis (existing flow)
    let pitchAnalysis: any
    try {
      pitchAnalysis = await analyzeVideoPitch(transcriptText, founder)
    } catch (aiError: any) {
      console.error('AI analysis error:', aiError)
      return NextResponse.json({ 
        error: 'Analysis Error',
        message: 'Failed to analyze video pitch. Please try again.',
        details: aiError?.message,
      }, { status: 500 })
    }

    // Get all investors for matching
    const investors = await db.investor.findMany({
      where: { verified: true },
    })

    // Match with VCs - convert pitch features to resume-like format for matching
    let matchedVCs: any[] = []
    try {
      // Create a resume-like features object from video pitch analysis
      const resumeLikeFeatures = {
        basics: {},
        education: [],
        experience: [],
        projects: [],
        skills: {
          programming: [],
          ml: [],
          gtm: [],
          domain: [],
        },
        yearsExp: 0,
        leadership: true,
        traction: pitchAnalysis.tractionMetrics,
      }

      matchedVCs = await intelligentMatchVCs(
        resumeLikeFeatures,
        {
          stage: founder.stage,
          sectors: JSON.parse(founder.sectors || '[]'),
          fundingNeed: founder.fundingNeed,
          location: founder.location,
        },
        investors
      )

      // Enhance matches with application recommendations
      matchedVCs = matchedVCs.map(match => {
        const vc = match.investor
        const sectors = JSON.parse(vc.sectors || '[]')
        const founderSectors = JSON.parse(founder.sectors || '[]')
        const sectorMatch = sectors.some((s: string) => 
          founderSectors.some((fs: string) => 
            fs.toLowerCase().includes(s.toLowerCase()) || 
            s.toLowerCase().includes(fs.toLowerCase())
          )
        )

        // Generate application recommendations
        let whyApply = `Strong ${sectorMatch ? 'sector' : 'stage'} fit with ${vc.firmName}'s investment thesis.`
        let bestApproach = 'Warm introduction preferred'
        let timing = 'Apply within 2-4 weeks'

        if (match.score >= 85) {
          whyApply = `Excellent match! ${vc.firmName} actively invests in ${sectors.slice(0, 2).join(' and ')} at ${founder.stage} stage. Your pitch aligns with their thesis.`
          bestApproach = 'Warm introduction through portfolio founder or mutual connection'
          timing = 'Apply immediately - high priority match'
        } else if (match.score >= 70) {
          whyApply = `Good fit with ${vc.firmName}. They invest in ${sectors[0]} and your stage aligns.`
          bestApproach = 'Warm introduction or personalized cold email with specific thesis alignment'
          timing = 'Apply within 1-2 weeks'
        } else {
          whyApply = `Moderate fit. ${vc.firmName} may be interested given your sector and traction.`
          bestApproach = 'Personalized cold email highlighting specific alignment points'
          timing = 'Apply when you have stronger traction metrics'
        }

        return {
          ...match,
          whyApply,
          bestApproach,
          timing,
        }
      })
    } catch (matchError: any) {
      console.error('Matching error:', matchError)
      // Continue even if matching fails
    }

    // Save video pitch analysis
    const videoPitch = await (db as any).videoPitch.create({
      data: {
        founderId: founder.id,
        fileName: file.name,
        fileUrl: '', // In production, upload to S3/storage and save URL
        fileType: file.type.split('/')[1] || 'mp4',
        fileSize: file.size,
        transcript: transcript,
        transcriptText: transcriptText.substring(0, 50000), // Limit text storage
        analysisResult: JSON.stringify({
          features: pitchAnalysis,
          matchedVCs: matchedVCs.slice(0, 10),
        }),
        strengths: JSON.stringify(pitchAnalysis.strengths || []),
        weaknesses: JSON.stringify(pitchAnalysis.weaknesses || []),
        improvements: JSON.stringify(pitchAnalysis.improvements || []),
        matchedVCs: JSON.stringify(matchedVCs.slice(0, 10).map(m => ({
          investorId: m.investor.id,
          score: m.score,
          reasons: m.reasons,
          whyApply: m.whyApply,
          bestApproach: m.bestApproach,
          timing: m.timing,
        }))),
        sectorFit: JSON.stringify(pitchAnalysis.sectorFit || {}),
        tractionMetrics: JSON.stringify(pitchAnalysis.tractionMetrics || {}),
        marketAnalysis: JSON.stringify(pitchAnalysis.marketAnalysis || {}),
        teamAnalysis: JSON.stringify(pitchAnalysis.teamAnalysis || {}),
        productFit: JSON.stringify(pitchAnalysis.productFit || {}),
        presentationScore: pitchAnalysis.presentationScore || null,
        contentScore: pitchAnalysis.contentScore || null,
        overallScore: pitchAnalysis.overallScore || null,
        topVCRecommendations: JSON.stringify(matchedVCs.slice(0, 5).map(m => ({
          investorId: m.investor.id,
          firmName: m.investor.firmName,
          whyApply: m.whyApply,
          bestApproach: m.bestApproach,
          timing: m.timing,
          priority: m.score >= 85 ? 'high' : m.score >= 70 ? 'medium' : 'low',
        }))),
      },
    })

    return NextResponse.json({
      success: true,
      videoPitchId: videoPitch.id,
      analysis: {
        overallScore: pitchAnalysis.overallScore || 0,
        presentationScore: pitchAnalysis.presentationScore || 0,
        contentScore: pitchAnalysis.contentScore || 0,
        strengths: pitchAnalysis.strengths || [],
        weaknesses: pitchAnalysis.weaknesses || [],
        improvements: pitchAnalysis.improvements || [],
        matchedVCs: matchedVCs.slice(0, 10).map(m => ({
          investorId: m.investor.id,
          firmName: m.investor.firmName,
          score: m.score,
          reasons: m.reasons,
          whyApply: m.whyApply,
          bestApproach: m.bestApproach,
          timing: m.timing,
          detailedReasons: m.detailedReasons || [],
        })),
        topVCRecommendations: matchedVCs.slice(0, 5).map(m => ({
          investorId: m.investor.id,
          firmName: m.investor.firmName,
          whyApply: m.whyApply,
          bestApproach: m.bestApproach,
          timing: m.timing,
          priority: m.score >= 85 ? 'high' : m.score >= 70 ? 'medium' : 'low',
        })),
        sectorFit: pitchAnalysis.sectorFit || {},
        tractionMetrics: pitchAnalysis.tractionMetrics || {},
        marketAnalysis: pitchAnalysis.marketAnalysis || {},
        teamAnalysis: pitchAnalysis.teamAnalysis || {},
        productFit: pitchAnalysis.productFit || {},
      },
    }, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Video pitch analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze video pitch',
        message: error?.message || 'Please try again.',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

