'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Video,
  Presentation
} from "lucide-react"
import Link from "next/link"

interface Analysis {
  id: string
  type: 'video-pitch' | 'pitch-deck'
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

  useEffect(() => {
    loadAnalyses()
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your analyses...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Tab Navigation */}
        <div className="mb-4 border-b">
          <nav className="flex items-center gap-1 -mb-px">
            <Link
              href="/founder/discover"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/founder/matches"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Matches
            </Link>
            <Link
              href="/founder/bookmarks"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
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
          <p className="text-slate-600 text-lg">
            View your previous AI analysis reports and VC matches (Video Pitch, Pitch Deck)
          </p>
        </div>

        {analyses.length === 0 ? (
          <Card className="border-2">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="p-4 rounded-lg bg-primary/10">
                  <Video className="h-10 w-10 text-primary" />
                </div>
                <div className="p-4 rounded-lg bg-primary/10">
                  <Presentation className="h-10 w-10 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3">No Analyses Yet</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Get AI-powered feedback and VC matches by analyzing your pitch materials
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <Link href="/founder/video-pitch">
                  <Card className="hover:shadow-md transition-all border-2 hover:border-primary/40 h-full">
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
                <Link href="/founder/pitch-deck">
                  <Card className="hover:shadow-md transition-all border-2 hover:border-primary/40 h-full">
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
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <Card key={analysis.id} className="hover:shadow-medium transition-all duration-300 border-2 border-slate-200 hover:border-primary/40 overflow-hidden relative group">
                {/* Gradient accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <CardHeader className="bg-gradient-to-br from-slate-50 to-white pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg font-bold">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {analysis.type === 'video-pitch' && <Video className="h-5 w-5 text-primary" />}
                          {analysis.type === 'pitch-deck' && <Presentation className="h-5 w-5 text-primary" />}
                        </div>
                        {analysis.type === 'video-pitch' && 'Video Pitch Analysis Report'}
                        {analysis.type === 'pitch-deck' && 'Pitch Deck Analysis Report'}
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
                            <span className="text-slate-400">•</span>
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
                          <div className="text-xs font-medium text-slate-600">Compatibility</div>
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
                      {/* Video Pitch specific info */}
                      {analysis.type === 'video-pitch' && (
                        <div className="mb-4 p-4 rounded-lg border bg-muted/30">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Video Pitch Analysis
                          </h4>
                          {analysis.fileName && (
                            <p className="text-xs text-muted-foreground">
                              File: {analysis.fileName}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Top Matches - for all analysis types */}
                      {analysis.result?.matches && analysis.result.matches.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Top {Math.min(5, analysis.result.matches.length)} VC Matches
                          </h4>
                          <div className="space-y-2">
                            {analysis.result.matches.slice(0, 5).map((match: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 rounded-lg border-2 border-slate-200 bg-gradient-to-r from-white to-slate-50/50 hover:border-primary/40 hover:shadow-sm transition-all"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                    #{i + 1}
                                  </span>
                                  <span className="text-sm font-semibold text-slate-900">{match.investor.firmName}</span>
                                </div>
                                {match.reasons && match.reasons.length > 0 && (
                                  <p className="text-xs text-slate-600 mt-1.5">
                                    {match.reasons[0]}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant={match.score >= 80 ? "default" : "secondary"} 
                                  className={`text-xs font-semibold ${
                                    match.score >= 80 
                                      ? "bg-gradient-to-r from-primary to-blue-600 text-white" 
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {match.score}% match
                                </Badge>
                                <a
                                  href={match.investor.applicationUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </a>
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
                      <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <Link 
                          href={analysis.type === 'video-pitch' ? '/founder/video-pitch' : '/founder/pitch-deck'} 
                          className="flex-1"
                        >
                          <Button variant="outline" className="w-full border-2 hover:border-primary hover:bg-primary/5 transition-all">
                            <Sparkles className="mr-2 h-4 w-4" />
                            {analysis.type === 'video-pitch' ? 'New Video Pitch' : 'New Pitch Deck'}
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


