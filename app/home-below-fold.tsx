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
      <div className="h-6 w-px shrink-0 rounded-full bg-gradient-to-b from-border/60 to-primary/20" />
      <span className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/[0.06] text-primary">
        <ChevronDown className="h-4 w-4 animate-chevron-bounce" strokeWidth={2} aria-hidden />
      </span>
      <div className="h-6 w-px shrink-0 rounded-full bg-gradient-to-b from-primary/20 to-border/60" />
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
  verifiedInvestorCountLabel: string
  homeDemoRubric: UniversalAnalysisResult
  mounted: boolean
  isVerifiedUser: boolean
}

export function HomeBelowFold({
  verifiedInvestorCountLabel,
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
                Upload once. Score. Shortlist. Go.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                From first upload to ranked outreach targets in minutes, not weeks.
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
                      <p className="text-xs text-muted-foreground">Deck, answers, or video -- one submission feeds everything.</p>
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
                      <p className="text-xs text-muted-foreground">Turn scores into outreach-ready next steps.</p>
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
                    Build with mentors who are in the arena right now
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Skip generic advice loops. Get direct feedback and practical fundraising guidance from operators building real
                    companies today.
                  </p>

                  <div className="mt-5 space-y-3">
                    {[
                      {
                        icon: Users,
                        title: 'Luel (YC W26)',
                        desc: 'Featured mentors with fresh fundraising context from the current market.',
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
                    <p className="mt-1.5 text-sm font-medium text-foreground">Luel founders and operators</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      Learn from founders shipping now: sharper positioning, cleaner narrative, and better investor conversations
                      tied to {verifiedInvestorCountLabel}+ verified investor profiles.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </aside>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="section-shell-compact border-b-0 px-4 sm:px-6">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-primary/[0.02] to-transparent p-8 text-center sm:p-12 md:p-16">
              {/* Glow accents */}
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/[0.08] blur-[60px]" aria-hidden />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-primary/[0.06] blur-[50px]" aria-hidden />

              <div className="relative">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" strokeWidth={1.75} />
                </div>
                <h2 className="mt-5 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl text-balance">
                  Ready to find your investors?
                </h2>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button
                    size="lg"
                    onClick={() => {
                      track('cta_clicked', { name: 'bottom_cta', page: 'home' })
                      router.push(mounted && isVerifiedUser ? '/founder/ai-analysis' : '/signup')
                    }}
                    className="w-full rounded-xl px-8 shadow-lg shadow-primary/20 sm:w-auto"
                  >
                    Get started free
                    <Rocket className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      track('cta_clicked', { name: 'bottom_cta_secondary', page: 'home' })
                      router.push(mounted && isVerifiedUser ? '/founder/discover' : SIGNUP_DISCOVER)
                    }}
                    className="w-full rounded-xl sm:w-auto"
                  >
                    Browse investors
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
