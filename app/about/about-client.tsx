'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Target,
  Zap,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const cardClass =
  'border border-border/40 bg-card/80 shadow-sm ring-1 ring-border/15 transition-colors hover:border-border/55 hover:bg-card/90'

const principleIconWrap = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary'

export default function AboutClient({ verifiedInvestorCountLabel }: { verifiedInvestorCountLabel: string }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(32vh,18rem)] bg-[radial-gradient(ellipse_70%_55%_at_15%_-5%,hsl(var(--primary)/0.07),transparent_58%)]"
        aria-hidden
      />
      <div className="relative z-10 container mx-auto max-w-4xl px-4 py-12 md:py-16">
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

        <div className="mb-12">
          <h2 className="font-heading mb-8 text-center text-3xl font-semibold tracking-tight">Principles</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                icon: Shield,
                title: 'Privacy-conscious',
                text: 'We treat decks and personal data carefully and do not share them without your consent. Uploaded analysis content is automatically removed after 30 to 90 days.',
              },
              {
                icon: Zap,
                title: 'Faster shortlisting',
                text: 'Generate a ranked list in minutes instead of weeks of manual spreadsheet work, then prioritize who to research and contact first.',
              },
              {
                icon: TrendingUp,
                title: 'Grounded profiles',
                text: 'Investor signals draw on structured fields inside a verified dataset, so matching stays tied to what funds actually publish and approve.',
              },
              {
                icon: Users,
                title: 'Broad directory',
                text: 'Explore funds, angels, and programs across regions using filters that match how founders actually search for capital.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <Card key={title} className={cardClass}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={principleIconWrap}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <h3 className="mb-2 font-heading text-lg font-semibold">{title}</h3>
                      <p className="text-muted-foreground">{text}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="mb-12 border border-border/40 bg-card/60 shadow-sm ring-1 ring-primary/10">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-3">
              <div>
                <div className="font-heading mb-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  {verifiedInvestorCountLabel}
                </div>
                <div className="text-sm text-muted-foreground">Verified investor profiles</div>
              </div>
              <div>
                <div className="font-heading mb-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  3
                </div>
                <div className="text-sm text-muted-foreground">Analysis inputs (idea, deck, video)</div>
              </div>
              <div>
                <div className="font-heading mb-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Ranked
                </div>
                <div className="text-sm text-muted-foreground">Shortlists by fit</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8 text-center">
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            See a detailed breakdown of how NEXUS compares to existing tools.
          </p>
          <Link
            href="/why-nexus"
            className="mt-2 inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Why NEXUS vs PitchBook
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="text-center">
          <h2 className="font-heading mb-4 text-2xl font-semibold tracking-tight md:text-3xl">
            Ready for a ranked investor shortlist?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            Create an account, run an analysis, then review matches and discovery in one workflow.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold shadow-sm">
              <Link href="/signup">
                Start free analysis
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-border/50 px-8 text-base font-semibold">
              <Link href="/founder/discover">
                Browse investors
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
