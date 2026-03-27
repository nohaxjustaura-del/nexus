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
  RefreshCw,
  Video,
  Presentation,
  Lightbulb,
  Layers,
  Search,
  Filter,
  X
} from "lucide-react"
import Link from "next/link"
import { PitchFeedbackComparison } from "@/components/pitch-feedback-comparison"

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
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Tab Navigation */}
        <div className="mb-4 border-b border-border">
          <nav className="flex items-center gap-1 -mb-px">
            <Link
              href="/founder/discover"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/founder/matches"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Matches
            </Link>
            <Link
              href="/founder/bookmarks"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Bookmarks
            </Link>
            <Link
              href="/founder/my-analyses"
              className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary"
            >
              My Analyses
            </Link>
          </nav>
        </div>

        <div className="mb-6">
          <h1 className="mb-2 text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            My Analyses
          </h1>
          <p className="text-muted-foreground text-lg">
            Past pitch runs, feedback, and VC matches in one place
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
                    placeholder="Search analyses by filename or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
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
                    <option value="all">All Types</option>
                    <option value="unified-pitch">Unified Pitch</option>
                    <option value="video-pitch">Video Pitch</option>
                    <option value="pitch-deck">Pitch Deck</option>
                    <option value="pitch-idea">Pitch Idea</option>
                  </select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'date' | 'score')}
                    className="px-3 py-2 border border-border bg-card rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="score">Sort by Score</option>
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
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="p-4 rounded-lg bg-primary/10">
                  <Presentation className="h-10 w-10 text-primary" />
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <Video className="h-10 w-10 text-primary" />
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <Lightbulb className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3">No Analyses Yet</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Feedback and VC matches from your pitch materials
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <Link href="/founder/pitch-deck">
                  <Card className="hover:shadow-md transition-all border border-border/80 hover:border-primary/40 h-full">
                    <CardContent className="pt-6 text-center">
                      <div className="p-3 rounded-lg bg-primary/10 w-fit mx-auto mb-3">
                        <Presentation className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold mb-2">Pitch Deck</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Upload your pitch deck for analysis and VC matching
                      </p>
                      <Button size="sm" className="w-full">
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/founder/video-pitch">
                  <Card className="hover:shadow-md transition-all border border-border/80 hover:border-primary/40 h-full">
                    <CardContent className="pt-6 text-center">
                      <div className="p-3 rounded-lg bg-primary/10 w-fit mx-auto mb-3">
                        <Video className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold mb-2">Video Pitch</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Upload a video pitch for expert review and feedback
                      </p>
                      <Button size="sm" className="w-full">
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/founder/ai-analysis">
                  <Card className="hover:shadow-md transition-all border border-border/80 hover:border-primary/40 h-full">
                    <CardContent className="pt-6 text-center">
                      <div className="p-3 rounded-lg bg-primary/10 w-fit mx-auto mb-3">
                        <Lightbulb className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold mb-2">Pitch Idea</h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Structured feedback on your idea, aligned with how investors read decks
                      </p>
                      <Button size="sm" className="w-full">
                        Get Started
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </div>
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
                  ? 'Try adjusting your search or filters'
                  : 'Get started by analyzing your pitch materials'}
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
            {filteredAndSortedAnalyses.map((analysis) => (
              <Card key={analysis.id} className="hover:shadow-medium transition-all duration-300 border border-border hover:border-primary/40 overflow-hidden relative group">
                {/* Gradient accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardHeader className="bg-gradient-to-br from-muted/40 to-card pb-4 border-b border-border/60">
                  <div className="flex items-start justify-between">
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
                      {analysis.compatibilityScore > 0 ? (
                        <>
                          <div className="text-4xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {Math.round(analysis.compatibilityScore)}
                          </div>
                          <div className="text-xs font-medium text-muted-foreground">Compatibility</div>
                          {analysis.confidence && analysis.confidence > 0 && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
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
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {analysis.result ? (
                    <>
                      {/* Video / unified pitch file strip */}
                      {(analysis.type === 'video-pitch' || analysis.type === 'unified-pitch') && (
                        <div className="mb-4 p-4 rounded-lg border bg-muted/30">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            {analysis.type === 'unified-pitch' ? (
                              <Layers className="h-4 w-4" />
                            ) : (
                              <Video className="h-4 w-4" />
                            )}
                            {analysis.type === 'unified-pitch' ? 'Unified pitch' : 'Video Pitch Analysis'}
                          </h4>
                          {analysis.fileName && (
                            <p className="text-xs text-muted-foreground">
                              File: {analysis.fileName}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Top Matches - for all analysis types */}
                      {((analysis.result?.matches && analysis.result.matches.length > 0) || 
                        (analysis.result?.matchedVCs && analysis.result.matchedVCs.length > 0)) && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Top {Math.min(5, (analysis.result.matches || analysis.result.matchedVCs || []).length)} VC Matches
                          </h4>
                          <div className="space-y-2">
                            {(analysis.result.matches || analysis.result.matchedVCs || []).slice(0, 5).map((match: any, i: number) => (
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
                                    {match.livePulse && match.livePulse.signalStrength > 1 && (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Live
                                      </span>
                                    )}
                                    {match.livePulse && match.livePulse.signalStrength <= 1 && (
                                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 bg-amber-500/12 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                                        Potentially Inactive
                                      </span>
                                    )}
                                  </div>
                                  {match.reasons && match.reasons.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1.5">
                                      {match.reasons[0]}
                                    </p>
                                  )}
                                  {match.livePulse?.summary && (match.livePulse.summary.recentPortfolio || match.livePulse.summary.currentHeat || match.livePulse.summary.founderAlignment) && (
                                    <div className="mt-2 p-2 rounded bg-indigo-500/10 border border-indigo-500/25 space-y-0.5">
                                      {match.livePulse.summary.recentPortfolio && (
                                        <p className="text-xs text-muted-foreground">{match.livePulse.summary.recentPortfolio}</p>
                                      )}
                                      {match.livePulse.summary.currentHeat && (
                                        <p className="text-xs text-muted-foreground">{match.livePulse.summary.currentHeat}</p>
                                      )}
                                      {match.livePulse.summary.founderAlignment && (
                                        <p className="text-xs text-muted-foreground">{match.livePulse.summary.founderAlignment}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <Badge 
                                  variant={match.score >= 80 ? "default" : "secondary"} 
                                  className={`text-xs font-semibold ${
                                    match.score >= 80 
                                      ? "bg-gradient-to-r from-primary to-blue-600 text-white" 
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {match.score}% match
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
                                  <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </a>
                              </div>
                              </div>
                            </div>
                            ))}
                          </div>
                          {analysis.result?.matchCount && analysis.result.matchCount > 5 && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              +{analysis.result.matchCount - 5} more matches available
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Pitch Deck URL display */}
                      {analysis.type === 'pitch-deck' && analysis.url && (
                        <div className="mb-4 p-4 rounded-lg border bg-muted/30">
                          <h4 className="text-sm font-semibold mb-2">Pitch Deck</h4>
                          <a href={analysis.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            View Pitch Deck
                          </a>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 pt-4 border-t border-border">
                        <Link 
                          href={
                            analysis.type === 'unified-pitch'
                              ? '/founder/ai-analysis'
                              : analysis.type === 'video-pitch'
                                ? '/founder/video-pitch'
                                : '/founder/pitch-deck'
                          } 
                          className="flex-1"
                        >
                          <Button variant="outline" className="w-full border-border hover:border-primary hover:bg-primary/5 transition-all">
                            <Sparkles className="mr-2 h-4 w-4" />
                            {analysis.type === 'unified-pitch'
                              ? 'New unified pitch'
                              : analysis.type === 'video-pitch'
                                ? 'New Video Pitch'
                                : 'New Pitch Deck'}
                          </Button>
                        </Link>
                        {analysis.result?.matches && analysis.result.matches.length > 0 ? (
                          <Link href={`/founder/matches?analysis=${analysis.id}`} className="flex-1">
                            <Button className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-sm hover:shadow-md transition-all font-semibold">
                              View Full Report
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        ) : analysis.type === 'pitch-deck' && analysis.url ? (
                          <a href={analysis.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-sm hover:shadow-md transition-all font-semibold">
                              View Pitch Deck
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>
                          </a>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">
                        Analysis data unavailable. Please run a new analysis.
                      </p>
                      <Link href="/founder/video-pitch">
                        <Button>
                          Start New Analysis
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}


