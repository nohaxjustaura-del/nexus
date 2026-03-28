import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Heart,
  TrendingUp,
  Building2,
  Users,
  Target,
  Lightbulb,
  ExternalLink,
  ChevronDown,
  Info,
  Star,
  AlertCircle,
  Sparkles,
  Lock
} from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { parseJSON } from "@/lib/utils"
import { logger } from "@/lib/logger"
import { loadFounderAnalysisById } from "@/lib/analysis/load-founder-analysis"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: { analysis?: string }
}) {
  let user
  try {
    user = await getCurrentUser(false)
  } catch (authError) {
    // If auth fails, continue without user - page should still load
    user = null
  }
  
  // Check if user has completed ANY AI analysis (resume, video pitch, etc.)
  let hasAnalysis = false
  let latestAnalysis: any = null
  let topMatches: any[] = []
  let analysisType: 'resume' | 'video' | 'other' = 'resume'

  if (user?.email) {
    try {
      let founder
      try {
        founder = await db.founder.findUnique({
        where: { email: user.email },
        include: {
          resumeAnalyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          videoPitches: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            where: {
              analysisResult: { not: null },
            },
          },
          // 🆕 Include pitch deck analyses
          pitchDeckAnalyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            where: {
              analysisResult: { not: null },
            },
          },
        },
        })
      } catch (dbError) {
        founder = null
      }

      // Optional: open matches for a specific saved analysis (from My Analyses)
      let resolvedFromParam = false
      if (founder) {
        const aid =
          typeof searchParams.analysis === 'string' && searchParams.analysis.trim()
            ? searchParams.analysis.trim()
            : null
        if (aid) {
          const loaded = await loadFounderAnalysisById(founder.id, aid)
          if (loaded) {
            const r = loaded.result
            const matchesArray =
              Array.isArray(r.matches) && r.matches.length > 0
                ? r.matches
                : Array.isArray(r.matchedVCs)
                  ? r.matchedVCs
                  : []
            if (matchesArray.length > 0) {
              hasAnalysis = true
              topMatches = matchesArray.slice(0, 20)
              analysisType = 'video'
              resolvedFromParam = true
            }
          }
        }
      }

      // Check for any analysis type (all are equal importance)
      // Priority: Most recent analysis regardless of type
      const allAnalyses: Array<{ type: string; createdAt: Date; data: any }> = []
      
      if (founder && !resolvedFromParam) {
        const resumeAnalyses = (founder as any).resumeAnalyses || []
        const videoPitches = (founder as any).videoPitches || []

        // Add resume analyses if they exist and are properly formatted
        if (founder && Array.isArray(founder.resumeAnalyses)) {
          founder.resumeAnalyses.forEach((analysis: any) => {
            if (
              analysis &&
              analysis.createdAt &&
              !Number.isNaN(new Date(analysis.createdAt).getTime())
            ) {
              allAnalyses.push({
                type: 'resume',
                createdAt: new Date(analysis.createdAt),
                data: analysis,
              })
            }
          })
        }
        
        // Add video pitch analyses
        if (founder && Array.isArray((founder as any).videoPitches)) {
          (founder as any).videoPitches.forEach((pitch: any) => {
            allAnalyses.push({
              type: 'video',
              createdAt: pitch.createdAt,
              data: pitch,
            })
          })
        }
        
        // 🆕 Add pitch deck analyses
        if (founder && Array.isArray((founder as any).pitchDeckAnalyses)) {
          (founder as any).pitchDeckAnalyses.forEach((analysis: any) => {
            allAnalyses.push({
              type: 'pitch-deck',
              createdAt: analysis.createdAt,
              data: analysis,
            })
          })
        }
      }
      
      // Sort by most recent and get the latest
      if (allAnalyses.length > 0) {
        allAnalyses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        const latest = allAnalyses[0]
        hasAnalysis = true
        latestAnalysis = latest.data
        analysisType = latest.type as any
        
        // Parse matches from the latest analysis
        if (latest.type === 'resume' && latest.data.fullResult) {
          try {
            const result = JSON.parse(latest.data.fullResult)
            if (result.matches && Array.isArray(result.matches)) {
              topMatches = result.matches.slice(0, 20)
            }
          } catch (e) {
            // Failed to parse - continue without matches
          }
        } else if (latest.type === 'video' && latest.data.analysisResult) {
          try {
            const result = JSON.parse(latest.data.analysisResult)
            // Video pitch stores matches as "matchedVCs" not "matches"
            const matchesArray = result.matches || result.matchedVCs || []
            if (Array.isArray(matchesArray) && matchesArray.length > 0) {
              topMatches = matchesArray.slice(0, 20)
            }
          } catch (e) {
            // Failed to parse - continue without matches
          }
        } else if (latest.type === 'pitch-deck' && latest.data.analysisResult) {
          try {
            const result = JSON.parse(latest.data.analysisResult)
            // Pitch deck stores matches as "matches" or "matchedVCs"
            const matchesArray = result.matches || result.matchedVCs || []
            if (Array.isArray(matchesArray) && matchesArray.length > 0) {
              topMatches = matchesArray.slice(0, 20)
            }
          } catch (e) {
            // Failed to parse - continue without matches
          }
        }
      }
    } catch (error) {
      // Error checking for analysis - continue without matches
    }
  }

  // If no analysis, show prompt to use AI analyzer
  if (!hasAnalysis) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl px-4 py-4 md:py-6">
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
                className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary"
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
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                My Analyses
              </Link>
            </nav>
          </div>

          {/* Locked Content */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-blue-50/50 to-purple-50/30">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="mb-3 text-3xl font-bold">
                Unlock your personalized investor matches
              </CardTitle>
              <CardDescription className="mb-6 text-lg">
                Run a pitch analysis first, then get compatibility scores, match notes, and a ranked list of VCs, angels, accelerators, and more.
              </CardDescription>
              
              <div className="mx-auto mb-8 max-w-2xl space-y-4 text-left">
                <div className="flex items-start gap-4 rounded-lg border border-border bg-card/80 p-4">
                  <Sparkles className="mt-1 h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-semibold">Pitch analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Use idea, deck, or video analysis to build a profile. We match from that, with scores you can read.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-lg border border-border bg-card/80 p-4">
                  <Target className="mt-1 h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-semibold">Detailed match breakdown</h3>
                    <p className="text-sm text-muted-foreground">
                      See exactly why each investor is a good fit with component scores, evidence, and improvement suggestions
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-lg border border-border bg-card/80 p-4">
                  <TrendingUp className="mt-1 h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-semibold">Actionable Insights</h3>
                    <p className="text-sm text-muted-foreground">
                      Get specific recommendations on how to improve your match scores and increase your chances
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/founder/ai-analysis">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Run pitch analysis
                  </Button>
                </Link>
                <Link href="/founder/discover">
                  <Button size="lg" variant="outline">
                    Browse all investors
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // If no matches found in analysis, show empty state
  if (topMatches.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl px-4 py-4 md:py-6">
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
                className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary"
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
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                My Analyses
              </Link>
            </nav>
          </div>

          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <CardTitle className="mb-2">No Matches Found</CardTitle>
              <CardDescription className="mb-6">
                No matches found in your latest analysis. Try running a new analysis or browse all investors.
              </CardDescription>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/founder/ai-analysis">
                  <Button>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Run pitch analysis
                  </Button>
                </Link>
                <Link href="/founder/discover">
                  <Button variant="outline">Browse all investors</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Format matches from analysis result
  const formattedMatches = topMatches.map((match: any, idx: number) => {
    const investor = match.investor || {}
    const stages = parseJSON<string[]>(investor.stages || '[]', [])
    const sectors = parseJSON<string[]>(investor.sectors || '[]', [])
    const valueAddTags = parseJSON<string[]>(investor.valueAddTags || '[]', [])
    
    return {
      id: investor.id || `match-${idx}`,
      investor: {
        firmName: investor.firmName || 'Unknown VC',
        name: investor.name || '',
        fundType: investor.fundType || 'institutional',
        stages,
        sectors,
        checkMin: investor.checkMin || 0,
        checkMax: investor.checkMax || 0,
        thesis: investor.thesis || '',
        applicationUrl: investor.applicationUrl || investor.websiteUrl || `mailto:${investor.email || ''}?subject=Investment Inquiry`,
      },
      score: Math.round(match.score || 0),
      confidence: match.confidence || 85,
      components: match.components || {},
      evidence: match.evidence || [],
      suggestions: match.suggestions || [],
      reasons: match.reasons || [],
    }
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-4 md:py-6">
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
              className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary"
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
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              My Analyses
            </Link>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-4">
          <h1 className="mb-2 text-3xl font-bold">Your top investor matches</h1>
          <p className="text-muted-foreground">
            Ranked by fit with your pitch -- thesis alignment, stage, sector, and recent activity
          </p>
        </div>

        {/* Matches */}
        <div className="space-y-4">
          {formattedMatches.map((match, idx) => (
            <Card key={match.id} className="overflow-hidden">
              {/* Header */}
              <CardHeader className="bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                      #{idx + 1}
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{match.investor.firmName}</CardTitle>
                      <CardDescription className="text-base">
                        {match.investor.name} · {match.investor.fundType}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-primary">{match.score}</div>
                    <div className="text-sm text-muted-foreground">
                      ±{100 - match.confidence} confidence
                    </div>
                  </div>
                </div>

                {/* Quick Facts */}
                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>{match.investor.stages.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{match.investor.sectors.join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span>${match.investor.checkMin}K - ${match.investor.checkMax}K</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {/* Subscores */}
                <div className="mb-6">
                  <h3 className="mb-4 font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Compatibility Breakdown
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(match.components).map(([key, value]: [string, any]) => {
                      const labels: Record<string, string> = {
                        sectorFit: 'Sector Fit',
                        stageReadiness: 'Stage Readiness',
                        teamTechFit: 'Team/Tech Fit',
                        gtmFit: 'GTM Fit',
                        geoFit: 'Geographic Match',
                        networkFit: 'Network Proximity',
                      }
                      
                      const numValue = typeof value === 'number' ? value : 0
                      if (key === 'networkFit' && numValue === 0) return null

                      return (
                        <div key={key}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium">{labels[key]}</span>
                            <span className="text-muted-foreground">{numValue}/100</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full transition-all ${
                                numValue >= 80
                                  ? 'bg-green-500'
                                  : numValue >= 60
                                  ? 'bg-blue-500'
                                  : numValue >= 40
                                  ? 'bg-orange-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${numValue}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Evidence */}
                <div className="mb-6">
                  <h3 className="mb-4 font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Evidence (Why This Match?)
                  </h3>
                  <div className="space-y-3">
                    {match.evidence.map((ev: any, i: number) => (
                      <div key={i} className="rounded-lg border bg-muted/30 p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {ev.component}
                          </Badge>
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <div>
                            <span className="font-medium">Your Resume: </span>
                            <span className="text-muted-foreground">"{ev.resumeSpan}"</span>
                          </div>
                          <div>
                            <span className="font-medium">VC Profile: </span>
                            <span className="text-muted-foreground">"{ev.vcSpan}"</span>
                          </div>
                          <div className="pt-1 text-primary">
                            → {ev.explanation}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Thesis */}
                <div className="mb-6 rounded-lg border bg-muted/20 p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Building2 className="h-4 w-4" />
                    Investment Thesis
                  </h3>
                  <p className="text-sm text-muted-foreground italic">
                    "{match.investor.thesis}"
                  </p>
                </div>

                {/* Suggestions */}
                <div className="mb-6">
                  <h3 className="mb-4 font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    How to Improve This Match
                  </h3>
                  <div className="space-y-2">
                    {match.suggestions.map((suggestion: any, i: number) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="shrink-0 font-medium text-primary">
                          {i + 1}.
                        </span>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <a href={match.investor.applicationUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button className="w-full">
                      Apply to {match.investor.firmName}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                  <Link href={`/founder/crash-course/${match.id}`}>
                    <Button variant="outline">
                      View Crash Course
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Next Steps Panel */}
        <Card className="mt-6 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-primary" />
              Next steps
            </CardTitle>
            <CardDescription>
              NEXUS does not stop at ranking -- act on your results.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Link href="/founder/discover" className="block">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card/80 p-4 transition-colors hover:border-primary/30 hover:bg-accent/30">
                <Users className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Browse all investors</p>
                  <p className="text-xs text-muted-foreground">Filter by stage, sector, and type</p>
                </div>
              </div>
            </Link>
            <Link href="/founder/bookmarks" className="block">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card/80 p-4 transition-colors hover:border-primary/30 hover:bg-accent/30">
                <Heart className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Save target list</p>
                  <p className="text-xs text-muted-foreground">Bookmark investors to track</p>
                </div>
              </div>
            </Link>
            <Link href="/founder/ai-analysis" className="block">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card/80 p-4 transition-colors hover:border-primary/30 hover:bg-accent/30">
                <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Improve and re-run</p>
                  <p className="text-xs text-muted-foreground">Refine your pitch for better matches</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



