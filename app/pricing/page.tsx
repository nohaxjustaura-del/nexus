'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  Zap, 
  Target, 
  CheckCircle,
  ArrowRight,
  Crown,
  UserCheck,
  Calendar
} from "lucide-react"
import Link from "next/link"

export default function PricingPage() {
  const [credits, setCredits] = useState<{ credits: number; isPremium: boolean }>({ credits: 0, isPremium: false })
  const [loading, setLoading] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/user/credits', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCredits(data || { credits: 0, isPremium: false }))
      .catch(() => setCredits({ credits: 0, isPremium: false }))
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
        alert(data.error || 'Failed to create checkout session')
        setLoading(null)
      }
    } catch (error) {
      console.error('Purchase error:', error)
      alert('Failed to process payment. Please try again.')
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
        alert(data.error || 'Failed to create subscription')
        setLoading(null)
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to process subscription. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/30 to-white">
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Simple Credit-Based Pricing
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            Pay only for what you use. No subscriptions, no hidden fees.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Your Credits: <span className="text-primary font-bold">{mounted ? (credits.credits ?? 0).toLocaleString() : '0'}</span>
            </span>
            {mounted && credits.isPremium && (
              <Badge className="ml-2 bg-yellow-500">
                <Crown className="mr-1 h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
        </div>

        {/* Credit Packages - 4 column grid with Premium */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg">Starter</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">$19</span>
                <span className="text-muted-foreground text-sm"> / 50 credits</span>
              </div>
              <div className="text-xs text-green-600 font-medium mt-1">$0.38 per credit</div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <ul className="space-y-2 text-sm text-muted-foreground mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span><strong>1 complete analysis</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Video or Pitch Deck analysis (50 credits)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Browse all 1,038 VCs for free</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Perfect for first-time founders</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => handlePurchase('starter')}
                disabled={loading !== null}
              >
                {loading === 'starter' ? 'Processing...' : 'Buy 50 Credits'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary relative hover:shadow-xl transition-all duration-300">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">Most Popular</Badge>
            <CardHeader>
              <CardTitle className="text-lg">Founder</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">$49</span>
                <span className="text-muted-foreground text-sm"> / 150 credits</span>
              </div>
              <div className="text-xs text-primary font-medium mt-1">$0.33 per credit • 13% savings</div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <ul className="space-y-2 text-sm text-muted-foreground mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span><strong>3 complete analysis cycles</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>3 Video/Pitch Deck analyses (150 credits)</span>
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
                className="w-full" 
                size="lg" 
                variant="default"
                onClick={() => handlePurchase('founder')}
                disabled={loading !== null}
              >
                {loading === 'founder' ? 'Processing...' : 'Buy 150 Credits'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg">Pro</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">$99</span>
                <span className="text-muted-foreground text-sm"> / 400 credits</span>
              </div>
              <div className="text-xs text-purple-600 font-medium mt-1">$0.25 per credit • 34% savings</div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <ul className="space-y-2 text-sm text-muted-foreground mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span><strong>8 complete analysis cycles</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>8 Video/Pitch Deck analyses (400 credits)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Perfect for teams or multiple iterations</span>
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
                className="w-full" 
                size="lg"
                onClick={() => handlePurchase('pro')}
                disabled={loading !== null}
              >
                {loading === 'pro' ? 'Processing...' : 'Buy 400 Credits'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 via-primary/3 to-background relative hover:shadow-xl transition-all duration-300">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full text-xs font-semibold">
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
                <span className="text-muted-foreground text-sm"> /month</span>
              </div>
              <div className="text-xs text-yellow-600 font-medium mt-1">Unlimited usage • Cancel anytime</div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <ul className="space-y-2 text-sm text-muted-foreground mb-6 flex-grow">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span><strong>Unlimited AI analyses</strong></span>
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
                className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90" 
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
            <CardDescription>How many credits each feature costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* FREE FEATURES FIRST */}
              <div className="flex items-center justify-between rounded-lg border-2 p-4 bg-green-50 border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <div className="font-medium">Browse All VCs</div>
                    <div className="text-sm text-muted-foreground">View full database</div>
                  </div>
                </div>
                <Badge className="text-base px-3 py-1 bg-green-100 text-green-700 shrink-0">Free</Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border-2 p-4 bg-green-50 border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <div className="font-medium">Tailored Recommendations</div>
                    <div className="text-sm text-muted-foreground">Matches based on profile</div>
                  </div>
                </div>
                <Badge className="text-base px-3 py-1 bg-green-100 text-green-700 shrink-0">Free</Badge>
              </div>

              {/* PAID FEATURES - CHEAPEST TO MOST EXPENSIVE */}
              <div className="flex items-center justify-between rounded-lg border-2 p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">Unlock Top 5 Matches</div>
                    <div className="text-sm text-muted-foreground">See detailed match scores</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1 shrink-0">10</Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border-2 p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">Pitch Deck Analysis</div>
                    <div className="text-sm text-muted-foreground">AI-powered feedback</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1 shrink-0">50</Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border-2 p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <div className="font-medium">Video Pitch Analysis</div>
                    <div className="text-sm text-muted-foreground">Presentation feedback</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1 shrink-0">50</Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border-2 border-purple-200 p-4 hover:border-purple-400 transition-colors bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-purple-600 shrink-0" />
                  <div>
                    <div className="font-medium">VC-Accepted Founder Review</div>
                    <div className="text-sm text-muted-foreground">Get feedback from funded founders</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1 bg-purple-100 text-purple-700 shrink-0">200</Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg border-2 border-blue-200 p-4 hover:border-blue-400 transition-colors bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-medium">Schedule 1-on-1 Meeting</div>
                    <div className="text-sm text-muted-foreground">Book time with mentors or experts</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-base px-3 py-1 bg-blue-100 text-blue-700 shrink-0">400</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Refund policy: If an analyzer fails to generate a report, you'll be fully refunded. Credits never expire.
        </p>
      </div>
    </div>
  )
}





