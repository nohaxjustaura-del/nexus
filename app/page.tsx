'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Rocket,
  Zap,
  Target,
  Users,
  TrendingUp,
  Sparkles,
  Shield,
  Lock,
  UserRound,
  Check,
} from 'lucide-react'
import { track as trackEvent } from '@/lib/analytics'

const track = (event: string, props?: Record<string, unknown>) => {
  try {
    trackEvent(event as never, props as never)
  } catch {
    /* analytics optional */
  }
}

export default function Home() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      router.replace(`/api/auth/callback${window.location.search}`)
    }
  }, [router])

  useEffect(() => {
    setMounted(true)
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check', {
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' },
        })
        const data = await res.json().catch(() => ({}))
        setIsAuthenticated(Boolean(data?.authenticated && data?.verified))
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  return (
    <div className="relative flex min-h-[calc(100vh-3.25rem)] flex-col">
      <div className="page-shell flex flex-1 flex-col pb-28 pt-10 md:pt-14">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/40 bg-card/60 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" aria-hidden />
            Investor intelligence for founders
          </p>
          <h1 className="text-balance font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-[3.25rem] md:leading-[1.12]">
            Get matched to{' '}
            <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">
              1,002 investors
            </span>{' '}
            who fund startups like yours
          </h1>
          <p
            className="mx-auto mt-6 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
            suppressHydrationWarning
          >
            Upload your pitch idea, deck, or video. We analyze your story and surface investors who are a real fit, not a
            generic list.
          </p>

          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Button
              size="lg"
              onClick={() => {
                track('cta_clicked', { name: 'find_matches', page: 'home' })
                if (!mounted || !isAuthenticated) {
                  router.push('/signup')
                } else {
                  router.push('/founder/dashboard')
                }
              }}
              className="h-12 rounded-full px-10 text-base font-semibold"
            >
              {mounted && isAuthenticated ? (
                <>
                  Go to dashboard
                  <LayoutDashboard className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Find my matches
                  <Rocket className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <Link
              href="/founder/discover"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'h-12 rounded-full border-border/50 bg-card/40 px-10 text-base font-semibold backdrop-blur-sm'
              )}
            >
              Browse investors
            </Link>
          </div>

          {mounted && (
            <div className="mt-12 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
              {['Double opt-in', 'Private by default', 'Global coverage'].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-border/35 bg-muted/30 px-3 py-1.5 backdrop-blur-sm"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </section>

        <div className="section-divider" aria-hidden />

        {/* Fund coach: single soft surface */}
        <section>
          <div className="overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-b from-card/80 to-card/40 shadow-none backdrop-blur-md">
            <div className="border-b border-border/25 bg-muted/20 px-6 py-5 md:px-10 md:py-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                Fundraising coach
              </div>
            </div>
            <div className="px-6 py-10 md:px-10 md:py-12">
              <h2 className="max-w-2xl font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                A clear fundraising roadmap from your real materials
              </h2>
              <p className="mt-5 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
                We review your pitch, deck, or video with an investor-style lens, then match you to{' '}
                <strong className="font-semibold text-foreground">verified VCs, accelerators, and programs</strong> in our
                database. You get tailored talking points for each investor.
              </p>

              <ul className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  { title: 'Deep analysis', desc: 'Pitch, traction, team, and market' },
                  { title: 'Smart matching', desc: 'Recommendations grounded in fit' },
                  { title: 'Pitch adaptation', desc: 'Notes you can use in real conversations' },
                ].map((item) => (
                  <li
                    key={item.title}
                    className="flex gap-3 rounded-2xl border border-border/25 bg-background/40 p-5 backdrop-blur-sm transition-colors hover:border-border/45"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/15">
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-11 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="h-12 rounded-full px-8 text-base font-semibold"
                  onClick={() => {
                    track('cta_clicked', { name: 'start_free_analysis', page: 'home' })
                    if (!mounted || !isAuthenticated) {
                      router.push('/signup')
                    } else {
                      router.push('/onboarding/founder')
                    }
                  }}
                >
                  Start free analysis
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
                <Link
                  href="/analysis"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'h-12 rounded-full border-border/50 px-8 text-base font-semibold'
                  )}
                >
                  View sample analysis
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="section-divider" aria-hidden />

        {/* Value props */}
        <section>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Smarter outreach, fewer dead ends
            </h2>
            <p className="mt-4 text-pretty text-muted-foreground">Focus on investors who align with your stage, sector, and story.</p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
            {[
              {
                icon: Target,
                title: 'Smart matching',
                body: 'We weigh stage, sector, thesis, and how you tell your story, not keywords alone.',
              },
              {
                icon: Zap,
                title: 'Faster signal',
                body: 'Spend time on conversations that have a plausible path, not spray-and-pray.',
              },
              {
                icon: Users,
                title: 'Verified network',
                body: '1,002+ curated investors, accelerators, and strategic programs.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-3xl border border-border/30 bg-card/50 p-7 backdrop-blur-sm transition-all duration-300 hover:border-border/50"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border/25 pt-10 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Signal-based matching
            </span>
            <span className="hidden text-border/60 sm:inline">·</span>
            <span>Evidence-based shortlists</span>
            <span className="hidden text-border/60 sm:inline">·</span>
            <span className="font-medium text-foreground">1,002 verified investors</span>
          </div>
        </section>

        <div className="section-divider" aria-hidden />

        {/* Stats: single cohesive panel */}
        <section>
          <div className="overflow-hidden rounded-3xl border border-border/30 bg-border/30 p-px shadow-none backdrop-blur-md">
            <div className="grid grid-cols-2 gap-px bg-border/30 md:grid-cols-4">
              {[
                { n: '500+', l: 'Active VCs' },
                { n: '1,002', l: 'Verified investors' },
                { n: '50+', l: 'Sectors' },
                { n: 'Live', l: 'Match engine' },
              ].map((s) => (
                <div key={s.l} className="bg-card/95 px-4 py-9 text-center backdrop-blur-sm md:py-10">
                  <div className="font-heading text-2xl font-bold tabular-nums text-foreground md:text-3xl">{s.n}</div>
                  <div className="mt-2 text-xs font-medium text-muted-foreground md:text-sm">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="section-divider" aria-hidden />

        {/* Trust */}
        <section className="pb-4">
          <div className="rounded-3xl border border-border/25 bg-gradient-to-b from-muted/25 to-muted/10 px-6 py-12 backdrop-blur-sm md:px-12 md:py-14">
            <div className="text-center">
              <h3 className="font-heading text-xl font-bold tracking-tight text-foreground md:text-2xl">Your data stays yours</h3>
              <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
                Decks and personal details are protected. Nothing is shared without your intent.
              </p>
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {[
                { icon: Shield, title: 'Secure storage', desc: 'Encrypted handling of uploads and profile data.' },
                { icon: Lock, title: 'Private by default', desc: 'Investors only see what you choose to share.' },
                { icon: UserRound, title: 'Full control', desc: 'Delete your account and data when you want.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="text-center">
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-medium text-foreground">{title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
