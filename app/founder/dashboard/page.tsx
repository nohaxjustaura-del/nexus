'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import DailyClaim from '@/components/daily-claim'
import { Search, Sparkles, Target, Bookmark, Crown, Shield, ArrowRight, FileText, Video, Lightbulb, Clock } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let isMounted = true

    fetch('/api/auth/check', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return
        if (!data?.authenticated) {
          router.push('/signup')
          return
        }
        setIsAdmin(Boolean(data?.isAdmin))
        setLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        router.push('/signup')
      })

    fetch('/api/user/credits', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setCredits(data)
      })
      .catch(() => {})

    Promise.all([
      fetch('/api/all-analyses', { credentials: 'include' })
        .then((r) => r.json())
        .catch(() => ({ analyses: [] })),
      fetch('/api/founder/profile', { credentials: 'include' })
        .then((r) => r.json())
        .catch(() => ({ founder: null })),
      fetch('/api/bookmarks', { credentials: 'include' })
        .then((r) => r.json())
        .catch(() => ({ total: 0 })),
    ]).then(([analysesData, profileData, bookmarksData]) => {
      if (!isMounted) return

      const analyses = (analysesData.analyses || []).filter((a: any) => a.type !== 'resume')
      const founder = profileData.founder || profileData.profile
      const bookmarksCount = typeof bookmarksData.total === 'number' ? bookmarksData.total : 0

      let completeness = 0
      if (founder) {
        const fields = [
          founder.name,
          founder.startupName,
          founder.bio,
          founder.stage,
          founder.sectors,
          founder.location,
          founder.fundingNeed,
          founder.pitchDeck,
          founder.videoPitchUrl,
          founder.linkedinUrl,
        ]
        const filledFields = fields.filter((f) => f && f !== '' && f !== '[]').length
        completeness = Math.round((filledFields / fields.length) * 100)
      }

      const matchesCount = analyses.reduce((sum: number, a: any) => {
        const count = a.result?.matchCount || a.result?.matches?.length || 0
        return sum + (typeof count === 'number' ? count : 0)
      }, 0)

      setStats({
        analysesCount: analyses.length,
        bookmarksCount,
        matchesCount,
        profileCompleteness: completeness,
        recentAnalyses: analyses.slice(0, 5),
      })
    }).catch(() => {})

    return () => {
      isMounted = false
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
          <Skeleton className="mb-8 h-10 w-48" />
          <Skeleton className="mb-6 h-36 w-full" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const primaryLinks = [
    {
      title: 'Find investors',
      desc: 'Search the directory',
      icon: Search,
      href: '/founder/discover',
    },
    {
      title: 'Analyze pitch',
      desc: 'Deck, video, or idea',
      icon: Sparkles,
      href: '/founder/ai-analysis',
    },
    {
      title: 'Your matches',
      desc: 'From past analyses',
      icon: Target,
      href: '/founder/matches',
    },
    {
      title: 'Saved',
      desc: 'Bookmarked investors',
      icon: Bookmark,
      href: '/founder/bookmarks',
    },
  ] as const

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
        {isAdmin && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-100">
              <Shield className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
              <span>Admin mode — open the admin hub for approvals and VC tools.</span>
            </div>
            <Link
              href="/admin/dashboard"
              className={buttonVariants({
                size: 'sm',
                className: 'shrink-0 bg-amber-700 text-white hover:bg-amber-800 hover:text-white shadow-none',
              })}
            >
              Admin hub
            </Link>
          </div>
        )}

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">Your hub</h1>
            <p className="mt-1 text-muted-foreground">Discover investors, run analysis, track saves.</p>
          </div>
          {credits && (
            <div className="flex items-center gap-3 sm:text-right">
              <div>
                <div className="text-2xl font-bold tabular-nums text-foreground">{credits.credits ?? 0}</div>
                <div className="text-xs text-muted-foreground">Credits</div>
              </div>
              {credits.isPremium && (
                <Badge className="bg-amber-500 text-white">
                  <Crown className="mr-1 h-3 w-3" />
                  Premium
                </Badge>
              )}
            </div>
          )}
        </header>

        <div className="mb-8">
          <DailyClaim />
        </div>

        {stats && (
          <>
            <div className="mb-6 grid grid-cols-3 gap-3">
              <Card className="border-border/80">
                <CardContent className="p-4 text-center sm:p-5">
                  <div className="text-xl font-bold tabular-nums sm:text-2xl">{stats.analysesCount}</div>
                  <p className="text-xs text-muted-foreground">Analyses</p>
                </CardContent>
              </Card>
              <Card className="border-border/80">
                <CardContent className="p-4 text-center sm:p-5">
                  <div className="text-xl font-bold tabular-nums sm:text-2xl">{stats.matchesCount}</div>
                  <p className="text-xs text-muted-foreground">Matches</p>
                </CardContent>
              </Card>
              <Card className="border-border/80">
                <CardContent className="p-4 text-center sm:p-5">
                  <div className="text-xl font-bold tabular-nums sm:text-2xl">{stats.bookmarksCount}</div>
                  <p className="text-xs text-muted-foreground">Saved</p>
                </CardContent>
              </Card>
            </div>

            {stats.profileCompleteness < 100 && (
              <Link href="/founder/onboarding" className="mb-8 block">
                <div className="flex items-center justify-between rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 transition-colors hover:bg-amber-500/[0.14]">
                  <div>
                    <p className="text-sm font-medium text-amber-100">Finish your profile ({stats.profileCompleteness}%)</p>
                    <p className="text-xs text-amber-200/80">Better profiles get stronger matches.</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-amber-400" />
                </div>
              </Link>
            )}
          </>
        )}

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Start here</h2>
        <div className="mb-10 grid gap-3 sm:grid-cols-2">
          {primaryLinks.map(({ title, desc, icon: Icon, href }) => (
            <Link key={href} href={href}>
              <Card className="h-full border-border/80 transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-5 w-5 text-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground">{title}</h3>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {stats && stats.recentAnalyses.length > 0 && (
          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent analyses</CardTitle>
              <CardDescription>Open full history anytime.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.recentAnalyses.map((analysis: any) => (
                <Link key={analysis.id} href="/founder/my-analyses">
                  <div
                    className={cn(
                      'flex items-center justify-between rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-primary/10 p-2">
                        {analysis.type === 'video-pitch' && <Video className="h-4 w-4 text-primary" />}
                        {analysis.type === 'pitch-deck' && <FileText className="h-4 w-4 text-primary" />}
                        {analysis.type === 'pitch-idea' && <Lightbulb className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {analysis.type === 'video-pitch' && 'Video pitch'}
                          {analysis.type === 'pitch-deck' && 'Pitch deck'}
                          {analysis.type === 'pitch-idea' && 'Pitch idea'}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(analysis.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    {analysis.compatibilityScore > 0 && (
                      <Badge variant="secondary" className="tabular-nums">
                        {Math.round(analysis.compatibilityScore)}%
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
              <Link href="/founder/my-analyses" className="mt-2 block">
                <Button variant="outline" className="w-full">
                  All analyses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
