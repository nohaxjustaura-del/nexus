import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ComparisonTable } from '@/components/marketing/comparison-table'
import {
  Sparkles,
  BrainCircuit,
  Target,
  ArrowRight,
  DollarSign,
  Clock,
  Users,
  Database,
  Workflow,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'

const founderFeatureCards = [
  {
    icon: CheckCircle2,
    title: 'Warm intro pathways, not cold guessing',
    description:
      'Spot likely intro paths and relationship context so outreach starts warmer and more relevant.',
  },
  {
    icon: Sparkles,
    title: 'Founder resources from real operators',
    description:
      'Get practical playbooks, examples, and prompts shaped by founders and investors linked to top-tier ecosystems.',
  },
  {
    icon: Database,
    title: 'Mandate-aware investor targeting',
    description:
      'Filter by stage, sector, check size, and thesis behavior so your list is built for fit, not vanity.',
  },
  {
    icon: Target,
    title: 'Execution-ready next steps',
    description:
      'Each recommendation includes why it fits and what to do next so progress does not stop in chat.',
  },
]

const pipelineSteps = [
  {
    icon: Sparkles,
    title: '1) Structured intake',
    description: 'Upload deck, video, and answers once. NEXUS standardizes your story for a clean evaluation pass.',
  },
  {
    icon: BrainCircuit,
    title: '2) Multi-pass analysis',
    description: 'Your pitch is scored across team, market, product, and traction so weak points are obvious before meetings.',
  },
  {
    icon: Database,
    title: '3) Mandate-fit matching',
    description: 'We map your startup to verified investor data by stage, sector, check size, and thesis behavior.',
  },
  {
    icon: CheckCircle2,
    title: '4) Execution-ready output',
    description: 'You get ranked targets, fit rationale, and concrete next actions instead of a one-off answer.',
  },
]

const whyBetterRows = [
  {
    generic: 'Mostly static templates and directories',
    nexus: 'Live workflow from intake to fit-ranked targets and execution steps',
  },
  {
    generic: 'Broad advice with weak mandate context',
    nexus: 'Verified investor intelligence with mandate-level fit signals',
  },
  {
    generic: 'Suggestions that still need heavy founder translation',
    nexus: 'Clear rationale, outreach angles, and immediate actions',
  },
]

const founderOutcomes = [
  'Spend less time researching and more time meeting aligned investors',
  'Tailor your narrative by investor thesis and check behavior',
  'Improve reply rates with higher-context outreach',
  'Run your fundraising as a repeatable system, not one-off prompts',
]

export default function WhyNexusPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            Why Us
          </Badge>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Why founders choose NEXUS over generic resource platforms
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            NEXUS turns fundraising into an execution system: analyze your pitch, rank true-fit investors, and move with clear
            next actions.
          </p>
        </header>

        <div className="mb-16">
          <Card className="border-border/80">
            <CardContent className="p-6">
              <h2 className="text-center text-xl font-bold md:text-2xl">Built for founders who need momentum</h2>
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
                Resources are informed by founder and investor patterns from top-tier ecosystems (for example YC, a16z, and
                Sequoia networks) where applicable, while staying focused on what is actionable for your round.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-16">
          <h2 className="mb-8 text-center text-xl font-bold md:text-2xl">Cool features founders actually use</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {founderFeatureCards.map((f) => (
              <Card key={f.title} className="border-border/80">
                <CardContent className="p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="mb-8 text-center text-xl font-bold md:text-2xl">Our pipeline advantage</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pipelineSteps.map((step) => (
              <Card key={step.title} className="border-border/80">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <step.icon className="h-4 w-4 text-primary" />
                    </span>
                    <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="mb-8 text-center text-xl font-bold md:text-2xl">Why this beats generic founder resource tools</h2>
          <div className="space-y-3">
            {whyBetterRows.map((row) => (
              <Card key={row.generic} className="border-border/80">
                <CardContent className="grid gap-3 p-5 md:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Typical platform</p>
                    <p className="mt-1 text-sm text-muted-foreground">{row.generic}</p>
                  </div>
                  <div className="rounded-lg border border-primary/25 bg-primary/[0.05] p-3">
                    <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-primary">NEXUS</p>
                    <p className="mt-1 text-sm text-foreground">{row.nexus}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="mb-8 text-center text-xl font-bold md:text-2xl">Founder outcomes, not just analysis</h2>
          <Card className="border-border/80">
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Most platforms stop at content. NEXUS helps you move from analysis to execution with clear fit rationale and
                targeted actions.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {founderOutcomes.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/70 px-3 py-2.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground/90">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-16">
          <h2 className="mb-8 text-center text-xl font-bold md:text-2xl">Built for both sides of the table</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/80">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground">For founders</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Replace broad investor lists with fit-ranked targets and clear rationale, then move straight into smarter,
                  better-targeted outreach.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/80">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground">For investors</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Use structured founder and market signals to triage faster, reduce noise, and prioritize opportunities that truly
                  fit your thesis.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-16 grid gap-6 md:grid-cols-3">
          <Card className="border-primary/30 bg-primary/5 text-center">
            <CardContent className="p-6">
              <DollarSign className="mx-auto mb-2 h-8 w-8 text-primary" />
              <div className="text-3xl font-bold">64x cheaper</div>
              <p className="mt-1 text-sm text-muted-foreground">than PitchBook annually</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-6">
              <Clock className="mx-auto mb-2 h-8 w-8 text-primary" />
              <div className="text-3xl font-bold">2 min</div>
              <p className="mt-1 text-sm text-muted-foreground">from signup to first analysis</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-6">
              <Users className="mx-auto mb-2 h-8 w-8 text-primary" />
              <div className="text-3xl font-bold">3,000+</div>
              <p className="mt-1 text-sm text-muted-foreground">verified investors indexed</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-16">
          <ComparisonTable />
        </div>

        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold">Ready to out-execute generic tools?</h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
            Start with a free analysis and see investor-fit targets with rationale, not just suggestions.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-xl px-6">
              <Link href="/signup">
                Analyze your pitch free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl px-6">
              <Link href="/founder/discover">Browse investors</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
