'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  Sparkles,
  TrendingUp,
  User,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type DetailResponse = {
  founder: {
    id: string
    name: string
    email: string
    startupName: string | null
    bio: string | null
    stage: string
    sectors: string[]
    location: string
    fundingNeed: number
    businessModel: string | null
    linkedinUrl: string | null
    twitterUrl: string | null
    websiteUrl: string | null
    demoUrl: string | null
    videoPitchUrl: string | null
    pitchDeckUrl: string | null
    teamSize: number | null
    revenue: number | null
    users: number | null
    growthRate: string | null
    profileComplete: boolean
  }
  matchScore: number
  application: { status: string; message: string | null; createdAt: string } | null
  resumeAnalysis: {
    compatibilityScore: number
    skills: string[]
    gaps: string[]
    suggestions: string[]
    keywords: string[]
  } | null
  pitchDeckAnalysis: {
    overallScore: number | null
    strengths: string[]
    weaknesses: string[]
    improvements: string[]
  } | null
  pitchIdea: { summary: string | null; strengths: string[] } | null
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  const clean = items.filter(Boolean)
  if (clean.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <ul className="list-inside list-disc space-y-1.5 text-sm text-foreground/90">
      {clean.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

export default function VCApplicantDetailPage() {
  const params = useParams()
  const founderId = typeof params?.founderId === 'string' ? params.founderId : ''
  const [data, setData] = useState<DetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!founderId) {
      setLoading(false)
      setError('Invalid link.')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/vc/applicants/${founderId}`, { credentials: 'include' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (!cancelled) {
            setError(json.message || json.error || 'Could not load this founder.')
            setData(null)
          }
          return
        }
        if (!cancelled) {
          setData(json as DetailResponse)
          setError(null)
        }
      } catch {
        if (!cancelled) setError('Something went wrong. Try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [founderId])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading founder…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Link
          href="/vc/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to candidates
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Not available</CardTitle>
            <CardDescription>{error || 'This profile could not be loaded.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/vc/dashboard" className={buttonVariants({ variant: 'outline' })}>
              Return to list
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { founder, matchScore, application, resumeAnalysis, pitchDeckAnalysis, pitchIdea } = data
  const hasAnyAi =
    Boolean(resumeAnalysis) ||
    Boolean(pitchDeckAnalysis && (pitchDeckAnalysis.strengths.length > 0 || pitchDeckAnalysis.overallScore != null)) ||
    Boolean(pitchIdea && (pitchIdea.summary || pitchIdea.strengths.length > 0))

  const external = [
    { label: 'Website', url: founder.websiteUrl },
    { label: 'LinkedIn', url: founder.linkedinUrl },
    { label: 'Demo', url: founder.demoUrl },
    { label: 'Video pitch', url: founder.videoPitchUrl },
    { label: 'Deck file', url: founder.pitchDeckUrl },
  ].filter((x): x is { label: string; url: string } => Boolean(x.url))

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/vc/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All candidates
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {founder.startupName || 'Startup'}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="h-4 w-4 opacity-70" />
                {founder.name}
              </span>
              <span className="text-border">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4 opacity-70" />
                {founder.location}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-sm font-medium">
              {matchScore}% thesis fit
            </Badge>
            {application && (
              <Badge variant="outline" className="capitalize">
                Applied: {application.status}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`mailto:${founder.email}`}
            className={buttonVariants({ variant: 'default' })}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email founder
          </a>
        </div>

        {!hasAnyAi && (
          <p className="mt-6 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            This founder has not run AI analysis on the platform yet. Use email and profile details
            to decide on next steps.
          </p>
        )}

        <div className="mt-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Snapshot</CardTitle>
              <CardDescription>Stage, ask, and how they describe the company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  {founder.stage}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {founder.sectors.length ? founder.sectors.join(', ') : '-'}
                </span>
                <span>${founder.fundingNeed}K raise</span>
                {founder.businessModel && <span>{founder.businessModel}</span>}
              </div>
              {founder.bio ? (
                <p className="leading-relaxed text-foreground/90">{founder.bio}</p>
              ) : (
                <p className="text-muted-foreground">No bio provided.</p>
              )}
              {(founder.revenue != null || founder.users != null || founder.growthRate || founder.teamSize != null) && (
                <div className="rounded-md border border-border/80 bg-muted/15 px-3 py-2 text-muted-foreground">
                  {founder.teamSize != null && <div>Team: {founder.teamSize}</div>}
                  {founder.revenue != null && <div>Revenue (monthly): {founder.revenue}</div>}
                  {founder.users != null && <div>Users: {founder.users}</div>}
                  {founder.growthRate && <div>Growth: {founder.growthRate}</div>}
                </div>
              )}
              {application?.message && (
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Note with application</p>
                  <p className="mt-1 text-foreground/90">{application.message}</p>
                </div>
              )}
              {external.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {external.map(({ label, url }) => (
                    <a
                      key={label}
                      href={url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-primary hover:bg-muted/50"
                    >
                      {label}
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {resumeAnalysis && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">AI: team & background</CardTitle>
                </div>
                <CardDescription>
                  From resume analysis
                  {resumeAnalysis.compatibilityScore != null && (
                    <span className="ml-1">
                      · compatibility score {Math.round(resumeAnalysis.compatibilityScore)}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {resumeAnalysis.keywords.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {resumeAnalysis.keywords.map((k) => (
                        <Badge key={k} variant="outline" className="font-normal">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Strengths / skills
                  </p>
                  <BulletList items={resumeAnalysis.skills} empty="No skills list stored." />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Gaps & risks
                  </p>
                  <BulletList items={resumeAnalysis.gaps} empty="None flagged." />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Suggestions
                  </p>
                  <BulletList items={resumeAnalysis.suggestions} empty="None listed." />
                </div>
              </CardContent>
            </Card>
          )}

          {pitchDeckAnalysis &&
            (pitchDeckAnalysis.overallScore != null ||
              pitchDeckAnalysis.strengths.length > 0 ||
              pitchDeckAnalysis.weaknesses.length > 0) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">AI: pitch deck</CardTitle>
                  </div>
                  <CardDescription>
                    {pitchDeckAnalysis.overallScore != null && (
                      <span>Deck score {Math.round(pitchDeckAnalysis.overallScore)} · </span>
                    )}
                    Strengths and gaps from the latest deck review
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Strengths
                    </p>
                    <BulletList items={pitchDeckAnalysis.strengths} empty="No strengths extracted." />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Weaknesses
                    </p>
                    <BulletList items={pitchDeckAnalysis.weaknesses} empty="None listed." />
                  </div>
                  {pitchDeckAnalysis.improvements.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Improvements
                      </p>
                      <BulletList items={pitchDeckAnalysis.improvements} empty="" />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          {pitchIdea && (pitchIdea.summary || pitchIdea.strengths.length > 0) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">AI: pitch idea</CardTitle>
                </div>
                <CardDescription>From their written or voice pitch idea analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {pitchIdea.summary && (
                  <p className="leading-relaxed text-foreground/90">{pitchIdea.summary}</p>
                )}
                {pitchIdea.strengths.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Highlights
                    </p>
                    <BulletList items={pitchIdea.strengths} empty="" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
