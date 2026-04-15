import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ComparisonTable } from '@/components/marketing/comparison-table'
import {
  Sparkles,
  Search,
  BarChart3,
  Target,
  ArrowRight,
  DollarSign,
  Clock,
  Users,
} from 'lucide-react'

const goldenFeatures = [
  {
    icon: Sparkles,
    title: 'AI Pitch Analysis',
    description:
      'Upload your pitch deck, record a video, or describe your idea. Our AI scores your pitch across team, market, traction, and product, then tells you exactly what to improve before your next investor meeting.',
  },
  {
    icon: Search,
    title: 'Investor Intelligence',
    description:
      'Search 3,000+ verified investors by stage, sector, check size, and geography. Every profile includes their thesis, portfolio, recent deals, and value-add; the data PitchBook charges $30K/year for.',
  },
  {
    icon: Target,
    title: 'Smart Matching',
    description:
      'After analyzing your pitch, we rank the investors most likely to fund you, with a plain-English explanation of why each one is a fit. No more cold outreach to the wrong VCs.',
  },
  {
    icon: BarChart3,
    title: 'Market Intelligence',
    description:
      'See what sectors are being funded, average check sizes by stage, and which geographies are most active, all aggregated from our live investor database.',
  },
]

export default function WhyNexusPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            PitchBook alternative
          </Badge>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Why founders choose NEXUS
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            The investor intelligence platform built for founders who are raising for the first time, not
            analysts at banks.
          </p>
        </header>

        <div className="mb-16">
          <ComparisonTable />
        </div>

        {/* Golden features */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-xl font-bold md:text-2xl">
            Two golden features, one simple platform
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

        {/* Pricing callout */}
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

        {/* CTA */}
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold">Ready to find your investors?</h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
            Start with a free pitch analysis. See which investors match your startup before you pay anything.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-xl px-6">
              <Link href="/signup">
                Get started free <ArrowRight className="ml-2 h-4 w-4" />
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
