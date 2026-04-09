'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
import { BRAND_NAME } from '@/lib/brand'
import { HeroSection } from '@/components/ui/hero-section-1'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const HOME_AT_A_GLANCE_BENEFITS = [
  'Allocator-style read on your pitch, not a one-size-fits-all chat reply.',
  'Match to relevant VCs, angels, accelerators, and corporate venture.',
  'Rank by fit against maintained profiles; generate tailored outreach from your shortlist.',
  'Updated monthly. Quality-checked before listing.',
  'Double opt-in intros; share materials only when you choose.',
] as const

const HOME_COMPARE_ROWS = [
  { old: 'Static lists or ad hoc prompts', nw: 'Dynamic matching tied to your pitch and profile' },
  { old: 'Manual searching or vague “who should I pitch?” replies', nw: 'Ranked by fit with explainable signals' },
  { old: 'Stale data or hallucinated firm names', nw: 'Verified graph, refreshed with quality checks' },
  { old: 'Generic deck feedback with no investor link', nw: 'Pitch scoring that feeds the same shortlist logic' },
  { old: 'No workflow after the answer', nw: 'Outreach drafts and next steps on your targets' },
  { old: 'One model for every task', nw: 'Product logic scoped to fundraising fit and mandates' },
] as const

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

const HOME_STEP_FLOW_MS = 3500
const HOME_STEP_BOTTOM_SNAKE_LAG_MS = 184

/** Vertical line + chevron between “How it works” steps: snake highlight + node glow, staggered 1→2→3. */
function HomeHowItWorksConnector({ stagger }: { stagger: 0 | 1 }) {
  const baseMs = stagger * (HOME_STEP_FLOW_MS / 2)
  return (
    <div className="flex flex-col items-center py-2 sm:py-3" aria-hidden>
      <div className="relative h-5 w-px overflow-hidden rounded-full">
        <div
          className="absolute inset-0 rounded-full bg-border/40 motion-safe:animate-home-step-line-breathe dark:bg-border/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-2.5 w-2.5 rounded-full bg-primary motion-safe:animate-home-step-snake motion-safe:shadow-[0_0_12px_hsl(var(--primary)/0.7)] motion-reduce:opacity-0"
          style={{ animationDelay: `${baseMs}ms` }}
        />
      </div>
      <span
        className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/35 bg-muted/25 text-muted-foreground shadow-sm motion-safe:animate-home-step-node motion-reduce:border-border/40 motion-reduce:text-muted-foreground/70"
        style={{ animationDelay: `${baseMs}ms` }}
      >
        <span className="flex items-center justify-center motion-safe:animate-home-step-breathe-fast">
          <ChevronDown className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </span>
      </span>
      <div className="relative h-5 w-px overflow-hidden rounded-full">
        <div
          className="absolute inset-0 rounded-full bg-border/40 motion-safe:animate-home-step-line-breathe dark:bg-border/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-2.5 w-2.5 rounded-full bg-primary motion-safe:animate-home-step-snake motion-safe:shadow-[0_0_12px_hsl(var(--primary)/0.7)] motion-reduce:opacity-0"
          style={{ animationDelay: `${baseMs + HOME_STEP_BOTTOM_SNAKE_LAG_MS}ms` }}
        />
      </div>
    </div>
  )
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
      <div className="relative z-10 flex flex-col">
        <div className="border-b border-border/30">
          <HeroSection showHeader={false} verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
        </div>

        <section className="border-b border-border/30 px-4 py-10 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-7xl lg:px-2">
            <aside className="mx-auto max-w-xl rounded-2xl border border-border/40 bg-card/60 p-6 shadow-sm ring-1 ring-border/20 backdrop-blur-sm sm:p-7 lg:max-w-none">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">At a glance</p>
              <p className="mt-4 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {verifiedInvestorCountLabel}+
              </p>
              <p className="mt-1 text-sm text-muted-foreground">verified investor profiles in the network</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['VCs', 'Angels', 'Accelerators', 'Corporate Venture'].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border/50 bg-muted/20 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <ul className="mt-5 space-y-3 border-t border-border/35 pt-5 text-sm leading-snug text-muted-foreground">
                {HOME_AT_A_GLANCE_BENEFITS.slice(0, 3).map((text) => (
                  <li key={text} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <Collapsible className="group/at-glance mt-2 border-t border-border/35 pt-2">
                <CollapsibleTrigger className="flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-primary underline-offset-4 hover:underline">
                  <span>Show all benefits</span>
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/at-glance:rotate-180"
                    aria-hidden
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 space-y-3 text-sm leading-snug text-muted-foreground">
                    {HOME_AT_A_GLANCE_BENEFITS.slice(3).map((text) => (
                      <li key={text} className="flex gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            </aside>
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
                Upload a deck, answer a few questions, or describe your idea. You get scores, feedback, and a ranked shortlist
                from{' '}
                <span className="font-medium text-foreground">{verifiedInvestorCountLabel}+ verified</span> profiles.
              </p>
              <Accordion type="single" collapsible className="mt-4 max-w-3xl rounded-xl border border-border/40 bg-card/40 px-3">
                <AccordionItem value="pipeline" className="border-0">
                  <AccordionTrigger className="py-3 text-sm hover:no-underline">
                    Why fundraising-specific (not generic AI)
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="max-w-prose pb-2 text-sm leading-relaxed text-muted-foreground">
                      {BRAND_NAME} runs a fundraising-tuned pipeline on what you share—aligned to how investors evaluate
                      stage, sector, and thesis—so you are not hand-tuning prompts in a general model.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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

              <HomeHowItWorksConnector stagger={0} />

              {/* Step 2: Score & Rank */}
              <div className="flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">2</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Score & Rank</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      Scores reflect how your story maps to each investor&apos;s mandate—not a generic bullet list.
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

              <HomeHowItWorksConnector stagger={1} />

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
              Why not a spreadsheet, a static database, or a general chatbot?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Verified mandates plus a fundraising-specific read on <em>your</em> materials—ranked shortlist and rationale in
              one flow.
            </p>

            <div className="mt-10 overflow-hidden rounded-2xl border border-border/40 shadow-sm">
              <div className="grid grid-cols-[1fr_1fr]">
                <div className="border-b border-r border-border/40 bg-muted/30 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-6 sm:text-sm">
                  Lists / generic AI
                </div>
                <div className="border-b border-border/40 bg-primary/5 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-primary sm:px-6 sm:text-sm">
                  {BRAND_NAME}
                </div>
              </div>
              {HOME_COMPARE_ROWS.slice(0, 3).map(({ old, nw }, i) => (
                <div key={old} className="grid grid-cols-[1fr_1fr]">
                  <div
                    className={cn(
                      'flex items-start gap-2.5 border-r border-border/40 px-4 py-3.5 text-sm text-muted-foreground sm:px-6',
                      i < 2 && 'border-b border-b-border/30',
                    )}
                  >
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" strokeWidth={2} />
                    <span>{old}</span>
                  </div>
                  <div
                    className={cn(
                      'flex items-start gap-2.5 px-4 py-3.5 text-sm text-foreground sm:px-6',
                      i < 2 && 'border-b border-b-border/30',
                    )}
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                    <span>{nw}</span>
                  </div>
                </div>
              ))}
              <Collapsible className="group/compare border-t border-border/30 bg-muted/[0.03]">
                <CollapsibleTrigger className="flex w-full items-center justify-center gap-1 px-4 py-3 text-xs font-medium text-primary underline-offset-4 hover:underline sm:text-sm">
                  <span>Show full comparison</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/compare:rotate-180" aria-hidden />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {HOME_COMPARE_ROWS.slice(3).map(({ old, nw }, j) => (
                    <div key={old} className="grid grid-cols-[1fr_1fr]">
                      <div
                        className={cn(
                          'flex items-start gap-2.5 border-r border-border/40 px-4 py-3.5 text-sm text-muted-foreground sm:px-6',
                          j < HOME_COMPARE_ROWS.length - 4 && 'border-b border-b-border/30',
                        )}
                      >
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" strokeWidth={2} />
                        <span>{old}</span>
                      </div>
                      <div
                        className={cn(
                          'flex items-start gap-2.5 px-4 py-3.5 text-sm text-foreground sm:px-6',
                          j < HOME_COMPARE_ROWS.length - 4 && 'border-b border-b-border/30',
                        )}
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                        <span>{nw}</span>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
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
            <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Mentors and partners with real fundraising and fund experience—grounded perspective, not generic templates.
            </p>
            <div className="mx-auto mt-4 max-w-md">
              <Accordion type="single" collapsible className="rounded-xl border border-border/40 bg-card/50 px-3">
                <AccordionItem value="mentors-more" className="border-0">
                  <AccordionTrigger className="py-2.5 text-xs hover:no-underline sm:text-sm">
                    More about mentors
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="pb-2 text-left text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      On the platform you will find people who have raised capital, been through strong accelerators, helped
                      build breakout companies, or spent years at leading venture firms.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

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

            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                onClick={() => {
                  track('cta_clicked', { name: 'try_it', page: 'home' })
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
