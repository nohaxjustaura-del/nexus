'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { INVESTOR_SECTORS } from '@/lib/constants/investor-sectors'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import {
  BadgeCheck,
  ExternalLink,
  Globe,
  Linkedin,
  Activity,
  MapPin,
} from 'lucide-react'

function formatCheckRange(min: number | null, max: number | null): string {
  if (!min && !max) return 'Not disclosed'
  const fmt = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}M` : `$${v}K`)
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}`
  return fmt(min || max || 0)
}

/** DB `portfolio` JSON may be string names or structured objects. */
export type PortfolioListItem =
  | string
  | {
      name?: string
      companyName?: string
      sector?: string
      stage?: string
      outcome?: string
    }

export type PortfolioCompanyRow = {
  id: string
  companyName: string
  companyWebsite: string | null
  sector: string | null
  stage: string | null
  investmentYear: number | null
  investmentDate: string | null
  amount: number | null
  isLead: boolean | null
  coInvestors: string
  confidence: number
}

function portfolioDisplayLabel(item: PortfolioListItem): string {
  if (typeof item === 'string') return item.trim()
  if (item && typeof item === 'object') {
    return (
      (typeof item.name === 'string' && item.name.trim()) ||
      (typeof item.companyName === 'string' && item.companyName.trim()) ||
      ''
    )
  }
  return ''
}

function legacyPortfolioPlainLines(portfolio: PortfolioListItem[]): string[] {
  const lines: string[] = []
  for (const item of portfolio) {
    if (typeof item === 'string') {
      const t = item.trim()
      if (t) lines.push(t)
      continue
    }
    if (!item || typeof item !== 'object') continue
    const label = portfolioDisplayLabel(item)
    if (!label) continue
    const parts: string[] = []
    if (typeof item.sector === 'string' && item.sector.trim()) parts.push(item.sector.trim())
    if (typeof item.stage === 'string' && item.stage.trim()) parts.push(item.stage.trim())
    lines.push(parts.length ? `${label} (${parts.join(' · ')})` : label)
  }
  return lines
}

function parseCoInvestors(raw: string): string[] {
  try {
    const p = JSON.parse(raw || '[]')
    if (!Array.isArray(p)) return []
    return p
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  } catch {
    return []
  }
}

function dealYear(row: PortfolioCompanyRow): number | null {
  if (typeof row.investmentYear === 'number' && Number.isFinite(row.investmentYear)) {
    return row.investmentYear
  }
  if (row.investmentDate) {
    const y = new Date(row.investmentDate).getFullYear()
    return Number.isFinite(y) ? y : null
  }
  return null
}

/** VCEnrichmentCache `recentDeals` amounts: USD millions in `$5M` / `$500K` form (see `formatDealAmountForCache`). */
function parseDealAmountFromCache(raw: string | undefined | null): number | null {
  if (!raw || typeof raw !== 'string') return null
  const s = raw.trim().replace(/,/g, '')
  const m = s.match(/^\$(\d+(?:\.\d+)?)\s*([MK])?$/i)
  if (!m) return null
  const n = parseFloat(m[1])
  if (!Number.isFinite(n) || n <= 0) return null
  const suffix = (m[2] || 'M').toUpperCase()
  if (suffix === 'K') return n / 1000
  return n
}

function parseEnrichmentDealDate(raw: string | undefined): { year: number | null; iso: string | null } {
  const d = raw?.trim()
  if (!d) return { year: null, iso: null }
  if (/^\d{4}$/.test(d)) {
    const y = parseInt(d, 10)
    return Number.isFinite(y) ? { year: y, iso: null } : { year: null, iso: null }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const dt = new Date(d.slice(0, 10))
    const y = dt.getFullYear()
    return Number.isFinite(y) ? { year: y, iso: d.slice(0, 10) } : { year: null, iso: null }
  }
  return { year: null, iso: null }
}

type RecentDealInput = {
  name?: string
  title?: string
  date?: string | null
  amount?: string
  snippet?: string
}

/** When relational `portfolioCompanies` is empty, chart from VCEnrichmentCache.recentDeals. */
function recentDealsToPortfolioRows(deals: RecentDealInput[] | undefined | null): PortfolioCompanyRow[] {
  if (!deals?.length) return []
  return deals.map((d, i) => {
    const dateStr = d.date == null ? undefined : typeof d.date === 'string' ? d.date : String(d.date)
    const { year, iso } = parseEnrichmentDealDate(dateStr)
    const amount = parseDealAmountFromCache(d.amount)
    const rawLabel = (d.name ?? d.title ?? '').trim()
    const name = rawLabel || 'Investment'
    return {
      id: `enrichment:${i}:${name.slice(0, 40)}`,
      companyName: name,
      companyWebsite: null,
      sector: null,
      stage: null,
      investmentYear: year,
      investmentDate: iso,
      amount,
      isLead: null,
      coInvestors: '[]',
      confidence: 5,
    }
  })
}

const SECTOR_PALETTE = [
  'hsl(217 82% 58%)',
  'hsl(280 65% 58%)',
  'hsl(168 72% 40%)',
  'hsl(32 92% 54%)',
  'hsl(350 72% 52%)',
  'hsl(199 89% 48%)',
  'hsl(142 60% 42%)',
  'hsl(48 96% 48%)',
  'hsl(265 80% 62%)',
  'hsl(12 78% 54%)',
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h << 5) - h + s.charCodeAt(i)
  return Math.abs(h)
}

function sectorColor(sector: string | null): string {
  const key = sector?.trim() || ''
  if (!key) return 'hsl(215 14% 52% / 0.45)'
  const idx = (INVESTOR_SECTORS as readonly string[]).indexOf(key)
  const i = idx >= 0 ? idx : hashString(key)
  return SECTOR_PALETTE[i % SECTOR_PALETTE.length]
}

export type ChartPoint = {
  id: string
  x: number
  y: number
  z: number
  /** Calendar year from source data; tooltips use this when `x` is jittered for display. */
  dataYear: number
  /** USD millions from source row; tooltips use this when `y` is jittered on the scatter plot. */
  dataAmount: number | null
  label: string
  sector: string | null
  stage: string | null
  isLead: boolean | null
  coInvestors: string[]
  website: string | null
  date: string | null
  hasAmount: boolean
}

function buildChartPoints(rows: PortfolioCompanyRow[], mode: 'scatter' | 'timeline'): ChartPoint[] {
  const out: ChartPoint[] = []
  for (const row of rows) {
    const year = dealYear(row)
    if (year == null) continue
    const hasAmount = typeof row.amount === 'number' && !Number.isNaN(row.amount) && row.amount > 0
    const dataAmount = hasAmount ? (row.amount as number) : null
    const y =
      mode === 'timeline'
        ? 1
        : hasAmount
          ? Math.max(row.amount as number, 0.01)
          : 1
    const z =
      mode === 'timeline'
        ? 120
        : hasAmount
          ? Math.sqrt(row.amount as number) * 42 + 48
          : 56
    out.push({
      id: row.id,
      x: year,
      y,
      z,
      dataYear: year,
      dataAmount,
      label: row.companyName,
      sector: row.sector,
      stage: row.stage,
      isLead: row.isLead,
      coInvestors: parseCoInvestors(row.coInvestors),
      website: row.companyWebsite,
      date: row.investmentDate,
      hasAmount,
    })
  }
  return out
}

/**
 * Recharts draws one bubble per row; identical (x,y) stacks into a single dot.
 * Spread coincident points slightly in data space so every investment stays visible.
 */
function applyCoincidenceJitter(points: ChartPoint[], mode: 'scatter' | 'timeline'): ChartPoint[] {
  if (points.length <= 1) return points

  const bucketKey = (p: ChartPoint) =>
    mode === 'timeline'
      ? String(Math.round(p.dataYear))
      : `${p.dataYear}:${Number(p.y.toPrecision(6))}:${p.hasAmount ? 1 : 0}`

  const buckets = new Map<string, ChartPoint[]>()
  for (const p of points) {
    const k = bucketKey(p)
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(p)
  }

  return points.map((p) => {
    const group = buckets.get(bucketKey(p))!
    if (group.length <= 1) return p

    const idx = group.findIndex((g) => g.id === p.id)
    const n = group.length
    const spread = n === 1 ? 0 : (idx - (n - 1) / 2) / (n - 1)

    if (mode === 'timeline') {
      const span = Math.min(0.44, 0.11 * n)
      return { ...p, x: p.dataYear + spread * span }
    }

    const spanX = Math.min(0.36, 0.1 * n)
    const xJ = p.dataYear + spread * spanX
    const yJ = p.hasAmount ? p.y * (1 + spread * 0.055) : p.y * (1 + spread * 0.12)
    return { ...p, x: xJ, y: Math.max(yJ, 1e-4) }
  })
}

function formatInvestmentDate(iso: string | null, yearFallback: number): string {
  if (iso) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(iso))
    } catch {
      return String(yearFallback)
    }
  }
  return String(yearFallback)
}

function DealTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: ChartPoint }>
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  const lead =
    p.isLead === true ? 'Lead' : p.isLead === false ? 'Follow' : 'Not disclosed'
  return (
    <div className="minimal-surface max-w-xs rounded-xl border border-border/70 p-3 text-xs shadow-lg">
      <p className="font-heading text-sm font-semibold text-foreground">{p.label}</p>
      <div className="mt-2 space-y-1.5 text-muted-foreground">
        {p.website ? (
          <a
            href={p.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Website <ExternalLink className="size-3 shrink-0" aria-hidden />
          </a>
        ) : null}
        {p.sector ? (
          <p>
            <span className="text-foreground/80">Sector:</span> {p.sector}
          </p>
        ) : null}
        {p.stage ? (
          <p>
            <span className="text-foreground/80">Stage:</span> {p.stage}
          </p>
        ) : null}
        <p>
          <span className="text-foreground/80">Amount:</span>{' '}
          {p.hasAmount && p.dataAmount != null
            ? `$${p.dataAmount >= 10 ? p.dataAmount.toFixed(0) : p.dataAmount.toFixed(1)}M`
            : 'Not disclosed'}
        </p>
        <p>
          <span className="text-foreground/80">Role:</span> {lead}
        </p>
        {p.coInvestors.length > 0 ? (
          <p>
            <span className="text-foreground/80">Co-investors:</span> {p.coInvestors.join(', ')}
          </p>
        ) : null}
        <p>
          <span className="text-foreground/80">Date:</span>{' '}
          {formatInvestmentDate(p.date, p.dataYear)}
        </p>
      </div>
    </div>
  )
}

function PortfolioChart({
  points,
  mode,
  yearDomain,
}: {
  points: ChartPoint[]
  mode: 'scatter' | 'timeline'
  yearDomain: [number, number]
}) {
  const pad = 0.5
  const x0 = yearDomain[0] - pad
  const x1 = yearDomain[1] + pad
  const amounts = points.filter((p) => p.hasAmount).map((p) => p.y)
  const hasUnknownAmount = points.some((p) => !p.hasAmount)
  let minY = 0.5
  let maxY = 1.5
  if (mode === 'scatter') {
    if (amounts.length === 0) {
      minY = 0.5
      maxY = 10
    } else {
      const amin = Math.min(...amounts)
      const amax = Math.max(...amounts, 1)
      minY = hasUnknownAmount ? Math.min(0.5, amin * 0.15) : Math.max(0.05, amin * 0.25)
      maxY = Math.max(amax * 1.2, minY * 1.5, 1)
    }
  }

  return (
    <div className="minimal-surface h-[min(26rem,70vw)] w-full min-h-[280px] rounded-2xl p-3 sm:p-4 md:h-[22rem]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="hsl(var(--border) / 0.45)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            domain={[x0, x1]}
            tickCount={Math.min(12, yearDomain[1] - yearDomain[0] + 3)}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickFormatter={(v) => String(Math.round(v))}
            name="Year"
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={mode === 'scatter' ? [minY, maxY] : [0.5, 1.5]}
            scale={mode === 'scatter' ? 'log' : 'linear'}
            tick={mode === 'timeline' ? false : { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={mode === 'timeline' ? false : true}
            tickLine={mode === 'timeline' ? false : true}
            tickFormatter={mode === 'scatter' ? (v) => `$${Number(v).toFixed(v >= 10 ? 0 : 1)}M` : () => ''}
            label={
              mode === 'scatter'
                ? {
                    value: '$M invested',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 11,
                  }
                : undefined
            }
            hide={mode === 'timeline'}
          />
          <ZAxis type="number" dataKey="z" range={[72, 220]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3', stroke: 'hsl(var(--primary) / 0.5)' }}
            content={<DealTooltip />}
          />
          <Scatter data={points} shape="circle">
            {points.map((entry) => (
              <Cell key={entry.id} fill={sectorColor(entry.sector)} fillOpacity={0.88} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

function FocusPills({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="section-copy text-sm">Not specified</p>
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <span
          key={s}
          className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-3.5 py-1.5 text-sm text-foreground/90 shadow-sm"
        >
          {s}
        </span>
      ))}
    </div>
  )
}

interface InvestorProfileClientProps {
  investor: {
    id: string
    firmName: string
    name: string | null
    bio: string | null
    verified: boolean
    stages: string[]
    sectors: string[]
    geoFocus: string[]
    geography: string[]
    checkMin: number
    checkMax: number
    checkSizeMin: number
    checkSizeMax: number
    fundType: string
    fundSize: string | null
    leadFollow: string
    thesis: string | null
    portfolio: PortfolioListItem[]
    notableInvestments: string | null
    proofPoints: string[]
    valueAddTags: string[]
    personalityType: string | null
    decisionSpeed: string | null
    ownershipTarget: string | null
    websiteUrl: string | null
    applicationUrl: string | null
    twitterUrl: string | null
    linkedinUrl: string | null
    crunchbaseUrl: string | null
    foundedYear: number | null
    partnerNames: string[]
    activelyInvesting: boolean
    lastDealDate: string | null
    enrichedAt: string | null
    portfolioCompanies: PortfolioCompanyRow[]
  }
  enrichment: {
    snapshot: string | null
    recentDeals: Array<{
      name?: string
      title?: string
      date?: string | null
      amount?: string
      snippet?: string
    }>
  } | null
}

export default function InvestorProfileClient({ investor, enrichment }: InvestorProfileClientProps) {
  const geo = investor.geoFocus.length > 0 ? investor.geoFocus : investor.geography
  const checkMin = investor.checkSizeMin || investor.checkMin
  const checkMax = investor.checkSizeMax || investor.checkMax
  const [bioExpanded, setBioExpanded] = useState(false)

  const mergedPortfolioRows = useMemo(() => {
    const db = investor.portfolioCompanies
    if (db.length > 0) return db
    return recentDealsToPortfolioRows(enrichment?.recentDeals)
  }, [investor.portfolioCompanies, enrichment?.recentDeals])

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7471/ingest/0f685c44-f6c8-4b99-b23e-84e0cc9d4f08', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6d9bda' },
      body: JSON.stringify({
        sessionId: '6d9bda',
        location: 'investor-profile-client.tsx:client_mount',
        message: 'investor_profile_client_props',
        hypothesisId: 'H4-H5',
        data: {
          investorId: investor.id,
          firmName: investor.firmName,
          portfolioCompaniesLen: investor.portfolioCompanies?.length ?? -1,
          mergedChartRowsLen: mergedPortfolioRows.length,
          recentDealsLen: enrichment?.recentDeals?.length ?? 0,
          stagesLen: investor.stages?.length ?? -1,
          sectorsLen: investor.sectors?.length ?? -1,
          partnerNamesLen: investor.partnerNames?.length ?? -1,
          snapshotLen: enrichment?.snapshot?.length ?? 0,
          thesisLen: investor.thesis?.length ?? 0,
          foundedYear: investor.foundedYear,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
  }, [investor, enrichment, mergedPortfolioRows.length])

  const portfolioAnalysis = useMemo(() => {
    const rows = mergedPortfolioRows
    const withYear = rows
      .map((r) => ({ row: r, year: dealYear(r) }))
      .filter((x): x is { row: PortfolioCompanyRow; year: number } => x.year != null)
    const years = withYear.map((x) => x.year)
    const yearDomain: [number, number] =
      years.length > 0 ? [Math.min(...years), Math.max(...years)] : [new Date().getFullYear() - 5, new Date().getFullYear()]
    const hasAnyAmount = rows.some((p) => typeof p.amount === 'number' && !Number.isNaN(p.amount) && p.amount > 0)
    const emptyPortfolio = rows.length === 0
    const chartable = withYear.length > 0
    let mode: 'empty' | 'scatter' | 'timeline' | 'unplotted' = 'empty'
    if (!emptyPortfolio && chartable) {
      mode = hasAnyAmount ? 'scatter' : 'timeline'
    } else if (!emptyPortfolio && !chartable) {
      mode = 'unplotted'
    }
    const scatterPoints =
      mode === 'scatter' ? applyCoincidenceJitter(buildChartPoints(rows, 'scatter'), 'scatter') : []
    const timelinePoints =
      mode === 'timeline' ? applyCoincidenceJitter(buildChartPoints(rows, 'timeline'), 'timeline') : []
    const chartPts = mode === 'scatter' ? scatterPoints : mode === 'timeline' ? timelinePoints : []
    const yMin = years.length > 0 ? Math.min(...years) : yearDomain[0]
    const yMax = years.length > 0 ? Math.max(...years) : yearDomain[1]
    let chartYearDomain: [number, number] = yearDomain
    if (chartPts.length > 0) {
      const xs = chartPts.map((p) => p.x)
      chartYearDomain = [Math.min(yMin, ...xs) - 0.42, Math.max(yMax, ...xs) + 0.42]
    }
    const sectorsInDeals = Array.from(
      new Set(rows.map((r) => r.sector?.trim()).filter((s): s is string => Boolean(s))),
    )
    const yearLabel =
      chartable && years.length > 0 ? (yMin === yMax ? String(yMin) : `${yMin}–${yMax}`) : null
    return {
      emptyPortfolio,
      chartable,
      mode,
      yearDomain: chartYearDomain,
      scatterPoints,
      timelinePoints,
      dealCount: rows.length,
      sectorsInDeals,
      yearLabel,
    }
  }, [mergedPortfolioRows])

  const legacyLines = useMemo(() => legacyPortfolioPlainLines(investor.portfolio), [investor.portfolio])

  const showFocusBand =
    investor.stages.length > 0 || investor.sectors.length > 0 || geo.length > 0

  const bioLong = (investor.bio?.length ?? 0) > 220

  /** One hero blurb: enriched snapshot first, else DB thesis (never both — long thesis was kept while snapshot updated). */
  const snapshotMandate = enrichment?.snapshot?.trim() ?? ''
  const thesisTrim = investor.thesis?.trim() ?? ''
  const primaryMandate = snapshotMandate || thesisTrim

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-8 md:pt-10">
        <Link
          href="/founder/discover"
          className="helper-copy mb-8 inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to investor database
        </Link>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-zinc-50 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.12]" aria-hidden />
          <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden>
            <div className="absolute left-1/2 top-[-20%] h-[min(28rem,48vh)] w-[min(100%,48rem)] -translate-x-1/2 rounded-[100%] bg-primary/[0.09] blur-[80px]" />
            <div className="absolute left-[18%] top-[30%] h-40 w-40 rounded-full bg-primary/[0.05] blur-[56px]" />
            <div className="absolute right-[12%] top-[45%] h-32 w-32 rounded-full bg-primary/[0.04] blur-[48px]" />
          </div>

          <div className="relative z-10 px-6 py-10 md:px-10 md:py-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-[2.5rem] lg:leading-tight">
                    {investor.firmName}
                  </h1>
                  {investor.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/[0.12] px-2.5 py-0.5 text-xs font-medium text-primary">
                      <BadgeCheck className="size-3.5 shrink-0" aria-hidden />
                      Verified
                    </span>
                  ) : null}
                  {investor.fundType ? (
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-xs text-zinc-200">
                      {investor.fundType}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
                  {investor.foundedYear != null ? (
                    <span>
                      Founded <span className="tabular-nums text-zinc-200">{investor.foundedYear}</span>
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={cn(
                        'size-2 shrink-0 rounded-full',
                        investor.activelyInvesting ? 'bg-emerald-400 motion-reduce:animate-none animate-pulse' : 'bg-zinc-600',
                      )}
                      aria-hidden
                    />
                    {investor.activelyInvesting ? 'Actively investing' : 'Not marked active'}
                  </span>
                </div>

                {primaryMandate ? (
                  <p className="max-w-3xl border-l-[3px] border-primary/45 pl-5 text-lg leading-relaxed text-zinc-100/95 md:text-xl md:leading-[1.65]">
                    {primaryMandate}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
                {investor.applicationUrl ? (
                  <Button asChild className="btn-shine w-full sm:w-auto lg:w-56">
                    <a href={investor.applicationUrl} target="_blank" rel="noopener noreferrer">
                      Apply <ExternalLink className="ml-2 size-4" aria-hidden />
                    </a>
                  </Button>
                ) : null}
                {investor.websiteUrl ? (
                  <Button variant="secondary" asChild className="w-full border border-white/10 bg-white/10 text-white hover:bg-white/15 sm:w-auto lg:w-56">
                    <a href={investor.websiteUrl} target="_blank" rel="noopener noreferrer">
                      <Globe className="mr-2 size-4" aria-hidden />
                      Website
                    </a>
                  </Button>
                ) : null}
                {investor.linkedinUrl ? (
                  <Button variant="outline" asChild className="w-full border-white/20 bg-transparent text-white hover:bg-white/10 sm:w-auto lg:w-56">
                    <a href={investor.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="mr-2 size-4" aria-hidden />
                      LinkedIn
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* Summary */}
        {(investor.name || investor.bio) && (
          <section className="mt-12 space-y-3 border-b border-border/50 pb-12">
            {investor.name ? <p className="text-base font-medium text-foreground">{investor.name}</p> : null}
            {investor.bio ? (
              <div>
                <p
                  className={cn(
                    'section-copy max-w-3xl whitespace-pre-wrap',
                    !bioExpanded && bioLong && 'line-clamp-4',
                  )}
                >
                  {investor.bio}
                </p>
                {bioLong ? (
                  <button
                    type="button"
                    onClick={() => setBioExpanded((e) => !e)}
                    className="mt-2 text-sm font-medium text-primary hover:underline"
                  >
                    {bioExpanded ? 'Show less' : 'Read more'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        )}

        {/* Metrics */}
        <section className="mt-12 border-b border-border/40 pb-12">
          <div className="pointer-events-none mb-8 h-px w-full bg-gradient-to-r from-transparent via-primary/25 to-transparent" aria-hidden />
          <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Founded', value: investor.foundedYear != null ? String(investor.foundedYear) : '—' },
              { label: 'Fund size', value: investor.fundSize?.trim() || '—' },
              { label: 'Check size', value: formatCheckRange(checkMin, checkMax) },
              { label: 'Lead / follow', value: investor.leadFollow?.trim() || '—' },
              { label: 'Decision speed', value: investor.decisionSpeed?.trim() || '—' },
              {
                label: 'Actively investing',
                value: investor.activelyInvesting ? 'Yes' : 'No',
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={cn(
                  'relative px-2 text-center sm:px-3 lg:border-r lg:border-border/40 lg:text-left',
                  i === 5 && 'lg:border-r-0',
                )}
              >
                <p className="meta-copy mb-1.5">{stat.label}</p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground md:text-3xl">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Investment focus */}
        {showFocusBand ? (
          <section className="mt-16 space-y-8">
            <div>
              <p className="eyebrow-label mb-2">Mandate</p>
              <h2 className="section-title">Investment focus</h2>
            </div>
            <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="meta-copy mb-2">Stages</p>
                <FocusPills items={investor.stages} />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="meta-copy mb-2">Sectors</p>
                <FocusPills items={investor.sectors} />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="meta-copy mb-2">Geography</p>
                <div className="flex flex-wrap gap-2">
                  {geo.length === 0 ? (
                    <p className="section-copy text-sm">Not specified</p>
                  ) : (
                    geo.map((g) => (
                      <span
                        key={g}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3.5 py-1.5 text-sm text-foreground/90 shadow-sm"
                      >
                        <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        {g}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Portfolio */}
        <section className="mt-20 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow-label mb-2">Deals</p>
              <h2 className="section-title">Portfolio activity</h2>
            </div>
            <p className="meta-copy text-foreground/80">
              {portfolioAnalysis.dealCount} investment{portfolioAnalysis.dealCount === 1 ? '' : 's'}
              {portfolioAnalysis.yearLabel ? ` · ${portfolioAnalysis.yearLabel}` : ''}
              {!portfolioAnalysis.yearLabel && portfolioAnalysis.dealCount > 0 && !portfolioAnalysis.chartable
                ? ' · —'
                : ''}
            </p>
          </div>

          {portfolioAnalysis.mode === 'empty' ? (
            <div className="minimal-surface rounded-2xl p-8 md:p-10" role="status" aria-label="No structured portfolio data">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
                  <Activity className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-2">
                  <h3 className="font-heading text-lg font-semibold text-foreground">No investment data available yet</h3>
                  <p className="section-copy max-w-xl text-sm md:text-base">
                    Structured deal history will appear here after the profile is enriched. You can still use firm mandate,
                    check size, and links above to evaluate fit.
                  </p>
                </div>
              </div>
              {legacyLines.length > 0 ? (
                <div className="mt-8 border-t border-border/50 pt-6">
                  <p className="meta-copy mb-2">Also listed in directory</p>
                  <p className="helper-copy leading-relaxed text-muted-foreground">{legacyLines.join(' · ')}</p>
                </div>
              ) : null}
              {investor.notableInvestments?.trim() ? (
                <p className="helper-copy mt-6 max-w-2xl leading-relaxed text-muted-foreground">{investor.notableInvestments}</p>
              ) : null}
            </div>
          ) : portfolioAnalysis.mode === 'unplotted' ? (
            <div className="minimal-surface rounded-2xl p-8 md:p-10" role="status">
              <h3 className="font-heading text-lg font-semibold text-foreground">Year not available for charting</h3>
              <p className="section-copy mt-2 max-w-xl text-sm">
                These investments are on file without a reliable year. Details may appear after the next enrichment pass.
              </p>
              <ul className="mt-6 divide-y divide-border/50 border-t border-border/50">
                {mergedPortfolioRows.map((row) => (
                  <li key={row.id} className="py-3 text-sm text-foreground/90">
                    {row.companyName}
                    {row.sector ? <span className="text-muted-foreground"> — {row.sector}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mx-auto max-w-5xl space-y-8">
              {portfolioAnalysis.mode === 'scatter' ? (
                <PortfolioChart
                  points={portfolioAnalysis.scatterPoints}
                  mode="scatter"
                  yearDomain={portfolioAnalysis.yearDomain}
                />
              ) : (
                <PortfolioChart
                  points={portfolioAnalysis.timelinePoints}
                  mode="timeline"
                  yearDomain={portfolioAnalysis.yearDomain}
                />
              )}
              {portfolioAnalysis.sectorsInDeals.length > 0 ? (
                <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border/40 pt-4">
                  {portfolioAnalysis.sectorsInDeals.map((s) => (
                    <span key={s} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: sectorColor(s) }} aria-hidden />
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
              {investor.notableInvestments?.trim() ? (
                <div className="border-t border-border/40 pt-6">
                  <p className="meta-copy mb-2">Notable</p>
                  <p className="section-copy max-w-3xl text-muted-foreground">{investor.notableInvestments}</p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        {/* Partners */}
        {investor.partnerNames.length > 0 ? (
          <section className="mt-20">
            <p className="eyebrow-label mb-2">Team</p>
            <h2 className="section-title mb-8">Partners</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {investor.partnerNames.map((name) => (
                <div
                  key={name}
                  className="rounded-xl border border-border/60 bg-card/40 px-4 py-4 shadow-sm backdrop-blur-sm"
                >
                  <p className="font-heading text-sm font-semibold text-foreground">{name}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Value add + style */}
        {(investor.valueAddTags.length > 0 ||
          investor.personalityType ||
          investor.decisionSpeed ||
          investor.ownershipTarget) && (
          <section className="mt-20 flex flex-col gap-10 border-t border-border/40 pt-16 lg:flex-row lg:gap-16">
            {investor.valueAddTags.length > 0 ? (
              <div className="min-w-0 flex-1">
                <p className="eyebrow-label mb-2">Value add</p>
                <h2 className="section-title mb-4">Beyond capital</h2>
                <div
                  className="-mx-1 flex gap-2 overflow-x-auto pb-2 pt-1 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
                  style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)' }}
                >
                  {investor.valueAddTags.map((tag) => (
                    <span
                      key={tag}
                      className="shrink-0 rounded-full border border-primary/20 bg-primary/[0.06] px-3.5 py-1.5 text-sm text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {(investor.personalityType || investor.decisionSpeed || investor.ownershipTarget) && (
              <div className="w-full shrink-0 lg:max-w-md">
                <p className="eyebrow-label mb-2">Working style</p>
                <h2 className="section-title mb-4">How they operate</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {investor.personalityType ? (
                    <li>
                      <span className="text-foreground/80">Approach:</span> {investor.personalityType}
                    </li>
                  ) : null}
                  {investor.decisionSpeed ? (
                    <li>
                      <span className="text-foreground/80">Decisions:</span> {investor.decisionSpeed}
                    </li>
                  ) : null}
                  {investor.ownershipTarget ? (
                    <li>
                      <span className="text-foreground/80">Ownership:</span> {investor.ownershipTarget}
                    </li>
                  ) : null}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="relative mt-24 overflow-hidden border-t border-border/50 pt-10">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-1/2 top-0 z-0 h-24 w-[min(100%,40rem)] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
            style={{
              background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.08), transparent 72%)',
            }}
            aria-hidden
          />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="helper-copy text-muted-foreground">
              {investor.enrichedAt
                ? `Data enriched ${new Intl.DateTimeFormat(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }).format(new Date(investor.enrichedAt))}`
                : 'Profile data from directory'}
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {investor.websiteUrl ? (
                <a
                  href={investor.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Website
                </a>
              ) : null}
              {investor.linkedinUrl ? (
                <a
                  href={investor.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  LinkedIn
                </a>
              ) : null}
              {investor.crunchbaseUrl ? (
                <a
                  href={investor.crunchbaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  Crunchbase
                </a>
              ) : null}
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
