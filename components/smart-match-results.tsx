'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Sparkles, Target, MapPin, DollarSign, ExternalLink, TrendingUp, ChevronDown, Building2 } from 'lucide-react'
import Link from 'next/link'

export interface RankedVC {
  id: string
  firmName: string
  /** 0–1 similarity (vector-style), normalized from raw score/similarity. */
  similarity: number
  /** 0–100 final match score from the v3 ranker (combinedScore). */
  score: number
  metadata: {
    stages?: string[]
    sectors?: string[]
    geography?: string[]
    checkSize?: string
    fundType?: string
  }
  narrative?: string
  thesis?: string
}

const JUNK_NAME_RE = /^(https?:\/\/|www\.|unknown|test |placeholder|our ai|unlocking ai)/i
const NAME_TOO_LONG = 60

function isJunkVCName(name: string): boolean {
  if (name.trim().length < 2) return true
  if (JUNK_NAME_RE.test(name.trim())) return true
  if (name.trim().length > NAME_TOO_LONG) return true
  return false
}

function normalizeSmartMatchRow(raw: unknown): RankedVC | null {
  if (raw == null || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>
  const inv =
    typeof m.investor === 'object' && m.investor !== null
      ? (m.investor as Record<string, unknown>)
      : {}
  const meta =
    typeof m.metadata === 'object' && m.metadata !== null
      ? (m.metadata as Record<string, unknown>)
      : {}

  const stagesFromMeta = Array.isArray(meta.stages) ? (meta.stages as string[]) : undefined
  let stagesFromInv: string[] | undefined
  if (Array.isArray(inv.stages)) stagesFromInv = inv.stages as string[]
  else if (typeof inv.stage === 'string' && inv.stage.trim()) stagesFromInv = [inv.stage]

  const sectors =
    (Array.isArray(meta.sectors) ? (meta.sectors as string[]) : undefined) ??
    (Array.isArray(inv.sectors) ? (inv.sectors as string[]) : undefined)

  const fundType =
    (typeof meta.fundType === 'string' ? meta.fundType : undefined) ??
    (typeof inv.fundType === 'string' ? inv.fundType : undefined)

  const geographyFromMeta = Array.isArray(meta.geography) ? (meta.geography as string[]) : undefined
  const geographyFromInv = Array.isArray(inv.geography) ? (inv.geography as string[]) : undefined
  const geography = geographyFromMeta ?? geographyFromInv

  let checkSize: string | undefined =
    typeof meta.checkSize === 'string' ? meta.checkSize : undefined
  if (!checkSize) {
    const cmin =
      typeof inv.checkSizeMin === 'number'
        ? inv.checkSizeMin
        : typeof inv.checkMin === 'number'
          ? inv.checkMin
          : null
    const cmax =
      typeof inv.checkSizeMax === 'number'
        ? inv.checkSizeMax
        : typeof inv.checkMax === 'number'
          ? inv.checkMax
          : null
    if (cmin != null && cmax != null && (cmin > 0 || cmax > 0)) {
      checkSize = `$${cmin}k–$${cmax}k`
    }
  }

  const id =
    (typeof m.id === 'string' && m.id) ||
    (typeof m.investorId === 'string' && m.investorId) ||
    (typeof inv.id === 'string' && inv.id) ||
    ''

  const firmName =
    (typeof m.firmName === 'string' && m.firmName) ||
    (typeof inv.firmName === 'string' && inv.firmName) ||
    'Unknown'

  const rawSim = m.similarity
  const rawScore = m.score
  const rawCombined = m.combinedScore

  let similarity = 0
  if (typeof rawSim === 'number' && Number.isFinite(rawSim)) {
    similarity = rawSim > 1 ? Math.min(1, rawSim / 100) : Math.min(1, Math.max(0, rawSim))
  } else if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
    similarity = Math.min(1, Math.max(0, rawScore / 100))
  }

  // Prefer the deterministic v3 combinedScore; fall back to score; finally derive from similarity.
  let score = 0
  if (typeof rawCombined === 'number' && Number.isFinite(rawCombined)) {
    score = Math.min(100, Math.max(0, Math.round(rawCombined)))
  } else if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
    score = Math.min(100, Math.max(0, Math.round(rawScore)))
  } else {
    score = Math.round(similarity * 100)
  }

  const narrative =
    (typeof m.narrative === 'string' ? m.narrative : undefined) ??
    (typeof m.matchNarrative === 'string' ? m.matchNarrative : undefined) ??
    (typeof m.bestApproach === 'string' ? m.bestApproach : undefined)

  const thesis =
    (typeof inv.thesis === 'string' ? inv.thesis : undefined) ??
    (typeof meta.thesis === 'string' ? meta.thesis : undefined)

  return {
    id,
    firmName,
    similarity,
    score,
    metadata: {
      fundType,
      stages: stagesFromMeta ?? stagesFromInv,
      sectors,
      geography,
      checkSize,
    },
    narrative,
    thesis,
  }
}

function uiFitDisplayPercent(index: number, salt: number): number {
  const frac = (k: number) => {
    const x = Math.sin(salt * 12.9898 + index * 78.233 + k * 43758.5453) * 43758.5453
    return x - Math.floor(x)
  }
  const jitter = (frac(1) - 0.5) * 8

  let center: number
  if (index === 0) center = 85 + frac(2) * 6
  else if (index === 1) center = 82 + frac(3) * 6
  else if (index === 2) center = 79 + frac(4) * 6
  else if (index === 3) center = 72 + frac(5) * 5
  else if (index === 4) center = 67 + frac(6) * 5
  else if (index === 5) center = 62 + frac(7) * 5
  else if (index < 10) center = 56 - (index - 6) * 3 + frac(8) * 4
  else center = Math.max(40, 48 - (index - 10) * 2 + frac(9) * 3)

  return Math.min(94, Math.max(38, Math.round(center + jitter)))
}

function buildWhyReasons(match: RankedVC): string[] {
  const reasons: string[] = []
  if (match.metadata.fundType) {
    reasons.push(`Investor type: ${match.metadata.fundType}`)
  }
  if (match.metadata.stages && match.metadata.stages.length > 0) {
    reasons.push(`Stage fit: ${match.metadata.stages.join(', ')}`)
  }
  if (match.metadata.sectors && match.metadata.sectors.length > 0) {
    reasons.push(`Sector alignment: ${match.metadata.sectors.slice(0, 4).join(', ')}`)
  }
  if (match.metadata.geography && match.metadata.geography.length > 0) {
    reasons.push(`Geography: ${match.metadata.geography.slice(0, 3).join(', ')}`)
  }
  if (match.metadata.checkSize) {
    reasons.push(`Check size: ${match.metadata.checkSize}`)
  }
  return reasons
}

interface SmartMatchResultsProps {
  matches: readonly unknown[] | null | undefined
  showAll?: boolean
}

export function SmartMatchResults({ matches, showAll = false }: SmartMatchResultsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const displaySalt = useMemo(
    () => Math.random() * 100_000 + (typeof performance !== 'undefined' ? performance.now() % 10_000 : 0),
    [matches],
  )

  if (!matches || matches.length === 0) {
    return null
  }

  const normalized = matches
    .map((row) => normalizeSmartMatchRow(row))
    .filter((row): row is RankedVC => row != null && row.id !== '' && !isJunkVCName(row.firmName))

  if (normalized.length === 0) {
    return null
  }

  const displayMatches = showAll ? normalized : normalized.slice(0, 10)

  return (
    <Card className="border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg text-foreground">
              Investor matches
              <Badge variant="secondary" className="font-normal text-muted-foreground">
                {normalized.length} ranked
              </Badge>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Ordered by fit with your pitch. Click any match to see why it was selected.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {displayMatches.map((match, index) => {
            const isExpanded = expandedId === match.id
            const whyReasons = buildWhyReasons(match)

            return (
              <div key={match.id} className="rounded-lg border border-border bg-card/80 transition-colors hover:border-primary/25 hover:bg-accent/40">
                <div
                  className="cursor-pointer p-4"
                  onClick={() => setExpandedId(isExpanded ? null : match.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setExpandedId(isExpanded ? null : match.id)
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                          #{index + 1}
                        </span>
                        <h3 className="truncate font-semibold text-foreground">
                          {match.firmName}
                        </h3>
                      </div>

                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {match.metadata.fundType && (
                          <Badge variant="outline" className="border-border bg-muted/40 text-xs font-normal capitalize text-foreground">
                            <Building2 className="mr-1 h-3 w-3 opacity-70" aria-hidden />
                            {match.metadata.fundType}
                          </Badge>
                        )}
                        {match.metadata.stages && match.metadata.stages.length > 0 && (
                          <Badge variant="outline" className="border-border bg-muted/40 text-xs font-normal text-foreground">
                            <Target className="mr-1 h-3 w-3 opacity-70" aria-hidden />
                            {match.metadata.stages.slice(0, 2).join(', ')}
                          </Badge>
                        )}
                        {match.metadata.geography && match.metadata.geography.length > 0 && (
                          <Badge variant="outline" className="border-border bg-muted/40 text-xs font-normal text-foreground">
                            <MapPin className="mr-1 h-3 w-3 opacity-70" aria-hidden />
                            {match.metadata.geography[0]}
                          </Badge>
                        )}
                        {match.metadata.checkSize && (
                          <Badge variant="outline" className="border-border bg-muted/40 text-xs font-normal text-foreground">
                            <DollarSign className="mr-1 h-3 w-3 opacity-70" aria-hidden />
                            {match.metadata.checkSize}
                          </Badge>
                        )}
                      </div>

                      {match.metadata.sectors && match.metadata.sectors.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">Focus:</span>{' '}
                          {match.metadata.sectors.slice(0, 3).join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div className="text-right">
                        <div className="text-2xl font-bold tabular-nums tracking-tight text-primary">
                          {/* Previously: UI-only jittered fit display via uiFitDisplayPercent(index, displaySalt).
                              Kept commented so it can be reinstated easily if needed. */}
                          {Math.round(match.score)}%
                        </div>
                        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3 opacity-80" aria-hidden />
                          Fit score
                        </div>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform',
                          isExpanded && 'rotate-180',
                        )}
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>

                {/* Why this match? (expandable) */}
                {isExpanded && (
                  <div className="border-t border-border/50 px-4 pb-4 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Why this match?
                    </p>

                    {whyReasons.length > 0 && (
                      <ul className="mb-3 space-y-1.5">
                        {whyReasons.map((reason, ri) => (
                          <li key={ri} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    )}

                    {match.thesis && (
                      <div className="mb-3 rounded-md border border-border/40 bg-muted/20 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Thesis</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {match.thesis.length > 200 ? match.thesis.slice(0, 200) + '...' : match.thesis}
                        </p>
                      </div>
                    )}

                    {match.narrative && (
                      <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Match briefing</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {match.narrative.length > 300 ? match.narrative.slice(0, 300) + '...' : match.narrative}
                        </p>
                      </div>
                    )}

                    <div className="mt-3">
                      <Link
                        href={`/founder/discover?highlight=${match.id}`}
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'inline-flex gap-1.5 text-xs',
                        )}
                      >
                        View full profile
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {!showAll && normalized.length > 10 && (
            <div className="border-t border-border pt-4 text-center">
              <Link
                href="/founder/discover"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex gap-2')}
              >
                View all {normalized.length} matches
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SmartMatchResults
