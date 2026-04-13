import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserForAiAnalysis } from '@/lib/auth'
import { extractPitchDeckFeatures, analyzeVideoPitch } from '@/lib/ai'
import { runMatchingPipeline } from '@/lib/matching/matching-orchestrator'
import { runScoringPipeline } from '@/lib/scoring/scoring-pipeline'
import { logger } from '@/lib/logger'
import { validatePitchDeck, validateVideoPitch, validatePitchIdea } from '@/lib/content-validator'
import { CREDIT_COSTS } from '@/lib/constants'
import { shouldEnforceAiCredits } from '@/lib/dev-ai-analysis-bypass'
import { rateLimitMiddleware, RATE_LIMITS } from '@/lib/rate-limit'
import { parseJSON } from '@/lib/utils'
import { getComprehensiveFounderContext } from '@/lib/founder-context'
import { saveFileToDisk, buildFounderSnapshot } from '@/lib/file-storage'
import { getDeepMarketContextSafe } from '@/lib/market-intelligence'
import {
  parseStructuredQaJson,
  hasAnyStructuredAnswer,
  formatStructuredQaBody,
  formatStructuredQaBlock,
  flattenStructuredQaForValidation,
} from '@/lib/unified-pitch/structured-qa'
import { normalizePitchText, capSectionsForCombinedPitch } from '@/lib/unified-pitch/text-utils'
import { extractDeckTextFromFile, validateDeckFile } from '@/lib/unified-pitch/extract-deck-text'
import {
  transcribeVideoFromBuffer,
  validateUnifiedVideoFile,
} from '@/lib/unified-pitch/transcribe-video-file'
import { mergePitchAnalysesForMatching } from '@/lib/unified-pitch/merge-pitch-analysis'
import { buildUnifiedFounderContext } from '@/lib/unified-pitch/unified-founder-context'
import { reviewerAssignableWhere } from '@/lib/reviewer-filters'
import { analyzeFounderNotFoundResponse, analyzeUnauthorizedResponse } from '@/lib/analyze-routes/responses'
import {
  upsertFounderAnalysisSummary,
  ventureNameOverrideFromFormData,
} from '@/lib/analysis/upsert-founder-analysis-summary'
import { adaptRankedInvestorForApi } from '@/lib/pipelines/adapt-ranked-investor-for-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isFile(f: unknown): f is File {
  return typeof f === 'object' && f !== null && 'size' in f && typeof (f as File).size === 'number'
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request, {
    ...RATE_LIMITS.AI_ANALYSIS,
    identifier: 'analyze-unified-pitch',
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const user = await getUserForAiAnalysis(request)
    if (!user) {
      return analyzeUnauthorizedResponse()
    }

    const sessionEmail = user.email.toLowerCase().trim()
    const founder = await db.founder.findUnique({ where: { email: sessionEmail } }).catch(() => null)
    if (!founder) {
      return analyzeFounderNotFoundResponse({ redirectTo: '/founder/onboarding' })
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid Request', message: 'Could not parse form data.' }, { status: 400 })
    }

    const qaRaw = (formData.get('qa') as string) || ''
    const qaAnswers = parseStructuredQaJson(qaRaw)
    const narrativeRaw = typeof formData.get('narrative') === 'string' ? (formData.get('narrative') as string) : ''
    const narrativeNorm = normalizePitchText(narrativeRaw)
    const deckInput = formData.get('deck')
    const videoInput = formData.get('video')
    const deckFile = isFile(deckInput) && deckInput.size > 0 ? deckInput : null
    const videoFile = isFile(videoInput) && videoInput.size > 0 ? videoInput : null
    const reviewType = ((formData.get('reviewType') as string) || 'ai') as 'ai' | 'reviewer'
    const reviewerId = (formData.get('reviewerId') as string) || null

    if (!hasAnyStructuredAnswer(qaAnswers) && !deckFile && !videoFile && !narrativeNorm) {
      return NextResponse.json(
        {
          error: 'Nothing to analyze',
          message:
            'Add at least one non-empty structured Q&A answer, a pitch narrative, or a non-empty deck or video file.',
        },
        { status: 400 },
      )
    }

    const creditCost =
      reviewType === 'reviewer' ? CREDIT_COSTS.VIDEO_PITCH.REVIEWER : CREDIT_COSTS.UNIFIED_PITCH

    if (shouldEnforceAiCredits(user.email)) {
      let userCredits = await db.userCredits.findUnique({ where: { userId: user.id } })
      if (!userCredits) {
        userCredits = await db.userCredits.create({
          data: { userId: user.id, credits: 0, isPremium: false },
        })
      }
      if (!userCredits.isPremium && (userCredits.credits ?? 0) < creditCost) {
        return NextResponse.json(
          {
            error: 'Insufficient Credits',
            message: `Unified pitch analysis costs ${creditCost} credits. You have ${userCredits.credits ?? 0} credits.`,
            requiresPayment: true,
            creditCost,
            currentCredits: userCredits.credits ?? 0,
          },
          { status: 402 },
        )
      }
    }

    const warnings: string[] = []
    let savedDeckPath = ''
    let savedVideoPath = ''

    const founderForAi = {
      ...founder,
      sectors: parseJSON<string[]>(founder.sectors || '[]', []),
    }

    const founderContext = await getComprehensiveFounderContext(founder.email)
    const enhancedFounder = { ...founder, ...founderContext, sectors: founderForAi.sectors }

    let deckTextNormalized = ''
    let deckFeatures: Awaited<ReturnType<typeof extractPitchDeckFeatures>> | null = null

    if (deckFile) {
      const dv = validateDeckFile(deckFile)
      if (!dv.valid) {
        warnings.push(`Deck file: ${dv.error || 'invalid'}`)
      } else {
        try {
          const buf = await deckFile.arrayBuffer()
          const buffer = Buffer.from(buf)
          savedDeckPath =
            (await saveFileToDisk(buffer, 'pitch-decks', founder.id, deckFile.name, {
              contentType: deckFile.type || 'application/pdf',
            })) || ''
        } catch (e: unknown) {
          logger.warn('[UNIFIED-PITCH] deck save failed', e)
        }
        try {
          const raw = await extractDeckTextFromFile(deckFile)
          deckTextNormalized = normalizePitchText(raw)
          if (deckTextNormalized.length < 50) {
            warnings.push('Deck: extracted text too short; deck section omitted.')
            deckTextNormalized = ''
          } else {
            try {
              const v = await validatePitchDeck(deckTextNormalized)
              if (!v.isValid) warnings.push(`Deck validation: ${v.reason || 'low confidence'}`)
            } catch {
              warnings.push('Deck validation error (non-fatal).')
            }
            try {
              deckFeatures = await extractPitchDeckFeatures(deckTextNormalized, founderForAi)
            } catch (e: unknown) {
              warnings.push(`Deck AI features failed: ${(e as Error)?.message || 'unknown'}`)
            }
          }
        } catch (e: unknown) {
          warnings.push(`Deck extraction failed: ${(e as Error)?.message || 'unknown'}`)
        }
      }
    }

    let videoTranscriptNormalized = ''
    let videoFeatures: Awaited<ReturnType<typeof analyzeVideoPitch>> | null = null

    if (videoFile) {
      const vv = validateUnifiedVideoFile(videoFile)
      if (!vv.valid) {
        warnings.push(`Video file: ${vv.error || 'invalid'}`)
      } else {
        try {
          const buf = await videoFile.arrayBuffer()
          const buffer = Buffer.from(buf)
          const saveP = saveFileToDisk(buffer, 'videos', founder.id, videoFile.name, {
            contentType: videoFile.type || 'video/mp4',
          }).catch((e: unknown) => {
            logger.warn('[UNIFIED-PITCH] video save failed', e)
            return ''
          })
          const [pathFromSave, tr] = await Promise.all([
            saveP,
            transcribeVideoFromBuffer(buffer, videoFile.name, videoFile.type || 'video/mp4'),
          ])
          savedVideoPath = pathFromSave || ''
          videoTranscriptNormalized = normalizePitchText(tr)
          if (videoTranscriptNormalized.length >= 50) {
            try {
              const v = await validateVideoPitch(videoTranscriptNormalized)
              if (!v.isValid || v.confidence < 30) {
                warnings.push(`Video content validation: ${v.reason || 'low confidence'}`)
              }
            } catch {
              warnings.push('Video validation error (non-fatal).')
            }
            try {
              videoFeatures = await analyzeVideoPitch(videoTranscriptNormalized, enhancedFounder)
            } catch (e: unknown) {
              warnings.push(`Video AI analysis failed: ${(e as Error)?.message || 'unknown'}`)
            }
          } else {
            warnings.push('Video: transcript too short; video section omitted.')
            videoTranscriptNormalized = ''
          }
        } catch (e: unknown) {
          warnings.push(`Video transcription failed: ${(e as Error)?.message || 'unknown'}`)
        }
      }
    }

    if (hasAnyStructuredAnswer(qaAnswers)) {
      const flat = flattenStructuredQaForValidation(qaAnswers)
      try {
        const v = await validatePitchIdea(flat)
        if (!v.isValid) warnings.push(`Q&A validation: ${v.reason || 'did not pass content check'}`)
      } catch {
        warnings.push('Q&A validation error (non-fatal).')
      }
    }

    if (narrativeNorm && !hasAnyStructuredAnswer(qaAnswers)) {
      try {
        const v = await validatePitchIdea(narrativeNorm)
        if (!v.isValid) warnings.push(`Narrative validation: ${v.reason || 'did not pass content check'}`)
      } catch {
        warnings.push('Narrative validation error (non-fatal).')
      }
    }

    const qaBodyBase = formatStructuredQaBody(qaAnswers)
    const qaBody =
      narrativeNorm && qaBodyBase
        ? `${qaBodyBase}\n\nPITCH NARRATIVE:\n${narrativeNorm}`
        : narrativeNorm && !qaBodyBase
          ? `PITCH NARRATIVE:\n${narrativeNorm}`
          : qaBodyBase
    const capped = capSectionsForCombinedPitch({
      qa: qaBody,
      deck: deckTextNormalized,
      video: videoTranscriptNormalized,
    })

    const combinedRawPitch = capped.combined.trim()
    if (combinedRawPitch.length < 50) {
      return NextResponse.json(
        {
          error: 'No usable content',
          message:
            'All sources were empty or failed extraction. Fix uploads, add Q&A or a pitch narrative, and try again.',
          warnings,
        },
        { status: 400 },
      )
    }

    const qaBlock = formatStructuredQaBlock(qaAnswers)
    const narrativeBlock = narrativeNorm ? `PITCH NARRATIVE:\n${narrativeNorm}` : ''
    const reviewerPacketText = [qaBlock, narrativeBlock].filter(Boolean).join('\n\n')
    const reviewerPrefix = reviewerPacketText ? `${reviewerPacketText}\n\n` : ''
    const storageNarrative =
      reviewerPrefix +
      (deckTextNormalized ? `PITCH DECK (excerpt):\n${deckTextNormalized.slice(0, 12000)}\n\n` : '') +
      (videoTranscriptNormalized ? `VIDEO TRANSCRIPT (excerpt):\n${videoTranscriptNormalized.slice(0, 12000)}` : '')

    if (reviewType === 'reviewer') {
      let assignedReviewerId = reviewerId
      if (!assignedReviewerId) {
        const availableReviewer = await (db as any).reviewer.findFirst({
          where: reviewerAssignableWhere(),
          orderBy: [{ averageRating: 'desc' }, { totalReviews: 'asc' }],
        })
        assignedReviewerId = availableReviewer?.id
      }
      if (!assignedReviewerId) {
        return NextResponse.json(
          { error: 'No reviewers available', message: 'Try AI analysis or pick a reviewer later.' },
          { status: 503 },
        )
      }

      const displayName =
        videoFile?.name || deckFile?.name || (hasAnyStructuredAnswer(qaAnswers) ? 'unified-submission' : 'unified-submission')

      const videoPitch = await (db as any).videoPitch.create({
        data: {
          founderId: founder.id,
          fileName: displayName,
          fileUrl: savedVideoPath || savedDeckPath || '',
          fileType: videoFile ? (videoFile.type.split('/')[1] || 'mp4') : 'unified',
          fileSize: videoFile?.size ?? deckFile?.size ?? 0,
          transcript: storageNarrative.slice(0, 1000),
          transcriptText: storageNarrative.slice(0, 50000),
          founderSnapshot: JSON.stringify(buildFounderSnapshot(founder)),
          analysisResult: JSON.stringify({
            pitchType: 'UNIFIED',
            reviewPending: true,
            warnings,
            modalities: {
              qa: hasAnyStructuredAnswer(qaAnswers),
              narrative: !!narrativeNorm,
              deck: !!deckFile && !!deckTextNormalized,
              video: !!videoFile && !!videoTranscriptNormalized,
            },
            savedDeckPath,
            savedVideoPath,
          }),
        },
      })

      const review = await (db as any).videoPitchReview.create({
        data: {
          videoPitchId: videoPitch.id,
          reviewerId: assignedReviewerId,
          status: 'pending',
        },
      })

      if (shouldEnforceAiCredits(user.email)) {
        try {
          await db.userCredits.update({
            where: { userId: user.id },
            data: { credits: { decrement: creditCost } },
          })
        } catch (e) {
          logger.error('[UNIFIED-PITCH] credit deduct failed', e)
        }
      }

      return NextResponse.json({
        success: true,
        reviewId: review.id,
        videoPitchId: videoPitch.id,
        message:
          'Your unified pitch has been submitted for human review. You will receive an email when the review is complete.',
        reviewer: await (db as any).reviewer.findUnique({
          where: { id: assignedReviewerId },
          select: { name: true, acceptedVC: true },
        }),
        warnings,
      })
    }

    const mergedAnalysis = mergePitchAnalysesForMatching({
      videoAnalysis: videoFeatures,
      deckFeatures,
      qaAnswers,
      videoTranscript: videoTranscriptNormalized || null,
    })

    const unifiedCtx = buildUnifiedFounderContext(founderContext ?? (enhancedFounder as any), {
      videoTranscript: videoTranscriptNormalized || null,
      videoAnalysis: videoFeatures,
      deckFeatures,
      qaAnswers,
    })

    const domain = unifiedCtx.sectors?.[0] || 'technology'
    const problem =
      mergedAnalysis.problemStatement ||
      mergedAnalysis.oneLineSummary ||
      combinedRawPitch.slice(0, 300)

    let matchedVCs: any[] = []
    let matchPipelineResult: any = null
    const [matchRes, marketContext] = await Promise.all([
      runMatchingPipeline(
        unifiedCtx,
        mergedAnalysis,
        videoTranscriptNormalized && videoTranscriptNormalized.trim().length > 50
          ? videoTranscriptNormalized.trim()
          : null,
        undefined,
        { rawPitchText: combinedRawPitch },
      ).catch((e: unknown) => {
        logger.error('[UNIFIED-PITCH] matching pipeline', e)
        return null
      }),
      getDeepMarketContextSafe(domain, problem),
    ])

    if (matchRes) {
      matchPipelineResult = matchRes
      matchedVCs = matchRes.rankedInvestors.map((r: any) => adaptRankedInvestorForApi(r as Record<string, unknown>))
    }

    let scoringResult: Awaited<ReturnType<typeof runScoringPipeline>> | null = null
    try {
      scoringResult = await runScoringPipeline(combinedRawPitch, unifiedCtx, marketContext, 'UNIFIED')
      if (scoringResult.passesCompleted?.includes('degraded-error')) {
        warnings.push(
          'AI scoring used a fallback (for example LLM quota, billing, or an unexpected API error). Review narrative scores as approximate.',
        )
      }
    } catch (e) {
      logger.error('[UNIFIED-PITCH] scoring pipeline', e)
      warnings.push(
        'Full AI scoring could not run (market intelligence or scoring setup failed). Other analysis and matches may still appear.',
      )
    }

    const sectorFitMerged: Record<string, number> = {}
    for (const o of [deckFeatures?.sectorFit, videoFeatures?.sectorFit]) {
      if (!o) continue
      for (const [k, v] of Object.entries(o)) {
        const n = Number(v)
        if (!Number.isFinite(n)) continue
        sectorFitMerged[k] = Math.max(sectorFitMerged[k] ?? 0, n)
      }
    }

    const pitchAnalysisDisplay = {
      strengths: [
        ...(videoFeatures?.strengths || []),
        ...(deckFeatures?.strengths || []),
      ].filter((s, i, a) => a.indexOf(s) === i),
      weaknesses: [...(videoFeatures?.weaknesses || []), ...(deckFeatures?.weaknesses || [])].filter(
        (s, i, a) => a.indexOf(s) === i,
      ),
      improvements: [...(videoFeatures?.improvements || []), ...(deckFeatures?.improvements || [])].filter(
        (s, i, a) => a.indexOf(s) === i,
      ),
      positiveFeedback: videoFeatures?.positiveFeedback || [],
      negativeFeedback: videoFeatures?.negativeFeedback || [],
      sectorFit: sectorFitMerged,
      tractionMetrics: mergedAnalysis.tractionMetrics || videoFeatures?.tractionMetrics || deckFeatures?.tractionMetrics,
      marketAnalysis: videoFeatures?.marketAnalysis || deckFeatures?.marketAnalysis,
      teamAnalysis:
        videoFeatures?.teamAnalysis ||
        (qaAnswers.team
          ? { strengths: [qaAnswers.team], gaps: [] as string[] }
          : undefined) ||
        deckFeatures?.teamAnalysis,
      productFit: mergedAnalysis.productFit || videoFeatures?.productFit || deckFeatures?.productFit,
    }

    const videoPitch = await (db as any).videoPitch.create({
      data: {
        founderId: founder.id,
        fileName: videoFile?.name || deckFile?.name || 'unified-submission',
        fileUrl: savedVideoPath || savedDeckPath || '',
        fileType: videoFile ? (videoFile.type.split('/')[1] || 'mp4') : 'unified',
        fileSize: (videoFile?.size ?? 0) + (deckFile?.size ?? 0) || 0,
        transcript: combinedRawPitch.slice(0, 1000),
        transcriptText: combinedRawPitch.slice(0, 50000),
        founderSnapshot: JSON.stringify(buildFounderSnapshot(founder)),
        analysisResult: JSON.stringify({
          pitchType: 'UNIFIED',
          warnings,
          modalities: {
            qa: !!qaBodyBase,
            narrative: !!narrativeNorm,
            deck: !!deckTextNormalized,
            video: !!videoTranscriptNormalized,
          },
          features: mergedAnalysis,
          strengths: pitchAnalysisDisplay.strengths,
          weaknesses: pitchAnalysisDisplay.weaknesses,
          improvements: pitchAnalysisDisplay.improvements,
          positiveFeedback: pitchAnalysisDisplay.positiveFeedback,
          negativeFeedback: pitchAnalysisDisplay.negativeFeedback,
          sectorFit: pitchAnalysisDisplay.sectorFit,
          tractionMetrics: pitchAnalysisDisplay.tractionMetrics,
          marketAnalysis: pitchAnalysisDisplay.marketAnalysis,
          teamAnalysis: pitchAnalysisDisplay.teamAnalysis,
          productFit: pitchAnalysisDisplay.productFit,
          overallScore: scoringResult?.finalScore ?? 0,
          finalScore: scoringResult?.finalScore ?? 0,
          scoreBreakdown: scoringResult?.scoreBreakdown ?? null,
          categoryScores: scoringResult?.categoryScores ?? null,
          pipelineVersion: scoringResult?.pipelineVersion ?? null,
          rubricAnalysis: scoringResult?.rubricCompatible ?? null,
          transcript: combinedRawPitch.slice(0, 5000),
          matches: matchedVCs.slice(0, 20).map((m: any) => ({
            investorId: m.investor.id,
            investor: {
              id: m.investor.id,
              name: m.investor.name,
              firmName: m.investor.firmName,
              fundType: m.investor.fundType,
              stages: parseJSON<string[]>(m.investor.stages || '[]', []),
              sectors: parseJSON<string[]>(m.investor.sectors || '[]', []),
              checkMin: m.investor.checkMin || m.investor.checkSizeMin,
              checkMax: m.investor.checkMax || m.investor.checkSizeMax,
              thesis: m.investor.thesis,
              applicationUrl: m.investor.applicationUrl,
              websiteUrl: m.investor.websiteUrl,
              valueAddTags: parseJSON<string[]>(m.investor.valueAddTags || '[]', []),
            },
            score: Math.round(m.combinedScore || m.score || 0),
            confidence: m.confidence || 85,
            reasons: m.reasons || [],
            suggestions: m.suggestions || [],
            livePulse: m.livePulse
              ? { summary: m.livePulse.summary, signalStrength: m.livePulse.signalStrength ?? 0 }
              : null,
          })),
          matchedVCs: matchedVCs.slice(0, 10).map((m: any) => ({
            investorId: m.investor.id,
            firmName: m.investor.firmName,
            score: Math.round(m.combinedScore || m.score || 0),
            reasons: m.reasons,
          })),
          universityPrograms: matchPipelineResult?.universityPrograms ?? [],
          nichePrograms: matchPipelineResult?.nichePrograms ?? [],
          savedDeckPath,
          savedVideoPath,
        }),
        smartMatchResults: JSON.stringify(matchedVCs.slice(0, 10)),
      },
    })

    const ventureNameOverride = ventureNameOverrideFromFormData(formData)
    upsertFounderAnalysisSummary(
      founder.id,
      {
        strengths: pitchAnalysisDisplay.strengths,
        weaknesses: pitchAnalysisDisplay.weaknesses,
        sectorFit: pitchAnalysisDisplay.sectorFit as Record<string, number> | undefined,
        tractionMetrics: pitchAnalysisDisplay.tractionMetrics as any,
        marketAnalysis: pitchAnalysisDisplay.marketAnalysis as any,
        teamAnalysis: pitchAnalysisDisplay.teamAnalysis as any,
        productFit: pitchAnalysisDisplay.productFit as any,
      },
      scoringResult,
      'UNIFIED',
      videoPitch.id,
      ventureNameOverride ? { ventureNameOverride } : undefined,
    ).catch(e => logger.error('[UNIFIED-PITCH] upsertFounderAnalysisSummary failed', e))

    if (shouldEnforceAiCredits(user.email)) {
      try {
        await db.userCredits.update({
          where: { userId: user.id },
          data: { credits: { decrement: creditCost } },
        })
      } catch (e) {
        logger.error('[UNIFIED-PITCH] credit deduct failed', e)
      }
    }

    return NextResponse.json({
      success: true,
      videoPitchId: videoPitch.id,
      warnings,
      analysis: {
        overallScore: scoringResult?.finalScore ?? 0,
        finalScore: scoringResult?.finalScore ?? 0,
        scoreBreakdown: scoringResult?.scoreBreakdown ?? null,
        categoryScores: scoringResult?.categoryScores ?? null,
        strengths: pitchAnalysisDisplay.strengths,
        weaknesses: pitchAnalysisDisplay.weaknesses,
        improvements: pitchAnalysisDisplay.improvements,
        positiveFeedback: pitchAnalysisDisplay.positiveFeedback,
        negativeFeedback: pitchAnalysisDisplay.negativeFeedback,
        matchedVCs: matchedVCs.slice(0, 20).map((m: any) => ({
          investorId: m.investor.id,
          firmName: m.investor.firmName,
          score: m.combinedScore || m.score || 0,
          intelligentScore: m.intelligentScore || m.score || 0,
          vectorSimilarity: m.vectorSimilarity || 0,
          similarity: m.vectorSimilarity || 0,
          reasons: m.reasons || [],
          whyApply: m.whyApply || '',
          bestApproach: m.bestApproach || '',
          timing: m.timing || '',
          detailedReasons: m.detailedReasons || [],
          investor: {
            id: m.investor.id,
            firmName: m.investor.firmName,
            fundType: m.investor.fundType,
            sectors: parseJSON<string[]>(m.investor.sectors || '[]', []),
            stages: parseJSON<string[]>(m.investor.stages || '[]', []),
            geography: parseJSON<string[]>(m.investor.geography || '[]', []),
            thesis: m.investor.thesis || '',
            checkSizeMin: m.investor.checkSizeMin,
            checkSizeMax: m.investor.checkSizeMax,
          },
        })),
        topVCRecommendations: matchedVCs.slice(0, 5).map((m: any) => ({
          investorId: m.investor.id,
          firmName: m.investor.firmName,
          score: m.combinedScore || m.score || 0,
          whyApply: m.whyApply || '',
          bestApproach: m.bestApproach || '',
          timing: m.timing || '',
        })),
        sectorFit: pitchAnalysisDisplay.sectorFit,
        tractionMetrics: pitchAnalysisDisplay.tractionMetrics,
        marketAnalysis: pitchAnalysisDisplay.marketAnalysis,
        teamAnalysis: pitchAnalysisDisplay.teamAnalysis,
        productFit: pitchAnalysisDisplay.productFit,
        transcript: combinedRawPitch.slice(0, 5000),
        rubricAnalysis: scoringResult?.rubricCompatible ?? null,
      },
      universityPrograms: matchPipelineResult?.universityPrograms ?? [],
      nichePrograms: matchPipelineResult?.nichePrograms ?? [],
      pipelineVersion: matchPipelineResult?.pipelineVersion ?? '3.0',
      matchingDurationMs: matchPipelineResult?.durationMs ?? 0,
      matchingError: matchPipelineResult === null,
    })
  } catch (error: unknown) {
    logger.error('[UNIFIED-PITCH]', error)
    return NextResponse.json(
      { error: 'Failed to analyze unified pitch', message: (error as Error)?.message || 'Please try again.' },
      { status: 500 },
    )
  }
}
