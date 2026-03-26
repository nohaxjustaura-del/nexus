'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DailyClaim from "@/components/daily-claim"
import { 
  Search, 
  Sparkles, 
  FileText, 
  Target,
  TrendingUp,
  Bookmark,
  BarChart3,
  Settings,
  Rocket,
  Video,
  Lightbulb,
  Crown,
  CheckCircle,
  Clock,
  Activity,
  ArrowRight,
  Send
} from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { MatchQualityInsights } from "@/components/match-quality-insights"

export default function FounderDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState<{ credits: number; isPremium: boolean } | null>(null)
  const [stats, setStats] = useState<{
    analysesCount: number
    bookmarksCount: number
    matchesCount: number
    profileCompleteness: number
    recentAnalyses: any[]
  } | null>(null)
  const [founderProfile, setFounderProfile] = useState<any>(null)

  useEffect(() => {
    let isMounted = true

    // Check auth
    fetch('/api/auth/check', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return
        if (!data?.authenticated) {
          router.push('/signup')
          return
        }
        setLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        router.push('/signup')
      })

    // Load credits
    fetch('/api/user/credits', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (isMounted) setCredits(data)
      })
      .catch(() => {})

    // Load stats
    Promise.all([
      fetch('/api/all-analyses', { credentials: 'include' }).then(r => r.json()).catch(() => ({ analyses: [] })),
      fetch('/api/founder/profile', { credentials: 'include' }).then(r => r.json()).catch(() => ({ founder: null }))
    ]).then(([analysesData, profileData]) => {
      if (!isMounted) return
      
      const analyses = (analysesData.analyses || []).filter((a: any) => a.type !== 'resume')
      const founder = profileData.founder || profileData.profile
      
      // Store founder profile for insights
      if (founder) {
        setFounderProfile(founder)
      }
      
      // Calculate profile completeness
      let completeness = 0
      if (founder) {
        const fields = [
          founder.name, founder.startupName, founder.bio, founder.stage,
          founder.sectors, founder.location, founder.fundingNeed,
          founder.pitchDeck, founder.videoPitchUrl, founder.linkedinUrl
        ]
        const filledFields = fields.filter(f => f && f !== '' && f !== '[]').length
        completeness = Math.round((filledFields / fields.length) * 100)
      }

      // Calculate matches count more safely
      const matchesCount = analyses.reduce((sum: number, a: any) => {
        const count = a.result?.matchCount || a.result?.matches?.length || 0
        return sum + (typeof count === 'number' ? count : 0)
      }, 0)

      setStats({
        analysesCount: analyses.length,
        bookmarksCount: 0, // Would need separate API call
        matchesCount,
        profileCompleteness: completeness,
        recentAnalyses: analyses.slice(0, 3)
      })
    }).catch(() => {})

    return () => {
      isMounted = false
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.25rem)]">
        <div className="page-shell">
          <Skeleton className="mb-8 h-12 w-64" />
          <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const quickActions = [
    {
      title: 'Discover VCs',
      description: 'Browse and search 200+ investors',
      icon: Search,
      href: '/founder/discover',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-primary/10',
      iconColor: 'text-blue-400'
    },
    {
      title: 'Pitch analysis',
      description: 'Analyze your pitch deck, video, or idea',
      icon: Sparkles,
      href: '/founder/ai-analysis',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-400'
    },
    {
      title: 'My Matches',
      description: 'View your personalized VC matches',
      icon: Target,
      href: '/founder/matches',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400'
    },
    {
      title: 'Bookmarks',
      description: 'Your saved investors',
      icon: Bookmark,
      href: '/founder/bookmarks',
    },
  ]

  const analysisOptions = [
    {
      title: 'Pitch Deck Analysis',
      description: 'Get detailed feedback on your pitch deck',
      icon: FileText,
      href: '/founder/ai-analysis?tab=pitch-deck',
      credits: 50
    },
    {
      title: 'Video Pitch Analysis',
      description: 'Analyze your video pitch presentation',
      icon: Video,
      href: '/founder/ai-analysis?tab=video',
      credits: 50
    },
    {
      title: 'Pitch Idea Analysis',
      description: 'Get feedback on your startup idea',
      icon: Lightbulb,
      href: '/founder/ai-analysis?tab=pitch-idea',
      credits: 15
    },
  ]

  return (
    <div className="min-h-[calc(100vh-3.25rem)]">
      <div className="page-shell">
        <div className="mb-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="mb-2 font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Dashboard
              </h1>
              <p className="text-muted-foreground">Manage your startup journey</p>
            </div>
            {credits && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">
                    {credits.credits ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Credits</div>
                </div>
                {credits.isPremium && (
                  <Badge className="bg-amber-500 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Daily Claim */}
        <div className="mb-10">
          <DailyClaim />
        </div>

        {stats && (
          <div className="mb-10 overflow-hidden rounded-3xl border border-border/30 bg-border/25 p-px backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-px bg-border/25 lg:grid-cols-4">
              <Card className="rounded-none border-0 shadow-none backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold tabular-nums text-foreground">{stats.analysesCount}</div>
                  <p className="text-sm text-muted-foreground">Analyses</p>
                </CardContent>
              </Card>
              <Card className="rounded-none border-0 shadow-none backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold tabular-nums text-foreground">{stats.matchesCount}</div>
                  <p className="text-sm text-muted-foreground">Matches</p>
                </CardContent>
              </Card>
              <Card className="rounded-none border-0 shadow-none backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold tabular-nums text-foreground">{stats.bookmarksCount}</div>
                  <p className="text-sm text-muted-foreground">Bookmarks</p>
                </CardContent>
              </Card>
              <Card className="rounded-none border-0 shadow-none backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold tabular-nums text-foreground">{stats.profileCompleteness}%</div>
                  <p className="text-sm text-muted-foreground">Profile</p>
                  {stats.profileCompleteness < 100 && (
                    <Link href="/founder/onboarding" className="mt-3 inline-block w-full">
                      <Button size="sm" variant="outline" className="w-full rounded-full text-xs">
                        Complete
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Smart Reminders - Simplified */}
        {stats && (
          <Card className="mb-10 border-border/30 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading">Quick actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.profileCompleteness < 100 && (
                  <Link href="/founder/onboarding">
                    <div className="flex items-center justify-between rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 transition-colors hover:bg-amber-500/15">
                      <div>
                        <p className="text-sm font-medium text-amber-100">Complete your profile</p>
                        <p className="text-xs text-amber-200/80">{stats.profileCompleteness}% complete</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-amber-300" />
                    </div>
                  </Link>
                )}
                {stats.analysesCount === 0 && (
                  <Link href="/founder/ai-analysis">
                    <div className="flex items-center justify-between rounded-2xl border border-primary/25 bg-primary/10 p-4 transition-colors hover:bg-primary/15">
                      <div>
                        <p className="text-sm font-medium text-foreground">Get your first analysis</p>
                        <p className="text-xs text-muted-foreground">Analyze your pitch materials</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                    </div>
                  </Link>
                )}
                <Link href="/founder/discover">
                  <div className="flex items-center justify-between rounded-2xl border border-border/40 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">Discover VCs</p>
                      <p className="text-xs text-muted-foreground">Browse 1,002 investors</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Match Quality Insights */}
        {stats && founderProfile && (
          <div className="mb-8">
            <MatchQualityInsights
              analyses={stats.recentAnalyses || []}
              founderProfile={founderProfile}
              matches={stats.recentAnalyses?.[0]?.result?.matches || []}
            />
          </div>
        )}

        {/* Recent Activity */}
        {stats && stats.recentAnalyses.length > 0 && (
          <Card className="mb-10 animate-slide-up border-border/30" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Recent Activity</CardTitle>
              </div>
              <CardDescription>Your latest analyses and matches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentAnalyses.map((analysis: any) => (
                  <Link key={analysis.id} href="/founder/my-analyses">
                    <div className="flex cursor-pointer items-center justify-between rounded-xl border border-border/40 p-3 transition-all hover:border-primary/35 hover:bg-muted/40">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {analysis.type === 'video-pitch' && <Video className="h-4 w-4 text-primary" />}
                          {analysis.type === 'pitch-deck' && <FileText className="h-4 w-4 text-primary" />}
                          {analysis.type === 'pitch-idea' && <Lightbulb className="h-4 w-4 text-primary" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {analysis.type === 'video-pitch' && 'Video Pitch Analysis'}
                            {analysis.type === 'pitch-deck' && 'Pitch Deck Analysis'}
                            {analysis.type === 'pitch-idea' && 'Pitch Idea Analysis'}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      {analysis.compatibilityScore > 0 && (
                        <Badge className="bg-gradient-to-r from-primary to-blue-600 text-white">
                          {Math.round(analysis.compatibilityScore)}% match
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/founder/my-analyses">
                <Button variant="outline" className="mt-4 w-full rounded-full border-border/50">
                  View All Analyses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Simplified */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.slice(0, 6).map((action, idx) => {
              const Icon = action.icon
              return (
                <Link key={idx} href={action.href}>
                  <Card className="border border-border hover:border-primary/50 hover:shadow-sm transition-all bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="h-5 w-5 text-foreground/85" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-foreground truncate">{action.title}</h3>
                          <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}


