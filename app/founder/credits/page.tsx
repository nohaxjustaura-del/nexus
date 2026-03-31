'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Sparkles,
  FileText,
  Video,
  Lightbulb,
  MessageSquare,
  Crown,
  ArrowRight,
  Calendar,
} from 'lucide-react'
import Link from 'next/link'
import DailyClaim from '@/components/daily-claim'
import { normalizeUserCreditsApiPayload } from '@/lib/client/normalize-user-credits-api'

interface CreditUsage {
  feature: string
  count: number
  totalCost: number
  lastUsed: string | null
}

export default function CreditsPage() {
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState<{
    credits: number
    isPremium: boolean
    unlimitedCredits?: boolean
  } | null>(null)
  const [usage, setUsage] = useState<CreditUsage[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load credits
      const creditsRes = await fetch('/api/user/credits', { credentials: 'include' })
      const creditsRaw = await creditsRes.json()
      const n = normalizeUserCreditsApiPayload(creditsRaw)
      setCredits({
        credits: n.credits,
        isPremium: n.isPremium,
        unlimitedCredits: n.unlimitedCredits,
      })

      // Load analyses to calculate usage
      const analysesRes = await fetch('/api/all-analyses', { credentials: 'include' })
      const analysesData = await analysesRes.json()
      const analyses = analysesData.analyses || []

      // Calculate usage by feature
      const usageMap: Record<string, CreditUsage> = {
        'pitch-deck': { feature: 'Pitch Deck Analysis', count: 0, totalCost: 0, lastUsed: null },
        'video-pitch': { feature: 'Video Pitch Analysis', count: 0, totalCost: 0, lastUsed: null },
        'pitch-idea': { feature: 'Pitch Idea Analysis', count: 0, totalCost: 0, lastUsed: null },
        'founder-feedback': { feature: 'Founder Feedback', count: 0, totalCost: 0, lastUsed: null },
      }

      const costs: Record<string, number> = {
        'pitch-deck': 50,
        'video-pitch': 50,
        'pitch-idea': 15,
        'founder-feedback': 200,
      }

      analyses.forEach((analysis: any) => {
        const type = analysis.type
        if (usageMap[type]) {
          usageMap[type].count++
          usageMap[type].totalCost += costs[type] || 0
          if (!usageMap[type].lastUsed || new Date(analysis.createdAt) > new Date(usageMap[type].lastUsed)) {
            usageMap[type].lastUsed = analysis.createdAt
          }
        }
      })

      setUsage(Object.values(usageMap).filter(u => u.count > 0))
      setRecentActivity(analyses.slice(0, 5))
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/50 via-background to-primary/5">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    )
  }

  const totalSpent = usage.reduce((sum, u) => sum + u.totalCost, 0)
  const totalAnalyses = usage.reduce((sum, u) => sum + u.count, 0)
  const averageCost = totalAnalyses > 0 ? Math.round(totalSpent / totalAnalyses) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 via-background to-primary/5">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Credit Usage & Insights</h1>
              <p className="text-lg text-muted-foreground">Track how you're using your credits</p>
            </div>
            <Link href="/pricing">
              <Button>
                <Crown className="mr-2 h-4 w-4" />
                {credits?.isPremium ? 'Premium Active' : 'Upgrade to Premium'}
              </Button>
            </Link>
          </div>

          {/* Current Credits */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-foreground">
                      {credits?.unlimitedCredits ? '∞' : (credits?.credits ?? 0).toLocaleString()}
                    </span>
                    <span className="text-xl text-muted-foreground">credits</span>
                  </div>
                </div>
                <div className="text-right">
                  {credits?.isPremium ? (
                    <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 text-sm">
                      <Crown className="mr-1 h-4 w-4" />
                      Premium Member
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="px-4 py-2 text-sm">
                      Free Tier
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {!credits?.isPremium && (
            <div className="mt-6">
              <DailyClaim />
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <TrendingUp className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-foreground">{totalAnalyses}</div>
              <p className="text-sm text-muted-foreground">Total Analyses</p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-accent">
                  <Coins className="h-5 w-5 text-accent-foreground" />
                </div>
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-3xl font-bold text-foreground">{totalSpent}</div>
              <p className="text-sm text-muted-foreground">Credits Spent</p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold text-foreground">{averageCost}</div>
              <p className="text-sm text-muted-foreground">Avg Cost/Analysis</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Breakdown */}
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle>Usage by Feature</CardTitle>
            <CardDescription>See how many credits each feature uses</CardDescription>
          </CardHeader>
          <CardContent>
            {usage.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="mx-auto h-12 w-12 mb-4 text-muted-foreground/40" />
                <p>No usage data yet. Start analyzing to see your credit usage!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {usage.map((item, idx) => {
                  const iconMap: Record<string, any> = {
                    'Pitch Deck Analysis': FileText,
                    'Video Pitch Analysis': Video,
                    'Pitch Idea Analysis': Lightbulb,
                    'Founder Feedback': MessageSquare,
                  }
                  const Icon = iconMap[item.feature] || Sparkles
                  const percentage = totalSpent > 0 ? Math.round((item.totalCost / totalSpent) * 100) : 0

                  return (
                    <div key={idx} className="p-4 border-2 border-border rounded-lg hover:border-primary/40 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{item.feature}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.count} {item.count === 1 ? 'use' : 'uses'} • {item.totalCost} credits
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{percentage}%</Badge>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-blue-600 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      {item.lastUsed && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last used: {new Date(item.lastUsed).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Recent Credit Usage</CardTitle>
              <CardDescription>Your latest analyses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity: any) => {
                  const costMap: Record<string, number> = {
                    'pitch-deck': 50,
                    'video-pitch': 50,
                    'pitch-idea': 15,
                    'founder-feedback': 200,
                  }
                  const cost = costMap[activity.type] || 0
                  const iconMap: Record<string, any> = {
                    'pitch-deck': FileText,
                    'video-pitch': Video,
                    'pitch-idea': Lightbulb,
                  }
                  const Icon = iconMap[activity.type] || Sparkles

                  return (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 rounded-lg border-2 border-border hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {activity.type === 'pitch-deck' && 'Pitch Deck Analysis'}
                            {activity.type === 'video-pitch' && 'Video Pitch Analysis'}
                            {activity.type === 'pitch-idea' && 'Pitch Idea Analysis'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-semibold">
                        -{cost} credits
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="mt-8 border-2 border-primary/25 bg-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Credit Saving Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-foreground/85">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>Pitch Idea Analysis (15 credits) is the most cost-effective way to get feedback</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>Complete your profile to get better matches and reduce need for multiple analyses</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>Premium members get unlimited analyses - upgrade to save credits long-term</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}








