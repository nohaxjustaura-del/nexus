'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Heart, 
  Upload, 
  Sparkles, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Target,
  ArrowRight,
  Building2,
  DollarSign,
  Clock,
  ExternalLink,
  Zap,
  FileText,
  Users,
  BarChart3,
  Globe,
  Lock,
  Crown
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { loadStripe } from '@stripe/stripe-js'

interface PitchAnalysisResult {
  pitchDeckId: string
  analysis: {
    overallScore: number
    strengths: string[]
    weaknesses: string[]
    improvements: string[]
    matchedVCs: Array<{
      investorId: string
      firmName: string
      score: number
      reasons: string[]
      detailedReasons?: Array<{
        category: string
        score: number
        explanation: string
        evidence: string[]
      }>
    }>
    sectorFit: Record<string, number>
    tractionMetrics: {
      revenue?: number
      users?: number
      growth?: string
      mrr?: number
      arr?: number
    }
    marketAnalysis: {
      tam?: string
      sam?: string
      som?: string
      marketSize?: string
    }
    teamAnalysis: {
      strengths?: string[]
      gaps?: string[]
    }
    productFit: {
      pmfSignals?: string[]
      differentiators?: string[]
    }
  }
}

export default function PitchDeckAnalysisPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<PitchAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState<{ credits: number; isPremium: boolean } | null>(null)
  const [topMatchesUnlocked, setTopMatchesUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [paymentVerified, setPaymentVerified] = useState(true) // allow during beta
  const [paymentAmount, setPaymentAmount] = useState<number | null>(0) // $0 beta
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>('beta_free')

  // Verify Stripe session on redirect back from Checkout (client-side)
  if (typeof window !== 'undefined') {
    queueMicrotask(async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const sessionId = params.get('session_id')
        if (sessionId && !paymentVerified) {
          const verifyRes = await fetch(`/api/create-checkout?session_id=${encodeURIComponent(sessionId)}`)
          if (verifyRes.ok) {
            const data = await verifyRes.json()
            if (data.verified) {
              setPaymentVerified(true)
              setCheckoutSessionId(sessionId)
              if (typeof data.amount === 'number') setPaymentAmount(data.amount)
              const url = new URL(window.location.href)
              url.searchParams.delete('session_id')
              window.history.replaceState({}, '', url.toString())
            }
          }
        }
      } catch {
        // ignore
      }
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    setError(null)
    try {
      const checkoutResponse = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType: 'pitch-deck-analysis' }),
      })
      if (!checkoutResponse.ok) throw new Error('Payment setup failed')
      const { sessionId, amount, url } = await checkoutResponse.json()
      setCheckoutSessionId(sessionId)
      setPaymentAmount(amount)
      if (amount > 0) {
        if (url) {
          window.location.assign(url)
          return
        }
        // Fallback for older flows (shouldn't be needed with latest Stripe)
        const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string | undefined
        if (!pk) throw new Error('Stripe publishable key is not configured. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local')
        const stripe = await loadStripe(pk)
        if (!stripe) throw new Error('Stripe failed to initialize')
        const { error } = await (stripe as any).redirectToCheckout({ sessionId })
        if (error) throw new Error(error.message)
        return
      }
      setPaymentVerified(true)
    } catch (e: any) {
      setError(e.message || 'Failed to initialize checkout.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please upload a pitch deck first')
      return
    }
    if (!paymentVerified || !checkoutSessionId) {
      setError('Please complete checkout first before analysis.')
      return
    }
    
    setAnalyzing(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('paymentVerified', paymentVerified ? 'true' : 'false')
      formData.append('sessionId', checkoutSessionId)

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
        // Reload credits
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-6 md:py-8">
        {/* Hero */}
        <div className="mb-8 md:mb-12 text-center">
          <Badge className="mb-4" variant="secondary">
            <FileText className="mr-1 h-3 w-3" />
            Pitch Deck Analysis
          </Badge>
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">
            Get AI-Powered Pitch Deck Feedback
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Upload your pitch deck and get detailed feedback on what to improve, plus discover which VCs are the best fit for your startup.
          </p>
        </div>

        {!result ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload Your Pitch Deck</CardTitle>
              <CardDescription>
                Supported formats: PDF, PowerPoint (PPTX). Max size: 50MB
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="file">Pitch Deck File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.pptx,.ppt"
                  onChange={handleFileChange}
                  disabled={analyzing}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>Error:</strong> {error}
                  </div>
                </div>
              )}

              {/* Payment Section */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Pitch Deck Analysis
                    </div>
                    <div className="text-muted-foreground">
                      {paymentAmount === null ? 'Price: $29 (Beta: $0)' : `Price: $${(paymentAmount / 100).toFixed(2)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {paymentVerified ? (
                      <Badge className="bg-green-600">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Paid
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleCheckout}
                        disabled={checkoutLoading}
                      >
                        {checkoutLoading ? 'Preparing Checkout...' : 'Proceed to Checkout'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleAnalyze} 
                disabled={!file || analyzing || !paymentVerified}
                className="w-full"
                size="lg"
              >
                {analyzing ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
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
                    <span>Detailed feedback on strengths and weaknesses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>Actionable suggestions to improve your pitch</span>
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
        ) : (
          <div className="space-y-6">
            {/* Overall Score */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Overall Pitch Score</CardTitle>
                    <CardDescription>Based on clarity, completeness, traction, team, and market opportunity</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-primary">
                      {result.analysis.overallScore}
                    </div>
                    <div className="text-sm text-muted-foreground">out of 100</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${result.analysis.overallScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.analysis.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Areas to Improve
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.analysis.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Improvements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Actionable Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.analysis.improvements.map((improvement, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {idx + 1}
                      </div>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Traction Metrics */}
            {Object.keys(result.analysis.tractionMetrics).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Traction Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {result.analysis.tractionMetrics.revenue && (
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Revenue</div>
                        <div className="text-2xl font-bold">${result.analysis.tractionMetrics.revenue.toLocaleString()}</div>
                      </div>
                    )}
                    {result.analysis.tractionMetrics.users && (
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Users</div>
                        <div className="text-2xl font-bold">{result.analysis.tractionMetrics.users.toLocaleString()}</div>
                      </div>
                    )}
                    {result.analysis.tractionMetrics.mrr && (
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">MRR</div>
                        <div className="text-2xl font-bold">${result.analysis.tractionMetrics.mrr.toLocaleString()}</div>
                      </div>
                    )}
                    {result.analysis.tractionMetrics.arr && (
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">ARR</div>
                        <div className="text-2xl font-bold">${result.analysis.tractionMetrics.arr.toLocaleString()}</div>
                      </div>
                    )}
                    {result.analysis.tractionMetrics.growth && (
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Growth Rate</div>
                        <div className="text-2xl font-bold">{result.analysis.tractionMetrics.growth}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Market Analysis */}
            {Object.keys(result.analysis.marketAnalysis).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Market Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {result.analysis.marketAnalysis.tam && (
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">TAM</div>
                        <div className="text-xl font-bold">{result.analysis.marketAnalysis.tam}</div>
                      </div>
                    )}
                    {result.analysis.marketAnalysis.sam && (
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">SAM</div>
                        <div className="text-xl font-bold">{result.analysis.marketAnalysis.sam}</div>
                      </div>
                    )}
                    {result.analysis.marketAnalysis.som && (
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">SOM</div>
                        <div className="text-xl font-bold">{result.analysis.marketAnalysis.som}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top VC Matches */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top VC Matches</CardTitle>
                    <CardDescription>Based on your pitch deck content and investment thesis</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/founder/discover')}
                  >
                    View All VCs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Premium Top 5 Matches - Locked */}
                {!topMatchesUnlocked && result.analysis.matchedVCs.length > 5 && (
                  <div className="rounded-lg border-2 border-dashed border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5 p-8 text-center mb-6">
                    <div className="mb-4 flex justify-center">
                      <div className="rounded-full bg-primary/10 p-4">
                        <Lock className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">Unlock Your Top 5 Matches</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      See your highest compatibility scores and best-fit VCs
                    </p>
                    <div className="mb-4 flex items-center justify-center gap-2 text-sm">
                      {credits && (
                        <>
                          {credits.isPremium ? (
                            <Badge className="bg-yellow-500">
                              <Crown className="mr-1 h-3 w-3" />
                              Premium Member
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {credits.credits} Credit{credits.credits !== 1 ? 's' : ''} Available
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                    <Button
                      onClick={handleUnlockTopMatches}
                      disabled={unlocking}
                      className="bg-gradient-to-r from-primary to-purple-600"
                    >
                      {unlocking ? (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                          Unlocking...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          {credits?.isPremium || (credits && credits.credits > 0)
                            ? 'Unlock Top 5 Matches'
                            : 'Get Credits to Unlock'}
                        </>
                      )}
                    </Button>
                    {credits && !credits.isPremium && credits.credits === 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Need credits? <Link href="/pricing" className="text-primary hover:underline">View pricing</Link>
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {result.analysis.matchedVCs
                    .slice(topMatchesUnlocked ? 0 : 5, Math.min(10, result.analysis.matchedVCs.length))
                    .map((match, idx) => {
                      const actualIndex = topMatchesUnlocked ? idx : 5 + idx
                      return (
                    <div
                      key={match.investorId}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                            topMatchesUnlocked && actualIndex < 5
                              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {topMatchesUnlocked && actualIndex < 5 && (
                              <Crown className="mr-1 h-3 w-3" />
                            )}
                            {actualIndex + 1}
                          </div>
                          <h3 className="font-semibold">{match.firmName}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {match.score}% Match
                          </Badge>
                        </div>
                        {match.reasons.length > 0 && (
                          <ul className="ml-11 space-y-1 text-sm text-muted-foreground">
                            {match.reasons.slice(0, 2).map((reason, rIdx) => (
                              <li key={rIdx} className="flex items-start gap-2">
                                <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/founder/discover?vc=${match.investorId}`)}
                      >
                        View Profile
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null)
                  setFile(null)
                }}
                className="flex-1"
              >
                Analyze Another Deck
              </Button>
              <Button
                onClick={() => router.push('/founder/discover')}
                className="flex-1"
              >
                Discover More VCs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

