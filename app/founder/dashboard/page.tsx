'use client'

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
  BarChart3,
  Rocket,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAuthSession } from '@/components/auth-session-provider'
import { legacyNexusExtrasEnabled } from '@/lib/nexus-surface-flags'
import { FounderWorkspaceTabs } from '@/components/founder-workspace-tabs'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { ProgressRing } from '@/components/ui/progress-ring'

type HubSummary = {
  subscription: { isPro: boolean; tier: string }
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

const analysisTypeConfig: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  'video-pitch': { icon: Video, label: 'Video pitch', color: 'text-violet-400' },
  'unified-pitch': { icon: Video, label: 'Unified pitch', color: 'text-violet-400' },
  'pitch-deck': { icon: FileText, label: 'Pitch deck', color: 'text-blue-400' },
  'pitch-idea': { icon: Lightbulb, label: 'Pitch idea', color: 'text-amber-400' },
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
      desc: 'Start AI analysis',
      icon: Sparkles,
      href: '/founder/ai-analysis',
      gradient: 'from-violet-500/10 to-blue-500/10',
      iconColor: 'text-violet-400',
    },
    {
      title: 'Your matches',
      desc: 'View best fits',
      icon: Target,
      href: '/founder/matches',
      gradient: 'from-emerald-500/10 to-teal-500/10',
      iconColor: 'text-emerald-400',
    },
    {
      title: 'Find investors',
      desc: 'Browse directory',
      icon: Search,
      href: '/founder/discover',
      gradient: 'from-blue-500/10 to-cyan-500/10',
      iconColor: 'text-blue-400',
    },
    ...(showNetworkStartHere
      ? ([
          {
            title: 'Network',
            desc: 'Partner access',
            icon: Network,
            href: '/founder/network',
            gradient: 'from-orange-500/10 to-amber-500/10',
            iconColor: 'text-orange-400',
          },
        ] as const)
      : []),
    {
      title: 'Saved',
      desc: 'Your shortlist',
      icon: Bookmark,
      href: '/founder/bookmarks',
      gradient: 'from-pink-500/10 to-rose-500/10',
      iconColor: 'text-pink-400',
    },
  ] as const

  const stats = summary
  const hasData = stats && (stats.analysesCount > 0 || stats.matchesCount > 0 || stats.bookmarksCount > 0)

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh bg-dot-grid" aria-hidden />
      <div className="page-shell-narrow">
        {isAdmin && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-200/80">
              <Shield className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
              <span>Admin mode active</span>
            </div>
            <Link
              href="/admin/dashboard"
              className={buttonVariants({
                size: 'sm',
                className: 'shrink-0 bg-amber-600/80 text-white hover:bg-amber-600 shadow-none',
              })}
            >
              Admin hub
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <div className="mb-6">
          <FounderWorkspaceTabs />
        </div>

        <header className="mb-8 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow-label mb-2">Founder workspace</p>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Your hub
              </h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-[15px]">
                Analyze, match, and track everything in one clean workspace.
              </p>
            </div>
            {pending ? (
              <Skeleton className="h-9 w-24 rounded-full" />
            ) : stats?.subscription?.isPro ? (
              <Badge variant="glow" className="gap-1.5 px-3 py-1">
                <Crown className="h-3.5 w-3.5" />
                Pro
              </Badge>
            ) : (
              <Link href="/pricing" className={buttonVariants({ size: 'sm', className: 'rounded-full shadow-sm' })}>
                Upgrade to Pro
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </header>

        {/* Stat cards */}
        {pending ? (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-5">
              {[
                { label: 'Analyses', value: stats.analysesCount, max: 20, icon: BarChart3, color: 'text-violet-400', ring: 'text-violet-400' },
                { label: 'Matches', value: stats.matchesCount, max: 50, icon: Target, color: 'text-emerald-400', ring: 'text-emerald-400' },
                { label: 'Saved', value: stats.bookmarksCount, max: 30, icon: Bookmark, color: 'text-blue-400', ring: 'text-blue-400' },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <Card key={stat.label} className="group border-border/60 bg-card/70 shadow-sm hover:border-primary/25">
                    <CardContent className="flex items-center gap-4 p-5">
                      <ProgressRing
                        value={stat.value}
                        max={stat.max}
                        size={52}
                        strokeWidth={4}
                        fillClass={stat.ring}
                      />
                      <div className="min-w-0 flex-1">
                        <AnimatedCounter
                          value={stat.value}
                          className="text-2xl font-bold text-foreground"
                          formatNumber={false}
                        />
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className={cn('h-3.5 w-3.5', stat.color)} strokeWidth={1.75} />
                          {stat.label}
                        </p>
                      </div>
                      {stat.value > 0 && (
                        <TrendingUp className="h-4 w-4 text-success/60" strokeWidth={1.75} />
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {stats.profileCompleteness < 100 && (
              <Link href="/founder/onboarding" className="mb-8 block">
                <div className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-5 py-3.5 shadow-sm backdrop-blur-sm transition-all hover:border-amber-500/35 hover:bg-amber-500/[0.1]">
                  <div className="flex items-center gap-3">
                    <ProgressRing
                      value={stats.profileCompleteness}
                      max={100}
                      size={36}
                      strokeWidth={3}
                      fillClass="text-amber-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-amber-100">Complete your profile</p>
                      <p className="text-xs text-amber-200/60">{stats.profileCompleteness}% done -- better profiles get better matches</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-amber-400/70" />
                </div>
              </Link>
            )}
          </>
        ) : null}

        {/* Quick actions */}
        <div className="mb-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <p className="eyebrow-label">Quick actions</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Jump straight into your most-used flows</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {primaryLinks.map(({ title, desc, icon: Icon, href, gradient, iconColor }) => (
              <Link key={href} href={href}>
                <Card className="group h-full border-border/60 bg-card/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30">
                  <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                    <span className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-105',
                      gradient
                    )}>
                      <Icon className={cn('h-5 w-5', iconColor)} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-foreground">{title}</h3>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary/60" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent analyses */}
        {pending ? (
          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-2 h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ) : stats && stats.recentAnalyses.length > 0 ? (
          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent analyses</CardTitle>
              <CardDescription>Your latest runs at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {stats.recentAnalyses.map((analysis, idx) => {
                const config = analysisTypeConfig[analysis.type] || analysisTypeConfig['pitch-idea']
                const Icon = config.icon
                return (
                  <Link key={analysis.id} href="/founder/my-analyses">
                    <div className="group flex items-center justify-between rounded-xl border border-transparent px-3 py-3 transition-all hover:border-border/60 hover:bg-muted/40">
                      <div className="flex items-center gap-3">
                        {/* Timeline connector */}
                        <div className="relative flex flex-col items-center">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.06]">
                            <Icon className={cn('h-4 w-4', config.color)} strokeWidth={1.75} />
                          </div>
                          {idx < stats.recentAnalyses.length - 1 && (
                            <div className="absolute -bottom-3 h-3 w-px bg-border/40" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{config.label}</p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(analysis.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      {analysis.compatibilityScore > 0 && (
                        <Badge variant="secondary" className="tabular-nums font-mono text-xs">
                          {Math.round(analysis.compatibilityScore)}%
                        </Badge>
                      )}
                    </div>
                  </Link>
                )
              })}
              <Link href="/founder/my-analyses" className="mt-3 block">
                <Button variant="outline" className="w-full bg-background/60">
                  All analyses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : !pending && !hasData ? (
          /* Empty state for new users */
          <Card className="border-border/60 border-dashed bg-card/70 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/[0.04]">
                <Rocket className="h-7 w-7 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Start your first analysis</h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  Upload your pitch deck or idea to get AI-powered scoring, feedback, and investor matches.
                </p>
              </div>
              <Button asChild className="mt-2 shadow-sm shadow-primary/20">
                <Link href="/founder/ai-analysis">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze your pitch
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
