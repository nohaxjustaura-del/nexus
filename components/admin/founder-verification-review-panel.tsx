'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast-simple'
import { CheckCircle, Clock, Download, FileText, Loader2, XCircle } from 'lucide-react'
import type { FounderVerificationReviewItem } from '@/lib/admin/founder-verifications'

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

type PanelProps = {
  pending: FounderVerificationReviewItem[]
  /** Shown below pending; compact rows without preview */
  recentDecisions?: FounderVerificationReviewItem[]
  /** When false, omit the page-level title card (e.g. on dashboard) */
  showHeader?: boolean
}

export function FounderVerificationReviewPanel({
  pending,
  recentDecisions = [],
  showHeader = true,
}: PanelProps) {
  const router = useRouter()
  const [actionBusy, setActionBusy] = useState<{ email: string; action: 'approve' | 'reject' } | null>(null)

  const runDecision = async (email: string, action: 'approve' | 'reject') => {
    setActionBusy({ email, action })
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
          toast.error('Verification saved, but account approval failed. Approve the user from User Signups if needed.')
        }
      }

      toast.success(action === 'approve' ? 'Founder verified' : 'Submission rejected')
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setActionBusy(null)
    }
  }

  const sortedPending = useMemo(
    () => [...pending].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [pending]
  )

  return (
    <div className="space-y-6">
      {showHeader && (
        <Card>
          <CardHeader>
            <CardTitle>Founder ID verification</CardTitle>
            <CardDescription>
              Review the uploaded document on this page, then verify or reject. Download opens the file in a new tab if
              the preview is unclear.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {sortedPending.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No pending ID submissions.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-1">
        {sortedPending.map((item) => {
          const rowBusy = actionBusy?.email === item.email
          const rejectLoading = rowBusy && actionBusy?.action === 'reject'
          const approveLoading = rowBusy && actionBusy?.action === 'approve'
          const kind = previewKind(item.url)
          const src = inlineFileUrl(item.email)

          return (
            <Card key={item.email} className="overflow-hidden border-primary/20">
              <CardHeader className="border-b bg-muted/30 pb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.email}</CardTitle>
                    <CardDescription className="mt-1 space-y-0.5">
                      {item.founderName && <span className="block font-medium text-foreground">{item.founderName}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Submitted {new Date(item.submittedAt).toLocaleString()}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="w-fit shrink-0">
                    Pending review
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="relative min-h-[240px] overflow-hidden rounded-lg border bg-muted/20">
                  {!item.url ? (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                      No file on record
                    </div>
                  ) : kind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin-only signed binary stream; Next/Image not applicable
                    <img
                      src={src}
                      alt={`ID document for ${item.email}`}
                      className="mx-auto max-h-[min(70vh,720px)] w-full object-contain"
                    />
                  ) : kind === 'pdf' ? (
                    <iframe title={`ID PDF ${item.email}`} src={src} className="h-[min(70vh,720px)] w-full bg-card" />
                  ) : (
                    <div className="flex h-64 flex-col items-center justify-center gap-3 p-4 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Preview is not available for this file type. Open or download to review.
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

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={item.url ? downloadFileUrl(item.email) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!item.url || rowBusy}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      (!item.url || rowBusy) && 'pointer-events-none opacity-50'
                    )}
                    onClick={(e) => {
                      if (!item.url || rowBusy) e.preventDefault()
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      disabled={rowBusy}
                      onClick={() => runDecision(item.email, 'reject')}
                    >
                      {rejectLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={rowBusy}
                      onClick={() => runDecision(item.email, 'approve')}
                    >
                      {approveLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Verify
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {recentDecisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent decisions</CardTitle>
            <CardDescription>Last {recentDecisions.length} reviewed submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentDecisions.map((row) => (
              <div
                key={`${row.email}-${row.verifiedAt?.toString() ?? ''}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{row.email}</span>
                  {row.founderName && <span className="text-muted-foreground"> · {row.founderName}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={row.status === 'approved' ? 'default' : 'destructive'}>{row.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {row.verifiedAt ? new Date(row.verifiedAt).toLocaleString() : '-'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
