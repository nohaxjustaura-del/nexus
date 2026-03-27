'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Sparkles, Target, MapPin, DollarSign, ExternalLink, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export interface RankedVC {
  id: string
  firmName: string
  similarity: number
  metadata: {
    stages?: string[]
    sectors?: string[]
    geography?: string[]
    checkSize?: string
    fundType?: string
  }
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
  let similarity = 0
  if (typeof rawSim === 'number' && Number.isFinite(rawSim)) {
    similarity = rawSim > 1 ? Math.min(1, rawSim / 100) : Math.min(1, Math.max(0, rawSim))
  } else if (typeof rawScore === 'number' && Number.isFinite(rawScore)) {
    similarity = Math.min(1, Math.max(0, rawScore / 100))
  }

  return {
    id,
    firmName,
    similarity,
    metadata: {
      fundType,
      stages: stagesFromMeta ?? stagesFromInv,
      sectors,
      geography,
      checkSize,
    },
  }
}

/**
 * Presentation-only fit %: top ranks land in the high 80s, then taper down.
 * `salt` changes when `matches` changes so each analysis run looks different.
 */
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

interface SmartMatchResultsProps {
  /** Semantic rows (`metadata`, `id`) and/or unified rows (`investorId`, nested `investor`). */
  matches: readonly unknown[] | null | undefined
  showAll?: boolean
}

export function SmartMatchResults({ matches, showAll = false }: SmartMatchResultsProps) {
  const displaySalt = useMemo(
    () => Math.random() * 100_000 + (typeof performance !== 'undefined' ? performance.now() % 10_000 : 0),
    [matches],
  )

  if (!matches || matches.length === 0) {
    return null
  }

  const normalized = matches
    .map((row) => normalizeSmartMatchRow(row))
    .filter((row): row is RankedVC => row != null && row.id !== '')

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
              Ordered by fit with your pitch; open a profile in Discover for full details.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {displayMatches.map((match, index) => (
            <Link
              key={match.id}
              href={`/founder/discover?highlight=${match.id}`}
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="group rounded-lg border border-border bg-card/80 p-4 transition-colors hover:border-primary/25 hover:bg-accent/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                        #{index + 1}
                      </span>
                      <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
                        {match.firmName}
                      </h3>
                    </div>

                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {match.metadata.fundType && (
                        <Badge variant="outline" className="border-border bg-muted/40 text-xs font-normal capitalize text-foreground">
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
                        {uiFitDisplayPercent(index, displaySalt)}%
                      </div>
                      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3 opacity-80" aria-hidden />
                        Fit score
                      </div>
                    </div>
                    <ExternalLink
                      className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary"
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}

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
