'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Lock,
  MessageSquare,
  Calendar,
  Download,
  Video,
  FileText,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  TrendingUp,
  Clock
} from 'lucide-react'

export default function YCInsiderPage() {
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [credits, setCredits] = useState(0)
  const [purchases, setPurchases] = useState<string[]>([])
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/user/credits', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setIsPremium(Boolean(data?.isPremium))
          setCredits(data?.credits || 0)
          setPurchases(data?.purchases || [])
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handlePurchase = async (itemId: string, cost: number) => {
    if (credits < cost) {
      alert('Not enough credits. Please purchase more credits.')
      return
    }
    
    setPurchasing(itemId)
    try {
      const res = await fetch('/api/yc-insider/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId, cost })
      })
      
      if (res.ok) {
        const data = await res.json()
        setCredits(data.remainingCredits)
        setPurchases([...purchases, itemId])
        // Reload credits to get updated purchases
        const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
        if (creditsRes.ok) {
          const creditsData = await creditsRes.json()
          setPurchases(creditsData.purchases || [])
        }
        alert('Purchase successful! You can now access this material.')
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert(errorData.error || 'Purchase failed. Please try again.')
      }
    } catch (e) {
      alert('Purchase failed. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  const hasPurchased = (itemId: string) => purchases.includes(itemId)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-10">
          {/* Credits Display */}
          <div className="flex justify-end mb-4">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-900 text-white">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-semibold">{credits} Credits</span>
              <Link href="/pricing">
                <Button size="sm" variant="secondary" className="h-7 text-xs">
                  Buy More
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-200 mb-4">
              <Sparkles className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-700">Verified • YC W26</span>
            </div>
            <h1 className="mb-3 text-4xl md:text-5xl font-bold text-slate-900">
              Steal YC-Winning Decisions, Not Just Decks
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Annotated deck, interview patterns, traction timeline, and exact decision logic — structured into actionable templates
            </p>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Verified YC W26</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Actionable templates</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Decision breakdowns</span>
              </div>
            </div>
          </div>
        </div>

        {!isPremium && (
          <Card className="mb-10 border-orange-200 bg-gradient-to-br from-orange-50/50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <Lock className="h-5 w-5 text-orange-600" />
                Unlock YC Insider Access
              </CardTitle>
              <CardDescription className="text-slate-600">
                See exactly how Luel got into YC W26 — their deck, application, and interview prep
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-slate-600">
                  Access real materials from founders who just got accepted to YC
                </p>
                {/* @ts-ignore */}
                <Button asChild className="bg-orange-600 hover:bg-orange-700">
                  <Link href="/pricing">Upgrade to Premium</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content visible for premium members */}
        <div className={`${!isPremium ? 'opacity-50 pointer-events-none select-none' : ''} space-y-8`}>
          
          {/* Founders - Both Currently in YC W26 */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Meet the Founders</CardTitle>
              <CardDescription>William Namgyal and Inigo Lenderking are currently in Y Combinator Winter 2026 (YC W26) with their startup Luel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* William */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    WN
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">William Namgyal</h4>
                      <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs">YC W26</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      Co-Founder & CEO at <strong>Luel</strong>, currently in <strong>Y Combinator W26</strong>. Berkeley M.E.T.
                    </p>
                    <div className="mb-3">
                      <Badge variant="outline" className="text-xs">Product + Strategy</Badge>
                    </div>
                    <div className="flex gap-2">
                      {/* @ts-ignore */}
                      <Button asChild size="sm" variant="outline" disabled={!isPremium}>
                        <Link href={isPremium ? 'mailto:support@foundermatch.local?subject=Question%20for%20William' : '#'}>
                          <MessageSquare className="h-3 w-3 mr-1.5" />
                          Ask
                        </Link>
                      </Button>
                      {/* @ts-ignore */}
                      <Button asChild size="sm" variant="ghost" disabled={!isPremium}>
                        <Link href={isPremium ? 'mailto:support@foundermatch.local?subject=Book%20Session' : '#'}>
                          <Calendar className="h-3 w-3 mr-1.5" />
                          Book
                        </Link>
                      </Button>
                      {/* @ts-ignore */}
                      <Button asChild size="sm" variant="ghost">
                        <a href="https://www.linkedin.com/in/william-namgyal-0294a6260/" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Inigo */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                    IL
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">Inigo Lenderking</h4>
                      <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs">YC W26</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">
                      Co-Founder at <strong>Luel</strong>, currently in <strong>Y Combinator W26</strong>. Berkeley dropout.
                    </p>
                    <div className="mb-3">
                      <Badge variant="outline" className="text-xs">Growth + Operations</Badge>
                    </div>
                    <div className="flex gap-2">
                      {/* @ts-ignore */}
                      <Button asChild size="sm" variant="outline" disabled={!isPremium}>
                        <Link href={isPremium ? 'mailto:support@foundermatch.local?subject=Question%20for%20Inigo' : '#'}>
                          <MessageSquare className="h-3 w-3 mr-1.5" />
                          Ask
                        </Link>
                      </Button>
                      {/* @ts-ignore */}
                      <Button asChild size="sm" variant="ghost" disabled={!isPremium}>
                        <Link href={isPremium ? 'mailto:support@foundermatch.local?subject=Book%20Session' : '#'}>
                          <Calendar className="h-3 w-3 mr-1.5" />
                          Book
                        </Link>
                      </Button>
                      {/* @ts-ignore */}
                      <Button asChild size="sm" variant="ghost">
                        <a href="https://www.linkedin.com/in/inigo-lenderking-8476a4266/" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Premium Modules */}
          <div className="space-y-4">
            
            {/* Module 1: Application Deconstruction */}
            <Card className="border-2 hover:border-primary/30 transition-colors relative">
              {hasPurchased('application-deconstruction') && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">Application Deconstruction</CardTitle>
                      <Badge className="bg-purple-100 text-purple-700 text-xs">Most Valuable</Badge>
                    </div>
                    <CardDescription className="text-xs">Their raw YC application answers + why each works + fill-in templates</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-slate-600">
                    <strong>What you get:</strong> Every YC application question with their actual answer, breakdown of why it works, risk flags they avoided, and a rewrite template you can use.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Raw application answers</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>"Why this works" analysis</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Risk flags avoided</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Fill-in templates</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('application-deconstruction') ? (
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=application-deconstruction`, {
                          credentials: 'include'
                        })
                        if (res.ok) {
                          const data = await res.json()
                          alert(`Download would start: ${data.filename}\n\nNote: Actual materials will be available in production.`)
                        } else {
                          alert('Failed to access material. Please try again.')
                        }
                      } catch (e) {
                        alert('Failed to download. Please try again.')
                      }
                    }}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Access Application Breakdown
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('application-deconstruction', 75)
                    }}
                    disabled={purchasing === 'application-deconstruction'}
                  >
                    {purchasing === 'application-deconstruction' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for 75 Credits
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Module 2: Pitch Deck Autopsy */}
            <Card className="border-2 hover:border-primary/30 transition-colors relative">
              {hasPurchased('pitch-deck-autopsy') && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Pitch Deck Autopsy</CardTitle>
                    <CardDescription className="text-xs">Annotated deck + critical slides + what YC questioned</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-slate-600">
                    <strong>What you get:</strong> Their full deck with slide-by-slide annotations explaining what each slide must prove, why the wording works, and what YC likely questioned.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Full annotated deck</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Critical 5 slides spotlight</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>YC question predictions</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Deck checklist</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('pitch-deck') ? (
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=pitch-deck`, {
                          credentials: 'include'
                        })
                        if (res.ok) {
                          const data = await res.json()
                          // In production, this would download the actual file
                          // For now, show a message
                          alert(`Download would start: ${data.filename}\n\nNote: Actual materials will be available in production.`)
                          // In production: window.open(data.url, '_blank') or trigger download
                        } else {
                          alert('Failed to access material. Please try again.')
                        }
                      } catch (e) {
                        alert('Failed to download. Please try again.')
                      }
                    }}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Download PDF
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('pitch-deck', 50)
                    }}
                    disabled={purchasing !== null}
                  >
                    {purchasing === 'pitch-deck' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-2" />
                        Unlock for 50 Credits
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Application Video */}
            <Card className="border-2 hover:border-primary/30 transition-colors relative">
              {hasPurchased('application-video') && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Video className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Application Video</CardTitle>
                    <CardDescription className="text-xs">Their 60-second video that got them the interview</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  Watch their actual video submission with notes on what worked and why.
                </p>
                {hasPurchased('application-video') ? (
                  <Button 
                    className="w-full" 
                    variant="outline" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=application-video`, {
                          credentials: 'include'
                        })
                        if (res.ok) {
                          const data = await res.json()
                          // In production, this would open the video
                          alert(`Video would open: ${data.filename}\n\nNote: Actual video will be available in production.`)
                          // In production: window.open(data.url, '_blank')
                        } else {
                          alert('Failed to access video. Please try again.')
                        }
                      } catch (e) {
                        alert('Failed to load video. Please try again.')
                      }
                    }}
                  >
                    <Video className="h-3 w-3 mr-2" />
                    Watch Video
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('application-video', 30)
                    }}
                    disabled={purchasing !== null}
                  >
                    {purchasing === 'application-video' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-2" />
                        Unlock for 30 Credits
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Interview Questions & Answers */}
          <Card className="border-2 relative">
            {hasPurchased('interview-qa') && (
              <div className="absolute top-3 right-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            )}
            <CardHeader>
              <CardTitle>YC Interview: Questions & Their Answers</CardTitle>
              <CardDescription>The exact questions YC partners asked them and how they responded</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 border">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-sm font-semibold text-slate-900">Q:</span>
                  <span className="text-sm text-slate-700">"What problem are you solving and why is now the time?"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-green-700">A:</span>
                  <span className="text-sm text-slate-600">
                    {hasPurchased('interview-qa') ? 'Their full answer: [Full answer would appear here]' : 'See their actual answer and why it worked →'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-sm font-semibold text-slate-900">Q:</span>
                  <span className="text-sm text-slate-700">"Show us your traction numbers"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-green-700">A:</span>
                  <span className="text-sm text-slate-600">
                    {hasPurchased('interview-qa') ? 'Their exact metrics: [Full metrics would appear here]' : 'Their exact metrics when they applied →'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-sm font-semibold text-slate-900">Q:</span>
                  <span className="text-sm text-slate-700">"Who are your users and how do you reach them?"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold text-green-700">A:</span>
                  <span className="text-sm text-slate-600">
                    {hasPurchased('interview-qa') ? 'Their distribution answer: [Full answer would appear here]' : 'How they explained their distribution →'}
                  </span>
                </div>
              </div>

              {hasPurchased('interview-qa') ? (
                <Button 
                  className="w-full" 
                  variant="outline" 
                  size="sm"
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    try {
                      const res = await fetch(`/api/yc-insider/download?itemId=interview-qa`, {
                        credentials: 'include'
                      })
                      if (res.ok) {
                        const data = await res.json()
                        // In production, this would download the actual file
                        alert(`Download would start: ${data.filename}\n\nNote: Actual Q&A document will be available in production.`)
                        // In production: window.open(data.url, '_blank') or trigger download
                      } else {
                        alert('Failed to access document. Please try again.')
                      }
                    } catch (e) {
                      alert('Failed to download. Please try again.')
                    }
                  }}
                >
                  <Download className="h-3 w-3 mr-2" />
                  Download Full Q&A Document
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handlePurchase('interview-qa', 75)
                  }}
                  disabled={purchasing !== null}
                >
                  {purchasing === 'interview-qa' ? (
                    'Processing...'
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-2" />
                      Unlock for 75 Credits
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Their Traction When They Applied */}
          <Card className="border-2 bg-gradient-to-br from-green-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Their Traction When They Applied
              </CardTitle>
              <CardDescription>What their metrics looked like when YC accepted them</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-green-600 mb-1">$XK</div>
                  <div className="text-xs text-slate-600">Monthly Revenue</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-green-600 mb-1">X</div>
                  <div className="text-xs text-slate-600">Active Users/Customers</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-green-600 mb-1">X%</div>
                  <div className="text-xs text-slate-600">MoM Growth</div>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600 text-center">
                <strong>Key insight:</strong> You don't need massive traction — you need clear progress and a strong story.
              </p>
            </CardContent>
          </Card>

          {/* Common Mistakes That Get You Rejected */}
          <Card className="border-2 border-red-200 bg-red-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Common Mistakes That Get Applications Rejected
              </CardTitle>
              <CardDescription>What they've seen (and avoided) that causes YC to say no</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-red-600 font-bold">×</span>
                  <span className="text-slate-700"><strong>Focusing on features instead of problems</strong> — YC wants to see you understand the pain, not just your solution</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-red-600 font-bold">×</span>
                  <span className="text-slate-700"><strong>Vague traction</strong> — "growing fast" doesn't work. You need specific numbers (even if small)</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-red-600 font-bold">×</span>
                  <span className="text-slate-700"><strong>Not knowing your numbers</strong> — In interviews, you must know revenue, users, churn, CAC, LTV by heart</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-red-600 font-bold">×</span>
                  <span className="text-slate-700"><strong>Overly polished videos</strong> — A simple, clear demo beats production quality. Show the product working.</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-red-600 font-bold">×</span>
                  <span className="text-slate-700"><strong>Not showing why now</strong> — YC asks "why now?" You need a clear answer about market timing</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Timeline */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Their Application Timeline
              </CardTitle>
              <CardDescription>What they did and when leading up to YC</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-20 text-sm font-semibold text-slate-600">3 months before</div>
                  <div className="flex-1 text-sm text-slate-700">Started getting initial traction — focused on one metric to show progress</div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-20 text-sm font-semibold text-slate-600">1 month before</div>
                  <div className="flex-1 text-sm text-slate-700">Filmed application video — multiple takes until it was clear and concise</div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-20 text-sm font-semibold text-slate-600">2 weeks before</div>
                  <div className="flex-1 text-sm text-slate-700">Finalized pitch deck — got feedback from previous YC founders</div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-20 text-sm font-semibold text-slate-600">Application day</div>
                  <div className="flex-1 text-sm text-slate-700">Submitted — then immediately started preparing for possible interview</div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-20 text-sm font-semibold text-slate-600">Interview prep</div>
                  <div className="flex-1 text-sm text-slate-700">Practiced answers to common questions, prepared live demo, memorized all metrics</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Get Feedback on Your Application */}
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle>Get Feedback on Your Application</CardTitle>
              <CardDescription>Book a session to review your deck, video, or application before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>30-45 min sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>~2 day response time</span>
                </div>
              </div>
              <div className="flex gap-2">
                {/* @ts-ignore */}
                <Button asChild disabled={!isPremium}>
                  <Link href={isPremium ? 'mailto:support@foundermatch.local?subject=Book%20YC%20Application%20Review' : '#'}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Application Review
                  </Link>
                </Button>
                {/* @ts-ignore */}
                <Button asChild variant="outline" disabled={!isPremium}>
                  <Link href={isPremium ? 'mailto:support@foundermatch.local?subject=YC%20Question' : '#'}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ask Quick Question
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {!isPremium && (
          <div className="mt-8 text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-slate-600 mb-4">
              Ready to see exactly how they got into YC W26?
            </p>
            {/* @ts-ignore */}
            <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-700">
              <Link href="/pricing">
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
