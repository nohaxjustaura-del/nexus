'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Sparkles, TrendingUp, AlertCircle, CheckCircle, Lightbulb, Target, ExternalLink, Video, Play, Crown, User, Star, FileVideo } from "lucide-react"
import Link from "next/link"
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard'
import { resolveRubricForDashboard } from '@/lib/analysis/is-safe-rubric-for-dashboard'
import { toast } from '@/components/ui/toast-simple'
import { appendVentureNameToAnalysisFormData } from '@/lib/client/analysis-venture-name'

export function VideoPitchAnalysisTab() {
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState<{ credits: number; isPremium: boolean } | null>(null)
  const [topMatchesUnlocked, setTopMatchesUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [reviewType, setReviewType] = useState<'ai' | 'reviewer'>('ai')
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null)
  const [reviewers, setReviewers] = useState<any[]>([])
  const [requestingFeedback, setRequestingFeedback] = useState(false)
  const [videoTranscript, setVideoTranscript] = useState<string>('')
  const VIDEO_AI_CREDIT_COST = 50
  const VIDEO_REVIEWER_CREDIT_COST = 100

  useEffect(() => {
    // Load credits on mount
    fetch('/api/user/credits', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setCredits(data)
        // Always clear errors when credits load successfully
        setError(null)
      })
      .catch(err => console.error('Error loading credits:', err))
    
    // Load reviewers if reviewer type is selected
    if (reviewType === 'reviewer') {
      fetch('/api/reviewers')
        .then(res => res.json())
        .then(data => setReviewers(data.reviewers || []))
        .catch(err => console.error('Failed to fetch reviewers:', err))
    }
  }, [reviewType])
  
  // Auto-clear insufficient credits errors when credits change
  useEffect(() => {
    if (credits && error && error.includes('Insufficient credits')) {
      setError(null)
    }
  }, [credits])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime']
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a valid video file (MP4, MOV, or WebM)')
        return
      }
      
      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024
      if (selectedFile.size > maxSize) {
        setError('File size must be less than 500MB')
        return
      }
      
      setFile(selectedFile)
      setError(null)
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(selectedFile)
      setVideoPreview(previewUrl)
    }
  }

  const handleRemoveFile = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
    }
    setFile(null)
    setVideoPreview(null)
    setError(null)
  }

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload a video pitch first')
      return
    }
    
    const currentCreditCost = reviewType === 'ai' ? VIDEO_AI_CREDIT_COST : VIDEO_REVIEWER_CREDIT_COST
    
    // Wait for credits to load if they haven't yet
    if (!credits) {
      setError('Loading your credits... Please wait a moment and try again.')
      return
    }
    
    // Check if user has enough credits (skip check if premium)
    if (!credits.isPremium && (credits.credits ?? 0) < currentCreditCost) {
      setError(`Insufficient credits. ${reviewType === 'ai' ? 'Standard' : 'Reviewer'} video pitch analysis costs ${currentCreditCost} credits. You have ${credits.credits ?? 0} credits. Please purchase credits or upgrade to premium.`)
      return
    }
    
    setAnalyzing(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('reviewType', reviewType)
      if (reviewType === 'reviewer' && selectedReviewer) {
        formData.append('reviewerId', selectedReviewer)
      }
      await appendVentureNameToAnalysisFormData(formData)

      const response = await fetch('/api/analyze-video-pitch', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 500))
        throw new Error(`Server error: Received ${contentType || 'unknown'} instead of JSON.`)
      }

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          // Insufficient credits
          setError(data.error || 'Insufficient credits. Please purchase credits or upgrade to premium.')
          // Reload credits
          const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json()
            setCredits(creditsData)
          }
          setAnalyzing(false)
          return
        }
        
        // Check if profile is incomplete - redirect to onboarding
        if (response.status === 404 && (data.error?.includes('profile') || data.error?.includes('onboarding') || data.redirectTo)) {
          console.log('[VIDEO-PITCH] Profile incomplete, redirecting to onboarding...')
          const redirectUrl = data.redirectTo || '/founder/onboarding'
          window.location.replace(redirectUrl)
          return
        }
        
        throw new Error(data.error || data.message || 'Failed to analyze video pitch')
      }

      // SUCCESS - Display results immediately
      console.log('[VIDEO-PITCH] Analysis successful, displaying results...')
      
      setResult({
        ...data.analysis,
        videoPitchId: data.videoPitchId,
        universityPrograms: Array.isArray(data.universityPrograms) ? data.universityPrograms : (data.analysis?.universityPrograms ?? []),
        nichePrograms: Array.isArray(data.nichePrograms) ? data.nichePrograms : (data.analysis?.nichePrograms ?? []),
      })
      setAnalyzing(false)
      
      // Reload credits after successful analysis
      const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
      if (creditsRes.ok) {
        const creditsData = await creditsRes.json()
        setCredits(creditsData)
      }
      
      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('analysis-results')
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } catch (err) {
      console.error('[VIDEO-PITCH] Analysis error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze video pitch. Please try again.'
      setError(errorMessage)
      setAnalyzing(false)
    }
  }

  const handleUnlockTopMatches = async () => {
    setUnlocking(true)
    try {
      const response = await fetch('/api/user/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'unlock_top_matches' }),
      })

      const data = await response.json()

      if (response.ok && data.unlocked) {
        setTopMatchesUnlocked(true)
        const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
        if (creditsRes.ok) {
          const creditsData = await creditsRes.json()
          setCredits(creditsData)
        }
      } else if (response.status === 402) {
        toast.error('You need credits or premium to unlock top matches. Please purchase credits or upgrade to premium.')
      } else {
        toast.error(data.error || 'Failed to unlock top matches')
      }
    } catch (err) {
      console.error('Error unlocking matches:', err)
      toast.error('Failed to unlock top matches')
    } finally {
      setUnlocking(false)
    }
  }


  return (
    <div className="space-y-6">
      <Card className="border-border shadow-none">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-lg">Video pitch</CardTitle>
          <CardDescription>
            MP4, MOV, or WebM · up to 500MB · about 2–10 minutes works best
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
        {!file ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
            <Video className="mb-3 h-10 w-10 text-muted-foreground/70" />
            <Label htmlFor="video-upload" className="cursor-pointer">
              <span className="text-sm font-medium text-primary hover:underline">
                Choose video
              </span>
              <span className="text-sm text-muted-foreground"> or drop it here</span>
            </Label>
            <Input
              id="video-upload"
              type="file"
              accept="video/mp4,video/mov,video/webm,video/quicktime"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {videoPreview && (
              <div className="relative overflow-hidden rounded-lg border border-border bg-black">
                <video 
                  src={videoPreview} 
                  controls 
                  className="w-full"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            )}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <FileVideo className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={analyzing}
                >
                  Remove
                </Button>
              </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mr-2 inline h-4 w-4 align-text-bottom" />
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">Review type</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setReviewType('ai')}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                reviewType === 'ai'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">AI analysis</span>
                <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                  {VIDEO_AI_CREDIT_COST} cr
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Instant scores and VC matches</p>
            </button>
            <button
              type="button"
              onClick={() => setReviewType('reviewer')}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                reviewType === 'reviewer'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Human reviewer</span>
                <Badge variant="secondary" className="shrink-0 text-xs font-normal">
                  {VIDEO_REVIEWER_CREDIT_COST} cr
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Founders vetted by top programs · ~2–3 days</p>
            </button>
          </div>
        </div>

          {reviewType === 'reviewer' && reviewers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Reviewer (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Skip to let us assign the best available reviewer.
              </p>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                {reviewers.map((reviewer) => (
                  <button
                    key={reviewer.id}
                    type="button"
                    onClick={() => setSelectedReviewer(selectedReviewer === reviewer.id ? null : reviewer.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                      selectedReviewer === reviewer.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{reviewer.name}</span>
                    </span>
                    {reviewer.averageRating > 0 && (
                      <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {reviewer.averageRating.toFixed(1)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {credits ? (
              <>
                This run:{' '}
                <span className="font-medium text-foreground">
                  {reviewType === 'ai' ? VIDEO_AI_CREDIT_COST : VIDEO_REVIEWER_CREDIT_COST}
                </span>
                {' · '}
                Balance:{' '}
                <span className="font-medium text-foreground">{credits.credits ?? 0}</span>
                {credits.isPremium && (
                  <Badge variant="secondary" className="ml-2 align-middle text-xs">
                    Premium
                  </Badge>
                )}
              </>
            ) : (
              'Loading balance…'
            )}
          </p>
          {credits &&
            (!credits.isPremium &&
              (credits.credits ?? 0) <
                (reviewType === 'ai' ? VIDEO_AI_CREDIT_COST : VIDEO_REVIEWER_CREDIT_COST)) && (
              <Link href="/pricing" className="shrink-0">
                <Button variant="outline" size="sm">
                  Add credits
                </Button>
              </Link>
            )}
        </div>

        {file && (
          <Button 
            onClick={handleAnalyze} 
            disabled={
              analyzing ||
              !credits ||
              (!credits.isPremium &&
                (credits.credits ?? 0) <
                  (reviewType === 'ai' ? VIDEO_AI_CREDIT_COST : VIDEO_REVIEWER_CREDIT_COST))
            }
            className="w-full"
            size="lg"
          >
            {analyzing ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : !credits ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Analyze video
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>

    {/* Results Display */}
    {result && (() => {
      const resolvedRubric = resolveRubricForDashboard(result as Record<string, unknown>)
      return (
      <div id="analysis-results" className="mx-auto max-w-6xl w-full space-y-6">
            {/* Rubric Analysis Dashboard */}
            {resolvedRubric ? (
              <AnalysisDashboard result={resolvedRubric} finalScore={result.finalScore ?? result.overallScore} />
            ) : (
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                      <div className="text-sm text-muted-foreground mb-1">Overall Score</div>
                      <div className="text-3xl font-bold text-primary">{result.overallScore || 0}/100</div>
                      <div className="text-xs text-muted-foreground mt-1">Combined presentation & content</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200">
                      <div className="text-sm text-muted-foreground mb-1">Presentation Score</div>
                      <div className="text-3xl font-bold text-blue-600">{result.presentationScore || 0}/100</div>
                      <div className="text-xs text-muted-foreground mt-1">Delivery, clarity, engagement</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200">
                      <div className="text-sm text-muted-foreground mb-1">Content Score</div>
                      <div className="text-3xl font-bold text-green-600">{result.contentScore || 0}/100</div>
                      <div className="text-xs text-muted-foreground mt-1">Substance, metrics, market fit</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Detailed Feedback (only when rubric is not available) */}
            {!resolvedRubric && (
            <Card className="border-2 border-primary/20">
              <CardContent className="space-y-6 pt-6">

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-green-200 bg-green-50/50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {(result.strengths || []).map((strength: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-lg border border-orange-200 bg-orange-50/50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {(result.weaknesses || []).map((weakness: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-orange-600 mt-0.5">•</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Improvements */}
            {result.improvements && result.improvements.length > 0 && (
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  Actionable Suggestions
                </h3>
                <ul className="space-y-2">
                  {result.improvements.map((improvement: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">→</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

              </CardContent>
            </Card>
            )}

            {/* Top VC Recommendations */}
            {result.topVCRecommendations && result.topVCRecommendations.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Top VC Recommendations
                </h3>
                <div className="grid gap-4">
                  {result.topVCRecommendations.map((vc: any, i: number) => (
                    <Card key={i} className="border-2 hover:border-primary/40 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg">{vc.firmName}</h4>
                              <Badge variant={vc.priority === 'elite' ? 'default' : 'secondary'}>
                                {vc.scoreSymbol} {vc.score}/100
                              </Badge>
                              {vc.priority === 'elite' && <Crown className="h-4 w-4 text-yellow-500" />}
                              {vc.livePulse && vc.livePulse.signalStrength > 1 && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Live
                                </span>
                              )}
                              {vc.livePulse && vc.livePulse.signalStrength <= 1 && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                  Potentially Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{vc.scoreMeaning}</p>
                            <p className="text-sm mb-2">{vc.whyApply}</p>
                            {vc.livePulse && (
                              <div className="mt-3 p-3 rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/60 space-y-1.5">
                                <h5 className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                                  <TrendingUp className="h-3 w-3" />
                                  Live VC Intelligence
                                </h5>
                                {vc.livePulse.summary?.recentPortfolio && (
                                  <p className="text-xs text-muted-foreground">{vc.livePulse.summary.recentPortfolio}</p>
                                )}
                                {vc.livePulse.summary?.currentHeat && (
                                  <p className="text-xs text-muted-foreground">{vc.livePulse.summary.currentHeat}</p>
                                )}
                                {vc.livePulse.summary?.founderAlignment && (
                                  <p className="text-xs text-muted-foreground">{vc.livePulse.summary.founderAlignment}</p>
                                )}
                                {!vc.livePulse.summary?.recentPortfolio && !vc.livePulse.summary?.currentHeat && !vc.livePulse.summary?.founderAlignment && (
                                  <p className="text-xs text-muted-foreground">Enrichment data unavailable for this investor.</p>
                                )}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground space-y-1 mt-2">
                              <div><strong>Best Approach:</strong> {vc.bestApproach}</div>
                              <div><strong>Timing:</strong> {vc.timing}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* All Matched VCs */}
            {result.matchedVCs && result.matchedVCs.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  All Matched VCs ({result.matchedVCs.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.matchedVCs.map((vc: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{vc.firmName}</span>
                            <Badge variant="outline" className="text-xs">
                              {vc.scoreSymbol} {vc.score}
                            </Badge>
                            {vc.livePulse && vc.livePulse.signalStrength > 1 && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                              </span>
                            )}
                            {vc.livePulse && vc.livePulse.signalStrength <= 1 && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                                Potentially Inactive
                              </span>
                            )}
                            {vc.scoreBreakdown && (
                              <span className="text-xs text-muted-foreground">
                                (Intelligent: {vc.intelligentScore}, Vector: {(vc.vectorSimilarity * 100).toFixed(0)}%)
                              </span>
                            )}
                          </div>
                          {vc.whyApply && (
                            <p className="text-xs text-muted-foreground mt-1">{vc.whyApply}</p>
                          )}
                          {vc.livePulse && (
                            <div className="mt-2 p-2 rounded bg-indigo-50/70 border border-indigo-100 space-y-0.5">
                              {vc.livePulse.summary?.recentPortfolio && (
                                <p className="text-xs text-muted-foreground">{vc.livePulse.summary.recentPortfolio}</p>
                              )}
                              {vc.livePulse.summary?.currentHeat && (
                                <p className="text-xs text-muted-foreground">{vc.livePulse.summary.currentHeat}</p>
                              )}
                              {vc.livePulse.summary?.founderAlignment && (
                                <p className="text-xs text-muted-foreground">{vc.livePulse.summary.founderAlignment}</p>
                              )}
                              {!vc.livePulse.summary?.recentPortfolio && !vc.livePulse.summary?.currentHeat && !vc.livePulse.summary?.founderAlignment && (
                                <p className="text-xs text-muted-foreground/80">Enrichment data unavailable.</p>
                              )}
                            </div>
                          )}
                        </div>
                        <Link href={`/founder/discover?vc=${vc.investorId}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved report — same screen as post-run, with section scores and matches */}
            <div className="pt-4 border-t">
              <Link
                href={
                  result.videoPitchId
                    ? `/founder/analyses/${result.videoPitchId}`
                    : '/founder/my-analyses'
                }
              >
                <Button variant="outline" className="w-full">
                  View full analysis
                </Button>
              </Link>
            </div>
      </div>
      )
    })()}
    </div>
  )
}

// Pitch Idea Analysis Component
