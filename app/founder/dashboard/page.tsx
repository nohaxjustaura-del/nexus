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
  Crown
} from "lucide-react"
import Link from "next/link"

export default function FounderDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState<{ credits: number; isPremium: boolean } | null>(null)

  useEffect(() => {
    // Check auth
    fetch('/api/auth/check', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data?.authenticated) {
          router.push('/signup')
          return
        }
        setLoading(false)
      })
      .catch(() => {
        router.push('/signup')
      })

    // Load credits
    fetch('/api/user/credits', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCredits(data))
      .catch(() => {})
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
                Welcome Back
              </h1>
              <p className="text-lg text-slate-600">
                Choose what you'd like to do next
              </p>
            </div>
            {credits && (
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">
                  {credits.credits ?? 0}
                </div>
                <div className="text-sm text-slate-600">Credits</div>
                {credits.isPremium && (
                  <Badge className="mt-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Daily Claim */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <DailyClaim />
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Quick Actions</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            {quickActions.map((action, idx) => {
              const Icon = action.icon
              return (
                <Link key={idx} href={action.href}>
                  <Card className={`${action.bgColor} border-2 border-transparent hover:border-slate-300 card-animated cursor-pointer h-full transition-all duration-300`}>
                    <CardContent className="p-6">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white mb-4 shadow-sm`}>
                        <Icon className={`h-6 w-6 ${action.iconColor}`} />
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 mb-2">{action.title}</h3>
                      <p className="text-sm text-slate-600">{action.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* AI Analysis Options */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">AI Analysis</h2>
          <div className="grid md:grid-cols-3 gap-4 stagger-children">
            {analysisOptions.map((option, idx) => {
              const Icon = option.icon
              return (
                <Link key={idx} href={option.href}>
                  <Card className="border-2 border-slate-200 hover:border-primary/40 card-animated cursor-pointer h-full transition-all duration-300 bg-white">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-3">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant="secondary">{option.credits} credits</Badge>
                      </div>
                      <CardTitle className="text-lg mb-2">{option.title}</CardTitle>
                      <CardDescription className="text-sm">{option.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Additional Resources */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/founder/my-analyses">
            <Card className="border-2 border-slate-200 hover:border-primary/40 card-animated cursor-pointer transition-all duration-300 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100">
                    <BarChart3 className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">My Analyses</h3>
                    <p className="text-sm text-slate-600">View all your past analyses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/pricing">
            <Card className="border-2 border-slate-200 hover:border-primary/40 card-animated cursor-pointer transition-all duration-300 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20">
                    <Rocket className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">Buy Credits</h3>
                    <p className="text-sm text-slate-600">Get more credits or upgrade to Premium</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}


