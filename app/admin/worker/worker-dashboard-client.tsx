'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

type JobRow = {
  id: string
  name: string
  status: string
  lastRun?: string
  nextRun?: string
  errorCount: number
  summary?: string
  cadence?: string
}

type WorkerStatusPayload = {
  running: boolean
  jobs: JobRow[]
}

function jobIdToTriggerType(
  id: string,
): 'exa-enrichment' | 'vc-thesis-research' | 'vc-profile-research' | 'embeddings' | 'data-validation' | 'vc-directory-sync' | null {
  if (id.includes('exa-enrichment')) return 'exa-enrichment'
  if (id.includes('vc-thesis')) return 'vc-thesis-research'
  if (id.includes('vc-profile')) return 'vc-profile-research'
  if (id.includes('embeddings')) return 'embeddings'
  if (id.includes('validation') || id === 'data-validation') return 'data-validation'
  if (id.includes('vc-directory')) return 'vc-directory-sync'
  return null
}

function formatWhen(iso?: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString()
}

export function WorkerDashboardClient() {
  const [status, setStatus] = useState<WorkerStatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [applyContactLimit, setApplyContactLimit] = useState(15)
  const [applyContactOverwrite, setApplyContactOverwrite] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/worker/status')
      if (!res.ok) throw new Error('Failed to fetch status')
      const data = (await res.json()) as { status: WorkerStatusPayload }
      setStatus(data.status)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const triggerJob = async (jobType: string, params?: Record<string, unknown>) => {
    setTriggering(jobType)
    try {
      const res = await fetch('/api/worker/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params ? { jobType, params } : { jobType }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error || 'Failed to trigger job')
      }
      toast.success('Job started')
      setTimeout(() => void refresh(), 1000)
    } catch (e) {
      toast.error(`Failed to trigger: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setTriggering(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 text-foreground">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Background worker</h1>
          <p className="text-muted-foreground">Loading status…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8 text-foreground">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-8 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Background worker</h1>
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6">
            <p className="text-destructive">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                void refresh()
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

  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Background worker</h1>
        <p className="mb-3 text-sm text-muted-foreground">
          Scheduled jobs in this Node process. Use <strong className="font-medium text-foreground">Run now</strong> to trigger
          handlers on demand.
        </p>
        <Accordion type="single" collapsible className="mb-8 rounded-lg border border-border/60 bg-card/50">
          <AccordionItem value="worker-local" className="border-0 px-4">
            <AccordionTrigger className="py-3 text-sm hover:no-underline">
              Running workers locally
            </AccordionTrigger>
            <AccordionContent>
              <p className="max-w-prose pb-3 text-sm leading-relaxed text-muted-foreground">
                Status here reflects this Next.js app only. On your machine, run{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run workers:all</code> in a dedicated terminal for
                maintenance plus VC discovery (Exa → research → Prisma and Supabase). Run now calls the same handlers via
                API.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="mb-8 rounded-lg border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Process</h2>
              <p
                className={
                  status?.running ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                }
              >
                {status?.running ? 'Running' : 'Stopped'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                void refresh()
              }}
              className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Refresh
            </button>
          </div>
        </div>

        <h2 className="mb-4 text-lg font-semibold">Scheduled jobs ({status?.jobs.length ?? 0})</h2>
        <ul className="space-y-4">
          {status?.jobs.map(job => {
            const triggerType = jobIdToTriggerType(job.id)
            const canRun = !!triggerType && job.status !== 'running'
            return (
              <li key={job.id} className="rounded-lg border bg-card p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{job.name}</h3>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{job.status}</span>
                    </div>
                    {job.summary ?
                      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{job.summary}</p>
                    : null}
                    {job.cadence ?
                      <p className="mb-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Schedule:</span> {job.cadence}
                      </p>
                    : null}
                    <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-foreground">Last run:</span> {formatWhen(job.lastRun)}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Next run:</span> {formatWhen(job.nextRun)}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Errors:</span> {job.errorCount}
                      </p>
                    </div>
                  </div>
                  {triggerType ?
                    <button
                      type="button"
                      onClick={() => void triggerJob(triggerType)}
                      disabled={!canRun || triggering === triggerType}
                      className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {triggering === triggerType ? 'Starting…' : 'Run now'}
                    </button>
                  : null}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-10 space-y-8">
          <div className="rounded-lg border border-dashed bg-muted/30 p-6">
            <h2 className="mb-2 text-base font-semibold">One-off seed research</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Runs full VC research (thesis + profile) on a fixed short list: Sequoia, a16z, Benchmark, Accel, YC. Separate
              from monthly thesis/profile windows and from the discover ingest worker.
            </p>
            <button
              type="button"
              onClick={() => void triggerJob('vc-research')}
              disabled={triggering === 'vc-research'}
              className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {triggering === 'vc-research' ? 'Starting…' : 'Run seed VC research'}
            </button>
          </div>

          <div className="rounded-lg border border-dashed bg-muted/30 p-6">
            <h2 className="mb-2 text-base font-semibold">Apply / contact URL refresh</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Targeted Exa passes (apply, official contact, LinkedIn) plus LLM extraction to fill or fix{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">applicationUrl</code>,{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">websiteUrl</code>, and{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">linkedinUrl</code>. Not on the maintenance timer; same
              job as <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run worker:apply-contact-urls</code>.
              Supabase <code className="rounded bg-muted px-1 py-0.5 text-xs">vc_directory</code> updates on the next
              directory sync job.
            </p>
            <div className="mb-4 flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Batch limit (public rows needing URLs)</span>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={applyContactLimit}
                  onChange={e => setApplyContactLimit(Math.min(80, Math.max(1, parseInt(e.target.value, 10) || 15)))}
                  className="w-24 rounded-md border bg-background px-2 py-1.5"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={applyContactOverwrite}
                  onChange={e => setApplyContactOverwrite(e.target.checked)}
                  className="rounded border"
                />
                <span className="text-muted-foreground">Overwrite existing URLs (validated only)</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() =>
                void triggerJob('vc-apply-contact-research', {
                  limit: applyContactLimit,
                  overwrite: applyContactOverwrite,
                })
              }
              disabled={triggering === 'vc-apply-contact-research'}
              className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {triggering === 'vc-apply-contact-research' ? 'Starting…' : 'Run apply/contact URL pass'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
