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
  Lock,
  Video,
  GraduationCap,
  ArrowUpRight,
  Globe,
  Shield,
} from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { parseJSON, fmtCheckSize, fmtCheckRange } from "@/lib/utils"
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
  let universityPrograms: any[] = []
  let nichePrograms: any[] = []
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
            if (Array.isArray(r.universityPrograms)) {
              universityPrograms = r.universityPrograms
            }
            if (Array.isArray(r.nichePrograms)) {
              nichePrograms = r.nichePrograms
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
        
        // Parse matches and university programs from the latest analysis
        const extractFromResult = (result: any) => {
          const matchesArray = result.matches || result.matchedVCs || []
          if (Array.isArray(matchesArray) && matchesArray.length > 0) {
            topMatches = matchesArray.slice(0, 20)
          }
          if (Array.isArray(result.universityPrograms)) {
            universityPrograms = result.universityPrograms
          }
          if (Array.isArray(result.nichePrograms)) {
            nichePrograms = result.nichePrograms
          }
        }

        if (latest.type === 'resume' && latest.data.fullResult) {
          try {
            extractFromResult(JSON.parse(latest.data.fullResult))
          } catch (e) {
            // Failed to parse - continue without matches
          }
        } else if ((latest.type === 'video' || latest.type === 'pitch-deck') && latest.data.analysisResult) {
          try {
            extractFromResult(JSON.parse(latest.data.analysisResult))
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
          <div className="mb-4 border-b border-border/60">
            <nav className="flex items-center gap-1 -mb-px">
              <Link
                href="/founder/discover"
                className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
                className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Bookmarks
              </Link>
              <Link
                href="/founder/my-analyses"
                className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                My Analyses
              </Link>
            </nav>
          </div>

          {/* Locked Content */}
          <Card className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-b from-primary/[0.07] via-card/95 to-card/95 shadow-sm ring-1 ring-border/15">
            <CardContent className="relative pt-12 pb-12 text-center sm:px-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/12 ring-1 ring-border/40">
                <Lock className="h-10 w-10 text-primary" aria-hidden />
              </div>
              <CardTitle className="mb-3 text-balance text-3xl font-bold text-foreground">
                Unlock your personalized investor matches
              </CardTitle>
              <CardDescription className="mx-auto mb-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
                Run a pitch analysis first, then get compatibility scores, match notes, and a ranked list of VCs, angels, accelerators, and more.
              </CardDescription>

              <div className="mx-auto mb-8 max-w-2xl space-y-3 text-left sm:space-y-4">
                <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-background/50 p-4 dark:bg-background/40">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-primary ring-1 ring-border/30">
                    <Video className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 font-semibold leading-snug text-foreground">Pitch analysis</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Use idea, deck, or video analysis to build a profile. We match from that, with scores you can read.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-background/50 p-4 dark:bg-background/40">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-primary ring-1 ring-border/30">
                    <Target className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 font-semibold leading-snug text-foreground">Detailed match breakdown</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      See exactly why each investor is a good fit with component scores, evidence, and improvement suggestions.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-background/50 p-4 dark:bg-background/40">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-primary ring-1 ring-border/30">
                    <TrendingUp className="h-5 w-5 animate-trend-nudge" strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 font-semibold leading-snug text-foreground">Actionable Insights</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Get specific recommendations on how to improve your match scores and increase your chances.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/founder/ai-analysis">
                  <Button size="lg" className="shadow-md">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Run pitch analysis
                  </Button>
                </Link>
                <Link href="/founder/discover">
                  <Button size="lg" variant="outline" className="border-border/60 bg-background/40 shadow-sm">
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
          <div className="mb-4 border-b border-border/60">
            <nav className="flex items-center gap-1 -mb-px">
              <Link
                href="/founder/discover"
                className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
                className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Bookmarks
              </Link>
              <Link
                href="/founder/my-analyses"
                className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                My Analyses
              </Link>
            </nav>
          </div>

          <Card className="rounded-2xl border border-border/40 bg-card/80 shadow-sm ring-1 ring-border/15">
            <CardContent className="pt-12 pb-12 text-center sm:px-8">
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
        <div className="mb-4 border-b border-border/60">
          <nav className="flex items-center gap-1 -mb-px">
            <Link
              href="/founder/discover"
              className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
              className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Bookmarks
            </Link>
            <Link
              href="/founder/my-analyses"
              className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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

        {/* Niche-focused programs: displayed above university and general investor matches */}
        {nichePrograms.length > 0 && (() => {
          const NICHE_META: Record<string, { label: string; icon: React.ReactNode; gradient: string; border: string }> = {
            women:           { label: 'Programs for women founders',           icon: <Heart className="h-5 w-5" />,          gradient: 'from-pink-500/[0.06] via-card to-card',   border: 'border-pink-500/20 ring-pink-500/10' },
            immigrant:       { label: 'Programs for immigrant founders',       icon: <Globe className="h-5 w-5" />,          gradient: 'from-blue-500/[0.06] via-card to-card',   border: 'border-blue-500/20 ring-blue-500/10' },
            veteran:         { label: 'Programs for veteran founders',         icon: <Shield className="h-5 w-5" />,         gradient: 'from-emerald-500/[0.06] via-card to-card', border: 'border-emerald-500/20 ring-emerald-500/10' },
            lgbtq:           { label: 'Programs for LGBTQ+ founders',          icon: <Heart className="h-5 w-5" />,          gradient: 'from-violet-500/[0.06] via-card to-card',  border: 'border-violet-500/20 ring-violet-500/10' },
            underrepresented:{ label: 'Programs for underrepresented founders', icon: <Sparkles className="h-5 w-5" />,      gradient: 'from-amber-500/[0.06] via-card to-card',   border: 'border-amber-500/20 ring-amber-500/10' },
          }

          const grouped = new Map<string, any[]>()
          for (const m of nichePrograms) {
            const tags: string[] = Array.isArray(m.matchedTags) ? m.matchedTags : (m.program?.focusTags ?? [])
            const primaryTag = tags[0] ?? 'underrepresented'
            if (!grouped.has(primaryTag)) grouped.set(primaryTag, [])
            grouped.get(primaryTag)!.push(m)
          }

          return [...grouped.entries()].map(([tag, matches]) => {
            const meta = NICHE_META[tag] ?? NICHE_META.underrepresented
            return (
              <Card key={tag} className={`mb-6 overflow-hidden rounded-2xl border-2 bg-gradient-to-br shadow-sm ring-1 ${meta.border} ${meta.gradient}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15`}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-foreground">
                        {meta.label}
                        <Badge variant="secondary" className="font-normal text-muted-foreground">
                          {matches.length} matched
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Investors and programs that specifically support founders like you, separate from the general investor list.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {matches.map((match: any, i: number) => {
                      const p = match.program || match
                      const key = p.id || `${p.name}-${i}`
                      const url = typeof p.applicationUrl === 'string' ? p.applicationUrl : ''
                      const urgency = match.urgency
                      return (
                        <div
                          key={key}
                          className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/80 p-4 transition-colors hover:border-primary/25 hover:bg-accent/30"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-semibold leading-snug text-foreground">{p.name}</h3>
                                {p.type && (
                                  <p className="text-xs font-medium capitalize text-muted-foreground">{p.type.replace(/_/g, ' ')}</p>
                                )}
                              </div>
                              {urgency === 'apply_now' && (
                                <Badge variant="destructive" className="shrink-0 text-xs">Apply now</Badge>
                              )}
                              {urgency === 'upcoming_deadline' && (
                                <Badge variant="secondary" className="shrink-0 text-xs">Upcoming</Badge>
                              )}
                            </div>

                            {typeof match.qualificationReason === 'string' && match.qualificationReason.trim() && (
                              <p className="text-sm leading-relaxed text-foreground/80">{match.qualificationReason}</p>
                            )}
                            {p.checkSize && (p.checkSize.min || p.checkSize.max) && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground/80">Check size:</span>{' '}
                                {fmtCheckRange(p.checkSize.min, p.checkSize.max)}
                              </p>
                            )}
                          </div>

                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                            >
                              Apply / learn more
                              <ArrowUpRight className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })
        })()}

        {/* School-specific programs: displayed above general investor matches */}
        {universityPrograms.length > 0 && (
          <Card className="mb-6 overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card shadow-sm ring-1 ring-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-foreground">
                    Campus and accelerator programs
                    <Badge variant="secondary" className="font-normal text-muted-foreground">
                      {universityPrograms.length} matched
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Based on your school affiliation and stage, with exclusive opportunities separate from the general investor list.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                {universityPrograms.map((match: any, i: number) => {
                  const p = match.program || match
                  const key = p.id || `${p.name}-${i}`
                  const url = typeof p.applicationUrl === 'string' ? p.applicationUrl : ''
                  const urgency = match.urgency
                  return (
                    <div
                      key={key}
                      className="flex flex-col justify-between rounded-xl border border-border/60 bg-card/80 p-4 transition-colors hover:border-primary/25 hover:bg-accent/30"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold leading-snug text-foreground">{p.name}</h3>
                            {p.university && (
                              <p className="text-xs font-medium text-muted-foreground">{p.university}</p>
                            )}
                          </div>
                          {urgency === 'apply_now' && (
                            <Badge variant="destructive" className="shrink-0 text-xs">Apply now</Badge>
                          )}
                          {urgency === 'upcoming_deadline' && (
                            <Badge variant="secondary" className="shrink-0 text-xs">Upcoming</Badge>
                          )}
                        </div>

                        {typeof match.qualificationReason === 'string' && match.qualificationReason.trim() && (
                          <p className="text-sm leading-relaxed text-foreground/80">{match.qualificationReason}</p>
                        )}
                        {typeof p.description === 'string' && p.description.trim() && (
                          <p className="text-xs leading-relaxed text-muted-foreground">{p.description}</p>
                        )}
                        {p.checkSize && (p.checkSize.min || p.checkSize.max) && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/80">Check size:</span>{' '}
                            {fmtCheckRange(p.checkSize.min, p.checkSize.max)}
                          </p>
                        )}
                      </div>

                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                        >
                          Apply / learn more
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

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
                    <span>{fmtCheckRange(match.investor.checkMin, match.investor.checkMax)}</span>
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
                                  ? 'bg-emerald-500'
                                  : numValue >= 60
                                  ? 'bg-primary'
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
        <Card className="mt-6 rounded-2xl border border-border/40 bg-gradient-to-b from-primary/[0.06] via-card/95 to-card shadow-sm ring-1 ring-border/15">
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



