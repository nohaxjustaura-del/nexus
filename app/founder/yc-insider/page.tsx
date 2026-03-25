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
  Clock,
  Target,
  Zap,
  BarChart3,
  Users
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
    // Skip credit check for premium users (they have unlimited credits shown as MAX_SAFE_INTEGER)
    if (!isPremium && credits < cost) {
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
        // Update credits (will be MAX_SAFE_INTEGER for admin/premium)
        setCredits(data.remainingCredits)
        // Add the new purchase to local state (no need to refetch)
        setPurchases(prev => prev.includes(itemId) ? prev : [...prev, itemId])
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
                Get operator-grade breakdowns from founders currently in YC W26
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-slate-600">
                  Access decision logic, templates, and insider intelligence you can't Google
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
          
          {/* Founders */}
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
                        <Link href={isPremium ? 'mailto:support@nexus.local?subject=Question%20for%20William' : '#'}>
                          <MessageSquare className="h-3 w-3 mr-1.5" />
                          Ask
                        </Link>
                      </Button>
                      {/* @ts-ignore */}
                      <Button asChild size="sm" variant="ghost" disabled={!isPremium}>
                        <Link href={isPremium ? 'mailto:support@nexus.local?subject=Book%20Session' : '#'}>
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
                        <Link href={isPremium ? 'mailto:support@nexus.local?subject=Question%20for%20Inigo' : '#'}>
                          <MessageSquare className="h-3 w-3 mr-1.5" />
                          Ask
                        </Link>
                      </Button>
                      {/* @ts-ignore */}
                      <Button asChild size="sm" variant="ghost" disabled={!isPremium}>
                        <Link href={isPremium ? 'mailto:support@nexus.local?subject=Book%20Session' : '#'}>
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
            <Card className="border-2 hover:border-purple-300 transition-colors relative">
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
                    <CardDescription className="text-xs">Raw YC application answers + why each works + fill-in templates</CardDescription>
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
                    className="w-full bg-purple-600 hover:bg-purple-700" 
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
            <Card className="border-2 hover:border-blue-300 transition-colors relative">
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
                {hasPurchased('pitch-deck-autopsy') ? (
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=pitch-deck-autopsy`, {
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
                    Access Deck Autopsy
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('pitch-deck-autopsy', 60)
                    }}
                    disabled={purchasing === 'pitch-deck-autopsy'}
                  >
                    {purchasing === 'pitch-deck-autopsy' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for 60 Credits
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Module 3: Interview Simulator */}
            <Card className="border-2 hover:border-green-300 transition-colors relative">
              {hasPurchased('interview-simulator') && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Interview Simulator</CardTitle>
                    <CardDescription className="text-xs">YC questions + their answers + what YC was testing + drill mode</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-slate-600">
                    <strong>What you get:</strong> Interactive drill with actual YC interview questions, their answers, YC's intent behind each question, and follow-up patterns.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Actual interview questions</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Their winning answers</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>YC intent analysis</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Follow-up patterns</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('interview-simulator') ? (
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=interview-simulator`, {
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
                    Access Interview Prep
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('interview-simulator', 65)
                    }}
                    disabled={purchasing === 'interview-simulator'}
                  >
                    {purchasing === 'interview-simulator' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for 65 Credits
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Module 4: Metrics Timeline */}
            <Card className="border-2 hover:border-amber-300 transition-colors relative">
              {hasPurchased('metrics-timeline') && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Metrics Snapshot Timeline</CardTitle>
                    <CardDescription className="text-xs">Their traction at 90/30/0 days before YC + growth story</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-slate-600">
                    <strong>What you get:</strong> Exact metrics at 90 days, 30 days, and application week — showing progress velocity, not just scale.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>90/30/0 day snapshots</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Growth rate analysis</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Retention signals</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>How they framed progress</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('metrics-timeline') ? (
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=metrics-timeline`, {
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
                    Access Metrics Timeline
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-amber-600 hover:bg-amber-700" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('metrics-timeline', 50)
                    }}
                    disabled={purchasing === 'metrics-timeline'}
                  >
                    {purchasing === 'metrics-timeline' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for 50 Credits
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Module 5: Distribution Diary */}
            <Card className="border-2 hover:border-indigo-300 transition-colors relative">
              {hasPurchased('distribution-diary') && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Distribution Diary</CardTitle>
                    <CardDescription className="text-xs">First 10 customers + outreach scripts + what worked/failed</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-slate-600">
                    <strong>What you get:</strong> Copy/paste scripts, channel playbooks, and the exact experiments they ran to get early traction.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>First 10 customer stories</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Outreach scripts (DM/email)</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Channel experiments</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>What didn't work + why</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('distribution-diary') ? (
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=distribution-diary`, {
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
                    Access Distribution Playbook
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('distribution-diary', 55)
                    }}
                    disabled={purchasing === 'distribution-diary'}
                  >
                    {purchasing === 'distribution-diary' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for 55 Credits
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Module 6: Demo Teardown */}
            <Card className="border-2 hover:border-rose-300 transition-colors relative">
              {hasPurchased('demo-teardown') && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <Video className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Demo Teardown</CardTitle>
                    <CardDescription className="text-xs">Application video + timestamp notes + what to copy</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-slate-600">
                    <strong>What you get:</strong> Their application video with timestamp annotations showing what's being proven at each moment and what to replicate.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Full application video</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Timestamp breakdowns</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>What to copy</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Demo script</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('demo-teardown') ? (
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=demo-teardown`, {
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
                    Watch Demo Teardown
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-rose-600 hover:bg-rose-700" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('demo-teardown', 55)
                    }}
                    disabled={purchasing === 'demo-teardown'}
                  >
                    {purchasing === 'demo-teardown' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for 55 Credits
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Bundle Deal */}
            <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50/30 to-white">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-xl">Complete Insider Pack</CardTitle>
                  <Badge className="bg-orange-100 text-orange-700">Save 40 Credits</Badge>
                </div>
                <CardDescription>Get all 6 modules + bonus templates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Everything above plus exclusive bonus: Founder Operating System (weekly cadence, decision principles, tool stack)
                  </p>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="text-sm text-slate-600">Individual: 360 credits</div>
                      <div className="text-2xl font-bold text-slate-900">Bundle: 320 credits</div>
                    </div>
                    <Button 
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handlePurchase('complete-pack', 320)
                      }}
                      disabled={purchasing === 'complete-pack'}
                    >
                      {purchasing === 'complete-pack' ? 'Processing...' : 'Unlock Complete Pack'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Why This Matters */}
          <Card className="border-2 bg-slate-50">
            <CardHeader>
              <CardTitle>Why This Is Different</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-slate-900 mb-1">Not Google-able</div>
                  <p className="text-slate-600">Decision logic, templates, and insider patterns you can't find anywhere else</p>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 mb-1">Actionable Templates</div>
                  <p className="text-slate-600">Fill-in frameworks you can use immediately for your own application</p>
                </div>
                <div>
                  <div className="font-semibold text-slate-900 mb-1">Verified & Current</div>
                  <p className="text-slate-600">From founders currently in YC W26, not outdated advice from years ago</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}

