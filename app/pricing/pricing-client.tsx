'use client'

import { useState, useEffect } from 'react'
import { normalizeUserCreditsApiPayload } from '@/lib/client/normalize-user-credits-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast-simple"
import { 
  Sparkles, 
  Zap, 
  Target, 
  CheckCircle,
  ArrowRight,
  Crown,
  UserCheck,
  Calendar,
  Bookmark
} from "lucide-react"
/** Credit Costs grid: high contrast, black + blue only (no mint/purple/pastels). */
const creditCostRow =
  "flex items-center justify-between rounded-lg border-2 border-slate-200 bg-slate-50 p-4 transition-colors hover:border-blue-500/60 dark:border-zinc-700 dark:bg-zinc-950/85 dark:hover:border-blue-500/50"
const creditCostTitle = "font-medium text-foreground"
const creditCostSub = "text-sm text-slate-700 dark:text-zinc-300"
const creditCostBadge =
  "shrink-0 border border-zinc-300 bg-zinc-200 text-base font-medium text-zinc-900 shadow-none hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800 px-3 py-1"

export default function PricingClient({ verifiedInvestorCountLabel }: { verifiedInvestorCountLabel: string }) {
  const [credits, setCredits] = useState<{
    credits: number
    isPremium: boolean
    unlimitedCredits?: boolean
  }>({ credits: 0, isPremium: false })
  const [loading, setLoading] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/user/credits', { credentials: 'include' })
      .then(res => res.json())
      .then((raw) => {
        const n = normalizeUserCreditsApiPayload(raw)
        setCredits({ credits: n.credits, isPremium: n.isPremium, unlimitedCredits: n.unlimitedCredits })
      })
      .catch(() => setCredits({ credits: 0, isPremium: false, unlimitedCredits: false }))
  }, [])

  const handlePurchase = async (packageType: 'starter' | 'founder' | 'pro') => {
    setLoading(packageType)
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ package: packageType }),
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to create checkout session')
        setLoading(null)
      }
    } catch (error) {
      console.error('Purchase error:', error)
      toast.error('Failed to process payment. Please try again.')
      setLoading(null)
    }
  }

  const handleSubscribe = async () => {
    setLoading('premium')
    try {
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to create subscription')
        setLoading(null)
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast.error('Failed to process subscription. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-700 bg-clip-text text-transparent">
            Simple Credit-Based Pricing
          </h1>
          <p className="text-foreground/80 text-lg md:text-xl max-w-2xl mx-auto">
            Pay only for what you use. No subscriptions, no hidden fees.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Your Credits:{' '}
              <span className="text-primary font-bold">
                {mounted ? (credits.unlimitedCredits ? '∞' : (credits.credits ?? 0).toLocaleString()) : '0'}
              </span>
            </span>
            {mounted && credits.isPremium && (
              <Badge className="ml-2 border border-blue-500/40 bg-blue-600 text-white hover:bg-blue-600">
                <Crown className="mr-1 h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
        </div>

        {/* Credit Packages - 4 column grid with Premium */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-stretch">
          <Card className="flex h-full flex-col border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg">Starter</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">$19</span>
                <span className="text-foreground/60 text-sm"> / 50 credits</span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">$0.38 per credit</div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <ul className="flex-1 space-y-2 text-sm text-foreground/75">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span><strong className="text-foreground">1 complete analysis</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>1 Video Pitch (50) OR 1 Pitch Deck (30) + extras</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Browse all {verifiedInvestorCountLabel} VCs for free</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Solid for a first pass at fundraising</span>
                </li>
              </ul>
              <Button 
                className="mt-auto w-full" 
                size="lg"
                onClick={() => handlePurchase('starter')}
                disabled={loading !== null}
              >
                {loading === 'starter' ? 'Processing...' : 'Buy 50 Credits'}
              </Button>
            </CardContent>
          </Card>

          <Card className="relative flex h-full flex-col border-2 border-primary hover:shadow-xl transition-all duration-300">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">Most Popular</Badge>
            <CardHeader>
              <CardTitle className="text-lg">Founder</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">$49</span>
                <span className="text-foreground/60 text-sm"> / 150 credits</span>
              </div>
              <div className="text-xs text-primary font-medium mt-1">$0.33 per credit • 13% savings</div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <ul className="flex-1 space-y-2 text-sm text-foreground/75">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span><strong className="text-foreground">3 complete analysis cycles</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>10 Pitch Ideas OR 5 Pitch Decks OR 3 Video Pitches</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Test different pitch versions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Iterate and refine your pitch</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Best value for serious founders</span>
                </li>
              </ul>
              <Button 
                className="mt-auto w-full" 
                size="lg" 
                variant="default"
                onClick={() => handlePurchase('founder')}
                disabled={loading !== null}
              >
                {loading === 'founder' ? 'Processing...' : 'Buy 150 Credits'}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg">Pro</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">$99</span>
                <span className="text-foreground/60 text-sm"> / 400 credits</span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">$0.25 per credit • 34% savings</div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-6">
              <ul className="flex-1 space-y-2 text-sm text-foreground/75">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span><strong className="text-foreground">8 complete analysis cycles</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>33 Pitch Ideas OR 16 Pitch Decks OR 10 Video Pitches</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Enough runway for teams iterating often</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Comprehensive pitch refinement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Best value for scaling startups</span>
                </li>
              </ul>
              <Button 
                className="mt-auto w-full" 
                size="lg"
                onClick={() => handlePurchase('pro')}
                disabled={loading !== null}
              >
                {loading === 'pro' ? 'Processing...' : 'Buy 400 Credits'}
              </Button>
            </CardContent>
          </Card>

          <Card className="relative flex h-full flex-col border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-primary/3 to-background hover:shadow-xl transition-all duration-300">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-3 py-1 rounded-full text-xs font-semibold">
              <Crown className="h-3 w-3" />
              Premium
            </div>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Premium
              </CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">$79</span>
                <span className="text-foreground/60 text-sm"> /month</span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Unlimited usage • Cancel anytime</div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-6">
              <ul className="space-y-2 text-sm text-foreground/75">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span><strong className="text-foreground">Unlimited pitch analyses</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Unlimited VC match unlocks</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Unlimited pitch deck analyses</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Priority support (24h response)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Early access to new features</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Best value if you use 300+ credits/month</span>
                </li>
              </ul>
              <Button 
                className="mt-auto w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90" 
                size="lg"
                onClick={handleSubscribe}
                disabled={loading !== null}
              >
                {loading === 'premium' ? 'Processing...' : (
                  <>
                    Upgrade to Premium
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature Pricing */}
        <Card className="mb-6 border-2">
          <CardHeader>
            <CardTitle className="text-xl">Credit Costs</CardTitle>
            <CardDescription className="text-foreground/70">
              How many credits each feature costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* FREE FEATURES FIRST */}
              <div className={creditCostRow}>
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="min-w-0">
                    <div className={creditCostTitle}>Browse All VCs</div>
                    <div className={creditCostSub}>View full database</div>
                  </div>
                </div>
                <Badge className="shrink-0 border-0 bg-blue-600 px-3 py-1 text-base font-medium text-white shadow-none hover:bg-blue-600">
                  Free
                </Badge>
              </div>

              <div className={creditCostRow}>
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="min-w-0">
                    <div className={creditCostTitle}>Tailored Recommendations</div>
                    <div className={creditCostSub}>Matches based on profile</div>
                  </div>
                </div>
                <Badge className="shrink-0 border-0 bg-blue-600 px-3 py-1 text-base font-medium text-white shadow-none hover:bg-blue-600">
                  Free
                </Badge>
              </div>

              {/* PAID FEATURES - CHEAPEST TO MOST EXPENSIVE */}
              <div className={creditCostRow}>
                <div className="flex items-center gap-3 min-w-0">
                  <Target className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="min-w-0">
                    <div className={creditCostTitle}>Unlock Top 5 Matches</div>
                    <div className={creditCostSub}>See detailed match scores</div>
                  </div>
                </div>
                <Badge className={creditCostBadge}>10</Badge>
              </div>

              <div className={creditCostRow}>
                <div className="flex items-center gap-3 min-w-0">
                  <Sparkles className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="min-w-0">
                    <div className={creditCostTitle}>Pitch Idea Analysis</div>
                    <div className={creditCostSub}>Written feedback on your idea</div>
                  </div>
                </div>
                <Badge className={creditCostBadge}>15</Badge>
              </div>

              <div className={creditCostRow}>
                <div className="flex items-center gap-3 min-w-0">
                  <Sparkles className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="min-w-0">
                    <div className={creditCostTitle}>Pitch Deck Analysis</div>
                    <div className={creditCostSub}>Slide-by-slide deck review</div>
                  </div>
                </div>
                <Badge className={creditCostBadge}>30</Badge>
              </div>

              <div className={creditCostRow}>
                <div className="flex items-center gap-3 min-w-0">
                  <Sparkles className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="min-w-0">
                    <div className={creditCostTitle}>Video Pitch Analysis</div>
                    <div className={creditCostSub}>Presentation feedback</div>
                  </div>
                </div>
                <Badge className={creditCostBadge}>50</Badge>
              </div>

              <div className={creditCostRow}>
                <div className="flex items-center gap-3 min-w-0">
                  <UserCheck className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="min-w-0">
                    <div className={creditCostTitle}>VC-Accepted Founder Review</div>
                    <div className={creditCostSub}>Get feedback from funded founders</div>
                  </div>
                </div>
                <Badge className={creditCostBadge}>200</Badge>
              </div>

              <div className={creditCostRow}>
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="min-w-0">
                    <div className={creditCostTitle}>Schedule 1-on-1 Meeting</div>
                    <div className={creditCostSub}>Book time with mentors or experts</div>
                  </div>
                </div>
                <Badge className={creditCostBadge}>400</Badge>
              </div>

              <div className={creditCostRow}>
                <div className="flex items-center gap-3 min-w-0">
                  <Bookmark className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="min-w-0">
                    <div className={creditCostTitle}>Bookmark VCs</div>
                    <div className={creditCostSub}>Save investors to revisit later</div>
                  </div>
                </div>
                <Badge className="shrink-0 border-0 bg-blue-600 px-3 py-1 text-base font-medium text-white shadow-none hover:bg-blue-600">
                  Free
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-foreground/65">
          Refund policy: If an analyzer fails to generate a report, you'll be fully refunded. Credits never expire.
        </p>
      </div>
    </div>
  )
}





