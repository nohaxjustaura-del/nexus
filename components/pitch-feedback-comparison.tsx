'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Calendar,
  Sparkles,
  ChevronDown,
} from "lucide-react"

interface Analysis {
  id: string
  type: 'video-pitch' | 'unified-pitch' | 'pitch-deck' | 'pitch-idea'
  createdAt: string
  compatibilityScore: number
  confidence: number
  result: any | null
  fileName?: string
}

interface PitchFeedbackComparisonProps {
  analyses: Analysis[]
}

export function PitchFeedbackComparison({ analyses }: PitchFeedbackComparisonProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Filter analyses with scores
  const scoredAnalyses = analyses
    .filter(a => a.compatibilityScore > 0)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  if (scoredAnalyses.length < 2) {
    return null
  }

  // Calculate improvements
  const getScoreChange = (current: number, previous: number) => {
    const change = current - previous
    const percentage = previous > 0 ? Math.round((change / previous) * 100) : 0
    return { change, percentage, trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable' }
  }

  const latest = scoredAnalyses[0]
  const previous = scoredAnalyses[1]
  const scoreChange = getScoreChange(latest.compatibilityScore, previous.compatibilityScore)

  // Extract feedback improvements
  const getFeedbackComparison = () => {
    const latestFeedback = latest.result?.feedback || latest.result?.improvements || []
    const previousFeedback = previous.result?.feedback || previous.result?.improvements || []
    
    // Find new improvements
    const newImprovements = latestFeedback.filter((item: string) => 
      !previousFeedback.some((prev: string) => prev.toLowerCase().includes(item.toLowerCase().substring(0, 20)))
    )

    return {
      newImprovements: newImprovements.slice(0, 3),
      totalImprovements: latestFeedback.length,
      previousTotal: previousFeedback.length,
    }
  }

  const feedbackComparison = getFeedbackComparison()

  return (
    <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
      <Card className="border-2">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Pitch trend
              </CardTitle>
              <CardDescription>
                Latest vs previous score
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                {detailsOpen ? 'Hide' : 'Details'}
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', detailsOpen && 'rotate-180')}
                  aria-hidden
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm">
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {Math.round(latest.compatibilityScore)}
            </span>
            <span className="text-muted-foreground">latest</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-muted-foreground">
              {Math.round(previous.compatibilityScore)} previous
            </span>
            {scoreChange.trend === 'up' ? (
              <span className="inline-flex items-center gap-1 font-medium text-green-600">
                <TrendingUp className="h-3.5 w-3.5" />
                +{scoreChange.change} ({scoreChange.percentage}%)
              </span>
            ) : scoreChange.trend === 'down' ? (
              <span className="inline-flex items-center gap-1 font-medium text-red-600">
                <TrendingDown className="h-3.5 w-3.5" />
                {scoreChange.change} ({Math.abs(scoreChange.percentage)}%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                <Minus className="h-3.5 w-3.5" />
                No change
              </span>
            )}
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
        {/* Score Trend */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-muted/50 to-primary/5 border-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-foreground/85">Latest Score</p>
              <p className="text-3xl font-bold text-foreground">{Math.round(latest.compatibilityScore)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground/85">Previous Score</p>
              <p className="text-3xl font-bold text-muted-foreground">{Math.round(previous.compatibilityScore)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {scoreChange.trend === 'up' ? (
              <>
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-600">
                  +{scoreChange.change} points ({scoreChange.percentage}% improvement)
                </span>
              </>
            ) : scoreChange.trend === 'down' ? (
              <>
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold text-red-600">
                  {scoreChange.change} points ({Math.abs(scoreChange.percentage)}% decrease)
                </span>
              </>
            ) : (
              <>
                <Minus className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-semibold text-muted-foreground">No change</span>
              </>
            )}
          </div>
        </div>

        {/* Analysis History */}
        <div>
          <h4 className="text-sm font-semibold mb-3">History</h4>
          <div className="space-y-2">
            {scoredAnalyses.slice(0, 5).map((analysis, i) => {
              const isLatest = i === 0
              const date = new Date(analysis.createdAt)
              
              return (
                <div
                  key={analysis.id}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                    isLatest ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isLatest ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <Calendar className={`h-4 w-4 ${
                        isLatest ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {analysis.type === 'unified-pitch' && 'Pitch analysis'}
                        {analysis.type === 'video-pitch' && 'Video Pitch'}
                        {analysis.type === 'pitch-deck' && 'Pitch Deck'}
                        {analysis.type === 'pitch-idea' && 'Pitch Idea'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={isLatest ? 'default' : 'secondary'}
                      className={isLatest ? 'bg-gradient-to-r from-primary to-blue-600' : ''}
                    >
                      {Math.round(analysis.compatibilityScore)}%
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* New Improvements */}
        {feedbackComparison.newImprovements.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              New wins
            </h4>
            <ul className="space-y-2">
              {feedbackComparison.newImprovements.map((improvement: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <div className="p-1 rounded-full bg-green-100 mt-0.5">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-foreground/85">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-foreground/85">
            <span className="font-semibold">{feedbackComparison.totalImprovements}</span> points in latest report
            {feedbackComparison.previousTotal > 0 && (
              <> (was {feedbackComparison.previousTotal})</>
            )}
          </p>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}


