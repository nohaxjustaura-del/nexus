'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, CheckCircle, User, Building2, Compass, Sparkles,
  ArrowRight, ArrowLeft, Check,
} from 'lucide-react'
import { toast } from '@/components/ui/toast-simple'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const FUND_TYPES = ['Venture Capital', 'Angel', 'Micro-VC', 'CVC', 'Accelerator', 'Family Office'] as const
const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B'] as const
const SECTORS = ['AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'Climate Tech', 'Consumer', 'Enterprise', 'Crypto/Web3', 'EdTech', 'DeepTech', 'Biotech', 'Hardware'] as const
const GEO_OPTIONS = ['US', 'Europe', 'Asia', 'LATAM', 'Africa', 'MENA', 'Global'] as const
const VALUE_ADD_TAGS = ['Technical', 'Go-to-Market', 'Hiring', 'Fundraising', 'Strategy', 'Product', 'International', 'Regulatory', 'Domain Expertise'] as const
const ROLES = ['General Partner', 'Managing Partner', 'Partner', 'Principal', 'Associate', 'Angel Investor', 'Other'] as const
const LEAD_OPTIONS = ['lead', 'follow', 'either'] as const
const APPROACH_OPTIONS = ['Hands-on', 'Advisory', 'Board Seat', 'Hands-off'] as const
const COINVEST_OPTIONS = ['Solo', 'Co-invest preferred', 'Either'] as const
const FOUNDER_FOCUS_OPTIONS = [
  { key: 'women', label: 'Women founders' },
  { key: 'immigrant', label: 'Immigrant founders' },
  { key: 'veteran', label: 'Veteran founders' },
  { key: 'lgbtq', label: 'LGBTQ+ founders' },
  { key: 'underrepresented', label: 'Underrepresented founders' },
  { key: 'student', label: 'Student founders' },
] as const

const STEPS = [
  { label: 'About You', icon: User, description: 'Your background' },
  { label: 'Fund Details', icon: Building2, description: 'Your fund' },
  { label: 'Thesis', icon: Compass, description: 'Investment focus' },
  { label: 'Value-Add', icon: Sparkles, description: 'What you bring' },
] as const

type FormData = {
  name: string
  firmName: string
  role: string
  yearsInvesting: string
  linkedinUrl: string
  fundType: string
  fundSize: string
  checkMin: string
  checkMax: string
  stages: string[]
  sectors: string[]
  geoFocus: string[]
  thesis: string
  leadFollow: string
  decisionSpeed: string
  coInvestPreference: string
  investmentApproach: string
  valueAddTags: string[]
  founderFocus: string[]
  notableInvestments: string
  websiteUrl: string
  applicationUrl: string
  totalInvestments: string
  capitalDeployed: string
  bio: string
}

const INITIAL: FormData = {
  name: '', firmName: '', role: '', yearsInvesting: '', linkedinUrl: '',
  fundType: 'Venture Capital', fundSize: '', checkMin: '', checkMax: '',
  stages: [], sectors: [], geoFocus: [], thesis: '', leadFollow: 'either',
  decisionSpeed: '', coInvestPreference: 'Either', investmentApproach: 'Advisory',
  valueAddTags: [], founderFocus: [], notableInvestments: '', websiteUrl: '',
  applicationUrl: '', totalInvestments: '', capitalDeployed: '', bio: '',
}

function FieldGroup({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">
        {label}{required && <span className="ml-0.5 text-primary">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
    </div>
  )
}

function ChipToggle({ items, selected, onToggle, columns }: {
  items: readonly string[]; selected: string[]; onToggle: (v: string) => void; columns?: string
}) {
  return (
    <div className={cn('grid gap-2', columns || 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4')}>
      {items.map(item => {
        const active = selected.includes(item)
        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className={cn(
              'group relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-150',
              active
                ? 'border-primary/50 bg-primary/10 text-foreground shadow-sm shadow-primary/5'
                : 'border-border/60 bg-card text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground',
            )}
          >
            <span className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-150',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted-foreground/30 group-hover:border-muted-foreground/50',
            )}>
              {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </span>
            <span className="truncate">{item}</span>
          </button>
        )
      })}
    </div>
  )
}

function SingleSelect({ items, selected, onSelect }: {
  items: readonly string[]; selected: string; onSelect: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => {
        const active = selected === item
        return (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-all duration-150',
              active
                ? 'border-primary/50 bg-primary/10 text-foreground shadow-sm shadow-primary/5'
                : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            {item}
          </button>
        )
      })}
    </div>
  )
}

export default function InvestorOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormData>(INITIAL)

  useEffect(() => {
    let alive = true
    fetch('/api/investor/profile', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!alive) return
        if (data.exists && data.onboardingCompleted) {
          router.replace('/investor/dashboard')
          return
        }
        if (data.exists && data.profile) {
          const p = data.profile
          setForm(prev => ({
            ...prev,
            name: p.name || '',
            firmName: p.firmName || '',
            fundType: p.fundType || 'Venture Capital',
            fundSize: p.fundSize || '',
            checkMin: p.checkMin ? String(p.checkMin) : '',
            checkMax: p.checkMax ? String(p.checkMax) : '',
            stages: p.stages || [],
            sectors: p.sectors || [],
            geoFocus: p.geoFocus || [],
            thesis: p.thesis || '',
            leadFollow: p.leadFollow || 'either',
            decisionSpeed: p.decisionSpeed || '',
            valueAddTags: p.valueAddTags || [],
            linkedinUrl: p.linkedinUrl || '',
            websiteUrl: p.websiteUrl || '',
            applicationUrl: p.applicationUrl || '',
            bio: p.bio || '',
            investmentApproach: p.investmentApproach || 'Advisory',
            totalInvestments: p.totalInvestments != null ? String(p.totalInvestments) : '',
            capitalDeployed: p.capitalDeployed || '',
            yearsInvesting: p.yearsInvesting != null ? String(p.yearsInvesting) : '',
          }))
        }
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [router])

  const toggle = useCallback((key: keyof FormData, value: string) => {
    setForm(prev => {
      const arr = prev[key] as string[]
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }
    })
  }, [])

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const validateStep = (s: number): boolean => {
    if (s === 0 && !form.name.trim()) { toast.error('Please enter your name'); return false }
    if (s === 1 && !form.firmName.trim()) { toast.error('Please enter your firm name'); return false }
    if (s === 2 && form.sectors.length === 0) { toast.error('Select at least one sector'); return false }
    return true
  }

  const next = () => {
    if (!validateStep(step)) return
    setStep(s => Math.min(s + 1, 3))
  }
  const prev = () => setStep(s => Math.max(s - 1, 0))

  const handleSubmit = async () => {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) return

    setSaving(true)
    try {
      const res = await fetch('/api/investor/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          checkMin: Number(form.checkMin) || 0,
          checkMax: Number(form.checkMax) || 0,
          totalInvestments: form.totalInvestments ? Number(form.totalInvestments) : null,
          yearsInvesting: form.yearsInvesting ? Number(form.yearsInvesting) : null,
          notableInvestments: form.notableInvestments.split('\n').map(s => s.trim()).filter(Boolean),
          geoFocus: form.geoFocus,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to save')
      }
      toast.success('Profile saved! Redirecting to your dashboard...')
      await new Promise(r => setTimeout(r, 800))
      router.push('/investor/dashboard')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page-mesh">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
        {/* Header */}
        <header className="mb-10 text-center">
          <Badge variant="secondary" className="mb-3 px-3 py-1 text-xs font-medium">
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            Investor Setup
          </Badge>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Set up your investor profile
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Tell us about your fund and thesis so we can match you with the most relevant founders.
          </p>
        </header>

        {/* Step indicator */}
        <nav className="mb-10" aria-label="Onboarding progress">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const done = i < step
              const active = i === step
              return (
                <div key={s.label} className="flex flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => i < step && setStep(i)}
                    disabled={i > step}
                    className={cn(
                      'group flex flex-col items-center gap-1.5 transition-all',
                      i > step && 'pointer-events-none',
                    )}
                  >
                    <span className={cn(
                      'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200',
                      done && 'border-primary bg-primary text-primary-foreground',
                      active && 'border-primary bg-primary/10 text-primary shadow-md shadow-primary/10',
                      !done && !active && 'border-border/60 bg-card text-muted-foreground/60',
                    )}>
                      {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className={cn(
                      'hidden text-xs font-medium sm:block',
                      active ? 'text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/60',
                    )}>
                      {s.label}
                    </span>
                  </button>

                  {i < STEPS.length - 1 && (
                    <div className="mx-2 h-px flex-1 sm:mx-4">
                      <div className={cn(
                        'h-full rounded-full transition-colors duration-300',
                        i < step ? 'bg-primary' : 'bg-border/60',
                      )} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        {/* Card */}
        <div className="surface-panel p-6 md:p-8" style={{ animation: 'fadeInUp .35s ease-out' }}>
          {/* Step 0: About You */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">About You</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Tell us about yourself so founders know who they&apos;re connecting with.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FieldGroup label="Full name" required>
                  <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" />
                </FieldGroup>
                <FieldGroup label="Role">
                  <select value={form.role} onChange={e => set('role', e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <option value="">Select role...</option>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </FieldGroup>
                <FieldGroup label="Years investing">
                  <Input type="number" value={form.yearsInvesting} onChange={e => set('yearsInvesting', e.target.value)} placeholder="5" />
                </FieldGroup>
                <FieldGroup label="LinkedIn URL">
                  <Input type="url" value={form.linkedinUrl} onChange={e => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." />
                </FieldGroup>
              </div>

              <FieldGroup label="Short bio" hint="A brief intro about your background and investment philosophy.">
                <Textarea rows={3} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="I focus on early-stage B2B SaaS companies with strong technical teams..." className="resize-none" />
              </FieldGroup>
            </div>
          )}

          {/* Step 1: Fund Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Fund Details</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Help us understand your investment capacity and focus.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FieldGroup label="Firm / fund name" required>
                  <Input value={form.firmName} onChange={e => set('firmName', e.target.value)} placeholder="Acme Ventures" />
                </FieldGroup>
                <FieldGroup label="Fund type">
                  <select value={form.fundType} onChange={e => set('fundType', e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    {FUND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FieldGroup>
                <FieldGroup label="Fund size">
                  <Input value={form.fundSize} onChange={e => set('fundSize', e.target.value)} placeholder="$10M" />
                </FieldGroup>
                <FieldGroup label="Total investments made">
                  <Input type="number" value={form.totalInvestments} onChange={e => set('totalInvestments', e.target.value)} placeholder="25" />
                </FieldGroup>
              </div>

              <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Check size range</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup label="Minimum ($K)">
                    <Input type="number" value={form.checkMin} onChange={e => set('checkMin', e.target.value)} placeholder="50" />
                  </FieldGroup>
                  <FieldGroup label="Maximum ($K)">
                    <Input type="number" value={form.checkMax} onChange={e => set('checkMax', e.target.value)} placeholder="500" />
                  </FieldGroup>
                </div>
              </div>

              <FieldGroup label="Capital deployed" hint="Total capital deployed across all deals.">
                <Input value={form.capitalDeployed} onChange={e => set('capitalDeployed', e.target.value)} placeholder="$5M across 20 deals" />
              </FieldGroup>

              <FieldGroup label="Stages you invest in">
                <ChipToggle items={STAGES} selected={form.stages} onToggle={v => toggle('stages', v)} columns="grid-cols-2 sm:grid-cols-4" />
              </FieldGroup>
            </div>
          )}

          {/* Step 2: Investment Thesis */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Investment Thesis</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Define your investment focus so we can match you with the right founders.
                </p>
              </div>

              <FieldGroup label="Sectors" required hint="Select all sectors you actively invest in.">
                <ChipToggle items={SECTORS} selected={form.sectors} onToggle={v => toggle('sectors', v)} columns="grid-cols-2 sm:grid-cols-3" />
              </FieldGroup>

              <FieldGroup label="Geographic focus">
                <ChipToggle items={GEO_OPTIONS} selected={form.geoFocus} onToggle={v => toggle('geoFocus', v)} columns="grid-cols-3 sm:grid-cols-4" />
              </FieldGroup>

              <FieldGroup label="Investment thesis" hint="What you look for in investments, your core beliefs about markets, and what makes a great founding team.">
                <Textarea rows={4} value={form.thesis} onChange={e => set('thesis', e.target.value)} placeholder="We back technical founders building infrastructure for the next generation of AI applications..." className="resize-none" />
              </FieldGroup>

              <div className="grid gap-5 sm:grid-cols-3">
                <FieldGroup label="Lead / follow">
                  <SingleSelect items={LEAD_OPTIONS} selected={form.leadFollow} onSelect={v => set('leadFollow', v)} />
                </FieldGroup>
                <FieldGroup label="Decision speed">
                  <Input value={form.decisionSpeed} onChange={e => set('decisionSpeed', e.target.value)} placeholder="2-3 weeks" />
                </FieldGroup>
                <FieldGroup label="Co-invest">
                  <select value={form.coInvestPreference} onChange={e => set('coInvestPreference', e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    {COINVEST_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </FieldGroup>
              </div>

              <FieldGroup label="Founder focus" hint="Select if you actively support specific founder communities.">
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                  {FOUNDER_FOCUS_OPTIONS.map(({ key, label }) => {
                    const active = form.founderFocus.includes(key)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggle('founderFocus', key)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-150',
                          active
                            ? 'border-primary/50 bg-primary/10 text-foreground'
                            : 'border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground',
                        )}
                      >
                        <span className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all',
                          active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30',
                        )}>
                          {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                        </span>
                        <span className="truncate">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </FieldGroup>
            </div>
          )}

          {/* Step 3: Value-Add */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">What You Bring</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Tell founders what value you add beyond capital.
                </p>
              </div>

              <FieldGroup label="Investment approach">
                <SingleSelect items={APPROACH_OPTIONS} selected={form.investmentApproach} onSelect={v => set('investmentApproach', v)} />
              </FieldGroup>

              <FieldGroup label="Value-add capabilities" hint="What expertise do you bring to portfolio companies?">
                <ChipToggle items={VALUE_ADD_TAGS} selected={form.valueAddTags} onToggle={v => toggle('valueAddTags', v)} columns="grid-cols-2 sm:grid-cols-3" />
              </FieldGroup>

              <FieldGroup label="Notable investments" hint="One investment per line.">
                <Textarea rows={3} value={form.notableInvestments} onChange={e => set('notableInvestments', e.target.value)} placeholder={"Stripe (Seed, 2011)\nFigma (Series A, 2015)"} className="resize-none" />
              </FieldGroup>

              <div className="grid gap-5 sm:grid-cols-2">
                <FieldGroup label="Website">
                  <Input type="url" value={form.websiteUrl} onChange={e => set('websiteUrl', e.target.value)} placeholder="https://acmeventures.com" />
                </FieldGroup>
                <FieldGroup label="Application URL">
                  <Input type="url" value={form.applicationUrl} onChange={e => set('applicationUrl', e.target.value)} placeholder="https://acmeventures.com/apply" />
                </FieldGroup>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-6">
            {step > 0 ? (
              <Button variant="ghost" onClick={prev} className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button onClick={next} className="gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={saving} onClick={handleSubmit} className="min-w-[180px] gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-muted-foreground/60">
          <a className="underline underline-offset-4 hover:text-muted-foreground" href="/terms">Terms</a>
          <span className="mx-2">&middot;</span>
          <a className="underline underline-offset-4 hover:text-muted-foreground" href="/privacy">Privacy</a>
        </footer>
      </div>
    </div>
  )
}
