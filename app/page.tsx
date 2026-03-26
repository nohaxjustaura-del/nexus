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
  const [isAdmin, setIsAdmin] = useState(false)
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
        setIsAdmin(Boolean(data?.isAdmin))
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="bg-page-mesh fixed inset-0 -z-10" aria-hidden />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_55%_40%_at_50%_0%,hsl(var(--primary)/0.06),transparent)]"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col">
        {/* Hero */}
        <section className="px-4 pt-14 pb-10 md:pt-24 md:pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/75 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-white/[0.03] backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75 motion-reduce:hidden"
                  aria-hidden
                />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden />
              </span>
              Investor intelligence for founders
            </p>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl md:leading-[1.06]">
              Get matched to{' '}
              <span className="bg-gradient-to-r from-primary via-sky-400 to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient motion-reduce:animate-none">
                1,002 investors
              </span>{' '}
              who fund startups like yours
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg" suppressHydrationWarning>
              Upload your pitch idea, deck, or video. We analyze your story and surface investors who are a real fit - not a generic list.
            </p>

            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                onClick={() => {
                  track('cta_clicked', { name: 'find_matches', page: 'home' })
                  if (!mounted || !isAuthenticated) {
                    router.push('/signup')
                  } else {
                    router.push(isAdmin ? '/admin/dashboard' : '/founder/dashboard')
                  }
                }}
                className="h-12 px-8 text-base font-semibold ring-1 ring-primary/30"
              >
                {mounted && isAuthenticated ? (
                  <>
                    {isAdmin ? 'Admin dashboard' : 'Go to dashboard'}
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
                  'h-12 border-border/80 bg-card/40 px-8 text-base font-semibold backdrop-blur-md ring-1 ring-white/[0.04] hover:bg-card/55'
                )}
              >
                Browse investors
              </Link>
            </div>

            {mounted && (
              <div className="mt-11 flex flex-wrap items-center justify-center gap-2.5 text-xs text-muted-foreground">
                {['Double opt-in', 'Private by default', 'Global coverage'].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-border/70 bg-muted/25 px-3 py-1.5 backdrop-blur-sm ring-1 ring-white/[0.03]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Fund coach */}
        <section className="px-4 py-10 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="surface-panel overflow-hidden">
              <div className="border-b border-border/80 bg-gradient-to-r from-muted/50 via-muted/30 to-transparent px-6 py-4 md:px-10 md:py-5">
                <div className="inline-flex items-center gap-2 rounded-lg bg-primary/12 px-3 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI fund coach
                </div>
              </div>
              <div className="px-6 py-8 md:px-10 md:py-10">
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  A clear fundraising roadmap from your real materials
                </h2>
                <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">
                  We review your pitch, deck, or video with an investor-style lens, then match you to{' '}
                  <strong className="font-semibold text-foreground">verified VCs, accelerators, and programs</strong> in our database - with
                  tailored talking points per investor.
                </p>

                <ul className="mt-8 grid gap-4 sm:grid-cols-3">
                  {[
                    { title: 'Deep analysis', desc: 'Pitch, traction, team, and market' },
                    { title: 'Smart matching', desc: 'Recommendations grounded in fit' },
                    { title: 'Pitch adaptation', desc: 'Notes you can use in real conversations' },
                  ].map((item) => (
                    <li key={item.title} className="flex gap-3 rounded-xl border border-border/70 bg-background/40 p-4 ring-1 ring-white/[0.03] transition-colors hover:border-border hover:bg-background/55">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/15">
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground leading-snug">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base font-semibold"
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
                      'h-12 border-border px-8 text-base font-semibold bg-transparent'
                    )}
                  >
                    View sample analysis
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="px-4 py-10 md:py-14">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">Smarter outreach, fewer dead ends</h2>
              <p className="mx-auto mt-3 max-w-lg text-muted-foreground leading-relaxed">
                Focus on investors who align with your stage, sector, and story.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: Target,
                  title: 'Smart matching',
                  body: 'We weigh stage, sector, thesis, and how you tell your story - not keywords alone.',
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
                  className="group rounded-2xl border border-border/80 bg-card/60 p-6 ring-1 ring-white/[0.04] backdrop-blur-sm transition-all duration-300 hover:border-primary/25"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-105">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border pt-8 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                AI-assisted matching
              </span>
              <span className="hidden sm:inline text-border">·</span>
              <span>Evidence-based shortlists</span>
              <span className="hidden sm:inline text-border">·</span>
              <span className="font-medium text-foreground">1,002 verified investors</span>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="px-4 py-8 md:py-12">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {[
              { n: '500+', l: 'Active VCs' },
              { n: '1,002', l: 'Verified investors' },
              { n: '50+', l: 'Sectors' },
              { n: 'AI', l: 'Match engine' },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-xl border border-border/80 bg-card/50 px-4 py-5 text-center ring-1 ring-white/[0.04] backdrop-blur-md"
              >
                <div className="font-heading text-2xl font-bold text-foreground md:text-3xl">{s.n}</div>
                <div className="mt-1 text-xs font-medium text-muted-foreground md:text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section className="px-4 pb-16 md:pb-24">
          <div className="mx-auto max-w-5xl rounded-2xl border border-border/80 bg-muted/15 px-6 py-10 ring-1 ring-white/[0.04] md:px-12 md:py-12">
            <div className="text-center">
              <h3 className="font-heading text-xl font-bold text-foreground md:text-2xl">Your data stays yours</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Decks and personal details are protected. Nothing is shared without your intent.
              </p>
            </div>
            <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
              {[
                { icon: Shield, title: 'Secure storage', desc: 'Encrypted handling of uploads and profile data.' },
                { icon: Lock, title: 'Private by default', desc: 'Investors only see what you choose to share.' },
                { icon: UserRound, title: 'Full control', desc: 'Delete your account and data when you want.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="font-semibold text-foreground">{title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
