'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft, Save } from 'lucide-react'
import { Step1BasicInfo } from '@/components/onboarding/step-1-basic-info'
import { Step2StartupDetails } from '@/components/onboarding/step-2-startup-details'
import { Step3Preferences } from '@/components/onboarding/step-3-preferences'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isKnownUniversity } from '@/lib/universities'
import { toast } from '@/components/ui/toast-simple'

type Section = 'basic' | 'startup' | 'prefs'

type ProfileFormData = {
  name: string
  email: string
  age: string
  education: string
  gender: string
  phone: string
  altEmail: string
  marketingOptIn: boolean
  willingToDropOut: boolean
  startupName: string
  stage: string
  sectors: string[]
  businessModel: string
  location: string
  website: string
  linkedin: string
  ethicsTags: string[]
  personalityTags: string[]
  valueAddNeeds: string[]
  geoPreference: 'us-only' | 'remote-ok'
  decisionSpeedDays: string
  targetOwnershipMax: string
  fundTypePreference: 'accelerator' | 'institutional' | 'either'
  leadPreference: 'never' | 'sometimes' | 'usually'
  isImmigrant: boolean
  isUnderrepresented: boolean
  isStudent: boolean
  isVeteran: boolean
  needsImmigrationSupport: boolean
  universityAffiliation: string
}

const emptyForm = (email: string): ProfileFormData => ({
  name: '',
  email,
  age: '',
  education: '',
  gender: '',
  phone: '',
  altEmail: '',
  marketingOptIn: false,
  willingToDropOut: false,
  startupName: '',
  stage: '',
  sectors: [],
  businessModel: '',
  location: '',
  website: '',
  linkedin: '',
  ethicsTags: [],
  personalityTags: [],
  valueAddNeeds: [],
  geoPreference: 'us-only',
  decisionSpeedDays: '',
  targetOwnershipMax: '',
  fundTypePreference: 'either',
  leadPreference: 'sometimes',
  isImmigrant: false,
  isUnderrepresented: false,
  isStudent: false,
  isVeteran: false,
  needsImmigrationSupport: false,
  universityAffiliation: '',
})

export function FounderProfileEditor({ sessionEmail }: { sessionEmail: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<Section>('basic')
  const [formData, setFormData] = useState<ProfileFormData>(() => emptyForm(sessionEmail))
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    age?: string
    education?: string
    phone?: string
    stage?: string
    sectors?: string
    location?: string
  }>({})

  const noopSetStep = useCallback(() => {}, [])

  const toggleArrayItem = useCallback((key: keyof ProfileFormData, value: string) => {
    setFormData((prev) => {
      const current = (prev as any)[key] as string[]
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      }
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/founder/profile', { credentials: 'include' })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!data.exists || !data.profile) {
          router.replace('/founder/onboarding')
          return
        }
        const p = data.profile
        setFormData({
          name: p.name || '',
          email: sessionEmail,
          age: p.age != null ? String(p.age) : '',
          education: p.education || '',
          gender: p.gender || '',
          phone: p.phone || '',
          altEmail: p.altEmail || '',
          marketingOptIn: Boolean(p.marketingOptIn),
          willingToDropOut: Boolean(p.willingToDropOut),
          startupName: p.startupName || '',
          stage: p.stage || '',
          sectors: Array.isArray(p.sectors) ? p.sectors : [],
          businessModel: p.businessModel || '',
          location: p.location || '',
          website: p.website || '',
          linkedin: p.linkedin || '',
          ethicsTags: Array.isArray(p.ethicsTags) ? p.ethicsTags : [],
          personalityTags: Array.isArray(p.personalityTags) ? p.personalityTags : [],
          valueAddNeeds: Array.isArray(p.valueAddNeeds) ? p.valueAddNeeds : [],
          geoPreference: p.geoPreference || 'us-only',
          decisionSpeedDays: p.decisionSpeedDays || '',
          targetOwnershipMax: p.targetOwnershipMax || '',
          fundTypePreference: p.fundTypePreference || 'either',
          leadPreference: p.leadPreference || 'sometimes',
          isImmigrant: Boolean(p.isImmigrant),
          isUnderrepresented: Boolean(p.isUnderrepresented),
          isStudent: Boolean(p.isStudent),
          isVeteran: Boolean(p.isVeteran),
          needsImmigrationSupport: Boolean(p.needsImmigrationSupport),
          universityAffiliation: p.universityAffiliation || '',
        })
      } catch {
        toast.error('Could not load your profile.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [router, sessionEmail])

  const save = async () => {
    const next: typeof errors = {}
    if (!formData.name?.trim()) next.name = 'Please enter your full name.'
    if (!/.+@.+\..+/.test(formData.email || '')) next.email = 'Please enter a valid email.'
    const ageNum = Number(formData.age)
    if (!formData.age || Number.isNaN(ageNum) || ageNum < 16 || ageNum > 100) {
      next.age = 'Please enter a valid age (16–100).'
    }
    if (!formData.phone || formData.phone.replace(/\D/g, '').length < 7) {
      next.phone = 'Please enter a valid phone number.'
    }
    if (!formData.education || !isKnownUniversity(formData.education)) {
      next.education = 'Please enter a recognized university.'
    }
    if (!formData.stage) next.stage = 'Please choose a stage.'
    if (!formData.location) next.location = 'Please enter your location.'
    if (formData.sectors.length === 0 || formData.sectors.length > 3) {
      next.sectors = 'Select 1–3 sectors.'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) {
      if (next.name || next.email || next.age || next.education || next.phone) setSection('basic')
      else setSection('startup')
      toast.error('Fix the highlighted fields, then save again.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/founder/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: sessionEmail,
          age: formData.age,
          education: formData.education,
          gender: formData.gender,
          phone: formData.phone,
          altEmail: formData.altEmail,
          marketingOptIn: formData.marketingOptIn,
          willingToDropOut: formData.willingToDropOut || formData.isStudent,
          startupName: formData.startupName,
          stage: formData.stage,
          sectors: formData.sectors,
          businessModel: formData.businessModel,
          location: formData.location,
          website: formData.website,
          linkedin: formData.linkedin,
          ethicsTags: formData.ethicsTags,
          personalityTags: formData.personalityTags,
          valueAddNeeds: formData.valueAddNeeds,
          geoPreference: formData.geoPreference,
          decisionSpeedDays: formData.decisionSpeedDays,
          targetOwnershipMax: formData.targetOwnershipMax,
          fundTypePreference: formData.fundTypePreference,
          leadPreference: formData.leadPreference,
          isImmigrant: formData.isImmigrant,
          isUnderrepresented: formData.isUnderrepresented,
          isStudent: formData.isStudent,
          isVeteran: formData.isVeteran,
          needsImmigrationSupport: formData.needsImmigrationSupport,
          universityAffiliation: formData.universityAffiliation,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Save failed')
      }
      toast.success('Profile updated.')
    } catch (e: any) {
      toast.error(e?.message || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-3" />
          Loading profile…
        </div>
      </div>
    )
  }

  const sectionTabs: { id: Section; label: string }[] = [
    { id: 'basic', label: 'About you' },
    { id: 'startup', label: 'Startup' },
    { id: 'prefs', label: 'Matching' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/account"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'w-fit gap-2 text-muted-foreground no-underline'
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to account
        </Link>
        <div className="flex flex-wrap gap-2">
          {sectionTabs.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={section === t.id ? 'default' : 'outline'}
              className="rounded-full"
              onClick={() => setSection(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {section === 'basic' && (
        <Step1BasicInfo
          formData={formData as any}
          setFormData={setFormData as any}
          errors={errors}
          setErrors={setErrors}
          setStep={noopSetStep}
          hideNavigation
          readOnlyEmail
        />
      )}

      {section === 'startup' && (
        <Step2StartupDetails
          formData={formData as any}
          setFormData={setFormData as any}
          errors={errors}
          setErrors={setErrors}
          setStep={noopSetStep}
          toggleArrayItem={toggleArrayItem as any}
          hideNavigation
        />
      )}

      {section === 'prefs' && (
        <Step3Preferences
          formData={formData as any}
          setFormData={setFormData as any}
          setStep={noopSetStep}
          toggleArrayItem={toggleArrayItem as any}
          hideNavigation
        />
      )}

      <div className="flex justify-end border-t border-border pt-6">
        <Button type="button" size="lg" className="gap-2 min-w-[200px]" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </div>
  )
}
