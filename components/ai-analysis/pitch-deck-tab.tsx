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
  Target,
  ExternalLink,
  Star,
  Crown
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/5">
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
          <Card className="border-2 border-purple-500/30 bg-purple-500/10/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Get Feedback from YC-Funded Founders</h3>
                  <p className="text-sm text-muted-foreground mb-1">Get personalized feedback from Inigo & William (YC-backed founders)</p>
                  <p className="text-xs text-slate-500">Improve your score and get actionable advice from real investors</p>
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
                          alert('Insufficient credits. Founder feedback costs 200 credits.')
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
                      alert(err instanceof Error ? err.message : 'Failed to get founder feedback')
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
          <Card className="border-2 border-purple-500/35 bg-gradient-to-br from-purple-500/12 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                Feedback from YC-Funded Founders
              </CardTitle>
              <CardDescription>Personalized advice from Inigo & William</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-foreground/85">{result.founderFeedback}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Niche Matching Badge */}
        {(isStudent || isTechnical || isUnderrepresented) && (
          <Card className="border-2 border-purple-500/30 bg-purple-500/10/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold text-purple-900">Niche Match:</span>
                {isStudent && (
                  <Badge className="bg-purple-100 text-purple-700 border-purple-500/35">
                    🎓 Student Founder → Matched with Student VCs (Dorm Room Fund, 1517 Fund, Neo)
                  </Badge>
                )}
                {isTechnical && (
                  <Badge className="bg-blue-100 text-primary border-blue-300">
                    💻 Technical Founder → Matched with DevTools and infrastructure VCs (Boldstart, Amplify, Root)
                  </Badge>
                )}
                {isUnderrepresented && (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    🌈 Diverse Founder → Matched with Diversity-Focused VCs (Fearless Fund, Slauson & Co)
                  </Badge>
                )}
                {hasTraction && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-500/35">
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
            <Card className="border-2 border-emerald-500/30 bg-emerald-500/10/30">
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
            <Card className="border-2 border-orange-500/30 bg-orange-500/8">
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
            <Card className="border-2 border-primary/25 bg-primary/10">
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
          <Card className="border-2 border-purple-500/30 bg-purple-500/10/30">
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
                    className="p-4 rounded-lg border-2 border-purple-500/30 bg-card hover:border-purple-400 transition-colors group"
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
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                              </span>
                            )}
                            {match.livePulse && match.livePulse.signalStrength <= 1 && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
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
                                      <div className="font-medium text-foreground/85">{detail.category}</div>
                                      <div className="text-xs text-slate-500 mt-0.5">{detail.explanation}</div>
                                      {detail.evidence && detail.evidence.length > 0 && (
                                        <div className="text-xs text-slate-400 mt-1 italic">
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
                          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/10 border border-primary/25 space-y-1.5">
                            <h5 className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                              <TrendingUp className="h-3 w-3" />
                              Live VC Intelligence
                            </h5>
                            {match.livePulse.summary.recentPortfolio && (
                              <p className="text-xs text-foreground/85">{match.livePulse.summary.recentPortfolio}</p>
                            )}
                            {match.livePulse.summary.currentHeat && (
                              <p className="text-xs text-foreground/85">{match.livePulse.summary.currentHeat}</p>
                            )}
                            {match.livePulse.summary.founderAlignment && (
                              <p className="text-xs text-foreground/85">{match.livePulse.summary.founderAlignment}</p>
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
      {/* Explanation Section */}
      <Card className="mx-auto max-w-4xl w-full border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            How Pitch Deck Analysis Works
          </CardTitle>
          <CardDescription className="text-base">
            Get insights tailored to your pitch
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-card/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Perfect VC Matches</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                NEXUS reviews your pitch deck and surfaces VCs that fit your business model, stage, sector, and traction.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Tailored Recommendations</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Get personalized suggestions on what to improve in your pitch deck and how to better position your startup for each VC.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-card/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Actionable Insights</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Understand your pitch strengths, identify weaknesses, and learn exactly what each VC looks for in pitches like yours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-4xl w-full">
        <CardHeader>
          <CardTitle>Upload Your Pitch Deck</CardTitle>
          <CardDescription>
            PDF or PPTX • Max 50MB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
          <Label htmlFor="pitch-deck-upload" className="cursor-pointer">
            <span className="text-sm font-medium text-primary hover:underline">
              Click to upload
            </span>
            <span className="text-sm text-muted-foreground"> or drag and drop</span>
          </Label>
          <Input
            id="pitch-deck-upload"
            type="file"
            accept=".pdf,.pptx,.ppt"
            onChange={handleFileChange}
            className="hidden"
          />
          {file && (
            <div className="mt-4">
              <Badge variant="secondary">
                <CheckCircle className="mr-1 h-3 w-3" />
                {file.name}
              </Badge>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {error}
          </div>
        )}

        {/* Credit Cost Section */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Pitch Deck Analysis
              </div>
              <div className="text-muted-foreground">
                Cost: {PITCH_DECK_CREDIT_COST} credits
                {credits && (
                  <span className="ml-2">
                    • You have: <span className="font-semibold text-foreground">{credits.credits ?? 0}</span> credits
                    {credits.isPremium && <Badge variant="secondary" className="ml-2 text-xs">Premium</Badge>}
                  </span>
                )}
              </div>
            </div>
            {credits && (!credits.isPremium && (credits.credits ?? 0) < PITCH_DECK_CREDIT_COST) && (
              <Link href="/pricing">
                <Button variant="outline" size="sm">
                  Buy Credits
                </Button>
              </Link>
            )}
          </div>
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
              Analyzing...
            </>
          ) : !credits ? (
            <>
              <Sparkles className="mr-2 h-4 w-4 animate-spin" />
              Loading credits...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Analyze Pitch Deck
            </>
          )}
        </Button>

        <div className="rounded-lg border bg-muted/50 p-6">
          <h3 className="mb-2 font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            What You'll Get
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Overall pitch quality score</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Detailed feedback on strengths and weaknesses</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Top VC matches based on your pitch content</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Market analysis and traction metrics extraction</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}


