'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, AlertCircle, CheckCircle, Lightbulb, TrendingUp, Target } from 'lucide-react'
import SmartMatchResults from '@/components/smart-match-results'
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard'
import { pickMatchesArray, resolveRubricForDashboard } from '@/lib/analysis/is-safe-rubric-for-dashboard'

export type PitchAnalysisReportProps = {
  result: Record<string, unknown>
  showMatches?: boolean
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
        </div>
      )}

      {showMatches && (!matches || matches.length === 0) && (
        <SmartMatchResults matches={matches} />
      )}
    </div>
  )
}
