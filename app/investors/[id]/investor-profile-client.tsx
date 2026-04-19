'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BadgeCheck,
  ExternalLink,
  Globe,
  Linkedin,
  ArrowRight,
  Sparkles,
  DollarSign,
  Target,
  Briefcase,
  Zap,
  MapPin,
  Users,
} from 'lucide-react'

function formatCheckRange(min: number | null, max: number | null): string {
  if (!min && !max) return 'Not disclosed'
  const fmt = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}M` : `$${v}K`)
  if (min && max && min !== max) return `${fmt(min)} - ${fmt(max)}`
  return fmt(min || max || 0)
}

/** DB `portfolio` JSON may be string names or structured objects. */
export type PortfolioListItem =
  | string
  | {
      name?: string
      companyName?: string
      sector?: string
      stage?: string
      outcome?: string
    }

function portfolioDisplayLabel(item: PortfolioListItem): string {
  if (typeof item === 'string') return item.trim()
  if (item && typeof item === 'object') {
    return (
      (typeof item.name === 'string' && item.name.trim()) ||
      (typeof item.companyName === 'string' && item.companyName.trim()) ||
      ''
    )
  }
  return ''
}

function portfolioSubtitle(item: PortfolioListItem): string | null {
  if (typeof item === 'string') return null
  if (!item || typeof item !== 'object') return null
  const parts: string[] = []
  if (typeof item.sector === 'string' && item.sector.trim()) parts.push(item.sector.trim())
  if (typeof item.stage === 'string' && item.stage.trim()) parts.push(item.stage.trim())
  if (typeof item.outcome === 'string' && item.outcome.trim()) parts.push(item.outcome.trim())
  return parts.length ? parts.join(' · ') : null
}

interface InvestorProfileClientProps {
  investor: {
    id: string
    firmName: string
    name: string | null
    bio: string | null
    verified: boolean
    stages: string[]
    sectors: string[]
    geoFocus: string[]
    geography: string[]
    checkMin: number
    checkMax: number
    checkSizeMin: number
    checkSizeMax: number
    fundType: string
    fundSize: string | null
    leadFollow: string
    thesis: string | null
    portfolio: PortfolioListItem[]
    notableInvestments: string | null
    proofPoints: string[]
    valueAddTags: string[]
    personalityType: string | null
    decisionSpeed: string | null
    ownershipTarget: string | null
    websiteUrl: string | null
    applicationUrl: string | null
    twitterUrl: string | null
    linkedinUrl: string | null
    crunchbaseUrl: string | null
  }
  enrichment: {
    snapshot: string | null
    recentDeals: Array<{ name?: string; date?: string; amount?: string }>
  } | null
}

export default function InvestorProfileClient({ investor, enrichment }: InvestorProfileClientProps) {
  const geo = investor.geoFocus.length > 0 ? investor.geoFocus : investor.geography
  const checkMin = investor.checkSizeMin || investor.checkMin
  const checkMax = investor.checkSizeMax || investor.checkMax

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/founder/discover"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to investor database
        </Link>

        {/* Hero header */}
        <div className="mb-8 flex flex-col gap-4 border-b border-border/50 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {investor.firmName}
              </h1>
              {investor.verified && (
                <BadgeCheck className="h-6 w-6 text-primary" aria-label="Verified" />
              )}
            </div>
            {investor.name && (
              <p className="mt-1 text-sm text-muted-foreground">{investor.name}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{investor.fundType}</Badge>
              {investor.fundSize && (
                <Badge variant="outline">{investor.fundSize}</Badge>
              )}
              {investor.leadFollow && (
                <Badge variant="outline">{investor.leadFollow}</Badge>
              )}
              {investor.decisionSpeed && (
                <Badge variant="outline">{investor.decisionSpeed}</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {investor.applicationUrl && (
              <Button asChild>
                <a href={investor.applicationUrl} target="_blank" rel="noopener noreferrer">
                  Apply <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            {investor.websiteUrl && (
              <Button variant="outline" asChild>
                <a href={investor.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="mr-2 h-4 w-4" /> Website
                </a>
              </Button>
            )}
            {investor.linkedinUrl && (
              <Button variant="outline" size="icon" asChild>
                <a href={investor.linkedinUrl} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left: main content */}
          <div className="space-y-6 md:col-span-2">
            {/* Investment Thesis */}
            {investor.thesis && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-primary" />
                    Investment Thesis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                    {investor.thesis}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Investment Criteria */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Investment Criteria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check Size</span>
                    <p className="mt-1 text-lg font-semibold">{formatCheckRange(checkMin, checkMax)}</p>
                  </div>
                  {investor.ownershipTarget && (
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ownership Target</span>
                      <p className="mt-1 text-lg font-semibold">{investor.ownershipTarget}</p>
                    </div>
                  )}
                  {investor.stages.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stages</span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {investor.stages.map((s) => (
                          <Badge key={s} variant="secondary">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {investor.sectors.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sectors</span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {investor.sectors.map((s) => (
                          <Badge key={s} variant="outline">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {geo.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Geography</span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {geo.map((g) => (
                          <Badge key={g} variant="outline">
                            <MapPin className="mr-1 h-3 w-3" />{g}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Portfolio */}
            {investor.portfolio.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Portfolio Companies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {investor.portfolio.map((company, index) => {
                      const label = portfolioDisplayLabel(company)
                      const sub = portfolioSubtitle(company)
                      if (!label && !sub) return null
                      const title = label || 'Portfolio company'
                      return (
                        <Badge
                          key={`portfolio-${index}-${title}`}
                          variant="secondary"
                          className="flex max-w-full flex-col items-stretch px-3 py-1.5 text-start text-sm"
                          title={sub ?? undefined}
                        >
                          <span className="block truncate">{title}</span>
                          {sub ? (
                            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                              {sub}
                            </span>
                          ) : null}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            {enrichment?.snapshot && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground/85">{enrichment.snapshot}</p>
                  {enrichment.recentDeals.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Deals</span>
                      {enrichment.recentDeals.map((deal, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm">
                          <span className="font-medium">{deal.name || 'Unknown'}</span>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            {deal.amount && <span>{deal.amount}</span>}
                            {deal.date && <span>{deal.date}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Get AI Match CTA */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Get AI Match Score</span>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Run a pitch analysis to see how well you match with {investor.firmName}.
                </p>
                <Button asChild className="w-full">
                  <Link href="/founder/ai-analysis">
                    Analyze your pitch <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Value-add */}
            {investor.valueAddTags.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">What they bring beyond money</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {investor.valueAddTags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Personality */}
            {(investor.personalityType || investor.decisionSpeed) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    Working Style
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {investor.personalityType && (
                    <div>
                      <span className="text-xs text-muted-foreground">Approach: </span>
                      <span className="font-medium">{investor.personalityType}</span>
                    </div>
                  )}
                  {investor.decisionSpeed && (
                    <div>
                      <span className="text-xs text-muted-foreground">Decision speed: </span>
                      <span className="font-medium">{investor.decisionSpeed}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bio */}
            {investor.bio && investor.bio.length > 5 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-relaxed text-muted-foreground">{investor.bio}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
