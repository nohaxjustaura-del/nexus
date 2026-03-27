'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Rocket,
  Check,
  Upload,
  FileText,
  Video,
  Lightbulb,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { track as trackEvent } from '@/lib/analytics'
import { useAuthSession } from '@/components/auth-session-provider'
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard'
import type { UniversalAnalysisResult } from '@/lib/universal-analysis-engine'
import { BRAND_NAME } from '@/lib/brand'

/** Sample rubric for the landing preview (not user data). */
const HOME_DEMO_RUBRIC: UniversalAnalysisResult = {
  categories: {
    market: {
      score: 45,
      bullets: [
        'Category momentum is visible but still early versus comparable raises.',
        'Tighten the story with named pilots or design partners where possible.',
      ],
    },
    moat: {
      score: 30,
      bullets: [
        'Differentiation is stated; durable advantages need clearer proof.',
        'Competitive context is acknowledged but defensibility reads thin at this stage.',
      ],
    },
    founderFit: {
      score: 70,
      bullets: [
        'Founder narrative maps credibly to the problem space.',
        'Background signals support the wedge you are pursuing.',
      ],
    },
    momentum: {
      score: 50,
      bullets: [
        'Traction arc is developing; concrete milestones would strengthen the case.',
        'Go-to-market motion is plausible but not yet fully de-risked.',
      ],
    },
    execution: {
      score: 75,
      bullets: [
        'Problem and solution read clearly; communication is strong.',
        'Personal wedge plus early traction supports the story.',
        'Market proof points land without overclaiming.',
      ],
    },
  },
  globalVerdict: '',
}

/** Framer Motion in AnalysisDashboard can SSR/CSR mismatch; show a static shell until mounted. */
function HomeDemoAnalysisDashboard() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])
  if (!ready) {
    return (
      <div
        className="flex min-h-[240px] flex-col gap-3 rounded-xl border border-border/40 bg-background/90 p-3 sm:min-h-[260px] sm:p-3.5"
        aria-hidden
      >
        <div className="mb-2 flex shrink-0 items-center gap-2 border-b border-border/35 pb-2">
          <span className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/40" />
          <span className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/40" />
          <span className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/40" />
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">{BRAND_NAME}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {['market', 'moat', 'fit', 'mom', 'exe'].map((k) => (
            <div
              key={k}
              className="h-[52px] rounded-xl border border-border/40 bg-card/80 sm:h-[56px]"
            />
          ))}
        </div>
      </div>
    )
  }
  return (
    <AnalysisDashboard
      result={HOME_DEMO_RUBRIC}
      tilesOnly
      compact
      defaultOpenKey={null}
      showLiveVerified={false}
    />
  )
}

const track = (event: string, props?: Record<string, unknown>) => {
  try {
    trackEvent(event as never, props as never)
  } catch {
    /* analytics optional */
  }
}

export type HomeClientProps = {
  verifiedInvestorCountLabel: string
}

export default function HomeClient({ verifiedInvestorCountLabel }: HomeClientProps) {
  const router = useRouter()
  const { loading: authLoading, authenticated, verified } = useAuthSession()
  const [mounted, setMounted] = useState(false)
  const isVerifiedUser = !authLoading && authenticated && verified

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    // Supabase may send ?code= (PKCE) or ?token_hash= (email link) to Site URL; forward both to the API handler.
    if (q.get('code') || q.get('token_hash')) {
      router.replace(`/api/auth/callback${window.location.search}`)
    }
  }, [router])

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(38vh,22rem)] bg-[radial-gradient(ellipse_70%_55%_at_15%_-5%,hsl(var(--primary)/0.07),transparent_58%)]"
        aria-hidden
      />
      <div className="relative z-10 flex flex-col">
        <section className="border-b border-border/30 px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-14 md:pb-20 md:pt-16">
          <div className="mx-auto max-w-7xl lg:px-2">
            <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-14">
              <div className="lg:col-span-7 xl:col-span-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Investor matching
                </p>
                <h1 className="mt-3 font-heading text-[1.7rem] font-semibold leading-[1.16] tracking-tight text-foreground sm:text-4xl sm:leading-[1.12] md:text-[2.4rem] md:leading-[1.1]">
                  Rank who to talk to next using the pitch you already have.
                </h1>
                <p
                  className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base"
                  suppressHydrationWarning
                >
                  Upload a deck, a video pitch, or a short written summary. You get category scores with notes and a
                  ranked investor list against{' '}
                  <span className="font-medium text-foreground/90">
                    {verifiedInvestorCountLabel}+ verified profiles
                  </span>{' '}
                  in our network. Double opt-in intros; your materials stay private until you choose to share them.
                </p>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    size="lg"
                    onClick={() => {
                      track('cta_clicked', { name: 'find_matches', page: 'home' })
                      if (!mounted || !isVerifiedUser) {
                        router.push('/signup')
                      } else {
                        router.push('/founder/dashboard')
                      }
                    }}
                    className="h-11 rounded-lg px-7 text-sm font-semibold shadow-sm sm:h-12 sm:px-8 sm:text-base"
                  >
                    {mounted && isVerifiedUser ? (
                      <>
                        Open founder hub
                        <LayoutDashboard className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Run a match pass
                        <Rocket className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Link
                    href={
                      mounted && isVerifiedUser
                        ? '/founder/discover'
                        : `/signup?next=${encodeURIComponent('/founder/discover')}`
                    }
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'lg' }),
                      'h-11 rounded-lg border-border/50 bg-background/40 px-7 text-sm font-semibold backdrop-blur-sm sm:h-12 sm:px-8 sm:text-base hover:bg-muted/35'
                    )}
                  >
                    Search the network
                  </Link>
                </div>
              </div>

              <aside className="rounded-2xl border border-border/40 bg-card/60 p-6 shadow-sm ring-1 ring-border/20 backdrop-blur-sm sm:p-7 lg:col-span-5 xl:col-span-5 xl:col-start-8">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">At a glance</p>
                <p className="mt-4 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {verifiedInvestorCountLabel}+
                </p>
                <p className="mt-1 text-sm text-muted-foreground">verified investor profiles in the network</p>
                <ul className="mt-6 space-y-3 border-t border-border/35 pt-6 text-sm leading-snug text-muted-foreground">
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                    <span>Scores and a ranked shortlist from one submission.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                    <span>Double opt-in intros; share materials only when you choose.</span>
                  </li>
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <section
          className="border-b border-border/30 px-4 py-14 sm:px-6 sm:py-16 md:py-20"
          aria-labelledby="home-how-heading"
        >
          <div className="mx-auto max-w-7xl lg:px-2">
            <div className="max-w-2xl">
              <h2
                id="home-how-heading"
                className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
              >
                How it works
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                Upload once, review scores and your ranked shortlist, then edit intro copy before you send anything.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:gap-5 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,2fr)_auto_minmax(0,1fr)] lg:items-stretch lg:gap-x-2 lg:gap-y-0">
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                    1
                  </span>
                  <span className="text-[11px] text-muted-foreground">Founder-side</span>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Upload</p>
                <ul className="divide-y divide-border/35 overflow-hidden rounded-xl border border-border/40 bg-background/80">
                  {[
                    { name: 'pitch_deck.pdf', Icon: FileText },
                    { name: 'video_pitch.mp4', Icon: Video },
                    { name: 'one_liner_idea.txt', Icon: Lightbulb },
                  ].map(({ name, Icon }) => (
                    <li key={name} className="flex items-center gap-3 px-3 py-2.5 sm:py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/90 sm:text-[13px]">
                        {name}
                      </span>
                      <Upload className="h-4 w-4 shrink-0 text-muted-foreground/55" strokeWidth={1.75} aria-hidden />
                    </li>
                  ))}
                </ul>
                <p className="mt-auto flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                  <span>One submission feeds both the score breakdown and your shortlist.</span>
                </p>
              </div>

              <div
                className="flex items-center justify-center py-0.5 text-muted-foreground/45 lg:min-h-0 lg:w-11 lg:self-stretch lg:py-0"
                aria-hidden
              >
                <ChevronDown className="h-5 w-5 shrink-0 lg:hidden" strokeWidth={2} />
                <ChevronRight className="hidden h-7 w-7 shrink-0 lg:block" strokeWidth={1.75} />
              </div>

              <div className="flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                    2
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Rubric + shortlist
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      Investors are ranked by fit with short notes per row (thesis, stage). Below is a sample rubric
                      panel only—not your data.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border/50 bg-muted/25 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Sample
                  </span>
                </div>
                <div className="relative flex min-h-[240px] flex-1 flex-col rounded-xl border border-border/40 bg-background/90 p-3 sm:min-h-[260px] sm:p-3.5">
                  <div className="mb-2 flex shrink-0 items-center gap-2 border-b border-border/35 pb-2">
                    <span className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/40" aria-hidden />
                    <span className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/40" aria-hidden />
                    <span className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/40" aria-hidden />
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">{BRAND_NAME}</span>
                  </div>
                  <div className="min-h-0 min-w-0 flex-1">
                    <HomeDemoAnalysisDashboard />
                  </div>
                </div>
              </div>

              <div
                className="flex items-center justify-center py-0.5 text-muted-foreground/45 lg:min-h-0 lg:w-11 lg:self-stretch lg:py-0"
                aria-hidden
              >
                <ChevronDown className="h-5 w-5 shrink-0 lg:hidden" strokeWidth={2} />
                <ChevronRight className="hidden h-7 w-7 shrink-0 lg:block" strokeWidth={1.75} />
              </div>

              <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                      3
                    </span>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Data & intros
                    </p>
                  </div>
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border/40 bg-muted/20 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                    <span>Verified investor profiles from a curated directory—updated on an ongoing basis.</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                    Privacy
                  </Link>
                  : TLS in transit, encrypted storage, deletion per policy. Intros are double opt-in; showing your
                  profile to investors stays opt-in.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
