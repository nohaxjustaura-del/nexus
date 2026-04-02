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
  Lightbulb,
  Video,
  ChevronDown,
  BarChart3,
  Send,
  RefreshCw,
  ArrowRight,
  Zap,
  X,
  Shield,
  Building2,
  GraduationCap,
  Target,
  TrendingUp,
  BadgeCheck,
  Handshake,
  Users,
} from 'lucide-react'
import { track as trackEvent } from '@/lib/analytics'
import { useAuthSession } from '@/components/auth-session-provider'
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard'
import type { UniversalAnalysisResult } from '@/lib/universal-analysis-engine'
import { BRAND_NAME, BRAND_HERO_EYEBROW } from '@/lib/brand'

function HomeDemoAnalysisDashboard({ result }: { result: UniversalAnalysisResult }) {
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
      result={result}
      tilesOnly
      compact
      defaultOpenKey="market"
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
  homeDemoRubric: UniversalAnalysisResult
}

export default function HomeClient({ verifiedInvestorCountLabel, homeDemoRubric }: HomeClientProps) {
  const router = useRouter()
  const { loading: authLoading, authenticated, verified } = useAuthSession()
  const [mounted, setMounted] = useState(false)
  const isVerifiedUser = !authLoading && authenticated && verified

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
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

        {/* ── HERO ── */}
        <section className="border-b border-border/30 px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-14 md:pb-20 md:pt-16">
          <div className="mx-auto max-w-7xl lg:px-2">
            <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-14">
              <div className="lg:col-span-7 xl:col-span-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {BRAND_HERO_EYEBROW}
                </p>
                <h1 className="mt-3 font-heading text-[1.7rem] font-semibold leading-[1.16] tracking-tight text-foreground sm:text-4xl sm:leading-[1.12] md:text-[2.4rem] md:leading-[1.1]">
                  Find the investors most likely to fund your startup
                </h1>
                <ul className="mt-5 space-y-2.5 text-[15px] leading-snug text-muted-foreground">
                  {[
                    'Analyze your pitch materials',
                    'Match to relevant VCs, angels, accelerators, and corporate venture',
                    'Rank by likelihood of fit',
                    'Generate tailored outreach',
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
                    className="h-11 w-full rounded-lg px-7 text-sm font-semibold shadow-sm sm:h-12 sm:w-auto sm:px-8 sm:text-base"
                  >
                    {mounted && isVerifiedUser ? (
                      <>
                        Open founder hub
                        <LayoutDashboard className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Try it with your pitch
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
                      'h-11 w-full rounded-lg border-border/50 bg-background/40 px-7 text-center text-sm font-semibold backdrop-blur-sm sm:h-12 sm:w-auto sm:px-8 sm:text-base hover:bg-muted/35',
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
                <div className="mt-4 flex flex-wrap gap-2">
                  {['VCs', 'Angels', 'Accelerators', 'Corporate Venture'].map((t) => (
                    <span key={t} className="rounded-full border border-border/50 bg-muted/20 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>
                <ul className="mt-5 space-y-3 border-t border-border/35 pt-5 text-sm leading-snug text-muted-foreground">
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                    <span>Scores and a ranked shortlist from one submission.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                    <span>Updated monthly. Quality-checked before listing.</span>
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

        {/* ── HOW IT WORKS (3 steps) ── */}
        <section
          className="border-b border-border/30 px-4 py-14 sm:px-6 sm:py-16 md:py-20"
          aria-labelledby="home-how-heading"
        >
          <div className="mx-auto max-w-7xl lg:px-2">
            <div className="max-w-3xl">
              <h2
                id="home-how-heading"
                className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
              >
                How it works
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                Upload a deck, answer a few questions, or describe your idea. {BRAND_NAME} scores your pitch, ranks best-fit
                investors from{' '}
                <span className="font-medium text-foreground">{verifiedInvestorCountLabel}+ verified</span> profiles,
                and helps you take action with tailored outreach and next steps.
              </p>
            </div>

            <div className="mx-auto mt-10 flex max-w-3xl flex-col sm:mt-12">
              {/* Step 1: Upload */}
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">1</span>
                  <span className="text-[11px] text-muted-foreground">Founder-side</span>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Upload</p>
                <ul className="divide-y divide-border/35 overflow-hidden rounded-xl border border-border/40 bg-background/80">
                  {[
                    { name: 'pitch_deck.pdf', Icon: FileText },
                    { name: 'structured_answers.json', Icon: Lightbulb },
                    { name: 'pitch_video.mp4', Icon: Video },
                  ].map(({ name, Icon }) => (
                    <li key={name} className="flex items-center gap-3 px-3 py-2.5 sm:py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground">
                        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/90 sm:text-[13px]">{name}</span>
                      <Upload className="h-4 w-4 shrink-0 text-muted-foreground/55" strokeWidth={1.75} aria-hidden />
                    </li>
                  ))}
                </ul>
                <p className="mt-auto flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                  <span>One submission feeds both the score breakdown and your shortlist.</span>
                </p>
              </div>

              <div className="flex flex-col items-center py-2 sm:py-3" aria-hidden>
                <span className="h-5 w-px shrink-0 bg-gradient-to-b from-border/50 via-border/35 to-transparent" />
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/35 bg-muted/25 text-muted-foreground/55 shadow-sm">
                  <ChevronDown className="h-5 w-5 animate-chevron-bounce" strokeWidth={2.25} />
                </span>
                <span className="h-5 w-px shrink-0 bg-gradient-to-b from-transparent via-border/35 to-border/50" />
              </div>

              {/* Step 2: Score & Rank */}
              <div className="flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">2</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Score & Rank</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {BRAND_NAME} scores your pitch across key categories and ranks best-fit investors with short notes per row.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-border/50 bg-muted/25 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Advanced pipeline
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
                    <HomeDemoAnalysisDashboard result={homeDemoRubric} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center py-2 sm:py-3" aria-hidden>
                <span className="h-5 w-px shrink-0 bg-gradient-to-b from-border/50 via-border/35 to-transparent" />
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/35 bg-muted/25 text-muted-foreground/55 shadow-sm">
                  <ChevronDown className="h-5 w-5 animate-chevron-bounce" strokeWidth={2.25} />
                </span>
                <span className="h-5 w-px shrink-0 bg-gradient-to-b from-transparent via-border/35 to-border/50" />
              </div>

              {/* Step 3: Act */}
              <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">3</span>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Act</p>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Get tailored outreach, application help, and clear next steps for every matched investor.
                  </p>
                  <div className="mt-4 space-y-2">
                    {[
                      { icon: Send, label: 'Generate outreach email' },
                      { icon: FileText, label: 'Tailor application' },
                      { icon: Target, label: 'Save target list' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" strokeWidth={1.75} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy</Link>: TLS in transit, encrypted storage. Intros are double opt-in; showing your profile to investors stays opt-in.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY NOT JUST USE A VC DATABASE? ── */}
        <section className="border-b border-border/30 px-4 py-14 sm:px-6 sm:py-16 md:py-20" aria-labelledby="home-compare-heading">
          <div className="mx-auto max-w-5xl lg:px-2">
            <h2 id="home-compare-heading" className="text-center font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Why not just use a VC database?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Databases give you lists. {BRAND_NAME} gives you a ranked shortlist of who is most likely to fund <em>your</em> startup, plus the tools to reach them.
            </p>

            <div className="mt-10 overflow-hidden rounded-2xl border border-border/40 shadow-sm">
              <div className="grid grid-cols-[1fr_1fr]">
                <div className="border-b border-r border-border/40 bg-muted/30 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-6 sm:text-sm">
                  Database tools
                </div>
                <div className="border-b border-border/40 bg-primary/5 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-primary sm:px-6 sm:text-sm">
                  {BRAND_NAME}
                </div>
              </div>
              {[
                { old: 'Static investor lists', nw: 'Dynamic matching to your pitch' },
                { old: 'Manual searching and filtering', nw: 'Ranked by fit score and relevance' },
                { old: 'Stale, rarely updated profiles', nw: 'Refreshed monthly with trend signals' },
                { old: 'No feedback on your pitch', nw: 'Pitch scoring with improvement tips' },
                { old: 'No workflow after searching', nw: 'Outreach generation and next steps' },
              ].map(({ old, nw }, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr]">
                  <div className={cn(
                    'flex items-start gap-2.5 border-r border-border/40 px-4 py-3.5 text-sm text-muted-foreground sm:px-6',
                    i < 4 && 'border-b border-b-border/30',
                  )}>
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" strokeWidth={2} />
                    <span>{old}</span>
                  </div>
                  <div className={cn(
                    'flex items-start gap-2.5 px-4 py-3.5 text-sm text-foreground sm:px-6',
                    i < 4 && 'border-b border-b-border/30',
                  )}>
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                    <span>{nw}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DATA TRUST ── */}
        <section className="border-b border-border/30 px-4 py-14 sm:px-6 sm:py-16 md:py-20" aria-labelledby="home-trust-heading">
          <div className="mx-auto max-w-5xl lg:px-2">
            <h2 id="home-trust-heading" className="text-center font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              How our data works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {BRAND_NAME} investor profiles are maintained for accuracy and recency so you can trust every match.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: RefreshCw, title: 'Updated monthly', desc: 'Investor profiles refreshed on an ongoing basis with the latest activity and thesis changes.' },
                { icon: Shield, title: 'Quality-checked', desc: 'Every profile is validated before listing. Low-confidence profiles are excluded automatically.' },
                { icon: TrendingUp, title: 'Trend signals', desc: 'Recent investment activity and sector momentum are factored into matching and ranking.' },
                { icon: BadgeCheck, title: 'Verified network', desc: `${verifiedInvestorCountLabel}+ verified profiles across VCs, angels, accelerators, and corporate venture arms.` },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-border/40 bg-card/60 p-5 shadow-sm ring-1 ring-border/15">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── USE CASES ── */}
        <section className="border-b border-border/30 px-4 py-14 sm:px-6 sm:py-16 md:py-20" aria-labelledby="home-usecases-heading">
          <div className="mx-auto max-w-5xl lg:px-2">
            <h2 id="home-usecases-heading" className="text-center font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Built for every stage of fundraising
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Whether you are raising your first check or targeting niche strategic investors, {BRAND_NAME} matches you to the right people.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Zap,
                  title: 'Pre-revenue founders',
                  desc: 'Looking for first checks from angels, micro-VCs, and accelerators. Get matched to investors who back early ideas, not just traction.',
                },
                {
                  icon: BarChart3,
                  title: 'Between rounds',
                  desc: 'Raised once or twice but struggling to find the next lead. Target investors by stage fit, sector thesis, and recent deployment activity.',
                },
                {
                  icon: Building2,
                  title: 'Vertical founders',
                  desc: 'PropTech, health/FDA, climate, fintech, or other regulated verticals. Find strategic and corporate venture investors who understand your space.',
                },
                {
                  icon: GraduationCap,
                  title: 'University founders',
                  desc: 'Looking for accelerators, fellowships, and early angels. Get matched to programs like Dorm Room Fund, 1517, and university-affiliated VCs.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 rounded-xl border border-border/40 bg-card/60 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── LEARN FROM THE BEST (mentors & partners) ── */}
        <section className="border-b border-border/30 px-4 py-14 sm:px-6 sm:py-16 md:py-20" aria-labelledby="home-mentors-heading">
          <div className="mx-auto max-w-5xl lg:px-2">
            <h2 id="home-mentors-heading" className="text-center font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Learn from the best
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {BRAND_NAME} works with real partners across the venture ecosystem. On the platform you will find mentors who
              have raised capital, been through Y Combinator, helped build breakout companies, or spent years at leading
              venture firms. You get grounded perspective from people who have done the work, not a vague idea of what
              &quot;great&quot; looks like.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Handshake,
                  title: 'Partner-backed',
                  desc: 'We work with aligned programs and advisors. Guidance reflects how fundraising actually works today, not recycled templates.',
                },
                {
                  icon: Users,
                  title: 'Experienced mentors',
                  desc: 'Learn from people who have raised capital, joined strong accelerators, and partnered with real funds. Their playbooks beat generic advice.',
                },
                {
                  icon: BadgeCheck,
                  title: 'YC & top-VC perspective',
                  desc: 'Many mentors bring experience from YC paths and leading venture firms. You get signal on narrative, diligence, and what partners really respond to.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  track('cta_clicked', { name: 'try_it', page: 'home' })
                  if (!mounted || !isVerifiedUser) {
                    router.push('/signup')
                  } else {
                    router.push('/founder/ai-analysis')
                  }
                }}
                className="h-11 rounded-lg px-8 text-sm font-semibold sm:h-12 sm:text-base"
              >
                Try it with your pitch
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="px-4 py-14 sm:px-6 sm:py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Stop searching. Start matching.
            </h2>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={() => {
                  track('cta_clicked', { name: 'bottom_cta', page: 'home' })
                  if (!mounted || !isVerifiedUser) {
                    router.push('/signup')
                  } else {
                    router.push('/founder/ai-analysis')
                  }
                }}
                className="h-11 w-full rounded-lg px-8 text-sm font-semibold shadow-sm sm:h-12 sm:w-auto sm:px-10 sm:text-base"
              >
                Try it with your pitch
                <Rocket className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
