'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast-simple'

type ProfileState = {
  name: string
  firmName: string
  thesis: string
  bio: string
  checkMin: string
  checkMax: string
  geoFocus: string
  decisionSpeed: string
  applicationUrl: string
  linkedinUrl: string
  websiteUrl: string
  stages: string[]
  sectors: string[]
  valueAddTags: string[]
  ethicsTags: string[]
  founderFocus: string[]
  notableInvestments: string[]
}

const INITIAL: ProfileState = {
  name: '',
  firmName: '',
  thesis: '',
  bio: '',
  checkMin: '',
  checkMax: '',
  geoFocus: '',
  decisionSpeed: '',
  applicationUrl: '',
  linkedinUrl: '',
  websiteUrl: '',
  stages: [],
  sectors: [],
  valueAddTags: [],
  ethicsTags: [],
  founderFocus: [],
  notableInvestments: [],
}

export default function InvestorProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ProfileState>(INITIAL)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/investor/profile', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!alive) return
        if (!data.exists || !data.profile) {
          setLoading(false)
          return
        }
        const p = data.profile
        setForm({
          name: p.name || '',
          firmName: p.firmName || '',
          thesis: p.thesis || '',
          bio: p.bio || '',
          checkMin: p.checkMin != null ? String(p.checkMin) : '',
          checkMax: p.checkMax != null ? String(p.checkMax) : '',
          geoFocus: Array.isArray(p.geoFocus) ? p.geoFocus.join(', ') : '',
          decisionSpeed: p.decisionSpeed || '',
          applicationUrl: p.applicationUrl || '',
          linkedinUrl: p.linkedinUrl || '',
          websiteUrl: p.websiteUrl || '',
          stages: Array.isArray(p.stages) ? p.stages : [],
          sectors: Array.isArray(p.sectors) ? p.sectors : [],
          valueAddTags: Array.isArray(p.valueAddTags) ? p.valueAddTags : [],
          ethicsTags: Array.isArray(p.ethicsTags) ? p.ethicsTags : [],
          founderFocus: Array.isArray(p.founderFocus) ? p.founderFocus : [],
          notableInvestments: Array.isArray(p.notableInvestments) ? p.notableInvestments : [],
        })
      } catch {
        if (alive) toast.error('Could not load investor profile')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  async function saveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/investor/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          stages: form.stages,
          sectors: form.sectors,
          geoFocus: form.geoFocus.split(',').map((s) => s.trim()).filter(Boolean),
          valueAddTags: form.valueAddTags,
          ethicsTags: form.ethicsTags,
          founderFocus: form.founderFocus,
          notableInvestments: form.notableInvestments,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Save failed')
      toast.success('Investor profile saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="page-shell-narrow py-12 text-sm text-muted-foreground">Loading profile...</div>
  }

  return (
    <div className="page-shell-narrow py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Investor profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep your mandate accurate so AI founder recommendations stay relevant.
        </p>
      </header>

      <div className="space-y-5 rounded-xl border border-border/60 bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Firm name</Label>
            <Input value={form.firmName} onChange={(e) => setForm((f) => ({ ...f, firmName: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Investment thesis</Label>
          <Textarea rows={4} value={form.thesis} onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Min check ($K)</Label>
            <Input type="number" value={form.checkMin} onChange={(e) => setForm((f) => ({ ...f, checkMin: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Max check ($K)</Label>
            <Input type="number" value={form.checkMax} onChange={(e) => setForm((f) => ({ ...f, checkMax: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Geographic focus (comma-separated)</Label>
          <Input value={form.geoFocus} onChange={(e) => setForm((f) => ({ ...f, geoFocus: e.target.value }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Application URL</Label>
            <Input type="url" value={form.applicationUrl} onChange={(e) => setForm((f) => ({ ...f, applicationUrl: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Decision timeline</Label>
            <Input value={form.decisionSpeed} onChange={(e) => setForm((f) => ({ ...f, decisionSpeed: e.target.value }))} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>LinkedIn</Label>
            <Input type="url" value={form.linkedinUrl} onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input type="url" value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Founder-facing note</Label>
          <Textarea rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
        </div>
        <div className="flex gap-3">
          <Button onClick={() => void saveProfile()} disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</Button>
          <Button asChild variant="outline">
            <Link href="/investor/discover">Back to Discover</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
