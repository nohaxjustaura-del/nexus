'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import {
  Rocket,
  Upload,
  FileText,
  Lightbulb,
  Video,
  ChevronDown,
  Send,
  Target,
  BadgeCheck,
  Users,
  Zap,
  ArrowRight,
  BrainCircuit,
} from 'lucide-react'
import { track as trackEvent } from '@/lib/analytics'
import type { UniversalAnalysisResult } from '@/lib/universal-analysis-engine'
import { BRAND_NAME } from '@/lib/brand'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

const SIGNUP_DISCOVER = `/signup?next=${encodeURIComponent('/founder/discover')}`

const AnalysisDashboard = dynamic(() => import('@/components/analysis/AnalysisDashboard'), {
  ssr: false,
  loading: () => <div className="h-[220px] w-full animate-pulse rounded-xl bg-muted/30" aria-hidden />,
})

function HomeDemoAnalysisDashboard({ result }: { result: UniversalAnalysisResult }) {
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

function HomeHowItWorksConnector() {
  return (
    <div className="flex flex-col items-center py-3 sm:py-4" aria-hidden>
      <span className="group relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-background/95 text-primary shadow-[0_0_0_1px_rgba(99,102,241,0.06),0_6px_20px_rgba(15,23,42,0.18)] transition-shadow duration-500 group-hover:shadow-[0_0_0_1px_rgba(99,102,241,0.1),0_10px_28px_rgba(15,23,42,0.24)]">
        <span className="absolute inset-0 rounded-full bg-primary/[0.07] blur-[1px] transition-opacity duration-500 group-hover:opacity-100" />
        <span className="how-connector-core-glow" />
        <ChevronDown className="relative h-4 w-4" strokeWidth={2.25} aria-hidden />
      </span>
    </div>
  )
}

function StepNumber({ step }: { step: '1' | '2' | '3' }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/[0.06] text-sm font-bold text-primary ring-1 ring-primary/15">
      {step}
    </span>
  )
}

export type HomeBelowFoldProps = {
  homeDemoRubric: UniversalAnalysisResult
  mounted: boolean
  isVerifiedUser: boolean
}

export function HomeBelowFold({
  homeDemoRubric,
  mounted,
  isVerifiedUser,
}: HomeBelowFoldProps) {
  const router = useRouter()

  return (
    <>
      {/* How it works */}
      <section className="section-shell-compact scroll-mt-20 px-4 sm:px-6" aria-labelledby="home-how-heading">
        <div className="mx-auto max-w-7xl lg:px-2">
          <ScrollReveal>
            <div className="max-w-2xl">
              <p className="eyebrow-label text-primary/70">How it works</p>
              <h2
                id="home-how-heading"
                className="mt-3 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl text-balance"
              >
                From raw pitch to mandate-matched investor targets.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                Not another static database: NEXUS combines pitch analysis plus live investor mandate data so both founder outreach
                and investor screening get materially more precise.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-12 grid gap-10 sm:mt-14 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-12 xl:gap-16">
            {/* Step flow */}
            <ol className="demo-step-list" aria-label="Demo in three steps">
              <ScrollReveal delay={0.1}>
                <li className="minimal-feature-card flex flex-col gap-4" aria-labelledby="home-demo-step-1">
                  <div className="flex items-center gap-3">
                    <StepNumber step="1" />
                    <div>
                      <h3 id="home-demo-step-1" className="font-medium text-foreground">Upload your pitch</h3>
                      <p className="text-xs text-muted-foreground">Deck, answers, or video -- one submission powers the full fit workflow.</p>
                    </div>
                  </div>
                  <ul className="divide-y divide-border/35 overflow-hidden rounded-xl border border-border/40 bg-background/80">
                    {[
                      { name: 'pitch_deck.pdf', Icon: FileText },
                      { name: 'structured_answers.json', Icon: Lightbulb },
                      { name: 'pitch_video.mp4', Icon: Video },
                    ].map(({ name, Icon }) => (
                      <li key={name} className="flex items-center gap-3 px-3 py-2.5 sm:py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.06] text-primary/70">
                          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/90 sm:text-[13px]">{name}</span>
                        <Upload className="h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={1.75} aria-hidden />
                      </li>
                    ))}
                  </ul>
                </li>
              </ScrollReveal>

              <HomeHowItWorksConnector />

              <ScrollReveal delay={0.2}>
                <li className="minimal-feature-card flex min-w-0 flex-col gap-4" aria-labelledby="home-demo-step-2">
                  <div className="flex items-center gap-3">
                    <StepNumber step="2" />
                    <div>
                      <h3 id="home-demo-step-2" className="font-medium text-foreground">See your live scores</h3>
                      <p className="text-xs text-muted-foreground">Multi-pass AI analysis scored like a partner&apos;s first pass.</p>
                    </div>
                  </div>
                  <div className="relative flex min-h-[240px] flex-col rounded-xl border border-border/40 bg-background/90 p-3 sm:min-h-[260px] sm:p-3.5">
                    <div className="mb-2 flex shrink-0 items-center gap-2 border-b border-border/35 pb-2">
                      <span className="h-2 w-2 rounded-full bg-destructive/40" aria-hidden />
                      <span className="h-2 w-2 rounded-full bg-warning/40" aria-hidden />
                      <span className="h-2 w-2 rounded-full bg-success/40" aria-hidden />
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">{BRAND_NAME}</span>
                    </div>
                    <div className="min-w-0">
                      <HomeDemoAnalysisDashboard result={homeDemoRubric} />
                    </div>
                  </div>
                </li>
              </ScrollReveal>

              <HomeHowItWorksConnector />

              <ScrollReveal delay={0.3}>
                <li className="minimal-feature-card flex flex-col gap-4" aria-labelledby="home-demo-step-3">
                  <div className="flex items-center gap-3">
                    <StepNumber step="3" />
                    <div>
                      <h3 id="home-demo-step-3" className="font-medium text-foreground">Act on your matches</h3>
                      <p className="text-xs text-muted-foreground">Turn fit scores into focused founder outreach and cleaner investor pipelines.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: Send, label: 'Generate outreach email' },
                      { icon: FileText, label: 'Tailor application' },
                      { icon: Target, label: 'Save target list' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/80 px-3 py-2.5 text-sm text-foreground/80 transition-colors hover:border-primary/20 hover:bg-primary/[0.03]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/[0.08]">
                          <Icon className="h-3.5 w-3.5 text-primary/70" strokeWidth={1.75} />
                        </span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </li>
              </ScrollReveal>
            </ol>

            {/* Mentor spotlight aside */}
            <aside
              id="why-nexus"
              className="mx-auto w-full max-w-md scroll-mt-20 lg:sticky lg:top-24 lg:mx-0 lg:max-w-none lg:self-start"
              aria-labelledby="home-why-better-heading"
            >
              <ScrollReveal delay={0.15} direction="right">
                <div className="rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.04] to-transparent p-5 sm:p-6">
                  <p className="eyebrow-label text-primary/60">Mentor spotlight</p>
                  <h3
                    id="home-why-better-heading"
                    className="mt-3 font-heading text-lg font-semibold tracking-tight text-foreground"
                  >
                    Get warm introductions to successful founders and investors
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Skip generic advice loops. Connect directly with successful founders, VC firm partners, and active investors for
                    practical fundraising guidance.
                  </p>

                  <div className="mt-5 space-y-3">
                    {[
                      {
                        icon: Users,
                        title: 'Program mentors',
                        desc: 'Featured mentors with fresh fundraising context from today\'s market.',
                      },
                      {
                        icon: BadgeCheck,
                        title: 'Tactical Feedback',
                        desc: 'Concrete edits for pitch, narrative, and outreach quality.',
                      },
                      {
                        icon: Target,
                        title: 'Actionable Next Moves',
                        desc: 'Leave each review with prioritized improvements and what to do next.',
                      },
                    ].map((pillar) => {
                      const Icon = pillar.icon
                      return (
                        <div
                          key={pillar.title}
                          className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 p-3.5 transition-colors hover:border-primary/20"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" strokeWidth={2} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{pillar.title}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{pillar.desc}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-primary/70">Featured mentor team</p>
                    <p className="mt-1.5 text-sm font-medium text-foreground">Founders and operators in the program</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      Learn from teams shipping now: sharper positioning, cleaner narrative, and better investor conversations tied
                      to the same verified profiles that power your shortlist.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </aside>
          </div>
        </div>
      </section>

      {/* Why us teaser */}
      <section className="section-shell-compact border-b-0 px-4 sm:px-6">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl">
            <div className="relative overflow-hidden rounded-xl border border-border/40 bg-muted/20 px-6 py-7 text-center sm:px-8 sm:py-8">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" aria-hidden />

              <div className="relative">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BrainCircuit className="h-5 w-5 text-primary" strokeWidth={1.75} />
                </div>
                <h2 className="mt-4 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl text-balance">
                  Why founders choose NEXUS
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  We are not just a list or a one-shot AI answer. NEXUS gives you an advanced pipeline from analysis to investor-fit
                  execution.
                </p>
                <div className="mx-auto mt-5 max-w-xl space-y-2 text-left">
                  {[
                    'Multi-pass pitch analysis, not one generic chat response.',
                    'Verified investor intelligence with stage, thesis, and check-size context.',
                    'Action-ready output: ranked matches, rationale, and next outreach steps.',
                  ].map((item) => (
                    <p key={item} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.9} />
                      <span>{item}</span>
                    </p>
                  ))}
                </div>
                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button asChild size="lg" className="w-full rounded-xl px-8 shadow-lg shadow-primary/20 sm:w-auto">
                    <Link
                      href="/why-nexus"
                      onClick={() => {
                        track('cta_clicked', { name: 'home_why_us_primary', page: 'home' })
                      }}
                    >
                      See why NEXUS is different
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      track('cta_clicked', { name: 'home_why_us_secondary', page: 'home' })
                      router.push(mounted && isVerifiedUser ? '/founder/ai-analysis' : '/signup')
                    }}
                    className="w-full rounded-xl sm:w-auto"
                  >
                    Analyze your pitch
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </>
  )
}
