'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { useAuthSession } from '@/components/auth-session-provider'
import { toast } from '@/components/ui/toast-simple'
import { cn } from '@/lib/utils'
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck,
  TrendingUp,
  Users,
  MapPin,
  DollarSign,
  Sparkles,
  BarChart3,
  Shield,
  Target,
  Zap,
  Brain,
  ExternalLink,
  Building2,
  Briefcase,
  Globe,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AnalysisSummary {
  overallScore: number
  tier: string | null
  strengths: string[]
  weaknesses: string[]
  executiveSummary: string | null
  marketScore: number | null
  teamScore: number | null
  tractionScore: number | null
  productScore: number | null
  marketAnalysis: string | null
  teamAnalysis: string | null
  redFlags: string[]
  bullCase: string | null
  bearCase: string | null
  analysisCount: number
}

interface DimensionBreakdown {
  investmentQuality: number
  sectorAlignment: number
  stageCheckFit: number
  geographyFit: number
  tractionEvidence: number
  founderFocusMatch: number
  valuesAlignment: number
}

interface FounderRecommendation {
  /** Unique row (venture summary id or founder id). */
  id: string
  /** Account id for bookmarks. */
  founderId: string
  name: string
  startupName: string | null
  stage: string
  sectors: string[]
  location: string
  fundingNeed: number
  bio: string | null
  linkedinUrl: string | null
  websiteUrl: string | null
  revenue: number | null
  users: number | null
  growthRate: string | null
  teamSize: number | null
  matchScore: number
  matchReasons: string[]
  confidence: number
  freshness: number
  strictFilterPass: boolean
  actionHint: string
  dimensionBreakdown: DimensionBreakdown
  analysisSummary: AnalysisSummary | null
}

/* ------------------------------------------------------------------ */
/*  Shared UI bits                                                     */
/* ------------------------------------------------------------------ */

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, score))
  const offset = circ - (pct / 100) * circ
  const color =
    pct >= 70 ? 'stroke-emerald-500' : pct >= 45 ? 'stroke-amber-500' : 'stroke-red-400'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-muted" strokeWidth={3} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          className={cn(color, 'transition-all duration-500')}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-xs font-bold tabular-nums text-foreground">{Math.round(pct)}</span>
    </div>
  )
}

function ScoreBar({ label, score, max, icon }: { label: string; score: number | null; max: number; icon: React.ReactNode }) {
  const pct = score != null ? Math.min(100, Math.round((score / max) * 100)) : 0
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">{icon}{label}</span>
        <span className="tabular-nums font-semibold text-foreground">{score != null ? Math.round(score) : '-'}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="surface-panel flex items-center gap-4 px-5 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold tabular-nums text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tier Badge                                                         */
/* ------------------------------------------------------------------ */

const TIER_STYLES: Record<string, string> = {
  EXCEPTIONAL: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  STRONG:      'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  DEVELOPING:  'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  EARLY:       'border-border bg-muted text-muted-foreground',
  PASS:        'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
}

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
      TIER_STYLES[tier] || TIER_STYLES.EARLY,
    )}>
      {tier}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Founder Card                                                       */
/* ------------------------------------------------------------------ */

function FounderCard({ rec, bookmarked, onToggleBookmark }: {
  rec: FounderRecommendation; bookmarked: boolean; onToggleBookmark: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const as = rec.analysisSummary
  const displayName = (rec.name || '').trim() || 'Founder'
  const displayStage = (rec.stage || '').trim() || 'Stage TBD'
  const displayLocation = (rec.location || '').trim() || 'Location TBD'
  const sectors = Array.isArray(rec.sectors) ? rec.sectors : []
  const fundingNeed =
    typeof rec.fundingNeed === 'number' && Number.isFinite(rec.fundingNeed) ? rec.fundingNeed : null

  return (
    <div
      className={cn(
        'group rounded-xl border bg-card transition-all duration-200',
        expanded
          ? 'border-primary/25 shadow-md shadow-primary/5 ring-1 ring-primary/10'
          : 'border-border/60 shadow-sm hover:border-border hover:shadow-md hover:shadow-black/5',
      )}
      style={{ animation: 'fadeInUp .4s ease-out backwards' }}
    >
      {/* Compact header */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Score ring */}
          <div className="hidden shrink-0 sm:block">
            <ScoreRing score={rec.matchScore} />
          </div>

          {/* Main info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {rec.startupName || 'Unnamed Startup'}
              </h3>
              <Badge variant="secondary" className="tabular-nums text-xs font-semibold sm:hidden">
                {rec.matchScore}%
              </Badge>
              {as?.tier && <TierBadge tier={as.tier} />}
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">{displayName}</span>
              <span className="text-border">·</span>
              <span>{displayStage}</span>
              {sectors.length > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span>{sectors.slice(0, 2).join(', ')}{sectors.length > 2 ? ` +${sectors.length - 2}` : ''}</span>
                </>
              )}
            </p>

            {/* Meta row */}
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{displayLocation}</span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {fundingNeed != null && fundingNeed > 0 ? `$${fundingNeed}K needed` : 'Funding TBD'}
              </span>
              {rec.revenue != null && rec.revenue > 0 && (
                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />${rec.revenue.toLocaleString()}/mo</span>
              )}
              {rec.teamSize != null && rec.teamSize > 0 && (
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />Team of {rec.teamSize}</span>
              )}
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" />{rec.confidence}% confidence</span>
              <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />{rec.freshness}% freshness</span>
            </div>

            {/* Executive summary */}
            {as?.executiveSummary && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-2">{as.executiveSummary}</p>
            )}

            {/* Match reasons */}
            {rec.matchReasons.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {rec.matchReasons.slice(0, 3).map((reason, i) => (
                  <span key={i} className="inline-flex items-center rounded-md border border-primary/15 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {reason}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs font-medium text-primary">{rec.actionHint}</p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleBookmark(rec.founderId)}
              className={cn(
                'rounded-lg p-2 transition-colors',
                bookmarked
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {bookmarked ? <BookmarkCheck className="h-4.5 w-4.5" /> : <Bookmark className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
          <div className="flex gap-2">
            {rec.linkedinUrl && (
              <a href={rec.linkedinUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                LinkedIn <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {rec.websiteUrl && (
              <a href={rec.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Website <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              expanded
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {expanded ? 'Show less' : 'Full analysis'}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border/40 bg-muted/15 px-5 py-6 sm:px-6 space-y-6">
          {/* AI Scores Grid */}
          {as && (
            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Analysis
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {as.analysisCount} run{as.analysisCount !== 1 ? 's' : ''}
                </span>
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <ScoreBar label="Overall" score={as.overallScore} max={100} icon={<BarChart3 className="h-3 w-3" />} />
                <ScoreBar label="Market" score={as.marketScore} max={100} icon={<Target className="h-3 w-3" />} />
                <ScoreBar label="Team" score={as.teamScore} max={100} icon={<Users className="h-3 w-3" />} />
                <ScoreBar label="Traction" score={as.tractionScore} max={100} icon={<TrendingUp className="h-3 w-3" />} />
                <ScoreBar label="Product" score={as.productScore} max={100} icon={<Zap className="h-3 w-3" />} />
              </div>
            </section>
          )}

          {/* Strengths & Weaknesses side by side */}
          {as && (as.strengths?.length > 0 || as.weaknesses?.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {as.strengths?.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Strengths</h4>
                  <ul className="space-y-1.5">
                    {as.strengths.slice(0, 4).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {as.weaknesses?.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Risks</h4>
                  <ul className="space-y-1.5">
                    {as.weaknesses.slice(0, 3).map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {/* Market & Team Analysis */}
          {(as?.marketAnalysis || as?.teamAnalysis) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {as?.marketAnalysis && (
                <section className="space-y-1.5">
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />Market
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">{as.marketAnalysis}</p>
                </section>
              )}
              {as?.teamAnalysis && (
                <section className="space-y-1.5">
                  <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Brain className="h-3.5 w-3.5 text-muted-foreground" />Team
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">{as.teamAnalysis}</p>
                </section>
              )}
            </div>
          )}

          {/* Bull / Bear Cases */}
          {(as?.bullCase || as?.bearCase) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {as?.bullCase && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <h5 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="h-3 w-3" />Bull Case
                  </h5>
                  <p className="text-sm leading-relaxed text-muted-foreground">{as.bullCase}</p>
                </div>
              )}
              {as?.bearCase && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <h5 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                    <Shield className="h-3 w-3" />Bear Case
                  </h5>
                  <p className="text-sm leading-relaxed text-muted-foreground">{as.bearCase}</p>
                </div>
              )}
            </div>
          )}

          {/* Red flags */}
          {as?.redFlags && as.redFlags.length > 0 && (
            <section className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Shield className="h-3.5 w-3.5 text-amber-500" />Caution Flags
              </h4>
              <ul className="space-y-1.5">
                {as.redFlags.slice(0, 3).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Match breakdown grid */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Match Breakdown</h4>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {([
                ['Quality', rec.dimensionBreakdown.investmentQuality, 30],
                ['Sector', rec.dimensionBreakdown.sectorAlignment, 25],
                ['Stage', rec.dimensionBreakdown.stageCheckFit, 15],
                ['Geo', rec.dimensionBreakdown.geographyFit, 10],
                ['Traction', rec.dimensionBreakdown.tractionEvidence, 10],
                ['Focus', rec.dimensionBreakdown.founderFocusMatch, 5],
                ['Values', rec.dimensionBreakdown.valuesAlignment, 5],
              ] as [string, number, number][]).map(([label, score, max]) => {
                const pct = max > 0 ? Math.round((score / max) * 100) : 0
                const ring =
                  pct >= 70 ? 'border-emerald-500/30' : pct >= 40 ? 'border-amber-500/30' : 'border-border'
                return (
                  <div key={label} className={cn('rounded-lg border bg-card p-2.5 text-center transition-colors', ring)}>
                    <div className="text-base font-bold tabular-nums text-foreground">{score}</div>
                    <div className="mt-0.5 text-[10px] leading-none text-muted-foreground">{label} <span className="text-muted-foreground/50">/ {max}</span></div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Bio */}
          {rec.bio && (
            <section className="space-y-1.5">
              <h4 className="text-sm font-semibold text-foreground">About the Founder</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">{rec.bio}</p>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function InvestorDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAdmin, loading: sessionLoading } = useAuthSession()
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<FounderRecommendation[]>([])
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set())
  const [investorName, setInvestorName] = useState('')
  const [filter, setFilter] = useState<'all' | 'analyzed' | 'top' | 'bookmarked'>(
    searchParams.get('view') === 'saved' ? 'bookmarked' : 'all',
  )
  const [strictStage, setStrictStage] = useState(false)
  const [strictCheck, setStrictCheck] = useState(false)
  const [strictGeo, setStrictGeo] = useState(false)
  const [analyzedOnly, setAnalyzedOnly] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dataSource, setDataSource] = useState<'saved' | 'refresh' | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null)

  useEffect(() => {
    if (sessionLoading) return
    let alive = true
    async function load() {
      try {
        const profileRes = await fetch('/api/investor/profile', { credentials: 'include' })
        const profileData = await profileRes.json()
        const listingReady = Boolean(profileData.exists && profileData.onboardingCompleted)
        if (!listingReady) {
          if (!isAdmin) {
            router.replace('/investor/onboarding')
            return
          }
          setInvestorName('Admin preview')
        } else {
          setInvestorName(profileData.profile?.firmName || 'Your Firm')
        }

        const query = new URLSearchParams({
          strictStage: String(strictStage),
          strictCheck: String(strictCheck),
          strictGeo: String(strictGeo),
          analyzedOnly: String(analyzedOnly),
        })
        const [recsRes, bmRes] = await Promise.all([
          fetch(`/api/investor/recommended-founders?mode=saved&${query.toString()}`, { credentials: 'include' }),
          fetch('/api/investor/bookmarks', { credentials: 'include' }),
        ])

        if (recsRes.ok) {
          const recsData = await recsRes.json()
          if (alive) {
            setRecommendations(recsData.recommendations || [])
            setDataSource(recsData.source || 'saved')
            setLastRefreshedAt(recsData.refreshedAt || null)
          }
        } else if (alive) {
          const errText = recsRes.status === 403 ? 'Complete onboarding to see matches.' : `Matches could not be loaded (${recsRes.status}).`
          toast.error(errText)
        }

        if (bmRes.ok) {
          const bmData = await bmRes.json()
          if (alive) setBookmarkedIds(new Set((bmData.bookmarks || []).map((b: any) => b.founderId)))
        }
      } catch {
        if (alive) toast.error('Failed to load recommendations')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [router, isAdmin, sessionLoading, strictStage, strictCheck, strictGeo, analyzedOnly])

  const refreshRecommendations = useCallback(async () => {
    setRefreshing(true)
    try {
      const query = new URLSearchParams({
        strictStage: String(strictStage),
        strictCheck: String(strictCheck),
        strictGeo: String(strictGeo),
        analyzedOnly: String(analyzedOnly),
      })
      const res = await fetch(`/api/investor/recommended-founders?${query.toString()}`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const msg = res.status === 403 ? 'Complete onboarding to analyze founders.' : 'Failed to refresh founder analysis.'
        throw new Error(msg)
      }
      const data = await res.json()
      setRecommendations(data.recommendations || [])
      setDataSource(data.source || 'refresh')
      setLastRefreshedAt(data.refreshedAt || null)
      toast.success('Top 10 founder matches refreshed.')
    } catch (err: any) {
      toast.error(err?.message || 'Could not refresh founder analysis')
    } finally {
      setRefreshing(false)
    }
  }, [strictStage, strictCheck, strictGeo, analyzedOnly])

  const toggleBookmark = useCallback(async (founderId: string) => {
    const was = bookmarkedIds.has(founderId)
    setBookmarkedIds(prev => {
      const next = new Set(prev)
      was ? next.delete(founderId) : next.add(founderId)
      return next
    })

    try {
      const res = await fetch('/api/investor/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ founderId }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setBookmarkedIds(prev => {
        const next = new Set(prev)
        was ? next.add(founderId) : next.delete(founderId)
        return next
      })
      toast.error('Failed to update bookmark')
    }
  }, [bookmarkedIds])

  const filtered = (() => {
    switch (filter) {
      case 'analyzed': return recommendations.filter(r => r.analysisSummary != null)
      case 'top':      return recommendations.filter(r => r.matchScore >= 50)
      case 'bookmarked': return recommendations.filter(r => bookmarkedIds.has(r.founderId))
      default:         return recommendations
    }
  })()

  const avgScore = recommendations.length > 0
    ? Math.round(recommendations.reduce((s, r) => s + r.matchScore, 0) / recommendations.length)
    : 0
  const analyzedCount = recommendations.filter(r => r.analysisSummary != null).length
  const topCount = recommendations.filter(r => r.matchScore >= 50).length

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Finding your best matches</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Loading your saved founder matches...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page-mesh">
      <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        {isAdmin && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-200/80">
              <Shield className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
              <span>Admin mode — previewing investor workspace (listing optional)</span>
            </div>
            <Link
              href="/admin/dashboard"
              className={buttonVariants({
                size: 'sm',
                className: 'shrink-0 bg-amber-600/80 text-white hover:bg-amber-600 shadow-none',
              })}
            >
              Admin hub
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </div>
        )}
        {/* Header */}
        <header className="mb-8">
          <Badge variant="secondary" className="mb-3 px-3 py-1 text-xs font-medium">
            <Briefcase className="mr-1.5 h-3.5 w-3.5" />
            Investor Discover
          </Badge>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {investorName}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            AI-ranked founders matched to your mandate, with confidence and freshness signals for faster diligence.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={refreshRecommendations} disabled={refreshing} className="gap-2">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {refreshing ? 'Analyzing...' : 'Analyze New Top 10'}
            </Button>
            {lastRefreshedAt && (
              <span className="text-xs text-muted-foreground">
                Last refreshed {new Date(lastRefreshedAt).toLocaleString()}
              </span>
            )}
            {dataSource && (
              <Badge variant="secondary" className="text-[11px]">
                Source: {dataSource === 'saved' ? 'Saved results' : 'Fresh analysis'}
              </Badge>
            )}
          </div>
        </header>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard icon={<Users className="h-5 w-5" />} label="Matched founders" value={recommendations.length} />
          <StatCard icon={<Sparkles className="h-5 w-5" />} label="AI analyzed" value={analyzedCount} />
          <StatCard icon={<Target className="h-5 w-5" />} label="Top matches" value={topCount} />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Avg match score" value={`${avgScore}%`} />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {([
            ['all', `All (${recommendations.length})`],
            ['analyzed', `AI Analyzed (${analyzedCount})`],
            ['top', `Top Matches`],
            ['bookmarked', `Bookmarked (${bookmarkedIds.size})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150',
                filter === key
                  ? 'border-primary/40 bg-primary/10 text-foreground shadow-sm'
                  : 'border-border/50 bg-card text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={() => setStrictStage((v) => !v)} className={cn('rounded-full border px-3 py-1.5', strictStage ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border/50 text-muted-foreground')}>Strict stage</button>
          <button type="button" onClick={() => setStrictCheck((v) => !v)} className={cn('rounded-full border px-3 py-1.5', strictCheck ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border/50 text-muted-foreground')}>Strict check size</button>
          <button type="button" onClick={() => setStrictGeo((v) => !v)} className={cn('rounded-full border px-3 py-1.5', strictGeo ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border/50 text-muted-foreground')}>Strict geography</button>
          <button type="button" onClick={() => setAnalyzedOnly((v) => !v)} className={cn('rounded-full border px-3 py-1.5', analyzedOnly ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border/50 text-muted-foreground')}>AI analyzed only</button>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="surface-panel py-20 text-center" style={{ animation: 'fadeIn .4s ease-out' }}>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              {filter === 'bookmarked' ? (
                <Bookmark className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Users className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <p className="text-base font-semibold text-foreground">
              {filter === 'bookmarked' ? 'No bookmarks yet' : 'No matches found yet'}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              {filter === 'all'
                ? 'As founders complete their profiles and run analyses, matches will appear here based on your thesis.'
                : filter === 'bookmarked'
                  ? 'Bookmark founders you\'re interested in to track them here.'
                  : 'Try a different filter or check back later.'}
            </p>
            {filter !== 'all' && (
              <Button variant="outline" className="mt-5" onClick={() => setFilter('all')}>
                View all founders
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((rec, i) => (
              <div key={rec.id} style={{ animationDelay: `${i * 50}ms` }}>
                <FounderCard
                  rec={rec}
                  bookmarked={bookmarkedIds.has(rec.founderId)}
                  onToggleBookmark={toggleBookmark}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
