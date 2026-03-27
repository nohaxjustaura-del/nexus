/**
 * Admin: background worker status and manual job triggers (must match /api/worker/trigger).
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/components/ui/toast-simple'

interface Job {
  id: string
  name: string
  status: 'idle' | 'running' | 'error'
  lastRun?: string
  nextRun?: string
  errorCount: number
}

interface WorkerStatus {
  running: boolean
  jobs: Job[]
}

/** Maps scheduled job id → POST /api/worker/trigger jobType */
function getTriggerJobType(jobId: string): string | null {
  if (jobId.includes('exa-enrichment')) return 'exa-enrichment'
  if (jobId.includes('vc-thesis')) return 'vc-thesis-research'
  if (jobId.includes('vc-profile')) return 'vc-profile-research'
  if (jobId.includes('embeddings')) return 'embeddings'
  if (jobId.includes('validation') || jobId === 'data-validation') return 'data-validation'
  if (jobId.includes('vc-directory')) return 'vc-directory-sync'
  return null
}

export function WorkerDashboardClient() {
  const [status, setStatus] = useState<WorkerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/worker/status')
      if (!response.ok) throw new Error('Failed to fetch status')
      const data = await response.json()
      setStatus(data.status)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const triggerJob = async (jobType: string) => {
    setTriggering(jobType)
    try {
      const response = await fetch('/api/worker/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to trigger job')
      }

      toast.success('Job started')
      setTimeout(fetchStatus, 1000)
    } catch (err: unknown) {
      toast.error(`Failed to trigger: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setTriggering(null)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 text-foreground">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Background worker
          </h1>
          <p className="text-muted-foreground">Loading status…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8 text-foreground">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Background worker
          </h1>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
            <p className="text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                fetchStatus()
              }}
              className="mt-4 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Background worker
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Status of in-process jobs and manual runs (same actions as the API).
        </p>

        <div className="mb-8 rounded-lg border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Process</h2>
              <p className={status?.running ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                {status?.running ? 'Running' : 'Stopped'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                fetchStatus()
              }}
              className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Refresh
            </button>
          </div>
        </div>

        <h2 className="mb-4 text-lg font-semibold">Scheduled jobs ({status?.jobs.length ?? 0})</h2>
        <ul className="space-y-4">
          {status?.jobs.map((job) => {
            const jobType = getTriggerJobType(job.id)
            const canTrigger = Boolean(jobType) && job.status !== 'running'
            return (
              <li
                key={job.id}
                className="rounded-lg border bg-card p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{job.name}</h3>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {job.status}
                      </span>
                    </div>
                    <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-foreground">Last run:</span> {formatDate(job.lastRun)}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Next run:</span> {formatDate(job.nextRun)}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Errors:</span> {job.errorCount}
                      </p>
                    </div>
                  </div>
                  {jobType ? (
                    <button
                      type="button"
                      onClick={() => triggerJob(jobType)}
                      disabled={!canTrigger || triggering === jobType}
                      className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {triggering === jobType ? 'Starting…' : 'Run now'}
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-10 rounded-lg border border-dashed bg-muted/30 p-6">
          <h2 className="mb-2 text-base font-semibold">One-off seed research</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Runs full research on a small built-in list of firms (not part of the monthly schedules).
          </p>
          <button
            type="button"
            onClick={() => triggerJob('vc-research')}
            disabled={triggering === 'vc-research'}
            className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {triggering === 'vc-research' ? 'Starting…' : 'Run seed VC research'}
          </button>
        </div>
      </div>
    </div>
  )
}
