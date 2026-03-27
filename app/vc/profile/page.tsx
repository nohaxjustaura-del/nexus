'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast-simple'
import type { ExtractedVcProfile } from '@/lib/vc-profile-extraction'
import { CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const DRAFT_KEY = 'vc_listing_draft_v1'

const SECTORS = [
  'AI/ML',
  'SaaS',
  'Fintech',
  'Healthcare',
  'Climate Tech',
  'Consumer',
  'Enterprise',
  'Crypto/Web3',
  'EdTech',
  'DeepTech',
  'Biotech',
  'Hardware',
]

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B']

type FormState = {
  name: string
  firmName: string
  thesis: string
  bio: string
  checkMin: string
  checkMax: string
  fundSize: string
  stages: string[]
  sectors: string[]
  geoFocus: string
  leadFollow: string
  applicationUrl: string
  linkedinUrl: string
  websiteUrl: string
  decisionSpeed: string
  notableInvestments: string
  valueAddTags: string[]
}

const emptyForm: FormState = {
  name: '',
  firmName: '',
  thesis: '',
  bio: '',
  checkMin: '',
  checkMax: '',
  fundSize: '',
  stages: [],
  sectors: [],
  geoFocus: '',
  leadFollow: 'either',
  applicationUrl: '',
  linkedinUrl: '',
  websiteUrl: '',
  decisionSpeed: '',
  notableInvestments: '',
  valueAddTags: [],
}

function draftToForm(d: ExtractedVcProfile): Partial<FormState> {
  return {
    firmName: d.firmName || '',
    thesis: d.thesis || '',
    bio: d.founderNotes || '',
    checkMin: d.checkMin != null ? String(d.checkMin) : '',
    checkMax: d.checkMax != null ? String(d.checkMax) : '',
    fundSize: d.fundSize || '',
    stages: d.stages || [],
    sectors: d.sectors || [],
    geoFocus: d.geoFocus?.length ? d.geoFocus.join(', ') : '',
    leadFollow: d.leadFollow || 'either',
    applicationUrl: d.applicationUrl || '',
    linkedinUrl: d.linkedinUrl || '',
    websiteUrl: d.websiteUrl || '',
    decisionSpeed: d.decisionSpeed || '',
    valueAddTags: d.valueAddTags || [],
  }
}

export default function VCProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exists, setExists] = useState(false)
  const [verified, setVerified] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [draftApplied, setDraftApplied] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/vc/profile', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!data.exists) {
          setExists(false)
          setLoading(false)
          return
        }
        setExists(true)
        setVerified(Boolean(data.verified))
        const p = data.profile
        setForm({
          name: p.name || '',
          firmName: p.firmName || '',
          thesis: p.thesis || '',
          bio: typeof p.bio === 'string' ? p.bio : '',
          checkMin: p.checkMin != null ? String(p.checkMin) : '',
          checkMax: p.checkMax != null ? String(p.checkMax) : '',
          fundSize: p.fundSize || '',
          stages: Array.isArray(p.stages) ? p.stages : [],
          sectors: Array.isArray(p.sectors) ? p.sectors : [],
          geoFocus: Array.isArray(p.geoFocus) ? p.geoFocus.join(', ') : '',
          leadFollow: p.leadFollow || 'either',
          applicationUrl: p.applicationUrl || '',
          linkedinUrl: p.linkedinUrl || '',
          websiteUrl: p.websiteUrl || '',
          decisionSpeed: p.decisionSpeed || '',
          notableInvestments: Array.isArray(p.notableInvestments) ? p.notableInvestments.join('\n') : '',
          valueAddTags: Array.isArray(p.valueAddTags) ? p.valueAddTags : [],
        })
      } catch {
        if (!cancelled) toast.error('Could not load profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (loading || !exists || draftApplied) return
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as ExtractedVcProfile
      sessionStorage.removeItem(DRAFT_KEY)
      setForm((prev) => ({ ...prev, ...draftToForm(d) }))
      setDraftApplied(true)
      toast.success('Applied extraction to this form. Review and save.')
    } catch {
      /* ignore */
    }
  }, [loading, exists, draftApplied])

  const toggle = (key: 'stages' | 'sectors' | 'valueAddTags', value: string) => {
    setForm((prev) => {
      const cur = prev[key]
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]
      return { ...prev, [key]: next }
    })
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/vc/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          geoFocus: form.geoFocus
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          notableInvestments: form.notableInvestments
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success('Listing updated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!exists) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-semibold text-foreground">No investor listing yet</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Claim your firm once so we can verify you. After approval, you&apos;ll manage thesis and checks here.
        </p>
        <Link
          href="/vc/claim"
          className={cn(buttonVariants({ variant: 'default' }), 'mt-8 inline-flex')}
        >
          Claim firm profile
        </Link>
      </div>
    )
  }

  const readOnly = !verified

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />
      <div className="page-shell-narrow">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Investors</p>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Your listing
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            What founders see in discovery: thesis, check size, stages, and how to apply. Use{' '}
            <Link href="/vc/extract" className="text-primary underline-offset-4 hover:underline">
              Extract
            </Link>{' '}
            if you already have copy elsewhere.
          </p>
        </header>

        {readOnly && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
            Your profile is pending verification. You can review what we have; editing unlocks after approval.
          </div>
        )}

        <div className="space-y-8 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-foreground">Your name</Label>
            <Input
              value={form.name}
              disabled={readOnly}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border-border bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Firm name</Label>
            <Input
              value={form.firmName}
              disabled={readOnly}
              onChange={(e) => setForm((f) => ({ ...f, firmName: e.target.value }))}
              className="border-border bg-background"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Investment thesis</Label>
          <Textarea
            rows={5}
            disabled={readOnly}
            value={form.thesis}
            onChange={(e) => setForm((f) => ({ ...f, thesis: e.target.value }))}
            className="border-border bg-background text-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">What founders should know before applying</Label>
          <Textarea
            rows={4}
            disabled={readOnly}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Process, materials to include, typical response time, sectors you avoid…"
            className="border-border bg-background text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-foreground">Min check ($K)</Label>
            <Input
              type="number"
              disabled={readOnly}
              value={form.checkMin}
              onChange={(e) => setForm((f) => ({ ...f, checkMin: e.target.value }))}
              className="border-border bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Max check ($K)</Label>
            <Input
              type="number"
              disabled={readOnly}
              value={form.checkMax}
              onChange={(e) => setForm((f) => ({ ...f, checkMax: e.target.value }))}
              className="border-border bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Fund size</Label>
            <Input
              disabled={readOnly}
              value={form.fundSize}
              onChange={(e) => setForm((f) => ({ ...f, fundSize: e.target.value }))}
              placeholder="$50M"
              className="border-border bg-background"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Stages</Label>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <Badge
                key={s}
                variant={form.stages.includes(s) ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer',
                  readOnly && 'pointer-events-none opacity-60',
                  form.stages.includes(s) ? 'border-primary bg-primary' : 'border-border/60 text-muted-foreground'
                )}
                onClick={() => !readOnly && toggle('stages', s)}
              >
                {form.stages.includes(s) && <CheckCircle className="mr-1 h-3 w-3" />}
                {s}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Sectors</Label>
          <div className="flex flex-wrap gap-2">
            {SECTORS.map((s) => (
              <Badge
                key={s}
                variant={form.sectors.includes(s) ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer',
                  readOnly && 'pointer-events-none opacity-60',
                  form.sectors.includes(s) ? 'border-primary bg-primary' : 'border-border/60 text-muted-foreground'
                )}
                onClick={() => !readOnly && toggle('sectors', s)}
              >
                {form.sectors.includes(s) && <CheckCircle className="mr-1 h-3 w-3" />}
                {s}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Geography</Label>
          <Input
            disabled={readOnly}
            value={form.geoFocus}
            onChange={(e) => setForm((f) => ({ ...f, geoFocus: e.target.value }))}
            placeholder="US, Europe, Global…"
            className="border-border bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Lead / follow</Label>
          <div className="flex flex-wrap gap-2">
            {(['lead', 'follow', 'either'] as const).map((t) => (
              <Badge
                key={t}
                variant={form.leadFollow === t ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer capitalize',
                  readOnly && 'pointer-events-none opacity-60',
                  form.leadFollow === t ? 'border-primary bg-primary' : 'border-border/60 text-muted-foreground'
                )}
                onClick={() => !readOnly && setForm((f) => ({ ...f, leadFollow: t }))}
              >
                {t}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Application URL</Label>
          <Input
            type="url"
            disabled={readOnly}
            value={form.applicationUrl}
            onChange={(e) => setForm((f) => ({ ...f, applicationUrl: e.target.value }))}
            className="border-border bg-background"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-foreground">Website</Label>
            <Input
              type="url"
              disabled={readOnly}
              value={form.websiteUrl}
              onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              className="border-border bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">LinkedIn</Label>
            <Input
              type="url"
              disabled={readOnly}
              value={form.linkedinUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
              className="border-border bg-background"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Decision timeline</Label>
          <Input
            disabled={readOnly}
            value={form.decisionSpeed}
            onChange={(e) => setForm((f) => ({ ...f, decisionSpeed: e.target.value }))}
            placeholder="e.g. 2–3 weeks"
            className="border-border bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Notable investments (one per line)</Label>
          <Textarea
            rows={3}
            disabled={readOnly}
            value={form.notableInvestments}
            onChange={(e) => setForm((f) => ({ ...f, notableInvestments: e.target.value }))}
            className="border-border bg-background text-foreground"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {!readOnly && (
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save listing'}
            </Button>
          )}
          <Link
            href="/vc/dashboard"
            className={cn(buttonVariants({ variant: 'outline', size: 'default' }))}
          >
            View matched founders
          </Link>
          <Link
            href="/vc/extract"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'default' }),
              'text-muted-foreground hover:text-foreground'
            )}
          >
            Run extraction
          </Link>
        </div>
      </div>
      </div>
    </div>
  )
}
