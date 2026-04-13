'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Sparkles,
  Target,
  Bookmark,
  Crown,
  Shield,
  ArrowRight,
  FileText,
  Video,
  Lightbulb,
  Clock,
  Network,
} from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAuthSession } from '@/components/auth-session-provider'
import { legacyNexusExtrasEnabled } from '@/lib/nexus-surface-flags'

const DailyClaim = dynamic(() => import('@/components/daily-claim'), {
  loading: () => <Skeleton className="mb-8 h-36 w-full rounded-lg" aria-hidden />,
  ssr: false,
})

type HubSummary = {
  credits: { credits: number; isPremium: boolean }
  bookmarksCount: number
  analysesCount: number
  matchesCount: number
  profileCompleteness: number
  recentAnalyses: Array<{
    id: string
    type: string
    createdAt: string
    compatibilityScore: number
  }>
}

export default function FounderDashboard() {
  const { isAdmin } = useAuthSession()
  const [pending, setPending] = useState(true)
  const [summary, setSummary] = useState<HubSummary | null>(null)
  const [canAccessFounderNetwork, setCanAccessFounderNetwork] = useState(false)

  useEffect(() => {
    let alive = true
    const maxWaitMs = 25_000
    const maxWait = window.setTimeout(() => {
      if (alive) setPending(false)
    }, maxWaitMs)

    fetch('/api/account/capabilities', { credentials: 'include' })
      .then(async (r) => {
        if (!alive || !r.ok) return
        const data = (await r.json()) as { authenticated?: boolean; canAccessFounderNetwork?: boolean }
        if (alive && data.authenticated && data.canAccessFounderNetwork) {
          setCanAccessFounderNetwork(true)
        }
      })
      .catch(() => {})

    fetch('/api/founder/hub-summary', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<HubSummary>
      })
      .then((body) => {
        if (!alive) return
        setSummary(body)
      })
      .catch(() => {
        if (alive) setSummary(null)
      })
      .finally(() => {
        window.clearTimeout(maxWait)
        if (alive) setPending(false)
      })

    return () => {
      alive = false
      window.clearTimeout(maxWait)
    }
  }, [])

  const showNetworkStartHere =
    legacyNexusExtrasEnabled() && canAccessFounderNetwork

  const primaryLinks = [
    {
      title: 'Analyze pitch',
      desc: 'Unified pitch, deck, video, and idea',
      icon: Sparkles,
      href: '/founder/ai-analysis',
    },
    {
      title: 'Your matches',
      desc: 'Ranked shortlist from analyses',
      icon: Target,
      href: '/founder/matches',
    },
    {
      title: 'Find investors',
      desc: 'Search the directory',
      icon: Search,
      href: '/founder/discover',
    },
    ...(showNetworkStartHere
      ? ([
          {
            title: 'Network',
            desc: 'Partner hubs: Luel playbooks, credits, founder access',
            icon: Network,
            href: '/founder/network',
          },
        ] as const)
      : []),
    {
      title: 'Saved',
      desc: 'Bookmarked investors',
      icon: Bookmark,
      href: '/founder/bookmarks',
    },
  ] as const

  const stats = summary

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />
      <div className="page-shell-narrow">
        {isAdmin && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-100">
              <Shield className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
              <span>Admin mode: open the admin hub for approvals and investor tools.</span>
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
          {pending ? (
            <div className="flex flex-col items-end gap-2 sm:text-right">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ) : stats ? (
            <div className="flex items-center gap-3 sm:text-right">
              <div>
                <div className="text-2xl font-bold tabular-nums text-foreground">{stats.credits.credits ?? 0}</div>
                <div className="text-xs text-muted-foreground">Credits</div>
              </div>
              {stats.credits.isPremium && (
                <Badge className="bg-amber-500 text-white">
                  <Crown className="mr-1 h-3 w-3" />
                  Premium
                </Badge>
              )}
            </div>
          ) : null}
        </header>

        <div className="mb-8">
          <DailyClaim />
        </div>

        {pending ? (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg sm:h-[5.5rem]" />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
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
        ) : null}

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Start here</h2>
        <div className="mb-10 grid gap-4 sm:grid-cols-2 md:gap-6">
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

        {pending ? (
          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-2 h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ) : stats && stats.recentAnalyses.length > 0 ? (
          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent analyses</CardTitle>
              <CardDescription>Open full history anytime.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.recentAnalyses.map((analysis) => (
                <Link key={analysis.id} href="/founder/my-analyses">
                  <div
                    className={cn(
                      'flex items-center justify-between rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-primary/10 p-2">
                        {(analysis.type === 'video-pitch' || analysis.type === 'unified-pitch') && (
                          <Video className="h-4 w-4 text-primary" />
                        )}
                        {analysis.type === 'pitch-deck' && <FileText className="h-4 w-4 text-primary" />}
                        {analysis.type === 'pitch-idea' && <Lightbulb className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {analysis.type === 'video-pitch' && 'Video pitch'}
                          {analysis.type === 'unified-pitch' && 'Unified pitch'}
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
        ) : null}
      </div>
    </div>
  )
}
