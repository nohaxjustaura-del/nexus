'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Sparkles, TrendingUp, AlertCircle, CheckCircle, Lightbulb, Target, ExternalLink, Video, Play, Crown, User, Star, FileVideo } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import SmartMatchResults from '@/components/smart-match-results'
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard'

export function VideoPitchAnalysisTab() {
  const router = useRouter()
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
      setError(`Insufficient credits. ${reviewType === 'ai' ? 'AI' : 'Reviewer'} video pitch analysis costs ${currentCreditCost} credits. You have ${credits.credits ?? 0} credits. Please purchase credits or upgrade to premium.`)
      return
    }
    
    if (reviewType === 'reviewer' && !selectedReviewer) {
      setError('Please select a reviewer')
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
      
      // Store both analysis and videoPitchId
      setResult({
        ...data.analysis,
        videoPitchId: data.videoPitchId,
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
        alert('You need credits or premium to unlock top matches. Please purchase credits or upgrade to premium.')
      } else {
        alert(data.error || 'Failed to unlock top matches')
      }
    } catch (err) {
      console.error('Error unlocking matches:', err)
      alert('Failed to unlock top matches')
    } finally {
      setUnlocking(false)
    }
  }


  return (
    <div className="space-y-6">
      {/* Explanation Section */}
      <Card className="mx-auto max-w-4xl w-full border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            How Video Pitch Analysis Works
          </CardTitle>
          <CardDescription className="text-base">
            Get AI-powered insights tailored to your video pitch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Perfect VC Matches</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Our AI analyzes your video pitch and finds VCs that are the perfect fit for your presentation style, content, and startup profile.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Tailored Recommendations</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Get personalized suggestions on what to improve in your video pitch and how to better present your startup to each VC.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Actionable Insights</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Understand your presentation strengths, identify areas for improvement, and learn exactly what each VC looks for in video pitches.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-4xl w-full">
        <CardHeader>
          <CardTitle>Upload Your Video Pitch</CardTitle>
          <CardDescription>
            MP4, MOV, or WebM • Max 500MB • 2-10 minutes recommended
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {!file ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <Video className="mb-4 h-12 w-12 text-muted-foreground" />
            <Label htmlFor="video-upload" className="cursor-pointer">
              <span className="text-sm font-medium text-primary hover:underline">
                Click to upload video
              </span>
              <span className="text-sm text-muted-foreground"> or drag and drop</span>
            </Label>
            <Input
              id="video-upload"
              type="file"
              accept="video/mp4,video/mov,video/webm,video/quicktime"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="mt-4 text-sm text-muted-foreground">
              MP4, MOV, or WebM format • Up to 500MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {videoPreview && (
              <div className="relative rounded-lg border-2 border-border overflow-hidden bg-black">
                <video 
                  src={videoPreview} 
                  controls 
                  className="w-full"
                  style={{ maxHeight: '400px' }}
                />
              </div>
            )}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <FileVideo className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {error}
          </div>
        )}

        {/* Review Type Selection */}
        <div className="rounded-lg border-2 border-slate-200 bg-white p-6">
          <Label className="text-base font-semibold mb-4 block">Choose Review Type</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <div
              onClick={() => setReviewType('ai')}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                reviewType === 'ai'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${reviewType === 'ai' ? 'bg-primary/10' : 'bg-slate-100'}`}>
                  <Sparkles className={`h-5 w-5 ${reviewType === 'ai' ? 'text-primary' : 'text-slate-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">AI Analysis</h3>
                    <Badge variant="secondary" className="text-xs">50 credits</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Instant AI-powered analysis with compatibility scores
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Instant results
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      VC matching & scores
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Improvement suggestions
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div
              onClick={() => setReviewType('reviewer')}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                reviewType === 'reviewer'
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${reviewType === 'reviewer' ? 'bg-primary/10' : 'bg-slate-100'}`}>
                  <User className={`h-5 w-5 ${reviewType === 'reviewer' ? 'text-primary' : 'text-slate-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">VC-Accepted Reviewer</h3>
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">100 credits</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Get reviewed by founders accepted to top VCs/accelerators
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Human expert feedback
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Personalized VC recommendations
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      2-3 day turnaround
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Reviewer Selection (if reviewer type selected) */}
          {reviewType === 'reviewer' && reviewers.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Label className="text-sm font-medium mb-2 block">Select Reviewer (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Leave blank to be matched with the best available reviewer
              </p>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {reviewers.map((reviewer) => (
                  <div
                    key={reviewer.id}
                    onClick={() => setSelectedReviewer(selectedReviewer === reviewer.id ? null : reviewer.id)}
                    className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                      selectedReviewer === reviewer.id
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{reviewer.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {reviewer.acceptedVC} • {reviewer.acceptedYear}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {reviewer.averageRating > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{reviewer.averageRating.toFixed(1)}</span>
                          </div>
                        )}
                        {selectedReviewer === reviewer.id && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Credit Cost Section */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {reviewType === 'ai' ? 'AI Video Pitch Analysis' : 'VC-Accepted Reviewer Review'}
              </div>
              <div className="text-muted-foreground">
                Cost: {reviewType === 'ai' ? VIDEO_AI_CREDIT_COST : VIDEO_REVIEWER_CREDIT_COST} credits
                {reviewType === 'reviewer' && ' • 2-3 day turnaround'}
                {credits && (
                  <span className="ml-2">
                    • You have: <span className="font-semibold text-slate-900">{credits.credits ?? 0}</span> credits
                    {credits.isPremium && <Badge variant="secondary" className="ml-2 text-xs">Premium</Badge>}
                  </span>
                )}
              </div>
            </div>
            {credits && (!credits.isPremium && (credits.credits ?? 0) < (reviewType === 'ai' ? VIDEO_AI_CREDIT_COST : VIDEO_REVIEWER_CREDIT_COST)) && (
              <Link href="/pricing">
                <Button variant="outline" size="sm">
                  Buy Credits
                </Button>
              </Link>
            )}
          </div>
        </div>

        {file && (
          <Button 
            onClick={handleAnalyze} 
            disabled={analyzing || !credits || (!credits.isPremium && (credits.credits ?? 0) < (reviewType === 'ai' ? VIDEO_AI_CREDIT_COST : VIDEO_REVIEWER_CREDIT_COST)) || (reviewType === 'reviewer' && !selectedReviewer)}
            className="w-full"
            size="lg"
          >
            {analyzing ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Video Pitch...
              </>
            ) : !credits ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Loading credits...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Analyze Video Pitch
              </>
            )}
          </Button>
        )}

        <div className="rounded-lg border bg-muted/50 p-6">
          <h3 className="mb-2 font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            What You'll Get
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Presentation score (delivery, clarity, engagement)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Content score (substance, metrics, market fit)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Top VC recommendations with application strategies</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Best approach for each VC (warm intro, cold email, timing)</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>

    {/* Results Display */}
    {result && (
      <div id="analysis-results" className="mx-auto max-w-6xl w-full space-y-6">
            {/* Rubric Analysis Dashboard */}
            {result.rubricAnalysis ? (
              <AnalysisDashboard result={result.rubricAnalysis} />
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
            {!result.rubricAnalysis && (
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
                                  <p className="text-xs text-slate-700">{vc.livePulse.summary.recentPortfolio}</p>
                                )}
                                {vc.livePulse.summary?.currentHeat && (
                                  <p className="text-xs text-slate-700">{vc.livePulse.summary.currentHeat}</p>
                                )}
                                {vc.livePulse.summary?.founderAlignment && (
                                  <p className="text-xs text-slate-700">{vc.livePulse.summary.founderAlignment}</p>
                                )}
                                {!vc.livePulse.summary?.recentPortfolio && !vc.livePulse.summary?.currentHeat && !vc.livePulse.summary?.founderAlignment && (
                                  <p className="text-xs text-slate-600">Enrichment data unavailable for this investor.</p>
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
                    <div key={i} className="p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors">
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
                                <p className="text-xs text-slate-600">{vc.livePulse.summary.recentPortfolio}</p>
                              )}
                              {vc.livePulse.summary?.currentHeat && (
                                <p className="text-xs text-slate-600">{vc.livePulse.summary.currentHeat}</p>
                              )}
                              {vc.livePulse.summary?.founderAlignment && (
                                <p className="text-xs text-slate-600">{vc.livePulse.summary.founderAlignment}</p>
                              )}
                              {!vc.livePulse.summary?.recentPortfolio && !vc.livePulse.summary?.currentHeat && !vc.livePulse.summary?.founderAlignment && (
                                <p className="text-xs text-slate-500">Enrichment data unavailable.</p>
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

            {/* View Full Analysis Link */}
            <div className="pt-4 border-t">
              <Link href={`/founder/my-analyses${result.videoPitchId ? `?video=${result.videoPitchId}` : ''}`}>
                <Button variant="outline" className="w-full">
                  View Full Analysis & Save Results
                </Button>
              </Link>
            </div>
      </div>
    )}
    </div>
  )
}

// Pitch Idea Analysis Component
