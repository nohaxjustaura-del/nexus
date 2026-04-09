'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Target,
  Users,
  Zap,
  Shield,
  TrendingUp,
  Search,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const cardClass =
  'border border-border/40 bg-card/80 shadow-sm ring-1 ring-border/15 transition-colors hover:border-border/55 hover:bg-card/90'

const iconCircle = 'flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary'

const checkClass = 'mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400'

const principleIconWrap = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary'

export default function AboutClient({ verifiedInvestorCountLabel }: { verifiedInvestorCountLabel: string }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(32vh,18rem)] bg-[radial-gradient(ellipse_70%_55%_at_15%_-5%,hsl(var(--primary)/0.07),transparent_58%)]"
        aria-hidden
      />
      <div className="relative z-10 container mx-auto max-w-6xl px-4 py-12 md:py-16">
        {/* Hero */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {BRAND_TAGLINE}
          </p>
          <h1 className="font-heading mb-4 text-4xl font-semibold tracking-tight md:text-5xl">About {BRAND_NAME}</h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            We analyze your idea, deck, or video with a fundraising-specific lens, then rank investors from{' '}
            <span className="font-medium text-foreground">{verifiedInvestorCountLabel} verified profiles</span> so suggestions
            map to real mandates, not invented names.
          </p>
        </div>

        {/* Mission */}
        <Card className={cn('mb-12', cardClass)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-2xl">
              <Target className="h-6 w-6 text-primary" aria-hidden />
              Our mission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base leading-relaxed text-muted-foreground">
              {BRAND_NAME} reviews what you share the way an investor would, then ranks investors by mandate fit so you focus on
              credible outreach, not spray-and-pray volume.
            </p>
            <Accordion type="single" collapsible className="w-full rounded-lg border border-border/40 px-3">
              <AccordionItem value="why-not-chat" className="border-0">
                <AccordionTrigger className="py-3 text-sm hover:no-underline">
                  Why not a generic chat model?
                </AccordionTrigger>
                <AccordionContent>
                  <p className="pb-2 text-sm leading-relaxed">
                    Big models optimize for fluent text, not a maintained investor graph. Directories alone are noisy without
                    a fit layer tied to your materials. We combine both.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="your-job" className="border-0 border-t border-border/30">
                <AccordionTrigger className="py-3 text-sm hover:no-underline">
                  What stays on you
                </AccordionTrigger>
                <AccordionContent>
                  <p className="pb-2 text-sm leading-relaxed">
                    We surface matches and rationale. Warm intros, diligence, and closes are yours to earn.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* What we do */}
        <div className="mb-12">
          <h2 className="font-heading mb-8 text-center text-3xl font-semibold tracking-tight">What we do</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className={cardClass}>
              <CardHeader>
                <div className={cn('mb-4', iconCircle)}>
                  <Sparkles className="h-6 w-6" aria-hidden />
                </div>
                <CardTitle className="font-heading">Pitch analysis</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Structured, investor-style feedback tuned to how pitches are judged, not generic writing advice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>
                      <strong className="text-foreground">Pitch idea:</strong> Concise, investor-style commentary on your
                      concept.
                    </span>
                  </li>
                </ul>
                <Accordion type="single" collapsible className="mt-2 w-full">
                  <AccordionItem value="pitch-more" className="border-0">
                    <AccordionTrigger className="py-2 text-xs font-medium text-primary hover:no-underline">
                      All analysis types
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle className={checkClass} aria-hidden />
                          <span>
                            <strong className="text-foreground">Pitch deck:</strong> Slide-level notes and messaging
                            suggestions.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className={checkClass} aria-hidden />
                          <span>
                            <strong className="text-foreground">Video pitch:</strong> Clarity, delivery, and narrative (some
                            flows finish by email).
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className={checkClass} aria-hidden />
                          <span>
                            <strong className="text-foreground">Resume:</strong> Team and traction context. See{' '}
                            <Link
                              href="/founder/resume-analysis"
                              className="font-medium text-primary underline-offset-2 hover:underline"
                            >
                              Resume analysis
                            </Link>
                          </span>
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardHeader>
                <div className={cn('mb-4', iconCircle)}>
                  <Target className="h-6 w-6" aria-hidden />
                </div>
                <CardTitle className="font-heading">Investor matching</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Ranked shortlists with explicit fit rationale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>
                      Rankings use stage, sector, vision, and how you operate, backed by{' '}
                      <strong className="text-foreground">{verifiedInvestorCountLabel} verified investors</strong>.
                    </span>
                  </li>
                </ul>
                <Accordion type="single" collapsible className="mt-2 w-full">
                  <AccordionItem value="match-more" className="border-0">
                    <AccordionTrigger className="py-2 text-xs font-medium text-primary hover:no-underline">
                      More on matching
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle className={checkClass} aria-hidden />
                          <span>Talking points tailored to names on your shortlist.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className={checkClass} aria-hidden />
                          <span>Inspectable scores where the UI exposes inputs and reasoning.</span>
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardHeader>
                <div className={cn('mb-4', iconCircle)}>
                  <Search className="h-6 w-6" aria-hidden />
                </div>
                <CardTitle className="font-heading">Discovery</CardTitle>
                <CardDescription className="text-muted-foreground">Browse and filter the investor directory</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>Filter by stage, sector, check size, geography, and more.</span>
                  </li>
                </ul>
                <Accordion type="single" collapsible className="mt-2 w-full">
                  <AccordionItem value="disc-more" className="border-0">
                    <AccordionTrigger className="py-2 text-xs font-medium text-primary hover:no-underline">
                      Discovery details
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle className={checkClass} aria-hidden />
                          <span>Criteria and context on each profile.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className={checkClass} aria-hidden />
                          <span>Bookmarks for follow-up.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className={checkClass} aria-hidden />
                          <span>Recommendations from your founder profile when available.</span>
                        </li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key features */}
        <div className="mb-12">
          <h2 className="font-heading mb-8 text-center text-3xl font-semibold tracking-tight">Principles</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className={cardClass}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={principleIconWrap}>
                    <Shield className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-2 font-heading text-lg font-semibold">Privacy-conscious</h3>
                    <p className="text-muted-foreground">
                      We treat decks and personal data carefully and do not share them without your consent. As noted in
                      the product, uploaded analysis content is automatically removed after 30 to 90 days per retention
                      settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={principleIconWrap}>
                    <Zap className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-2 font-heading text-lg font-semibold">Faster shortlisting</h3>
                    <p className="text-muted-foreground">
                      Generate a ranked list in minutes instead of weeks of manual spreadsheet work, then prioritize who
                      to research and contact first.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={principleIconWrap}>
                    <TrendingUp className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-2 font-heading text-lg font-semibold">Grounded profiles</h3>
                    <p className="text-muted-foreground">
                      Investor signals draw on structured fields (stages, sectors, thesis, check size, geography) inside a
                      verified dataset, so matching stays tied to what funds actually publish and approve, not loose keyword
                      overlap or model guesswork.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={principleIconWrap}>
                    <Users className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="mb-2 font-heading text-lg font-semibold">Broad directory</h3>
                    <p className="text-muted-foreground">
                      Explore funds, angels, and programs across regions using filters that match how founders actually
                      search for capital.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* How it works - link to home walkthrough */}
        <div className="mb-12">
          <Card className={cn('text-center', cardClass)}>
            <CardContent className="py-10">
              <h2 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">How it works</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
                The step-by-step walkthrough, with visuals, is on the homepage so we do not repeat it here.
              </p>
              <Link
                href="/#home-how-heading"
                className="mt-5 inline-flex items-center justify-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                See how it works on the homepage
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <Card className="mb-12 border border-border/40 bg-card/60 shadow-sm ring-1 ring-primary/10">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              <div>
                <div className="font-heading mb-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  {verifiedInvestorCountLabel}
                </div>
                <div className="text-sm text-muted-foreground">Verified investor profiles</div>
              </div>
              <div>
                <div className="font-heading mb-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  3+
                </div>
                <div className="text-sm text-muted-foreground">Analysis inputs (idea, deck, video)</div>
              </div>
              <div>
                <div className="font-heading mb-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Ranked
                </div>
                <div className="text-sm text-muted-foreground">Shortlists by fit</div>
              </div>
              <div>
                <div className="font-heading mb-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Filters
                </div>
                <div className="text-sm text-muted-foreground">Stage, sector, check, geo</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <h2 className="font-heading mb-4 text-2xl font-semibold tracking-tight md:text-3xl">
            Ready for a ranked investor shortlist?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            Create an account, run an analysis, then review matches and discovery in one workflow.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-sm">
                Start free analysis
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </Link>
            <Link href="/founder/discover">
              <Button size="lg" variant="outline" className="h-12 border-border/50 bg-background/40 px-8 text-base font-semibold backdrop-blur-sm hover:bg-muted/35">
                Browse investors
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
