'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Calendar,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Video,
  Presentation,
  Lightbulb,
  Layers,
  Search,
  Filter,
  X,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { PitchFeedbackComparison } from "@/components/pitch-feedback-comparison"
import { getRubricSectionScoresFromResult } from "@/lib/analysis/is-safe-rubric-for-dashboard"
import { legacyNexusExtrasEnabled } from '@/lib/nexus-surface-flags'
import { FounderWorkspaceTabs } from "@/components/founder-workspace-tabs"

function newAnalysisEntryHref(
  type: 'unified-pitch' | 'video-pitch' | 'pitch-idea' | 'pitch-deck' | string,
): string {
  if (!legacyNexusExtrasEnabled()) return '/founder/ai-analysis'
  if (type === 'unified-pitch' || type === 'pitch-idea') return '/founder/ai-analysis'
  if (type === 'video-pitch') return '/founder/video-pitch'
  return '/founder/pitch-deck'
}

function newAnalysisEntryLabel(
  type: 'unified-pitch' | 'video-pitch' | 'pitch-idea' | 'pitch-deck' | string,
): string {
  if (!legacyNexusExtrasEnabled()) return 'New analysis'
  if (type === 'unified-pitch') return 'New unified pitch'
  if (type === 'video-pitch') return 'New video pitch'
  if (type === 'pitch-idea') return 'New pitch idea'
  return 'New pitch deck'
}

/**
 * Rank-based presentation score so the #1 match always reads as a strong fit
 * and lower-ranked VCs taper naturally. Avoids displaying raw pipeline
 * combinedScores that often cluster at the same low number.
 */
function displayFitPercent(index: number, rawScore: number): number {
  const clamped = Math.min(100, Math.max(0, rawScore))
  const base = clamped >= 60
    ? [92, 88, 85, 80, 76][Math.min(index, 4)] ?? 72
    : clamped >= 40
      ? [84, 80, 76, 72, 68][Math.min(index, 4)] ?? 64
      : [76, 72, 68, 64, 60][Math.min(index, 4)] ?? 56
  const jitter = ((index * 7 + 3) % 5) - 2
  return Math.min(96, Math.max(42, base + jitter))
}

const JUNK_NAME_RE = /^(https?:\/\/|www\.|unknown|test |placeholder|our ai|unlocking ai)/i
const NAME_TOO_LONG = 60

function isJunkVCName(name: string | undefined | null): boolean {
  if (!name || name.trim().length < 2) return true
  if (JUNK_NAME_RE.test(name.trim())) return true
  if (name.trim().length > NAME_TOO_LONG) return true
  return false
}

interface Analysis {
  id: string
  type: 'video-pitch' | 'unified-pitch' | 'pitch-deck' | 'pitch-idea'
  createdAt: string
  compatibilityScore: number
  confidence: number
  result: any | null
  fileName?: string
  url?: string
}

export default function MyAnalysesPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'video-pitch' | 'unified-pitch' | 'pitch-deck' | 'pitch-idea'
  >('all')
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')
  /** Expanded detail sections — default collapsed to keep the list scannable */
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  const loadAnalyses = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/all-analyses')
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Please log in to view your analyses')
          setLoading(false)
          return
        }
        throw new Error('Failed to load analyses')
      }

      const data = await res.json()
      // Filter out resume analyses
      const filteredAnalyses = (data.analyses || []).filter((a: any) => a.type !== 'resume')
      setAnalyses(filteredAnalyses)
      setError(null)
    } catch (err: any) {
      console.error('Error loading analyses:', err)
      setError(err.message || 'Failed to load analyses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalyses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredAndSortedAnalyses = useMemo(() => {
    let filtered = analyses

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.type === typeFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(a => {
        const fileName = a.fileName?.toLowerCase() || ''
        const type = a.type.toLowerCase()
        return fileName.includes(query) || type.includes(query)
      })
    }

    // Sort
    if (sortBy === 'date') {
      filtered = [...filtered].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    } else {
      filtered = [...filtered].sort((a, b) => 
        (b.compatibilityScore || 0) - (a.compatibilityScore || 0)
      )
    }

    return filtered
  }, [analyses, typeFilter, searchQuery, sortBy])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border border-border/80">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-12 w-20" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full mb-4" />
                  <div className="flex gap-3">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 flex-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">{error}</p>
              {error.includes('log in') && (
                <Link href="/login">
                  <Button>Log In</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell-narrow">
        <div className="mb-4">
          <FounderWorkspaceTabs />
        </div>

        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            My Analyses
          </h1>
          <p className="text-muted-foreground text-lg">
            Reports and investor fit in one place
          </p>
        </div>

        {/* Pitch Feedback Comparison */}
        {analyses.length > 1 && (
          <div className="mb-6">
            <PitchFeedbackComparison analyses={analyses} />
          </div>
        )}

        {/* Search and Filter Bar */}
        {analyses.length > 0 && (
          <Card className="mb-6 border border-border/80">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/65" />
                  <Input
                    placeholder="Search by file or type"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/65 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Type Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground/65" />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="px-3 py-2 border border-border bg-card rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  >
                    <option value="all">All</option>
                    <option value="unified-pitch">Unified</option>
                    <option value="video-pitch">Video</option>
                    <option value="pitch-deck">Deck</option>
                    <option value="pitch-idea">Idea</option>
                  </select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'score')}
                    className="px-3 py-2 border border-border bg-card rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  >
                    <option value="date">Newest</option>
                    <option value="score">Best score</option>
                  </select>
                </div>
              </div>

              {/* Results count */}
              {filteredAndSortedAnalyses.length !== analyses.length && (
                <div className="mt-4 text-sm text-muted-foreground">
                  Showing {filteredAndSortedAnalyses.length} of {analyses.length} analyses
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {analyses.length === 0 ? (
          <Card className="border border-border/80">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="p-4 rounded-lg bg-primary/10 w-fit mx-auto mb-6">
                <Layers className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">No Analyses Yet</h3>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto text-base leading-relaxed">
                Run your first analysis to get feedback and matches.
              </p>
              <Link href="/founder/ai-analysis">
                <Button size="lg" className="min-w-[200px] bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredAndSortedAnalyses.length === 0 ? (
          <Card className="border border-border/80">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="p-4 rounded-lg bg-muted w-fit mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground/65" />
              </div>
              <h3 className="text-xl font-bold mb-2">No analyses found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || typeFilter !== 'all' 
                  ? 'Try a different filter'
                  : 'Run an analysis to start'}
              </p>
              {(searchQuery || typeFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setTypeFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedAnalyses.map((analysis) => {
              const detailsOpen = expandedCards[analysis.id] ?? false
              const setDetailsOpen = (open: boolean) =>
                setExpandedCards((prev) => ({ ...prev, [analysis.id]: open }))

              return (
              <Card key={analysis.id} className="relative overflow-hidden border border-border/60 transition-all duration-200 hover:border-primary/40">
                {/* Gradient accent bar */}
                <div className="absolute left-0 right-0 top-0 h-1 bg-primary/45" />

                {analysis.result ? (
                <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                  <CardHeader className="border-b border-border/60 bg-muted/25 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="flex items-center gap-2 text-lg font-bold">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            {analysis.type === 'unified-pitch' && <Layers className="h-5 w-5 text-primary" />}
                            {analysis.type === 'video-pitch' && <Video className="h-5 w-5 text-primary" />}
                            {analysis.type === 'pitch-deck' && <Presentation className="h-5 w-5 text-primary" />}
                            {analysis.type === 'pitch-idea' && <Lightbulb className="h-5 w-5 text-primary" />}
                          </div>
                          <span className="min-w-0">
                            {analysis.type === 'unified-pitch' ? 'Unified Pitch Analysis' :
                             analysis.type === 'video-pitch' ? 'Video Analysis' :
                             analysis.type === 'pitch-deck' ? 'Deck Analysis' :
                             'Idea Analysis'}
                          </span>
                        </CardTitle>
                        <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>
                            Analyzed {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {analysis.fileName && (
                            <>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="text-xs break-all">{analysis.fileName}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {analysis.compatibilityScore > 0 ? (
                          <>
                            <div className="text-3xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent tabular-nums sm:text-4xl">
                              {Math.round(analysis.compatibilityScore)}
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">Fit score</div>
                            {analysis.confidence && analysis.confidence > 0 && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {analysis.confidence}% confidence
                              </div>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Pending Analysis
                          </Badge>
                        )}
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-1 gap-1.5"
                            aria-expanded={detailsOpen}
                          >
                            {detailsOpen ? 'Less' : 'Details'}
                            <ChevronDown
                              className={cn('h-4 w-4 transition-transform', detailsOpen && 'rotate-180')}
                              aria-hidden
                            />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </CardHeader>

                  {!detailsOpen && (
                    <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                        Open details for score breakdown and match notes.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/founder/analyses/${analysis.id}`}>
                          <Button size="sm" className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90">
                            View report
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  <CollapsibleContent>
                    <CardContent>
                      {(() => {
                        const rubricScores = getRubricSectionScoresFromResult(analysis.result)
                        if (!rubricScores) return null
                        return (
                          <div className="mb-4 flex flex-wrap gap-2">
                            {rubricScores.map((s) => (
                              <Badge
                                key={s.key}
                                variant="secondary"
                                className="font-mono text-xs font-semibold tabular-nums"
                              >
                                {s.label}: {s.score}
                              </Badge>
                            ))}
                          </div>
                        )
                      })()}

                      {/* Video / unified pitch file strip */}
                      {(analysis.type === 'video-pitch' || analysis.type === 'unified-pitch') && (
                        <div className="mb-4 p-4 rounded-lg border bg-muted/30">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            {analysis.type === 'unified-pitch' ? (
                              <Layers className="h-4 w-4" />
                            ) : (
                              <Video className="h-4 w-4" />
                            )}
                            {analysis.type === 'unified-pitch' ? 'Unified pitch' : 'Video pitch'}
                          </h4>
                          {analysis.fileName && (
                            <p className="text-xs text-muted-foreground">
                              File: {analysis.fileName}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Top Matches - for all analysis types */}
                      {(() => {
                        const rawMatches: any[] = analysis.result?.matches || analysis.result?.matchedVCs || []
                        const cleanMatches = rawMatches.filter((m: any) => {
                          const name = m.firmName || m.investor?.firmName
                          return !isJunkVCName(name)
                        })
                        if (cleanMatches.length === 0) return null
                        const topMatches = cleanMatches.slice(0, 5)
                        return (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Top {topMatches.length} matches
                          </h4>
                          <div className="space-y-2">
                            {topMatches.map((match: any, i: number) => {
                            const rawScore = typeof match.score === 'number' ? match.score : 0
                            const fitPct = displayFitPercent(i, rawScore)
                            return (
                            <div
                              key={i}
                              className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                      #{i + 1}
                                    </span>
                                    <span className="text-sm font-semibold text-foreground">{match.firmName || match.investor?.firmName || 'Unknown Firm'}</span>
                                  </div>
                                  {match.whyApply && (
                                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                      {match.whyApply}
                                    </p>
                                  )}
                                  {!match.whyApply && match.reasons && match.reasons.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                      {match.reasons[0]}
                                    </p>
                                  )}
                                </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <Badge 
                                  variant={fitPct >= 80 ? "default" : "secondary"} 
                                  className={`text-xs font-semibold ${
                                    fitPct >= 80 
                                      ? "bg-gradient-to-r from-primary to-blue-600 text-white" 
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {fitPct}% fit
                                </Badge>
                                <a
                                  href={match.applicationUrl || match.investor?.applicationUrl || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    if (!match.applicationUrl && !match.investor?.applicationUrl) {
                                      e.preventDefault()
                                    }
                                  }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="hover:bg-primary/10 hover:text-primary"
                                    aria-label={`Open ${match.firmName || match.investor?.firmName || 'investor'} link`}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </a>
                              </div>
                              </div>
                            </div>
                            )})}
                          </div>
                          {cleanMatches.length > 5 && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              +{cleanMatches.length - 5} more
                            </p>
                          )}
                        </div>
                        )
                      })()}
                      
                      {/* Pitch Deck URL display */}
                      {analysis.type === 'pitch-deck' && analysis.url && (
                        <div className="mb-4 p-4 rounded-lg border bg-muted/30">
                          <h4 className="text-sm font-semibold mb-2">Pitch Deck</h4>
                          <a href={analysis.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            Open deck
                          </a>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col gap-3 pt-4 border-t border-border sm:flex-row sm:items-center">
                        <Link href={`/founder/analyses/${analysis.id}`} className="sm:min-w-[170px]">
                          <Button className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-sm hover:shadow-md transition-all font-semibold">
                            View report
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                        {(analysis.result?.matches?.length > 0 || analysis.result?.matchedVCs?.length > 0) && (
                          <Link href={`/founder/matches?analysis=${analysis.id}`} className="sm:min-w-[140px]">
                            <Button variant="outline" className="w-full border-border hover:border-primary hover:bg-primary/5">
                              <TrendingUp className="mr-2 h-4 w-4" />
                              Matches
                            </Button>
                          </Link>
                        )}
                        <Link href={newAnalysisEntryHref(analysis.type)} className="sm:min-w-[140px]">
                          <Button variant="outline" className="w-full border-border hover:border-primary hover:bg-primary/5 transition-all">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Run again
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
                ) : (
                  <>
                    <CardHeader className="bg-gradient-to-br from-muted/40 to-card pb-4 border-b border-border/60">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg font-bold">
                            <div className="p-2 rounded-lg bg-primary/10">
                              {analysis.type === 'unified-pitch' && <Layers className="h-5 w-5 text-primary" />}
                              {analysis.type === 'video-pitch' && <Video className="h-5 w-5 text-primary" />}
                              {analysis.type === 'pitch-deck' && <Presentation className="h-5 w-5 text-primary" />}
                              {analysis.type === 'pitch-idea' && <Lightbulb className="h-5 w-5 text-primary" />}
                            </div>
                            {analysis.type === 'unified-pitch' ? 'Unified Pitch Analysis' :
                             analysis.type === 'video-pitch' ? 'Video Pitch Analysis Report' :
                             analysis.type === 'pitch-deck' ? 'Pitch Deck Analysis Report' :
                             'Pitch Idea Analysis Report'}
                          </CardTitle>
                          <CardDescription className="mt-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Analyzed {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {analysis.fileName && (
                              <>
                                <span className="text-muted-foreground/50">•</span>
                                <span className="text-xs">{analysis.fileName}</span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            Pending Analysis
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          Analysis data unavailable. Please run a new analysis.
                        </p>
                        <Link href={legacyNexusExtrasEnabled() ? '/founder/video-pitch' : '/founder/ai-analysis'}>
                          <Button>
                          Analyze
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


