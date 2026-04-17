'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { TrendingUp, Building2, Target, Zap, Globe, CheckCircle, AlertCircle, ChevronDown, Layers } from 'lucide-react'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { legacyNexusExtrasEnabled } from '@/lib/nexus-surface-flags'

type TabId = 'stage' | 'sector' | 'structure' | 'next'

function BulletsCollapsible({
  items,
  initialVisible = 3,
  label = 'Show all',
}: {
  items: React.ReactNode[]
  initialVisible?: number
  label?: string
}) {
  const visible = items.slice(0, initialVisible)
  const rest = items.slice(initialVisible)
  if (rest.length === 0) {
    return (
      <ul className="space-y-2 text-sm">
        {visible.map((node, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{node}</span>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <div className="space-y-2">
      <ul className="space-y-2 text-sm">
        {visible.map((node, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{node}</span>
          </li>
        ))}
      </ul>
      <Collapsible className="group/vcguide-more">
        <CollapsibleTrigger className="flex w-full items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline">
          <span>{label}</span>
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=open]/vcguide-more:rotate-180"
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-2 space-y-2 text-sm">
            {rest.map((node, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{node}</span>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function SectorBulletList({ lines }: { lines: string[] }) {
  const visible = lines.slice(0, 3)
  const rest = lines.slice(3)
  return (
    <div>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {visible.map((line) => (
          <li key={line}>• {line.replace(/^•\s*/, '')}</li>
        ))}
      </ul>
      {rest.length > 0 ? (
        <Collapsible className="group/sec-more mt-2">
          <CollapsibleTrigger className="text-xs font-medium text-primary underline-offset-4 hover:underline">
            <span className="inline-flex items-center gap-1">
              Show all proof points
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/sec-more:rotate-180"
                aria-hidden
              />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {rest.map((line) => (
                <li key={line}>• {line.replace(/^•\s*/, '')}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'stage', label: 'By stage' },
  { id: 'sector', label: 'By sector' },
  { id: 'structure', label: 'Fund structure' },
  { id: 'next', label: 'Next steps' },
]

export default function VCGuidePage() {
  const [tab, setTab] = useState<TabId>('stage')

  return (
    <div className="min-h-screen bg-background">
      <div className="container-body px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-4xl text-center">
          <Badge className="mb-3" variant="secondary">
            <Target className="mr-1 h-3 w-3" aria-hidden />
            How matching works
          </Badge>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            VC landscape: what each type looks for
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Use the right proof points for each stage and sector. Work through one section at a time.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Guide sections"
          className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-2"
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                tab === id
                  ? 'border-border/70 bg-background text-foreground shadow-sm ring-1 ring-border/60'
                  : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-10" role="tabpanel">
          {tab === 'stage' && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-500" aria-hidden />
                    <CardTitle className="text-lg">Pre-seed / angel / scout / micro-investor</CardTitle>
                  </div>
                  <CardDescription>Checks: ~$50K–$750K</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">They look for</p>
                  <BulletsCollapsible
                    items={[
                      <>
                        <strong>Founder-market fit</strong>: unique insight or edge
                      </>,
                      <>
                        <strong>Speed</strong>: can you ship fast?
                      </>,
                      <>
                        <strong>Early proof</strong>: waitlist, prototype, pilots
                      </>,
                      <>
                        <strong>Technical depth</strong>: can you build it?
                      </>,
                      <>
                        <strong>Low burn</strong>: efficient path to the next milestone
                      </>,
                    ]}
                  />
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" aria-hidden />
                    <CardTitle className="text-lg">Seed</CardTitle>
                  </div>
                  <CardDescription>Checks: ~$750K–$3M (may lead)</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">They look for</p>
                  <BulletsCollapsible
                    items={[
                      <>
                        <strong>PMF trajectory</strong>: retention (D30 / WAU / MAU)
                      </>,
                      <>
                        <strong>Early revenue</strong>: $5K–$100K MRR or validated pilots
                      </>,
                      <>
                        <strong>Repeatable GTM</strong>: clear acquisition hypothesis
                      </>,
                      <>
                        <strong>Path to Series A</strong>: 18-month roadmap with milestones
                      </>,
                      <>
                        <strong>Team</strong>: key roles filled or a hiring plan
                      </>,
                    ]}
                  />
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-500" aria-hidden />
                    <CardTitle className="text-lg">Series A</CardTitle>
                  </div>
                  <CardDescription>Checks: ~$5M–$20M (ownership often 12–20%)</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">They look for</p>
                  <BulletsCollapsible
                    items={[
                      <>
                        <strong>Repeatable sales</strong>: typically {'>'}$1–2M ARR for SaaS
                      </>,
                      <>
                        <strong>Retention</strong>: NRR {'>'}100%
                      </>,
                      <>
                        <strong>Efficient payback</strong>: CAC payback {'<'}18 months
                      </>,
                      <>
                        <strong>Hiring plan</strong>: path to an A-player team
                      </>,
                      <>
                        <strong>Moat</strong>: why you win over time
                      </>,
                    ]}
                  />
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <div className="mb-2 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-500" aria-hidden />
                    <CardTitle className="text-lg">Growth (B / C+)</CardTitle>
                  </div>
                  <CardDescription>Checks: $20M+</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">They look for</p>
                  <BulletsCollapsible
                    items={[
                      <>
                        <strong>Scale</strong>: {'>'}$10–30M ARR
                      </>,
                      <>
                        <strong>Category leadership</strong>
                      </>,
                      <>
                        <strong>Top-quartile KPIs</strong>
                      </>,
                      <>
                        <strong>Governance</strong>: board, processes, reporting
                      </>,
                      <>
                        <strong>Path to profit</strong>
                      </>,
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'sector' && (
            <div>
              <h2 className="sr-only">By sector</h2>
              <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-muted-foreground">
                These are proof points investors often expect. Tailor your deck and data room to your vertical.
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: 'AI / ML',
                    lines: [
                      'Proprietary data or model advantage',
                      'Evaluation benchmarks (quality / cost / latency)',
                      'Defensibility beyond “we call an API”',
                      'Inference cost curves',
                      'AI-native UX',
                      'Security and privacy controls',
                    ],
                  },
                  {
                    title: 'Developer tools',
                    lines: [
                      'Bottoms-up adoption metrics',
                      'OSS traction (stars, contributors)',
                      'CI/CD integration story',
                      'Time-to-value in minutes',
                      'Expansion to enterprise',
                      'Security posture',
                    ],
                  },
                  {
                    title: 'Fintech',
                    lines: [
                      'Regulatory strategy (licenses / partners)',
                      'Fraud and risk controls',
                      'Unit economics',
                      'Risk capital requirements',
                      'Compliance framework',
                      'Banking partnerships',
                    ],
                  },
                  {
                    title: 'Healthcare / biotech',
                    lines: [
                      'Clinical / regulatory path',
                      'Key opinion leaders (KOLs)',
                      'Intellectual property (IP)',
                      'Milestones (IND, IDE, trials)',
                      'Reimbursement strategy',
                      'HIPAA compliance',
                    ],
                  },
                  {
                    title: 'Climate / hardtech',
                    lines: [
                      'Technology readiness level (TRL)',
                      'Pilot sites or LOIs',
                      'Capex / opex model',
                      'Supply chain risk mitigation',
                      'Incentives and tax incentives',
                      'Carbon impact metrics',
                    ],
                  },
                  {
                    title: 'Consumer',
                    lines: [
                      'Retention cohorts (D7, D30)',
                      'DAU/MAU and session depth',
                      'Content or creator engine',
                      'Distribution loops (viral, paid, organic)',
                      'Creator / influencer partnerships',
                      'Brand differentiation',
                    ],
                  },
                  {
                    title: 'SaaS / B2B',
                    lines: [
                      'ICP clarity and validation',
                      'Pipeline health (volume, velocity)',
                      'Sales efficiency (CAC, LTV, payback)',
                      'Implementation time',
                      'Integration ecosystem',
                      'Net revenue retention',
                    ],
                  },
                  {
                    title: 'Crypto / Web3',
                    lines: [
                      'On-chain traction (wallets, TVL)',
                      'Token plan and compliance',
                      'Security audits',
                      'Community governance model',
                      'Exchange / market maker relationships',
                      'Smart contract risk mitigation',
                    ],
                  },
                ].map(({ title, lines }) => (
                  <Card key={title} className="border-border/50 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SectorBulletList lines={lines} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tab === 'structure' && (
            <div className="space-y-4">
              <h2 className="sr-only">By fund structure</h2>
              <Card>
                <CardHeader>
                  <CardTitle>Solo GP / rolling fund / emerging manager</CardTitle>
                  <CardDescription>Concentrated bets, strong operator networks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        <strong>Founder-story fit</strong>: they often bet on people first.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        <strong>Fast conviction</strong>: sometimes 1 to 2 meetings to a term sheet.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        <strong>Operator help</strong>: hands-on when they have been there before.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Multi-partner institutional fund</CardTitle>
                  <CardDescription>Process-driven, ownership targets, board capacity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                      <span>
                        <strong>IC process</strong>: often 3 to 5 meetings.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                      <span>
                        <strong>Ownership</strong>: often about 15 to 20% at lead rounds.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                      <span>
                        <strong>Board bandwidth</strong>: partners only take so many boards.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Corporate Investor (CVC)</CardTitle>
                  <CardDescription>Strategic fit to the parent company</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        <strong>Strategic value</strong>: how you help the parent.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        <strong>BD potential</strong>: can the parent be a customer or partner?
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                      <span>
                        <strong>Conflicts</strong>: data sharing, competing products.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Accelerators / studios</CardTitle>
                  <CardDescription>Cohort-based, intense mentorship</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        <strong>Coachability</strong>: iterate with feedback.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        <strong>Cadence</strong>: ship weekly, learn constantly.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        <strong>Network</strong>: use alumni and partner intros.
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'next' && (
            <Card className="mx-auto max-w-2xl border-primary/40 bg-primary/[0.06] shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" aria-hidden />
                  <CardTitle>How this shows up in {BRAND_NAME}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Scores tie back to what you actually wrote. We line up stage- and sector-specific proof points from your
                  materials so you can see strengths and gaps.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Each match shows the thesis cues that moved the score, so it is not a black box. You also get notes on what
                  to tighten before you reach out.
                </p>
                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center">
                  <Link href={legacyNexusExtrasEnabled() ? '/founder/resume-analysis' : '/founder/ai-analysis'}>
                    <Button size="lg" className="w-full sm:w-auto">
                      {legacyNexusExtrasEnabled() ? 'Analyze my resume' : 'Analyze my pitch'}
                    </Button>
                  </Link>
                  <Link href="/founder/discover">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      Browse investors
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
