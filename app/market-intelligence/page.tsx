'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  TrendingUp,
  Globe,
  Briefcase,
  Users,
} from 'lucide-react'

interface MarketData {
  totalInvestors: number
  topSectors: Array<{ name: string; count: number }>
  topStages: Array<{ name: string; count: number }>
  topGeographies: Array<{ name: string; count: number }>
  fundTypes: Array<{ name: string; count: number }>
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-sm font-medium text-foreground" title={label}>
        {label}
      </span>
      <div className="flex-1">
        <div className="h-6 w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className="h-full rounded-full bg-primary/70 transition-all"
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      </div>
      <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">{count}</span>
    </div>
  )
}

export default function MarketIntelligencePage() {
  const [data, setData] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market-intelligence', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Skeleton className="mb-6 h-12 w-64" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-muted-foreground">
          Failed to load market data.
        </div>
      </div>
    )
  }

  const topSectorMax = data.topSectors[0]?.count ?? 1
  const topGeoMax = data.topGeographies[0]?.count ?? 1

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Market Intelligence
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            What&apos;s being funded right now, aggregated from {data.totalInvestors.toLocaleString()} active investors in our database.
          </p>
        </header>

        {/* Stat cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/80">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{data.totalInvestors.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Active investors</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{data.topSectors.length}</div>
                <p className="text-xs text-muted-foreground">Sectors covered</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{data.topGeographies.length}</div>
                <p className="text-xs text-muted-foreground">Geographies</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80">
            <CardContent className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{data.fundTypes.length}</div>
                <p className="text-xs text-muted-foreground">Fund types</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Sectors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top Sectors by Investor Count
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {data.topSectors.slice(0, 12).map((s) => (
                <BarRow key={s.name} label={s.name} count={s.count} max={topSectorMax} />
              ))}
            </CardContent>
          </Card>

          {/* Top Geographies */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-primary" />
                Most Active Geographies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {data.topGeographies.slice(0, 12).map((g) => (
                <BarRow key={g.name} label={g.name} count={g.count} max={topGeoMax} />
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
