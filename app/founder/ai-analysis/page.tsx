'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// Using a simple tab implementation without external dependency
// Tabs component will be created inline
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
  Video,
  Play,
  Lock,
  Crown,
  User,
  Star,
  FileVideo,
  Shield
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AIAnalysisPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('pitch-idea')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <div className="container-body px-4 py-4 md:py-6">
        {/* Hero - Animated */}
        <div className="mb-6 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-3 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 animate-slide-down">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">AI-Powered VC Matching</span>
          </div>
          <h1 className="mb-4 text-4xl md:text-5xl lg:text-6xl leading-tight font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-900 bg-clip-text text-transparent animate-gradient">
            Get Your VC Compatibility Score
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto animate-fade-in" style={{animationDelay: '0.2s'}}>
            Upload your materials and let AI match you with the perfect investors
          </p>
        </div>

        {/* Privacy strip - Animated */}
        <div className="mb-6 md:mb-8 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50 p-4 text-center text-sm text-slate-700 shadow-sm hover:shadow-md transition-all animate-slide-up">
          <Shield className="inline-block mr-2 h-4 w-4 text-emerald-600" />
          <span className="font-medium">100% Private & Secure</span>
          <span className="mx-2">•</span>
          <span>Your data is never shared. Auto-deleted in 30-90 days.</span>
          <Link href="/privacy" className="ml-2 text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2">
            Privacy Policy
          </Link>
        </div>

        {/* Tabs - Enhanced with animations */}
        <div className="mb-8 md:mb-10 flex justify-center animate-slide-up" style={{animationDelay: '0.1s'}}>
          <nav className="inline-flex rounded-full border-2 border-slate-200 bg-white shadow-lg p-1.5 hover:shadow-xl transition-shadow">
            <button
              onClick={() => setActiveTab('pitch-deck')}
              className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                activeTab === 'pitch-deck'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="h-4 w-4" />
              Pitch Deck
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                activeTab === 'video'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Video className="h-4 w-4" />
              Video Pitch
            </button>
            <button
              onClick={() => setActiveTab('pitch-idea')}
              className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                activeTab === 'pitch-idea'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md scale-105'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Lightbulb className="h-4 w-4" />
              Pitch Idea
            </button>
          </nav>
        </div>

        {/* Tab Content - Animated */}
        <div className="w-full animate-fade-in">
          {activeTab === 'pitch-deck' && <PitchDeckAnalysisTab />}
          {activeTab === 'video' && <VideoPitchAnalysisTab />}
          {activeTab === 'pitch-idea' && <PitchIdeaAnalysisTab />}
        </div>
      </div>
    </div>
  )
}

// Pitch Deck Analysis Component
function PitchDeckAnalysisTab() {
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
                  <p className="text-sm text-slate-600 mb-1">Get personalized feedback from Inigo & William (YC-backed founders)</p>
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
                <div className="whitespace-pre-wrap text-slate-700">{result.founderFeedback}</div>
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
                    className="p-4 rounded-lg border-2 border-purple-200 bg-white hover:border-purple-400 transition-colors group"
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
                          <h3 className="text-lg font-semibold">{investor.firmName || 'Unknown VC'}</h3>
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
                                      <div className="font-medium text-slate-700">{detail.category}</div>
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
      <Card className="mx-auto max-w-4xl w-full border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            How Pitch Deck Analysis Works
          </CardTitle>
          <CardDescription className="text-base">
            Get AI-powered insights tailored to your pitch
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
                Our AI analyzes your pitch deck and finds VCs that are the perfect fit for your business model, stage, sector, and traction.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Tailored Recommendations</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Get personalized suggestions on what to improve in your pitch deck and how to better position your startup for each VC.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/60 border border-primary/10">
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
                    • You have: <span className="font-semibold text-slate-900">{credits.credits ?? 0}</span> credits
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

// Video Pitch Analysis Component
function VideoPitchAnalysisTab() {
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
        throw new Error(data.error || data.message || 'Failed to analyze video pitch')
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
      setError(err instanceof Error ? err.message : 'Failed to analyze video pitch. Please try again.')
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
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Analysis Complete</CardTitle>
            <CardDescription>Your video pitch has been analyzed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              <Link href="/founder/video-pitch-analysis" className="text-primary hover:underline">View full detailed results</Link>
            </p>
            <Button onClick={() => {
              setResult(null)
              setFile(null)
              if (videoPreview) {
                URL.revokeObjectURL(videoPreview)
                setVideoPreview(null)
              }
            }} variant="outline">
              Analyze Another Video
            </Button>
          </CardContent>
        </Card>

        {/* Founder Feedback CTA */}
        {!result.founderFeedback && (
          <Card className="border-2 border-purple-200 bg-purple-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Get Feedback from YC-Funded Founders</h3>
                  <p className="text-sm text-slate-600 mb-1">Get personalized feedback from Inigo & William (YC-backed founders)</p>
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
                          videoTranscript: videoTranscript || result.transcript || ''
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
                <div className="whitespace-pre-wrap text-slate-700">{result.founderFeedback}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
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
    </div>
  )
}

// Pitch Idea Analysis Component
function PitchIdeaAnalysisTab() {
  const router = useRouter()
  const [ideaText, setIdeaText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState<{ credits: number; isPremium: boolean } | null>(null)
  const [requestingFeedback, setRequestingFeedback] = useState(false)
  const PITCH_IDEA_CREDIT_COST = 15

  useEffect(() => {
    fetch('/api/user/credits', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setCredits(data)
        setError(null)
      })
      .catch(err => console.error('Error loading credits:', err))
  }, [])

  const handleAnalyze = async () => {
    if (!ideaText.trim()) {
      setError('Please describe your pitch idea or product concept')
      return
    }
    
    if (!credits) {
      setError('Loading your credits... Please wait a moment and try again.')
      return
    }
    
    if (!credits.isPremium && (credits.credits ?? 0) < PITCH_IDEA_CREDIT_COST) {
      setError(`Insufficient credits. Pitch idea analysis costs ${PITCH_IDEA_CREDIT_COST} credits. You have ${credits.credits ?? 0} credits. Please purchase credits or upgrade to premium.`)
      return
    }
    
    setAnalyzing(true)
    setError(null)
    
    try {
      const response = await fetch('/api/analyze-pitch-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ideaText }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          setError(data.error || 'Insufficient credits. Please purchase credits or upgrade to premium.')
          const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json()
            setCredits(creditsData)
          }
          setAnalyzing(false)
          return
        }
        throw new Error(data.error || data.message || 'Failed to analyze pitch idea')
      }

      setResult(data)
      
      const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
      if (creditsRes.ok) {
        const creditsData = await creditsRes.json()
        setCredits(creditsData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze pitch idea. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGetFounderFeedback = async () => {
    if (!result) return
    
    setRequestingFeedback(true)
    try {
      const response = await fetch('/api/founder-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          analysisId: result.id,
          idea: ideaText 
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
  }

  if (result) {
    const analysis = result.analysis || {}
    const matches = result.matches || []
    
    return (
      <div className="space-y-6">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  Analysis Complete
                </CardTitle>
                <CardDescription className="mt-2">
                  Your pitch idea has been analyzed by AI trained on real investor feedback
                </CardDescription>
              </div>
              <Button onClick={() => {
                setResult(null)
                setIdeaText('')
              }} variant="outline">
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
                  <p className="text-sm text-slate-600 mb-1">Get personalized feedback from Inigo & William (YC-backed founders)</p>
                  <p className="text-xs text-slate-500">Improve your score and get actionable advice from real investors</p>
                </div>
                <Button 
                  onClick={handleGetFounderFeedback}
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
                <div className="whitespace-pre-wrap text-slate-700">{result.founderFeedback}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        <div className="grid md:grid-cols-3 gap-4">
          {analysis.strengths && analysis.strengths.length > 0 && (
            <Card className="border-2 border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {analysis.strengths.slice(0, 4).map((strength: string, i: number) => (
                    <li key={i} className="text-muted-foreground">• {strength}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.improvements && analysis.improvements.length > 0 && (
            <Card className="border-2 border-orange-200 bg-orange-50/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-orange-600" />
                  Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {analysis.improvements.slice(0, 4).map((improvement: string, i: number) => (
                    <li key={i} className="text-muted-foreground">• {improvement}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {analysis.suggestions.slice(0, 4).map((suggestion: string, i: number) => (
                    <li key={i} className="text-muted-foreground">• {suggestion}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* VC Matches */}
        {matches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recommended VCs</CardTitle>
              <CardDescription>{matches.length} VCs that might be interested</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {matches.slice(0, 5).map((match: any, idx: number) => {
                const investor = match.investor || {}
                return (
                  <div key={idx} className="p-4 rounded-lg border border-slate-200 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{investor.firmName || 'Unknown VC'}</h3>
                        <p className="text-sm text-muted-foreground">{investor.fundType} • ${investor.checkMin}K - ${investor.checkMax}K</p>
                      </div>
                      <a href={investor.applicationUrl || investor.websiteUrl || `mailto:${investor.email}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm">Apply</Button>
                      </a>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="mx-auto max-w-4xl w-full border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Pitch Idea Analysis
          </CardTitle>
          <CardDescription className="text-base">
            Get feedback on your pitch idea from AI trained on real investor feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Real Investor Insights</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                AI trained on feedback from real VCs and investors. Get the same insights they look for.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">Actionable Improvements</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Specific suggestions to strengthen your pitch and make it more compelling to investors.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-white/60 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-sm">VC Recommendations</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                See which VCs might be interested in your idea based on their investment thesis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-4xl w-full">
        <CardHeader>
          <CardTitle>Describe Your Pitch Idea</CardTitle>
          <CardDescription>
            Share your product idea, pitch concept, or startup vision. We'll analyze it and give you feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="idea">Your Pitch Idea or Product Concept *</Label>
            <textarea
              id="idea"
              value={ideaText}
              onChange={(e) => {
                setIdeaText(e.target.value)
                setError(null)
              }}
              placeholder="Describe your startup idea, product concept, or pitch. What problem are you solving? Who is your target market? What makes your solution unique?"
              className="flex min-h-[200px] w-full rounded-xl border-2 border-slate-300 focus:border-primary bg-background px-4 py-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              required
              disabled={analyzing}
            />
            <p className="text-xs text-muted-foreground">
              Be specific about your idea, target market, and what makes it unique. The more detail, the better the feedback.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mr-2 inline h-4 w-4" />
              {error}
            </div>
          )}

          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Pitch Idea Analysis
                </div>
                <div className="text-muted-foreground">
                  Cost: {PITCH_IDEA_CREDIT_COST} credits
                  {credits && (
                    <span className="ml-2">
                      • You have: <span className="font-semibold text-slate-900">{credits.credits ?? 0}</span> credits
                      {credits.isPremium && <Badge variant="secondary" className="ml-2 text-xs">Premium</Badge>}
                    </span>
                  )}
                </div>
              </div>
              {credits && (!credits.isPremium && (credits.credits ?? 0) < PITCH_IDEA_CREDIT_COST) && (
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
            disabled={!ideaText.trim() || analyzing || !credits || (!credits.isPremium && (credits.credits ?? 0) < PITCH_IDEA_CREDIT_COST)}
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
                <Lightbulb className="mr-2 h-4 w-4" />
                Analyze Pitch Idea
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
