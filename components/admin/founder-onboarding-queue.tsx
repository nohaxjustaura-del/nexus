'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast-simple'
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Loader2,
  Search,
  UserX,
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

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '-'
  }
}

function statusBadgeVariant(status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!status) return 'outline'
  if (status === 'pending') return 'secondary'
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
  const [bulkApproving, setBulkApproving] = useState(false)

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

  const approveAllPending = async () => {
    if (
      !confirm(
        'Approve every pending signup in the queue right now? This will grant access to all currently pending accounts.'
      )
    ) {
      return
    }

    setBulkApproving(true)
    try {
      const res = await fetch('/api/admin/users/approvals', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Bulk approve failed')
      const approvedCount =
        typeof data?.approvedCount === 'number' && Number.isFinite(data.approvedCount)
          ? data.approvedCount
          : 0
      toast.success(
        approvedCount > 0
          ? `Approved ${approvedCount} pending signup${approvedCount === 1 ? '' : 's'}`
          : 'No pending signups to approve'
      )
      await loadQueueFirstPage()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Bulk approve failed')
    } finally {
      setBulkApproving(false)
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
        : 'Showing the most recent signups. Search by email or name.',
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
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <p className="hidden text-xs text-muted-foreground sm:block sm:max-w-sm sm:text-right">{searchHint}</p>
          <Button type="button" size="sm" variant="outline" onClick={approveAllPending} disabled={bulkApproving}>
            {bulkApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Layers className="mr-2 h-4 w-4" />
                Approve all pending
              </>
            )}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground sm:hidden">{searchHint}</p>

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
                      <Badge variant={statusBadgeVariant(row.signupStatus)} className="text-xs">
                        Signup: {row.signupStatus}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        No signup row
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
