'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Upload, 
  Sparkles, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Lightbulb,
  ExternalLink,
  Star,
  Crown,
  FileText
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from '@/components/ui/toast-simple'

export function PitchDeckAnalysisTab() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState<{ credits: number; isPremium: boolean } | null>(null)
  const [unlocking, setUnlocking] = useState(false)
  const [topMatchesUnlocked, setTopMatchesUnlocked] = useState(false)
  const [requestingFeedback, setRequestingFeedback] = useState(false)
  const [pitchDeckText, setPitchDeckText] = useState<string>('')
  const PITCH_DECK_CREDIT_COST = 50

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
  }, [])
  
  // Auto-clear insufficient credits errors when credits change
  useEffect(() => {
    if (credits && error && error.includes('Insufficient credits')) {
      setError(null)
    }
  }, [credits])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      // Clear any previous errors when a new file is selected
      setError(null)
    }
  }

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload a pitch deck first')
      return
    }
    
    // Wait for credits to load if they haven't yet
    if (!credits) {
      setError('Loading your credits... Please wait a moment and try again.')
      return
    }
    
    // Check if user has enough credits (skip check if premium)
    if (!credits.isPremium && (credits.credits ?? 0) < PITCH_DECK_CREDIT_COST) {
      setError(`Insufficient credits. Pitch deck analysis costs ${PITCH_DECK_CREDIT_COST} credits. You have ${credits.credits ?? 0} credits. Please purchase credits or upgrade to premium.`)
      return
    }
    
    setAnalyzing(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/analyze-pitch-deck', {
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
        throw new Error(data.error || data.message || 'Failed to analyze pitch deck')
      }

      setResult(data)
      
      // Load credits after analysis
      try {
        const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
        if (creditsRes.ok) {
          const creditsData = await creditsRes.json()
          setCredits(creditsData)
        }
      } catch (err) {
        console.error('Error loading credits:', err)
      }

      // SUCCESS - Immediately redirect to results page (replace to prevent back navigation)
      window.location.replace('/founder/my-analyses')
      return // Exit immediately
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze pitch deck. Please try again.')
    } finally {
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

  if (result) {
    const analysis = result.analysis || {}
    const matches = result.matches || []
    const fellowships = result.fellowships || result.analysis?.fellowshipRecommendations || []
    
    // Extract niche signals
    const isStudent = analysis.isStudent || result.founderData?.isStudent
    const isTechnical = analysis.isTechnical || result.founderData?.isTechnical
    const isUnderrepresented = result.founderData?.isUnderrepresented
    const hasTraction = analysis.hasTraction || result.founderData?.hasTraction
    
    return (
      <div className="space-y-6">
        {/* Analysis Complete Header */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Analysis Complete
                </CardTitle>
                <CardDescription className="mt-2">
                  Your pitch deck has been analyzed against {matches.length} VCs
                </CardDescription>
              </div>
              <Button onClick={() => setResult(null)} variant="outline">
                Analyze Another
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Founder Feedback CTA */}
        {!result.founderFeedback && (
          <Card className="border-2 border-purple-200 bg-purple-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Get Feedback from YC-Funded Founders</h3>
                  <p className="text-sm text-muted-foreground mb-1">Get personalized feedback from Inigo & William (YC-backed founders)</p>
                  <p className="text-xs text-muted-foreground/85">Improve your score and get actionable advice from real investors</p>
                </div>
                <Button 
                  onClick={async () => {
                    setRequestingFeedback(true)
                    try {
                      const response = await fetch('/api/founder-feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          analysisId: result.id,
                          pitchDeckText: pitchDeckText || result.pitchDeckText || ''
                        }),
                        credentials: 'include',
                      })
                      const data = await response.json()
                      if (!response.ok) {
                        if (response.status === 402) {
                          toast.error('Insufficient credits. Founder feedback costs 200 credits.')
                          return
                        }
                        throw new Error(data.error || 'Failed to get founder feedback')
                      }
                      setResult({ ...result, founderFeedback: data.feedback })
                      const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
                      if (creditsRes.ok) {
                        const creditsData = await creditsRes.json()
                        setCredits(creditsData)
                      }
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to get founder feedback')
                    } finally {
                      setRequestingFeedback(false)
                    }
                  }}
                  disabled={requestingFeedback || !credits || (!credits.isPremium && (credits.credits ?? 0) < 200)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  {requestingFeedback ? 'Requesting...' : 'Get Feedback (200 credits)'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Founder Feedback Results */}
        {result.founderFeedback && (
          <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                Feedback from YC-Funded Founders
              </CardTitle>
              <CardDescription>Personalized advice from Inigo & William</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-muted-foreground">{result.founderFeedback}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Niche Matching Badge */}
        {(isStudent || isTechnical || isUnderrepresented) && (
          <Card className="border-2 border-purple-200 bg-purple-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-purple-900">Niche Match:</span>
                {isStudent && (
                  <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                    🎓 Student Founder → Matched with Student VCs (Dorm Room Fund, 1517 Fund, Neo)
                  </Badge>
                )}
                {isTechnical && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                    💻 Technical Founder → Matched with DevTools/AI VCs (Boldstart, Amplify, Root)
                  </Badge>
                )}
                {isUnderrepresented && (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    🌈 Diverse Founder → Matched with Diversity-Focused VCs (Fearless Fund, Slauson & Co)
                  </Badge>
                )}
                {hasTraction && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-300">
                    📈 Has Traction → Matched with Growth VCs
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Strengths, Gaps, Recommendations */}
        <div className="grid md:grid-cols-3 gap-4">
          {analysis.strengths && analysis.strengths.length > 0 && (
            <Card className="border-2 border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Your Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analysis.strengths.slice(0, 6).map((strength: string, i: number) => (
                    <Badge key={i} variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {analysis.gaps && analysis.gaps.length > 0 && (
            <Card className="border-2 border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  What's Missing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {analysis.gaps.slice(0, 4).map((gap: string, i: number) => (
                    <li key={i} className="text-muted-foreground flex items-start gap-2">
                      <span className="text-orange-600">•</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  Top Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {analysis.suggestions.slice(0, 4).map((suggestion: string, i: number) => (
                    <li key={i} className="text-muted-foreground flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Top 10 Fellowships & Accelerators */}
        {fellowships.length > 0 && (
          <Card className="border-2 border-purple-200 bg-purple-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-600" />
                Top 10 Fellowships & Accelerators
              </CardTitle>
              <CardDescription>
                Top programs to consider for your startup journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {fellowships.slice(0, 10).map((fellowship: any, idx: number) => (
                  <a 
                    key={idx} 
                    href={fellowship.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-4 rounded-lg border border-purple-500/35 bg-card hover:border-purple-400/55 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-purple-900 group-hover:text-purple-600 flex items-center gap-2">
                          {fellowship.name}
                          <ExternalLink className="h-4 w-4" />
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">{fellowship.description || fellowship.reason}</p>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0">
                        Apply
                      </Button>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* VC Matches with Enhanced "Why This Match" */}
        <Card>
          <CardHeader>
            <CardTitle>Your Top VC Matches</CardTitle>
            <CardDescription>
              Ranked by compatibility • {matches.length} matches found
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {matches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                <p>No matches found. Try updating your pitch deck or preferences.</p>
              </div>
            ) : (
              matches.slice(0, 10).map((match: any, idx: number) => {
                const investor = match.investor || {}
                return (
                  <Card key={idx} className="border-2 hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{investor.firmName || 'Unknown VC'}</h3>
                            {match.livePulse && match.livePulse.signalStrength > 1 && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                              </span>
                            )}
                            {match.livePulse && match.livePulse.signalStrength <= 1 && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                Potentially Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{investor.fundType} • ${investor.checkMin}K - ${investor.checkMax}K</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">{Math.round(match.score || 0)}</div>
                          <div className="text-xs text-muted-foreground">Match Score</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Why This Match?</h4>
                          {match.detailedReasons && match.detailedReasons.length > 0 ? (
                            <ul className="text-sm space-y-2">
                              {match.detailedReasons.slice(0, 4).map((detail: any, i: number) => (
                                <li key={i} className="text-muted-foreground">
                                  <div className="flex items-start gap-2">
                                    {detail.score > 0 ? (
                                      <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
                                    )}
                                    <div className="flex-1">
                                      <div className="font-medium text-muted-foreground">{detail.category}</div>
                                      <div className="text-xs text-muted-foreground/85 mt-0.5">{detail.explanation}</div>
                                      {detail.evidence && detail.evidence.length > 0 && (
                                        <div className="text-xs text-muted-foreground/65 mt-1 italic">
                                          {detail.evidence.slice(0, 2).join(' • ')}
                                        </div>
                                      )}
                                    </div>
                                    {detail.score !== undefined && (
                                      <div className={`text-xs font-semibold ${detail.score > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                        {detail.score > 0 ? '+' : ''}{detail.score}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <ul className="text-sm space-y-1">
                              {(match.reasons || []).slice(0, 4).map((reason: string, i: number) => (
                                <li key={i} className="text-muted-foreground flex items-start gap-2">
                                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        
                        {match.livePulse?.summary && (
                          <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200/60 space-y-1.5">
                            <h5 className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                              <TrendingUp className="h-3 w-3" />
                              Live VC Intelligence
                            </h5>
                            {match.livePulse.summary.recentPortfolio && (
                              <p className="text-xs text-muted-foreground">{match.livePulse.summary.recentPortfolio}</p>
                            )}
                            {match.livePulse.summary.currentHeat && (
                              <p className="text-xs text-muted-foreground">{match.livePulse.summary.currentHeat}</p>
                            )}
                            {match.livePulse.summary.founderAlignment && (
                              <p className="text-xs text-muted-foreground">{match.livePulse.summary.founderAlignment}</p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <a href={investor.applicationUrl || investor.websiteUrl || `mailto:${investor.email}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button className="w-full" size="sm">
                              Apply Now
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                          </a>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Link href="/founder/my-analyses" className="flex-1">
            <Button variant="outline" className="w-full">
              View All My Analyses
            </Button>
          </Link>
          <Link href="/founder/discover" className="flex-1">
            <Button className="w-full">
              Explore More VCs
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-none">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-lg">Pitch deck</CardTitle>
          <CardDescription>
            PDF, PPT, or PPTX · up to 50MB · {PITCH_DECK_CREDIT_COST} credits per run
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
        {!file ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/70" />
            <Label htmlFor="pitch-deck-upload" className="cursor-pointer">
              <span className="text-sm font-medium text-primary hover:underline">
                Choose file
              </span>
              <span className="text-sm text-muted-foreground"> or drop it here</span>
            </Label>
            <Input
              id="pitch-deck-upload"
              type="file"
              accept=".pdf,.pptx,.ppt"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setError(null)
                  }}
                  disabled={analyzing}
                >
                  Remove
                </Button>
              </div>
            <Input
              id="pitch-deck-upload-replace"
              type="file"
              accept=".pdf,.pptx,.ppt"
              onChange={handleFileChange}
              className="hidden"
            />
            <Label htmlFor="pitch-deck-upload-replace" className="cursor-pointer text-sm text-primary hover:underline">
              Choose a different file
            </Label>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mr-2 inline h-4 w-4 align-text-bottom" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {credits ? (
              <>
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
          {credits && (!credits.isPremium && (credits.credits ?? 0) < PITCH_DECK_CREDIT_COST) && (
            <Link href="/pricing" className="shrink-0">
              <Button variant="outline" size="sm">
                Add credits
              </Button>
            </Link>
          )}
        </div>

        <Button 
          onClick={handleAnalyze} 
          disabled={!file || analyzing || !credits || (!credits.isPremium && (credits.credits ?? 0) < PITCH_DECK_CREDIT_COST)}
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
              <Upload className="mr-2 h-4 w-4" />
              Analyze deck
            </>
          )}
        </Button>
      </CardContent>
    </Card>
    </div>
  )
}


