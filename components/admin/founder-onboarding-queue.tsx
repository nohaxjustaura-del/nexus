'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast-simple'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Search,
  UserX,
  XCircle,
} from 'lucide-react'

export type FounderOnboardingQueueItem = {
  email: string
  founderName: string | null
  signupStatus: 'pending' | 'approved' | 'rejected' | null
  signupCreatedAt: string | null
  signupReviewedAt: string | null
  idStatus: string | null
  idSubmittedAt: string | null
  idVerifiedAt: string | null
  hasIdFile: boolean
  idPreviewKind: 'pdf' | 'image' | 'unknown'
  lastActivityAt: string
}

type DetailsPayload = {
  error?: string
  user?: { email?: string; emailVerified?: boolean; createdAt?: string; updatedAt?: string } | null
  founder?: {
    name?: string | null
    stage?: string | null
    sectors?: string | null
    location?: string | null
    education?: string | null
    age?: number | null
  } | null
  contact?: {
    phone?: string | null
    altEmail?: string | null
    website?: string | null
    linkedin?: string | null
    city?: string | null
    country?: string | null
    updatedAt?: string | null
  } | null
  verification?: {
    status?: string
    submittedAt?: string
    verifiedAt?: string | null
    reviewerEmail?: string | null
    url?: string | null
  } | null
}

function previewKind(url: string | null | undefined): 'pdf' | 'image' | 'unknown' {
  if (!url) return 'unknown'
  const base = url.split('?')[0].toLowerCase()
  if (base.endsWith('.pdf')) return 'pdf'
  if (/\.(png|jpe?g|webp|gif)$/i.test(base)) return 'image'
  return 'unknown'
}

function inlineFileUrl(email: string) {
  return `/api/admin/founders/verification/file/${encodeURIComponent(email)}?disposition=inline`
}

function downloadFileUrl(email: string) {
  return `/api/admin/founders/verification/file/${encodeURIComponent(email)}`
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '-'
  }
}

function statusBadgeVariant(
  status: string | null,
  kind: 'signup' | 'id'
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!status) return 'outline'
  if (status === 'pending') return kind === 'signup' ? 'secondary' : 'secondary'
  if (status === 'approved') return 'default'
  if (status === 'rejected') return 'destructive'
  return 'outline'
}

export function FounderOnboardingQueue() {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [items, setItems] = useState<FounderOnboardingQueueItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [queueLoading, setQueueLoading] = useState(true)
  const [queueError, setQueueError] = useState<string | null>(null)

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [detailsByEmail, setDetailsByEmail] = useState<Record<string, DetailsPayload>>({})
  const [detailsLoading, setDetailsLoading] = useState<Set<string>>(() => new Set())

  const [submitting, setSubmitting] = useState<string | null>(null)
  const [idBusy, setIdBusy] = useState<{ email: string; action: 'approve' | 'reject' } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 320)
    return () => clearTimeout(t)
  }, [searchInput])

  const loadQueueFirstPage = useCallback(async () => {
    setQueueLoading(true)
    setQueueError(null)
    try {
      const params = new URLSearchParams({ skip: '0', limit: '28' })
      if (debouncedQ) params.set('q', debouncedQ)
      const res = await fetch(`/api/admin/founder-onboarding-queue?${params}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load queue')
      const next: FounderOnboardingQueueItem[] = Array.isArray(data.items) ? data.items : []
      setItems(next)
      setHasMore(Boolean(data.hasMore))
    } catch (e: unknown) {
      setQueueError(e instanceof Error ? e.message : 'Failed to load queue')
      setItems([])
    } finally {
      setQueueLoading(false)
    }
  }, [debouncedQ])

  useEffect(() => {
    void loadQueueFirstPage()
  }, [loadQueueFirstPage])

  const loadDetails = useCallback(async (email: string) => {
    setDetailsLoading((s) => new Set(s).add(email))
    try {
      const res = await fetch(`/api/admin/founders/details/${encodeURIComponent(email)}`, {
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDetailsByEmail((d) => ({ ...d, [email]: { error: data?.error || 'Failed to load details' } }))
        return
      }
      setDetailsByEmail((d) => ({ ...d, [email]: data as DetailsPayload }))
    } catch {
      setDetailsByEmail((d) => ({ ...d, [email]: { error: 'Failed to load details' } }))
    } finally {
      setDetailsLoading((s) => {
        const n = new Set(s)
        n.delete(email)
        return n
      })
    }
  }, [])

  const toggleExpand = (email: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      const wasOpen = next.has(email)
      if (wasOpen) next.delete(email)
      else {
        next.add(email)
        if (!detailsByEmail[email]) void loadDetails(email)
      }
      return next
    })
  }

  const patchUser = async (email: string, action: 'reject_signup' | 'revoke_access') => {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Request failed')
  }

  const approveSignup = async (email: string) => {
    setSubmitting(`approve:${email}`)
    try {
      const res = await fetch(`/api/admin/users/approve/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Approve failed')
      toast.success('Account approved')
      await loadQueueFirstPage()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setSubmitting(null)
    }
  }

  const rejectPending = async (email: string) => {
    if (
      !confirm(
        `Reject signup for ${email}? They will be blocked from logging in and receive a rejection email.`
      )
    ) {
      return
    }
    setSubmitting(`reject:${email}`)
    try {
      await patchUser(email, 'reject_signup')
      toast.success('Signup rejected')
      await loadQueueFirstPage()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setSubmitting(null)
    }
  }

  const revokeApproved = async (email: string) => {
    if (
      !confirm(
        `Revoke access for ${email}? Their signup will be marked rejected and founder ID verification removed if present. They will receive a rejection email.`
      )
    ) {
      return
    }
    setSubmitting(`revoke:${email}`)
    try {
      await patchUser(email, 'revoke_access')
      toast.success('Access revoked')
      await loadQueueFirstPage()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Revoke failed')
    } finally {
      setSubmitting(null)
    }
  }

  const runIdDecision = async (email: string, action: 'approve' | 'reject') => {
    setIdBusy({ email, action })
    try {
      const res = await fetch(`/api/admin/founders/verification/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Update failed')
      }

      if (action === 'approve') {
        const res2 = await fetch(`/api/admin/users/approve/${encodeURIComponent(email)}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res2.ok) {
          toast.error('ID saved, but account approval failed. Approve signup from this row if needed.')
        }
      }

      toast.success(action === 'approve' ? 'Founder ID verified' : 'ID submission rejected')
      setDetailsByEmail((d) => {
        const next = { ...d }
        delete next[email]
        return next
      })
      await loadQueueFirstPage()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setIdBusy(null)
    }
  }

  const loadMore = async () => {
    if (!hasMore || queueLoading) return
    setQueueLoading(true)
    setQueueError(null)
    const skip = items.length
    try {
      const params = new URLSearchParams({ skip: String(skip), limit: '28' })
      if (debouncedQ) params.set('q', debouncedQ)
      const res = await fetch(`/api/admin/founder-onboarding-queue?${params}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to load queue')
      const next: FounderOnboardingQueueItem[] = Array.isArray(data.items) ? data.items : []
      setItems((prev) => [...prev, ...next])
      setHasMore(Boolean(data.hasMore))
    } catch (e: unknown) {
      setQueueError(e instanceof Error ? e.message : 'Failed to load queue')
    } finally {
      setQueueLoading(false)
    }
  }

  const searchHint = useMemo(
    () =>
      debouncedQ
        ? `Search: “${debouncedQ}”`
        : 'Showing the most recent signups and ID submissions. Search by email or name.',
    [debouncedQ]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search email or founder name…"
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search queue"
          />
        </div>
        <p className="text-xs text-muted-foreground sm:max-w-sm sm:text-right">{searchHint}</p>
      </div>

      {queueError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{queueError}</div>
      )}

      {queueLoading && items.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading queue…
        </div>
      )}

      {!queueLoading && items.length === 0 && !queueError && (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          No founders match this search.
        </div>
      )}

      <ul className="space-y-2">
        {items.map((row) => {
          const isOpen = expanded.has(row.email)
          const details = detailsByEmail[row.email]
          const dLoading = detailsLoading.has(row.email)
          const rowBusy = idBusy?.email === row.email
          const rejectLoading = rowBusy && idBusy?.action === 'reject'
          const approveLoading = rowBusy && idBusy?.action === 'approve'
          const vUrl = details?.verification?.url
          const kind = vUrl ? previewKind(vUrl) : row.idPreviewKind ?? 'unknown'
          const src = inlineFileUrl(row.email)

          return (
            <li key={row.email} className="overflow-hidden rounded-lg border bg-card">
              <button
                type="button"
                onClick={() => toggleExpand(row.email)}
                className="flex w-full items-start gap-2 px-3 py-3 text-left transition-colors hover:bg-muted/40 sm:items-center sm:gap-3 sm:px-4"
              >
                <span className="mt-0.5 shrink-0 text-muted-foreground sm:mt-0">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-tight">{row.email}</div>
                  {row.founderName && (
                    <div className="text-sm text-muted-foreground">{row.founderName}</div>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {row.signupStatus ? (
                      <Badge variant={statusBadgeVariant(row.signupStatus, 'signup')} className="text-xs">
                        Signup: {row.signupStatus}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        No signup row
                      </Badge>
                    )}
                    {row.idStatus ? (
                      <Badge variant={statusBadgeVariant(row.idStatus, 'id')} className="text-xs">
                        ID: {row.idStatus}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        No ID submission
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                  <div>Last activity</div>
                  <div className="font-medium text-foreground">{formatWhen(row.lastActivityAt)}</div>
                </div>
              </button>

              {isOpen && (
                <div className="space-y-4 border-t bg-muted/20 px-3 py-4 sm:px-4">
                  {dLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading profile…
                    </div>
                  )}
                  {details?.error && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
                      {details.error}
                    </div>
                  )}

                  {!dLoading && details && !details.error && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <section className="rounded-md border bg-background p-3 text-sm">
                        <h3 className="mb-2 font-semibold">Account & signup</h3>
                        <dl className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                          <dt className="text-muted-foreground">Email verified</dt>
                          <dd className="col-span-2">{details.user?.emailVerified ? 'Yes' : 'No'}</dd>
                          <dt className="text-muted-foreground">User created</dt>
                          <dd className="col-span-2">{formatWhen(details.user?.createdAt)}</dd>
                          <dt className="text-muted-foreground">Signup requested</dt>
                          <dd className="col-span-2">{formatWhen(row.signupCreatedAt)}</dd>
                          <dt className="text-muted-foreground">Signup reviewed</dt>
                          <dd className="col-span-2">{formatWhen(row.signupReviewedAt)}</dd>
                        </dl>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {row.signupStatus === 'pending' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => rejectPending(row.email)}
                              disabled={!!submitting}
                            >
                              {submitting === `reject:${row.email}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Reject signup'
                              )}
                            </Button>
                          )}
                          {row.signupStatus === 'approved' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => revokeApproved(row.email)}
                              disabled={!!submitting}
                            >
                              {submitting === `revoke:${row.email}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <UserX className="mr-2 h-4 w-4" />
                              )}
                              Revoke access
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => approveSignup(row.email)}
                            disabled={!!submitting || row.signupStatus === 'approved'}
                          >
                            {submitting === `approve:${row.email}` ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Working…
                              </>
                            ) : row.signupStatus === 'approved' ? (
                              'Approved'
                            ) : row.signupStatus === 'rejected' ? (
                              'Approve signup again'
                            ) : (
                              'Approve signup'
                            )}
                          </Button>
                        </div>
                      </section>

                      <section className="rounded-md border bg-background p-3 text-sm">
                        <h3 className="mb-2 font-semibold">Profile & contact</h3>
                        <dl className="grid grid-cols-3 gap-x-2 gap-y-1.5">
                          <dt className="text-muted-foreground">Name</dt>
                          <dd className="col-span-2">{details.founder?.name || row.founderName || '-'}</dd>
                          <dt className="text-muted-foreground">Stage</dt>
                          <dd className="col-span-2">
                            {details.founder?.stage
                              ? String(details.founder.stage).replace(/\b\w/g, (c: string) => c.toUpperCase())
                              : '-'}
                          </dd>
                          <dt className="text-muted-foreground">Location</dt>
                          <dd className="col-span-2">{details.founder?.location || '-'}</dd>
                          <dt className="text-muted-foreground">Phone</dt>
                          <dd className="col-span-2">{details.contact?.phone || '-'}</dd>
                          <dt className="text-muted-foreground">LinkedIn</dt>
                          <dd className="col-span-2 break-all">{details.contact?.linkedin || '-'}</dd>
                        </dl>
                      </section>
                    </div>
                  )}

                  <section className="rounded-md border bg-background p-3">
                    <h3 className="mb-2 text-sm font-semibold">Founder ID document</h3>
                    {!row.hasIdFile && !vUrl && (
                      <p className="text-sm text-muted-foreground">No ID file uploaded for this email.</p>
                    )}
                    {(row.hasIdFile || vUrl) && (
                      <>
                        <div className="relative min-h-[200px] overflow-hidden rounded-md border bg-muted/20">
                          {!vUrl && dLoading ? (
                            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                              Loading preview…
                            </div>
                          ) : !vUrl ? (
                            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                              No file on record
                            </div>
                          ) : kind === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin stream; Next/Image not applicable
                            <img
                              src={src}
                              alt={`ID document for ${row.email}`}
                              className="mx-auto max-h-[min(60vh,560px)] w-full object-contain"
                            />
                          ) : kind === 'pdf' ? (
                            <iframe
                              title={`ID PDF ${row.email}`}
                              src={src}
                              className="h-[min(60vh,560px)] w-full bg-card"
                            />
                          ) : (
                            <div className="flex h-52 flex-col items-center justify-center gap-2 p-4 text-center">
                              <FileText className="h-9 w-9 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Preview unavailable. Open or download to review.
                              </p>
                              <a
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                              >
                                Open file
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <a
                            href={vUrl || row.hasIdFile ? downloadFileUrl(row.email) : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              buttonVariants({ variant: 'outline', size: 'sm' }),
                              (!vUrl && !row.hasIdFile) && 'pointer-events-none opacity-50'
                            )}
                            onClick={(e) => {
                              if (!vUrl && !row.hasIdFile) e.preventDefault()
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </a>
                          {row.idStatus === 'pending' && (
                            <div className="ml-auto flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                disabled={rowBusy}
                                onClick={() => runIdDecision(row.email, 'reject')}
                              >
                                {rejectLoading ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="mr-2 h-4 w-4" />
                                )}
                                Reject ID
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                disabled={rowBusy}
                                onClick={() => runIdDecision(row.email, 'approve')}
                              >
                                {approveLoading ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                )}
                                Verify ID
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </section>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {hasMore && items.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="outline" onClick={loadMore} disabled={queueLoading}>
            {queueLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
