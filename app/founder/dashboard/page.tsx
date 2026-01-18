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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'AI Analysis',
      description: 'Analyze your pitch deck, video, or idea',
      icon: Sparkles,
      href: '/founder/ai-analysis',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      title: 'My Matches',
      description: 'View your personalized VC matches',
      icon: Target,
      href: '/founder/matches',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
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
      description: 'Get AI-powered feedback on your pitch deck',
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
        {/* Header - Simplified */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                Dashboard
              </h1>
              <p className="text-slate-600">
                Manage your startup journey
              </p>
            </div>
            {credits && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    {credits.credits ?? 0}
                  </div>
                  <div className="text-sm text-slate-600">Credits</div>
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
        <div className="mb-8">
          <DailyClaim />
        </div>

        {/* Stats - Simplified */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <div className="text-2xl font-bold text-slate-900 mb-1">{stats.analysesCount}</div>
                <p className="text-sm text-slate-600">Analyses</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <div className="text-2xl font-bold text-slate-900 mb-1">{stats.matchesCount}</div>
                <p className="text-sm text-slate-600">Matches</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <div className="text-2xl font-bold text-slate-900 mb-1">{stats.bookmarksCount}</div>
                <p className="text-sm text-slate-600">Bookmarks</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-5">
                <div className="text-2xl font-bold text-slate-900 mb-1">{stats.profileCompleteness}%</div>
                <p className="text-sm text-slate-600">Profile</p>
                {stats.profileCompleteness < 100 && (
                  <Link href="/founder/onboarding" className="mt-2 inline-block">
                    <Button size="sm" variant="outline" className="w-full text-xs">
                      Complete
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Smart Reminders - Simplified */}
        {stats && (
          <Card className="mb-8 border border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.profileCompleteness < 100 && (
                  <Link href="/founder/onboarding">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors">
                      <div>
                        <p className="font-medium text-sm text-amber-900">Complete Your Profile</p>
                        <p className="text-xs text-amber-700">{stats.profileCompleteness}% complete</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-amber-600" />
                    </div>
                  </Link>
                )}
                {stats.analysesCount === 0 && (
                  <Link href="/founder/ai-analysis">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
                      <div>
                        <p className="font-medium text-sm text-blue-900">Get Your First Analysis</p>
                        <p className="text-xs text-blue-700">Analyze your pitch materials</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-blue-600" />
                    </div>
                  </Link>
                )}
                <Link href="/founder/discover">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-slate-900">Discover VCs</p>
                      <p className="text-xs text-slate-600">Browse 1,002 investors</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600" />
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
          <Card className="mb-8 border-2 border-slate-200 animate-slide-up" style={{ animationDelay: '0.2s' }}>
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
                    <div className="flex items-center justify-between p-3 rounded-lg border-2 border-slate-200 hover:border-primary/40 hover:bg-slate-50 transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {analysis.type === 'video-pitch' && <Video className="h-4 w-4 text-primary" />}
                          {analysis.type === 'pitch-deck' && <FileText className="h-4 w-4 text-primary" />}
                          {analysis.type === 'pitch-idea' && <Lightbulb className="h-4 w-4 text-primary" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900">
                            {analysis.type === 'video-pitch' && 'Video Pitch Analysis'}
                            {analysis.type === 'pitch-deck' && 'Pitch Deck Analysis'}
                            {analysis.type === 'pitch-idea' && 'Pitch Idea Analysis'}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
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
                <Button variant="outline" className="w-full mt-4 border-2">
                  View All Analyses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Simplified */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.slice(0, 6).map((action, idx) => {
              const Icon = action.icon
              return (
                <Link key={idx} href={action.href}>
                  <Card className="border border-slate-200 hover:border-primary/50 hover:shadow-sm transition-all bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100">
                          <Icon className="h-5 w-5 text-slate-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-slate-900 truncate">{action.title}</h3>
                          <p className="text-xs text-slate-600 truncate">{action.description}</p>
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


