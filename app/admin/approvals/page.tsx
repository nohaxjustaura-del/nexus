'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toast-simple'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AddEmailForm } from '@/components/admin/add-email-form'

type Approval = {
  id: string
  userId?: string | null
  email: string
  status: 'pending' | 'approved' | 'rejected'
  adminNotes?: string | null
  createdAt?: string
  updatedAt?: string
}

export default function AdminApprovalsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Basic admin gate (client-side): let server still enforce permissions
        const auth = await fetch('/api/auth/check', { credentials: 'include', headers: { 'Cache-Control': 'no-store' } }).then(r => r.json()).catch(() => ({}))
        const userEmail = auth?.userEmail || auth?.user?.email || auth?.email
        if (!userEmail || !auth?.isAdmin) {
          router.replace('/')
          return
        }
        const res = await fetch('/api/admin/users/approvals', { credentials: 'include' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to load approvals')
        if (!cancelled) {
          setApprovals(Array.isArray(data) ? data : (data?.approvals || []))
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load approvals')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [router])

  const approve = async (email: string) => {
    setSubmitting(email)
    try {
      const res = await fetch(`/api/admin/users/approve/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Approve failed')
      setApprovals(prev => prev.map(a => a.email === email ? { ...a, status: 'approved' } : a))
    } catch (e: any) {
      toast.error(e?.message || 'Approve failed')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
              Signup approvals
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Approve new accounts. Everything pending also appears on Overview.</p>
          </div>
          <Link
            className="text-sm font-medium text-primary hover:underline hover:underline-offset-4"
            href="/admin/founders"
          >
            Review founder IDs →
          </Link>
        </div>

        {loading && (
          <div className="text-sm text-muted-foreground">Loading approvals…</div>
        )}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && approvals.length === 0 && (
          <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            No signup approvals found.
          </div>
        )}

        <div className="space-y-3">
          {approvals.map(app => (
            <div key={app.id} className="flex items-center justify-between rounded-md border p-4">
              <div className="space-y-1">
                <div className="font-medium">{app.email}</div>
                <div className="text-xs text-muted-foreground">
                  Status: {app.status} {app.createdAt ? `• requested ${new Date(app.createdAt).toLocaleString()}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                  onClick={() => approve(app.email)}
                  disabled={submitting === app.email || app.status === 'approved'}
                >
                  {submitting === app.email ? 'Approving…' : (app.status === 'approved' ? 'Approved' : 'Approve')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <Card className="mt-10 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add email manually</CardTitle>
            <CardDescription>Put someone on the pending list without them signing up first.</CardDescription>
          </CardHeader>
          <CardContent>
            <AddEmailForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


