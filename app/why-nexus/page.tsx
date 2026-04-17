import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ComparisonTable } from '@/components/marketing/comparison-table'
import {
  Sparkles,
  BrainCircuit,
  BarChart3,
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

const goldenFeatures = [
  {
    icon: Workflow,
    title: 'Advanced fundraising pipeline',
    description:
      'NEXUS runs a full workflow: intake, multi-pass analysis, investor fit ranking, and clear next actions in one place.',
  },
  {
    icon: Database,
    title: 'Verified investor intelligence',
    description:
      'You get structured investor context, including stage, thesis, check-size behavior, and mandate signals, not just names on a list.',
  },
  {
    icon: BrainCircuit,
    title: 'Better than generic LLM output',
    description:
      'Generic chat tools stop at text. NEXUS turns analysis into ranked matches, rationale, and practical next steps you can execute.',
  },
  {
    icon: Target,
    title: 'Actionable results',
    description:
      'Move from insight to action fast: shortlist the right investors, tailor your story, and improve your outreach quality.',
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
    generic: 'One prompt in, one response out',
    nexus: 'Structured end-to-end workflow built for fundraising decisions',
  },
  {
    generic: 'Broad internet knowledge with limited investor context',
    nexus: 'Verified investor intelligence with mandate-level fit signals',
  },
  {
    generic: 'Advice that often ends in the chat window',
    nexus: 'Ranked matches, rationale, and immediate next actions',
  },
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
            Why founders choose NEXUS
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            NEXUS is built for real fundraising decisions. We combine advanced analysis, verified investor intelligence, and
            action-ready outputs so you can target the right investors with confidence.
          </p>
        </header>

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
          <h2 className="mb-8 text-center text-xl font-bold md:text-2xl">
            What makes NEXUS different
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {goldenFeatures.map((f) => (
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
          <h2 className="mb-8 text-center text-xl font-bold md:text-2xl">NEXUS vs generic LLM tools</h2>
          <div className="space-y-3">
            {whyBetterRows.map((row) => (
              <Card key={row.generic} className="border-border/80">
                <CardContent className="grid gap-3 p-5 md:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">Generic LLM</p>
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
          <h2 className="mb-8 text-center text-xl font-bold md:text-2xl">Not just a list of investors</h2>
          <Card className="border-border/80">
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                A static list tells you who exists. NEXUS tells you who actually fits and why. Each target is backed by richer
                context so your outreach is focused and credible.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  'Stage and check-size alignment',
                  'Sector and thesis relevance',
                  'Mandate and behavior signals',
                  'Clear fit rationale per investor',
                ].map((item) => (
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
