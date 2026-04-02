'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageSquare, Calendar, Mail } from 'lucide-react'
import { toast } from '@/components/ui/toast-simple'

export type YcInsiderRequestRow = {
  id: string
  userEmail: string
  founderKey: string
  requestType: string
  topic: string | null
  timezone: string | null
  message: string
  status: string
  createdAt: string
}

function founderLabel(key: string) {
  if (key === 'william') return 'William Namgyal'
  if (key === 'inigo') return 'Inigo Lenderking'
  return key
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'done', label: 'Done' },
  { value: 'declined', label: 'Declined' },
]

export function YcInsiderRequestsAdminList({ rows }: { rows: YcInsiderRequestRow[] }) {
  const router = useRouter()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/admin/yc-insider-requests/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Could not update status.')
        return
      }
      router.refresh()
    } catch {
      toast.error('Could not update status.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <ul className="space-y-4">
      {rows.map((r) => {
        const mailSubject = encodeURIComponent(
          `Re: Partner founder (${r.requestType === 'book' ? 'Book' : 'Ask'}): ${founderLabel(r.founderKey)}`
        )
        const mailHref = `mailto:${encodeURIComponent(r.userEmail)}?subject=${mailSubject}`
        const busy = updatingId === r.id

        return (
          <li key={r.id}>
            <Card>
              <CardHeader className="space-y-3 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-normal">
                    {founderLabel(r.founderKey)}
                  </Badge>
                  {r.requestType === 'book' ? (
                    <Badge className="gap-1 bg-violet-600 text-white hover:bg-violet-600">
                      <Calendar className="h-3 w-3" aria-hidden />
                      Book
                    </Badge>
                  ) : (
                    <Badge className="gap-1 bg-sky-600 text-white hover:bg-sky-600">
                      <MessageSquare className="h-3 w-3" aria-hidden />
                      Ask
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono" title="Request id">
                    {r.id.slice(0, 12)}…
                  </span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="text-base font-medium break-all">{r.userEmail}</CardTitle>
                    {r.topic ? (
                      <p className="text-sm font-medium text-foreground">{r.topic}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No topic (legacy submission)</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:w-56">
                    <span className="text-xs font-medium text-muted-foreground">Pipeline status</span>
                    <Select
                      value={r.status || 'new'}
                      disabled={busy}
                      onValueChange={(v) => handleStatusChange(r.id, v)}
                    >
                      <SelectTrigger aria-label="Request status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {r.requestType === 'book' && r.timezone ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Timezone: </span>
                    {r.timezone}
                  </p>
                ) : null}
                <div className="rounded-md border border-border/80 bg-muted/30 p-3">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.message}</p>
                </div>
                <div>
                  <a
                    href={mailHref}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex gap-2')}
                  >
                    <Mail className="h-4 w-4" aria-hidden />
                    Email submitter
                  </a>
                </div>
              </CardContent>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
