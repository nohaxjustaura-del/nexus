'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Rocket,
  Check,
  Upload,
  FileText,
  Lightbulb,
  Video,
  ChevronDown,
  Send,
  Target,
  BadgeCheck,
  Handshake,
  Users,
} from 'lucide-react'
import { track as trackEvent } from '@/lib/analytics'
import type { UniversalAnalysisResult } from '@/lib/universal-analysis-engine'
import { BRAND_NAME } from '@/lib/brand'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard'
import {
  HomeVsLlmCompareSection,
  WhyNexusDifferenceSection,
  WhyNexusProblemSection,
  WhyNexusSectionDivider,
} from '@/components/marketing/why-nexus-sections'

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
    <div className="flex flex-col items-center py-2 sm:py-3" aria-hidden>
      <div className="h-5 w-px shrink-0 rounded-full bg-border/55" />
      <span className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/30 text-muted-foreground">
        <ChevronDown className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>
      <div className="h-5 w-px shrink-0 rounded-full bg-border/55" />
    </div>
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
                    {BRAND_NAME} runs a pipeline tuned for fundraising on what you share. It follows how investors look at
                    stage, sector, and thesis, so you are not hand-tuning prompts in a general chat model.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="mx-auto mt-10 flex max-w-3xl flex-col sm:mt-12">
            <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
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
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                <span>One submission feeds both the score breakdown and your shortlist.</span>
              </p>
            </div>

            <HomeHowItWorksConnector />

            <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">2</span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Score & Rank</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Scores reflect how your story maps to each investor&apos;s mandate, not a generic bullet list.
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border/50 bg-muted/25 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Advanced pipeline
                </span>
              </div>
              <div className="relative flex min-h-[240px] flex-col rounded-xl border border-border/40 bg-background/90 p-3 sm:min-h-[260px] sm:p-3.5">
                <div className="mb-2 flex shrink-0 items-center gap-2 border-b border-border/35 pb-2">
                  <span className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/40" aria-hidden />
                  <span className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/40" aria-hidden />
                  <span className="h-1.5 w-1.5 rounded-sm bg-muted-foreground/40" aria-hidden />
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{BRAND_NAME}</span>
                </div>
                <div className="min-w-0">
                  <HomeDemoAnalysisDashboard result={homeDemoRubric} />
                </div>
              </div>
            </div>

            <HomeHowItWorksConnector />

            <div className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/80 p-5 shadow-sm ring-1 ring-border/15 sm:p-6">
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
                <Link href="/legal#privacy" className="underline underline-offset-2 hover:text-foreground">Privacy</Link>: TLS in transit, encrypted storage. Intros are double opt-in; showing your profile to investors stays opt-in.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="why-nexus"
        className="scroll-mt-20 border-b border-border/30 py-14 sm:py-16 md:py-20"
        aria-label={`Why ${BRAND_NAME}`}
      >
        <div className="mx-auto max-w-7xl lg:px-2">
          <WhyNexusProblemSection />
          <WhyNexusSectionDivider />
          <WhyNexusDifferenceSection />
        </div>
      </section>

      <section
        className="scroll-mt-20 border-b border-border/30 py-14 sm:py-16 md:py-20"
        aria-label={`${BRAND_NAME} compared to general AI`}
      >
        <div className="mx-auto max-w-7xl lg:px-2">
          <HomeVsLlmCompareSection verifiedInvestorCountLabel={verifiedInvestorCountLabel} />
        </div>
      </section>

      <section className="border-b border-border/30 px-4 py-14 sm:px-6 sm:py-16 md:py-20" aria-labelledby="home-mentors-heading">
        <div className="mx-auto max-w-5xl lg:px-2">
          <h2 id="home-mentors-heading" className="text-center font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Learn from the best
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Mentors and partners with real fundraising and fund experience. Practical guidance, not generic templates.
          </p>
          <div className="mx-auto mt-4 max-w-md">
            <Accordion type="single" collapsible className="rounded-xl border border-border/40 bg-card/50 px-3">
              <AccordionItem value="mentors-more" className="border-0">
                <AccordionTrigger className="py-2.5 text-xs hover:no-underline sm:text-sm">
                  More about mentors
                </AccordionTrigger>
                <AccordionContent>
                  <p className="pb-2 text-left text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    On the platform you will find people who have raised capital, been through programs like YC, helped
                    build breakout companies, or spent years at top firms (Sequoia, a16z, and others in that tier).
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
                title: 'YC, Sequoia, a16z & more',
                desc: 'Many mentors bring experience from YC-style paths and tier-one funds (Sequoia, a16z, and comparable shops). You get signal on narrative, diligence, and what partners really respond to.',
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
    </>
  )
}
