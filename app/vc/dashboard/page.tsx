'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast-simple'
import {
  Download,
  FileText,
  Loader2,
  Mail,
  Sparkles,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Applicant {
  id: string
  name: string
  email: string
  startupName: string | null
  stage: string
  sectors: string[]
  location: string
  fundingNeed: number
  matchScore: number
  hasResumeAnalysis: boolean
  hasPitchDeck: boolean
  applicationStatus: string | null
  createdAt: Date
}

type FilterKey = 'all' | 'applied' | 'ai'

async function downloadApplicantsCsv() {
  const response = await fetch('/api/vc/applicants/export', { credentials: 'include' })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Export failed')
  }
  const contentDisposition = response.headers.get('Content-Disposition')
  const filename = contentDisposition
    ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'candidates.csv'
    : 'candidates.csv'
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export default function VCDashboard() {
  const [loading, setLoading] = useState(true)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [vcProfile, setVcProfile] = useState<{ firmName?: string } | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [page, setPage] = useState(1)
  const perPage = 12

  useEffect(() => {
    async function loadData() {
      try {
        const profileRes = await fetch('/api/vc/profile', { credentials: 'include' })
        if (!profileRes.ok) {
          window.location.href = '/vc/claim'
          return
        }
        const profileData = await profileRes.json()
        if (!profileData.exists) {
          window.location.href = '/vc/claim'
          return
        }
        setVcProfile(profileData.profile)

        const applicantsRes = await fetch('/api/vc/applicants', { credentials: 'include' })
        if (applicantsRes.ok) {
          const applicantsData = await applicantsRes.json()
          setApplicants(applicantsData.applicants || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filtered = useMemo(() => {
    let list = [...applicants]
    if (filter === 'applied') {
      list = list.filter((a) => Boolean(a.applicationStatus))
    } else if (filter === 'ai') {
      list = list.filter((a) => a.hasResumeAnalysis || a.hasPitchDeck)
    }
    return list.sort((a, b) => b.matchScore - a.matchScore)
  }, [applicants, filter])

  useEffect(() => {
    setPage(1)
  }, [filter, applicants.length])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const pageSafe = Math.min(page, totalPages)
  const slice = filtered.slice((pageSafe - 1) * perPage, pageSafe * perPage)

  const appliedCount = applicants.filter((a) => a.applicationStatus).length
  const withAiCount = applicants.filter((a) => a.hasResumeAnalysis || a.hasPitchDeck).length
  const avgMatch =
    applicants.length > 0
      ? Math.round(applicants.reduce((s, a) => s + a.matchScore, 0) / applicants.length)
      : 0

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm">Loading candidates…</p>
        </div>
      </div>
    )
  }

  const filterBtn = (key: FilterKey, label: string) => (
    <button
      type="button"
      key={key}
      onClick={() => setFilter(key)}
      className={cn(
        'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        filter === key
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell-narrow">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              {vcProfile?.firmName || 'Your firm'}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Founders who fit your thesis. Open a profile for full details and any AI analysis they
              ran on the platform, then email the ones you want to meet.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 self-start sm:self-auto"
            onClick={async () => {
              try {
                await downloadApplicantsCsv()
                toast.success('Download started')
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : 'Export failed')
              }
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4 md:gap-6">
          <div className="rounded-xl border border-border/80 bg-card px-4 py-3 text-center">
            <div className="text-2xl font-semibold tabular-nums">{applicants.length}</div>
            <div className="text-xs text-muted-foreground">Thesis matches</div>
          </div>
          <div className="rounded-xl border border-border/80 bg-card px-4 py-3 text-center">
            <div className="text-2xl font-semibold tabular-nums">{appliedCount}</div>
            <div className="text-xs text-muted-foreground">Applied to you</div>
          </div>
          <div className="rounded-xl border border-border/80 bg-card px-4 py-3 text-center">
            <div className="text-2xl font-semibold tabular-nums">{avgMatch}%</div>
            <div className="text-xs text-muted-foreground">Avg fit score</div>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {filterBtn('all', `All (${applicants.length})`)}
            {filterBtn('applied', `Applied (${appliedCount})`)}
            {filterBtn('ai', `Has AI / deck (${withAiCount})`)}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-foreground">No one here yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === 'all'
                ? 'When founders match your stage, sector, check size, and geography, they will show up here.'
                : 'Try another filter or check back later.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {slice.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {a.startupName || 'Unnamed startup'}
                    </span>
                    <Badge variant="secondary" className="tabular-nums">
                      {a.matchScore}% fit
                    </Badge>
                    {a.applicationStatus && (
                      <Badge variant="outline" className="capitalize">
                        {a.applicationStatus}
                      </Badge>
                    )}
                    {a.hasResumeAnalysis && (
                      <Badge variant="outline" className="gap-1 font-normal">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </Badge>
                    )}
                    {a.hasPitchDeck && (
                      <Badge variant="outline" className="gap-1 font-normal">
                        <FileText className="h-3 w-3" />
                        Deck
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {a.name} · {a.stage} · {a.sectors.slice(0, 3).join(', ')}
                    {a.sectors.length > 3 ? '…' : ''} · ${a.fundingNeed}K · {a.location}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/vc/applicants/${a.id}`}
                    className={buttonVariants({ size: 'sm', variant: 'default' })}
                  >
                    View profile
                  </Link>
                  <a
                    href={`mailto:${a.email}`}
                    className={buttonVariants({ size: 'sm', variant: 'outline' })}
                  >
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    Email
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        {filtered.length > perPage && (
          <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-sm text-muted-foreground">
            <span>
              {(pageSafe - 1) * perPage + 1}–{Math.min(pageSafe * perPage, filtered.length)} of{' '}
              {filtered.length}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
