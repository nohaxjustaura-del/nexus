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
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            {BRAND_NAME} analyzes your pitch idea, deck, or video and builds a ranked shortlist of aligned investors from
            our verified directory, so you focus on conversations that fit your stage, sector, and story, not endless
            list-building. The live directory includes{' '}
            <span className="font-medium text-foreground">{verifiedInvestorCountLabel} verified investor profiles</span>{' '}
            we use for matching and discovery.
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
          <CardContent>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Fundraising is noisy: huge directories, weak overlap, and outreach that does not convert. {BRAND_NAME}{' '}
              reviews what you share in an allocator-style lens, then ranks investors by mandate fit so you spend time on
              credible outreach, not spray-and-pray volume. We surface matches and rationale; warm intros and closes remain
              yours to earn.
            </p>
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
                  Structured feedback on materials you submit in the app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>
                      <strong className="text-foreground">Pitch idea:</strong> Stress-test the concept with concise,
                      investor-style commentary
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>
                      <strong className="text-foreground">Pitch deck:</strong> Slide-level notes and messaging suggestions
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>
                      <strong className="text-foreground">Video pitch:</strong> Feedback on clarity, delivery, and
                      narrative (some flows may complete asynchronously by email)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>
                      <strong className="text-foreground">Resume:</strong> Separate founder resume analysis for team and
                      traction context; see{' '}
                      <Link
                        href="/founder/resume-analysis"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Resume analysis
                      </Link>
                    </span>
                  </li>
                </ul>
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
                    <span>Weights stage, sector, vision, and how you operate</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>
                      Draws on <strong className="text-foreground">{verifiedInvestorCountLabel} verified investors</strong>{' '}
                      in our maintained dataset
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>Talking points tailored to names on your shortlist</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>Inspectable scores: transparent inputs and reasoning where the UI exposes them</span>
                  </li>
                </ul>
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
                    <span>Filter by stage, sector, check size, geography, and more</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>Read criteria, focus, and context on each profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>Bookmark investors for follow-up</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className={checkClass} aria-hidden />
                    <span>Recommendations informed by your founder profile where available</span>
                  </li>
                </ul>
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
                      the product, uploaded analysis content is automatically removed after 30–90 days per retention
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
                      Investor signals draw on structured fields (stages, sectors, thesis, check size, geography), not
                      generic startup buzzwords alone.
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

        {/* How it works */}
        <div className="mb-12">
          <h2 className="font-heading mb-8 text-center text-3xl font-semibold tracking-tight">How it works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className={cn('text-center', cardClass)}>
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-2xl font-bold">1</span>
                </div>
                <CardTitle className="font-heading">Share materials</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Upload a deck or video, paste a short idea, or complete onboarding so we can infer your company
                  profile. You receive structured feedback and a profile used for matching.
                </p>
              </CardContent>
            </Card>
            <Card className={cn('text-center', cardClass)}>
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-2xl font-bold">2</span>
                </div>
                <CardTitle className="font-heading">Review matches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  See ranked investors with scores and notes per name, not a flat export, so you understand why each
                  suggestion appears.
                </p>
              </CardContent>
            </Card>
            <Card className={cn('text-center', cardClass)}>
              <CardHeader>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <span className="text-2xl font-bold">3</span>
                </div>
                <CardTitle className="font-heading">Outreach & iterate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Bookmark priorities, open applications or emails on your side, and refine your narrative as the round
                  evolves. {BRAND_NAME} does not send introductions on your behalf.
                </p>
              </CardContent>
            </Card>
          </div>
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
