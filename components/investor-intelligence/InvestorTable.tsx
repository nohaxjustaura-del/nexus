'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BadgeCheck, ArrowUpDown, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

function parseJSONSafe(val: string | null): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return val.split(',').map((s) => s.trim()).filter(Boolean)
  }
}

function formatCheckRange(min: number | null, max: number | null): string {
  if (!min && !max) return '-'
  const fmt = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}M` : `$${v}K`)
  if (min && max && min !== max) return `${fmt(min)} - ${fmt(max)}`
  return fmt(min || max || 0)
}

type SortKey = 'firmName' | 'checkMin' | 'fundType' | 'verified'
type SortDir = 'asc' | 'desc'

export interface InvestorRow {
  id: string
  firmName: string | null
  name: string | null
  sectors: string | null
  stages: string | null
  fundType: string | null
  checkMin: number | null
  checkMax: number | null
  leadFollow: string | null
  verified: boolean | null
  applicationUrl: string | null
  websiteUrl: string | null
}

interface InvestorTableProps {
  investors: InvestorRow[]
  totalCount: number
}

export default function InvestorTable({ investors, totalCount }: InvestorTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('firmName')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    return [...investors].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'firmName':
          cmp = (a.firmName ?? '').localeCompare(b.firmName ?? '')
          break
        case 'checkMin':
          cmp = (a.checkMin ?? 0) - (b.checkMin ?? 0)
          break
        case 'fundType':
          cmp = (a.fundType ?? '').localeCompare(b.fundType ?? '')
          break
        case 'verified':
          cmp = (a.verified ? 1 : 0) - (b.verified ? 1 : 0)
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [investors, sortKey, sortDir])

  const headerBtn = (key: SortKey, label: string) => (
    <button
      onClick={() => toggleSort(key)}
      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={cn('h-3 w-3', sortKey === key && 'text-primary')} />
    </button>
  )

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <span className="text-sm text-muted-foreground">
          Showing <strong className="text-foreground">{investors.length}</strong> of {totalCount} investors
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              <th className="px-4 py-3 text-left">{headerBtn('firmName', 'Firm')}</th>
              <th className="px-4 py-3 text-left">{headerBtn('fundType', 'Type')}</th>
              <th className="hidden px-4 py-3 text-left md:table-cell">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Stages</span>
              </th>
              <th className="hidden px-4 py-3 text-left lg:table-cell">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sectors</span>
              </th>
              <th className="px-4 py-3 text-left">{headerBtn('checkMin', 'Check Size')}</th>
              <th className="hidden px-4 py-3 text-left md:table-cell">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lead/Follow</span>
              </th>
              <th className="px-4 py-3 text-center">{headerBtn('verified', 'Verified')}</th>
              <th className="px-4 py-3 text-center">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Links</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((inv) => {
              const stages = parseJSONSafe(inv.stages).slice(0, 3)
              const sectors = parseJSONSafe(inv.sectors).slice(0, 3)
              return (
                <tr
                  key={inv.id}
                  className="border-b border-border/20 transition-colors hover:bg-muted/20"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/investors/${inv.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {inv.firmName || inv.name || 'Unknown'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.fundType || '-'}</td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {stages.length > 0
                        ? stages.map((s) => (
                            <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {s}
                            </Badge>
                          ))
                        : <span className="text-muted-foreground">-</span>}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {sectors.length > 0
                        ? sectors.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">
                              {s}
                            </Badge>
                          ))
                        : <span className="text-muted-foreground">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatCheckRange(inv.checkMin, inv.checkMax)}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {inv.leadFollow || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {inv.verified ? (
                      <BadgeCheck className="mx-auto h-4 w-4 text-primary" />
                    ) : (
                      <span className="text-muted-foreground/40">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {inv.applicationUrl && (
                        <a href={inv.applicationUrl} target="_blank" rel="noopener noreferrer" title="Apply">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                      <Link href={`/investors/${inv.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          View
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
