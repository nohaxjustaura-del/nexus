'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Bookmark, Clock3, CheckCircle2, Handshake, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast-simple'
import { cn } from '@/lib/utils'

type ProgressStage = 'saved' | 'contacted' | 'meeting' | 'closed'

interface SavedFounder {
  bookmarkId: string
  founderId: string
  savedAt: string
  founder: {
    id: string
    name: string
    startupName: string | null
    stage: string | null
    sectors: string | null
    location: string | null
    fundingNeed: number | null
    bio: string | null
    linkedinUrl: string | null
    websiteUrl: string | null
  }
  progress: {
    stage: ProgressStage
    notes: string
    updatedAt: string
  }
}

const STAGE_OPTIONS: { value: ProgressStage; label: string }[] = [
  { value: 'saved', label: 'Saved' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'closed', label: 'Closed' },
]

function stageChipClass(stage: ProgressStage): string {
  switch (stage) {
    case 'closed':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    case 'meeting':
      return 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400'
    case 'contacted':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

function StageIcon({ stage }: { stage: ProgressStage }) {
  if (stage === 'closed') return <CheckCircle2 className="h-3.5 w-3.5" />
  if (stage === 'meeting') return <Handshake className="h-3.5 w-3.5" />
  if (stage === 'contacted') return <Mail className="h-3.5 w-3.5" />
  return <Clock3 className="h-3.5 w-3.5" />
}

export default function InvestorSavedPage() {
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState<SavedFounder[]>([])
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({})

  const loadSaved = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/investor/saved', { credentials: 'include' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSaved(Array.isArray(data.saved) ? data.saved : [])
    } catch {
      toast.error('Failed to load saved founders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSaved()
  }, [loadSaved])

  const counts = useMemo(() => {
    return saved.reduce(
      (acc, item) => {
        acc.total += 1
        acc[item.progress.stage] += 1
        return acc
      },
      { total: 0, saved: 0, contacted: 0, meeting: 0, closed: 0 } as Record<ProgressStage | 'total', number>,
    )
  }, [saved])

  const updateProgress = useCallback(async (founderId: string, patch: Partial<SavedFounder['progress']>) => {
    setSavingMap((prev) => ({ ...prev, [founderId]: true }))
    const previous = saved
    setSaved((prev) =>
      prev.map((item) =>
        item.founderId === founderId
          ? {
              ...item,
              progress: {
                ...item.progress,
                ...patch,
              },
            }
          : item,
      ),
    )

    try {
      const res = await fetch('/api/investor/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          founderId,
          stage: patch.stage,
          notes: patch.notes,
        }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setSaved(previous)
      toast.error('Could not save progress update')
    } finally {
      setSavingMap((prev) => ({ ...prev, [founderId]: false }))
    }
  }, [saved])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading saved founders...</span>
        </div>
      </div>
    )
  }

  if (saved.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Bookmark className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">No saved founders yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Save founders from Discover and track outreach progress here without waiting for recommendation ranking.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:py-10">
      <header className="mb-6">
        <Badge variant="secondary" className="mb-2 px-3 py-1 text-xs font-medium">
          Investor Saved
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Outreach Tracker</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Track your active founder conversations with a simple pipeline.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border bg-card px-3 py-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-semibold">{counts.total}</p></div>
        <div className="rounded-lg border bg-card px-3 py-3 text-center"><p className="text-xs text-muted-foreground">Saved</p><p className="text-xl font-semibold">{counts.saved}</p></div>
        <div className="rounded-lg border bg-card px-3 py-3 text-center"><p className="text-xs text-muted-foreground">Contacted</p><p className="text-xl font-semibold">{counts.contacted}</p></div>
        <div className="rounded-lg border bg-card px-3 py-3 text-center"><p className="text-xs text-muted-foreground">Meeting</p><p className="text-xl font-semibold">{counts.meeting}</p></div>
        <div className="rounded-lg border bg-card px-3 py-3 text-center"><p className="text-xs text-muted-foreground">Closed</p><p className="text-xl font-semibold">{counts.closed}</p></div>
      </div>

      <div className="space-y-3">
        {saved.map((item) => {
          const isSaving = Boolean(savingMap[item.founderId])
          return (
            <article key={item.bookmarkId} className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{item.founder.startupName || 'Unnamed startup'}</h2>
                  <p className="text-sm text-muted-foreground">
                    {(item.founder.name || 'Founder').trim()} {item.founder.location ? `· ${item.founder.location}` : ''}
                  </p>
                </div>
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium', stageChipClass(item.progress.stage))}>
                  <StageIcon stage={item.progress.stage} />
                  {item.progress.stage}
                </span>
              </div>

              {item.founder.bio ? (
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{item.founder.bio}</p>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr]">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Stage</span>
                  <select
                    value={item.progress.stage}
                    onChange={(event) => updateProgress(item.founderId, { stage: event.target.value as ProgressStage })}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={isSaving}
                  >
                    {STAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Notes</span>
                  <textarea
                    value={item.progress.notes}
                    onChange={(event) =>
                      setSaved((prev) =>
                        prev.map((founder) =>
                          founder.founderId === item.founderId
                            ? { ...founder, progress: { ...founder.progress, notes: event.target.value } }
                            : founder,
                        ),
                      )
                    }
                    onBlur={(event) => updateProgress(item.founderId, { notes: event.target.value })}
                    placeholder="What is your next step?"
                    className="min-h-[74px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={isSaving}
                  />
                </label>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
