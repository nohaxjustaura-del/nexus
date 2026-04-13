'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { Step1BasicInfo } from '@/components/onboarding/step-1-basic-info'
import { Step2StartupDetails } from '@/components/onboarding/step-2-startup-details'
import { countryHasSubdivisionList } from '@/lib/geo/subdivisions'
import { Step3Preferences } from '@/components/onboarding/step-3-preferences'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isKnownUniversity } from '@/lib/universities'
import { toast } from '@/components/ui/toast-simple'

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
  countryCode: string
  regionCode: string
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
  resumeUrl?: string
  resumeFileName?: string
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
  countryCode: '',
  regionCode: '',
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
  resumeUrl: '',
  resumeFileName: '',
})

export type FounderProfileEditorAccount = {
  email: string
  emailVerified: boolean
  userType: string | null
}

function roleSelectValue(userType: string | null | undefined): 'founder' | 'mentor' | 'vc' {
  const t = (userType || 'founder').toLowerCase()
  if (t === 'mentor') return 'mentor'
  if (t === 'vc' || t === 'investor') return 'vc'
  return 'founder'
}

export function FounderProfileEditor({
  sessionEmail,
  account,
}: {
  sessionEmail: string
  account: FounderProfileEditorAccount
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
    countryCode?: string
    regionCode?: string
  }>({})

  const [portalRole, setPortalRole] = useState<'founder' | 'mentor' | 'vc'>(() =>
    roleSelectValue(account.userType),
  )
  const [roleSaving, setRoleSaving] = useState(false)

  useEffect(() => {
    setPortalRole(roleSelectValue(account.userType))
  }, [account.userType])

  const noopSetStep = useCallback(() => {}, [])

  const toggleArrayItem = useCallback((key: keyof ProfileFormData, value: string) => {
    setFormData((prev) => {
      const current = (prev as Record<string, unknown>)[key] as string[]
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
          countryCode: (p.countryCode as string) || '',
          regionCode: (p.regionCode as string) || '',
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
          resumeUrl: p.resumeUrl || '',
          resumeFileName: p.resumeUrl
            ? (() => {
                const tail = String(p.resumeUrl).split('/').pop() || ''
                return tail.replace(/^\d+_/, '') || 'resume.pdf'
              })()
            : '',
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

  const saveProfile = async () => {
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
          countryCode: formData.countryCode,
          regionCode: formData.regionCode,
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
          resumeUrl: formData.resumeUrl?.trim() || '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Save failed')
      }
      toast.success('Profile updated.')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not save profile.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const savePortalRole = async () => {
    const initial = roleSelectValue(account.userType)
    if (portalRole === initial) {
      toast.error('Choose a different account type to update.')
      return
    }

    setRoleSaving(true)
    try {
      const res = await fetch('/api/account/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userType: portalRole === 'vc' ? 'vc' : portalRole,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Update failed')
      }
      toast.success('Account type updated.')
      router.refresh()
      if (portalRole === 'vc') {
        router.replace('/vc/profile')
        return
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not update account type.'
      toast.error(message)
    } finally {
      setRoleSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-3" />
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Account</CardTitle>
          <CardDescription>Sign-in email and how you use the product</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          <div className="grid gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</span>
            <p className="text-base font-medium text-foreground">{account.email}</p>
          </div>
          <div className="grid gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email status</span>
            <p className="text-base font-medium">
              {account.emailVerified ? (
                <span className="text-emerald-600 dark:text-emerald-400">Verified</span>
              ) : (
                <span className="text-destructive">Not verified</span>
              )}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="portal-role">Account type</Label>
            <Select
              value={portalRole}
              onValueChange={(v) => setPortalRole(v as 'founder' | 'mentor' | 'vc')}
            >
              <SelectTrigger id="portal-role" className="max-w-md">
                <SelectValue placeholder="Choose account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="founder">Startup founder</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="vc">Investor</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Investors use the investor workspace. Founders and mentors use founder tools and matching.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={roleSaving}
              onClick={savePortalRole}
            >
              {roleSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Update account type
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Step1BasicInfo
          formData={formData as never}
          setFormData={setFormData as never}
          errors={errors}
          setErrors={setErrors}
          setStep={noopSetStep}
          hideNavigation
          readOnlyEmail
          sectionTitle="Personal information"
          sectionDescription="Name, contact, and background stored on your founder record."
        />

        <Step2StartupDetails
          formData={formData as never}
          setFormData={setFormData as never}
          errors={errors}
          setErrors={setErrors}
          setStep={noopSetStep}
          toggleArrayItem={toggleArrayItem as never}
          hideNavigation
          sectionTitle="Company"
          sectionDescription="Stage, sector, and links we use for discovery and matching."
        />

        <Step3Preferences
          formData={formData as never}
          setFormData={setFormData as never}
          setStep={noopSetStep}
          toggleArrayItem={toggleArrayItem as never}
          hideNavigation
          sectionTitle="Investor matching"
          sectionDescription="Preferences for how we rank and explain investor fit."
        />
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Save when you are done editing your profile details.</p>
          <Button type="button" className="gap-2 shrink-0 sm:min-w-[180px]" disabled={saving} onClick={saveProfile}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
