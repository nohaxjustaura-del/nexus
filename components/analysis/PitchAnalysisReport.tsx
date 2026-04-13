'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Sparkles, AlertCircle, CheckCircle, Lightbulb, TrendingUp, Target, GraduationCap, Heart, Globe, Shield } from 'lucide-react'
import SmartMatchResults from '@/components/smart-match-results'
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard'
import { pickMatchesArray, resolveRubricForDashboard } from '@/lib/analysis/is-safe-rubric-for-dashboard'

export type PitchAnalysisReportProps = {
  result: Record<string, unknown>
  showMatches?: boolean
}

type UniversityProgramPayload = {
  program?: {
    id?: string
    name?: string
    university?: string
    applicationUrl?: string
    description?: string
  }
  qualificationReason?: string
  urgency?: string
}

function pickUniversityPrograms(result: Record<string, unknown>): UniversityProgramPayload[] {
  const raw = result.universityPrograms
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (x): x is UniversityProgramPayload =>
      x !== null && typeof x === 'object' && typeof (x as UniversityProgramPayload).program?.name === 'string',
  )
}

type NicheProgramPayload = {
  program?: {
    id?: string
    name?: string
    focusTags?: string[]
    type?: string
    applicationUrl?: string
    description?: string
    checkSize?: { min?: number | null; max?: number | null }
  }
  matchedTags?: string[]
  qualificationReason?: string
  urgency?: string
}

function pickNichePrograms(result: Record<string, unknown>): NicheProgramPayload[] {
  const raw = result.nichePrograms
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (x): x is NicheProgramPayload =>
      x !== null && typeof x === 'object' && typeof (x as NicheProgramPayload).program?.name === 'string',
  )
}

const NICHE_SECTION_META: Record<string, { label: string; icon: React.ReactNode }> = {
  women:            { label: 'Programs for women founders',           icon: <Heart className="h-5 w-5 text-pink-500" /> },
  immigrant:        { label: 'Programs for immigrant founders',       icon: <Globe className="h-5 w-5 text-blue-500" /> },
  veteran:          { label: 'Programs for veteran founders',         icon: <Shield className="h-5 w-5 text-emerald-500" /> },
  lgbtq:            { label: 'Programs for LGBTQ+ founders',          icon: <Heart className="h-5 w-5 text-violet-500" /> },
  underrepresented: { label: 'Programs for underrepresented founders', icon: <Sparkles className="h-5 w-5 text-amber-500" /> },
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Strong'
  if (score >= 70) return 'Promising'
  if (score >= 50) return 'Developing'
  if (score >= 30) return 'Early'
  return 'Needs work'
}

export function PitchAnalysisReport({ result, showMatches = true }: PitchAnalysisReportProps) {
  const resolvedRubric = resolveRubricForDashboard(result)
  const finalScore =
    (typeof result.finalScore === 'number' ? result.finalScore : undefined) ??
    (typeof result.overallScore === 'number' ? result.overallScore : undefined)
  const matches = pickMatchesArray(result)
  const universityPrograms = pickUniversityPrograms(result)
  const nichePrograms = pickNichePrograms(result)

  const strengths = (result.strengths as string[]) || []
  const weaknesses = (result.weaknesses as string[]) || []
  const improvements = Array.isArray(result.improvements) ? (result.improvements as string[]) : []

  return (
    <div className="space-y-6">
      {/* Fundraising Fit Score */}
      {finalScore != null && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardContent className="flex items-center gap-6 py-6">
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <span className={`text-3xl font-bold tabular-nums tracking-tight ${getScoreColor(finalScore)}`}>
                {Math.round(finalScore)}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">/100</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Target className="h-5 w-5 text-primary" />
                Fundraising fit
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className={`font-medium ${getScoreColor(finalScore)}`}>{getScoreLabel(finalScore)}</span>
                {' -- '}
                This score reflects how ready your pitch is to attract investor interest based on market, defensibility, founder fit, momentum, and execution.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rubric dashboard (category breakdown) */}
      {resolvedRubric ? (
        <AnalysisDashboard result={resolvedRubric} finalScore={finalScore} />
      ) : finalScore == null ? (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Analysis results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="text-sm text-muted-foreground">Overall score</div>
              <div className="text-3xl font-bold text-primary">0/100</div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* What's strong / What to improve */}
      {(strengths.length > 0 || weaknesses.length > 0 || improvements.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {strengths.length > 0 && (
            <Card className="border-green-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  What&apos;s strong
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-muted-foreground">
                      <span className="text-emerald-600 dark:text-emerald-400">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {(weaknesses.length > 0 || improvements.length > 0) && (
            <Card className="border-amber-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  What to improve before outreach
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-sm">
                  {weaknesses.map((s, i) => (
                    <li key={`w-${i}`} className="flex gap-2 text-muted-foreground">
                      <span className="text-amber-600 dark:text-amber-400">-</span>
                      {s}
                    </li>
                  ))}
                  {improvements.map((s, i) => (
                    <li key={`i-${i}`} className="flex gap-2 text-muted-foreground">
                      <span className="text-blue-600 dark:text-blue-400">*</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {typeof result.transcript === 'string' && result.transcript.trim().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Combined pitch (excerpt)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">
              {result.transcript}
            </pre>
          </CardContent>
        </Card>
      )}

      {nichePrograms.length > 0 && (() => {
        const grouped = new Map<string, NicheProgramPayload[]>()
        for (const m of nichePrograms) {
          const tags = m.matchedTags ?? m.program?.focusTags ?? []
          const primaryTag = tags[0] ?? 'underrepresented'
          if (!grouped.has(primaryTag)) grouped.set(primaryTag, [])
          grouped.get(primaryTag)!.push(m)
        }

        return [...grouped.entries()].map(([tag, matches]) => {
          const meta = NICHE_SECTION_META[tag] ?? NICHE_SECTION_META.underrepresented
          return (
            <div key={tag} className="space-y-3">
              <div className="flex items-center gap-2.5 px-1">
                {meta.icon}
                <div>
                  <h3 className="text-base font-semibold text-foreground">{meta.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    Investors and programs that specifically support founders like you.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {matches.map((m, i) => {
                  const p = m.program!
                  const key = p.id ?? `${p.name}-${i}`
                  const url = typeof p.applicationUrl === 'string' ? p.applicationUrl : ''
                  return (
                    <Card key={key} className="border-border/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base leading-snug">{p.name}</CardTitle>
                        {p.type && (
                          <p className="text-xs font-medium capitalize text-muted-foreground">{p.type.replace(/_/g, ' ')}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0 text-sm text-muted-foreground">
                        {typeof m.qualificationReason === 'string' && m.qualificationReason.trim() ? (
                          <p>{m.qualificationReason}</p>
                        ) : null}
                        {typeof p.description === 'string' && p.description.trim() ? (
                          <p className="text-xs leading-relaxed">{p.description}</p>
                        ) : null}
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                          >
                            Apply / learn more
                          </a>
                        ) : null}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })
      })()}

      {universityPrograms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-semibold text-foreground">Campus and accelerator programs</h3>
              <p className="text-sm text-muted-foreground">
                Based on your school and stage, separate from the institutional investor list below.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {universityPrograms.map((m, i) => {
              const p = m.program!
              const key = p.id ?? `${p.name}-${i}`
              const url = typeof p.applicationUrl === 'string' ? p.applicationUrl : ''
              return (
                <Card key={key} className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base leading-snug">{p.name}</CardTitle>
                    {p.university ? (
                      <p className="text-xs font-medium text-muted-foreground">{p.university}</p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0 text-sm text-muted-foreground">
                    {typeof m.qualificationReason === 'string' && m.qualificationReason.trim() ? (
                      <p>{m.qualificationReason}</p>
                    ) : null}
                    {typeof p.description === 'string' && p.description.trim() ? (
                      <p className="text-xs leading-relaxed">{p.description}</p>
                    ) : null}
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Apply / learn more
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Why these investors matched */}
      {showMatches && matches && matches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-semibold text-foreground">Why these investors matched</h3>
              <p className="text-sm text-muted-foreground">
                Investors ranked by thesis alignment, stage fit, sector relevance, and recent activity signals.
              </p>
            </div>
          </div>
          <SmartMatchResults matches={matches} />
          {typeof result.videoPitchId === 'string' && result.videoPitchId.length > 0 && (
            <Card className="border-primary/25 bg-primary/[0.04]">
              <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">Next: act on your shortlist</p>
                  <p className="text-xs text-muted-foreground">
                    Open the full ranked list, filters, and outreach context for this run.
                  </p>
                </div>
                <Button asChild className="shrink-0">
                  <Link href={`/founder/matches?analysis=${encodeURIComponent(result.videoPitchId)}`}>
                    View investor matches
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showMatches && (!matches || matches.length === 0) && (
        <SmartMatchResults matches={matches} />
      )}
    </div>
  )
}
