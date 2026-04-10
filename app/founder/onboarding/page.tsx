'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from "lucide-react"
import { isKnownUniversity } from "@/lib/universities"
import { Step1BasicInfo } from "@/components/onboarding/step-1-basic-info"
import { Step2StartupDetails } from "@/components/onboarding/step-2-startup-details"
import { Step3Preferences } from "@/components/onboarding/step-3-preferences"
import { CLIENT_STORAGE } from '@/lib/client-storage-keys'
import { toast } from '@/components/ui/toast-simple'

type OnboardingFormData = {
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
  /**
   * Persisted onboarding progress (saved into /api/onboarding/founder/draft).
   * We store this in the existing draft JSON to avoid extra DB migrations.
   */
  onboardingStep?: number
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
  [key: string]: any
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; age?: string; education?: string; phone?: string; stage?: string; location?: string; sectors?: string }>({})
  const [formData, setFormData] = useState<OnboardingFormData>({
    name: '',
    email: '',
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
    onboardingStep: 1,
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

  const normalizeOnboardingStep = (raw: unknown): number | null => {
    const n =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? parseInt(raw, 10)
          : NaN

    if (!Number.isFinite(n)) return null
    if (n === 4 || n === 5) return 3 // legacy steps after preferences
    if ([1, 2, 3].includes(n)) return n
    return null
  }

  // Load existing profile
  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      try {
        const response = await fetch('/api/founder/profile', { credentials: 'include' })
        if (cancelled) return
        
        if (response.ok) {
          const data = await response.json()
          if (data.exists && data.profile) {
            const p = data.profile
            setFormData(prev => ({
              ...prev,
              name: p.name || '',
              email: p.email || '',
              age: p.age != null ? String(p.age) : '',
              education: p.education || '',
              gender: p.gender || '',
              phone: p.phone || '',
              altEmail: p.altEmail || '',
              willingToDropOut: p.willingToDropOut || false,
              startupName: p.startupName || '',
              stage: p.stage || '',
              sectors: p.sectors || [],
              businessModel: p.businessModel || '',
              location: p.location || '',
              website: p.website || '',
              linkedin: p.linkedin || '',
              marketingOptIn: Boolean(p.marketingOptIn),
              ethicsTags: p.ethicsTags || [],
              personalityTags: p.personalityTags || [],
              valueAddNeeds: p.valueAddNeeds || [],
              geoPreference: p.geoPreference || 'us-only',
              decisionSpeedDays: p.decisionSpeedDays || '',
              targetOwnershipMax: p.targetOwnershipMax || '',
              fundTypePreference: p.fundTypePreference || 'either',
              leadPreference: p.leadPreference || 'sometimes',
              isImmigrant: Boolean(p.isImmigrant),
              isUnderrepresented: Boolean(p.isUnderrepresented),
              isStudent: Boolean(p.isStudent),
              isVeteran: Boolean(p.isVeteran),
            }))

            let resolvedStep: number | null = null
            try {
              const draftRes = await fetch('/api/onboarding/founder/draft', { credentials: 'include' })
              if (draftRes.ok) {
                const draftData = await draftRes.json()
                if (draftData?.exists && draftData?.draft && typeof draftData.draft === 'object') {
                  const draft = draftData.draft as Partial<OnboardingFormData> & { onboardingStep?: unknown }
                  resolvedStep = normalizeOnboardingStep(draft.onboardingStep)
                  setFormData(prev => ({ ...prev, ...(draftData.draft as Partial<OnboardingFormData>) }))
                }
              }
            } catch {}
            if (resolvedStep == null) {
              try {
                const draft =
                  localStorage.getItem(CLIENT_STORAGE.ONBOARDING_DRAFT) ||
                  localStorage.getItem(CLIENT_STORAGE.ONBOARDING_DRAFT_LEGACY)
                if (draft) {
                  const parsed = JSON.parse(draft) as Partial<OnboardingFormData> & { onboardingStep?: unknown }
                  resolvedStep = normalizeOnboardingStep(parsed.onboardingStep)
                  setFormData(prev => ({ ...prev, ...parsed }))
                }
              } catch {}
            }
            if (resolvedStep != null) setStep(resolvedStep)
          } else {
            try {
              const draftRes = await fetch('/api/onboarding/founder/draft', { credentials: 'include' })
              if (draftRes.ok) {
                const draftData = await draftRes.json()
                if (draftData?.exists && draftData?.draft && typeof draftData.draft === 'object') {
                  const draft = draftData.draft as Partial<OnboardingFormData> & { onboardingStep?: unknown }
                  const stepFromDraft = normalizeOnboardingStep(draft.onboardingStep)
                  if (stepFromDraft) setStep(stepFromDraft)

                  setFormData(prev => ({ ...prev, ...(draftData.draft as Partial<OnboardingFormData>) }))
                  return
                }
              }
            } catch {}
            try {
              const draft =
                localStorage.getItem(CLIENT_STORAGE.ONBOARDING_DRAFT) ||
                localStorage.getItem(CLIENT_STORAGE.ONBOARDING_DRAFT_LEGACY)
              if (draft) {
                const parsed = JSON.parse(draft)
                setFormData(prev => ({ ...prev, ...parsed }))
              }
            } catch {}
          }
        }
      } catch (error) {
        // Silent fail - allow user to continue
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    
    loadProfile()
    return () => { cancelled = true }
  }, [])

  // Autosave draft
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(CLIENT_STORAGE.ONBOARDING_DRAFT, JSON.stringify(formData)) } catch {}
      fetch('/api/onboarding/founder/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      }).catch(() => {})
    }, 400)
    return () => clearTimeout(t)
  }, [formData])

  // Persist the effective step into the existing onboarding draft JSON.
  useEffect(() => {
    setFormData(prev => {
      if (prev.onboardingStep === step) return prev
      return { ...prev, onboardingStep: step }
    })
  }, [step])

  const toggleArrayItem = useCallback((key: keyof OnboardingFormData, value: string) => {
    setFormData(prev => {
      const current = (prev as any)[key] as string[]
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      }
    })
  }, [])

  const ensureProfileSaved = useCallback(async () => {
      const preErrors: typeof errors = {}
      if (!formData.name?.trim()) preErrors.name = 'Please enter your full name.'
      if (!/.+@.+\..+/.test(formData.email || '')) preErrors.email = 'Please enter a valid email.'
      const ageNum = Number(formData.age)
      if (!formData.age || Number.isNaN(ageNum) || ageNum < 16 || ageNum > 100) preErrors.age = 'Please enter a valid age (16–100).'
      if (!formData.phone || (formData.phone.replace(/\D/g, '').length < 7)) preErrors.phone = 'Please enter a valid phone number.'
      if (!formData.education || !isKnownUniversity(formData.education)) preErrors.education = 'Please enter a recognized university.'
      if (!formData.stage) preErrors.stage = 'Please choose a stage.'
      if (!formData.location) preErrors.location = 'Please enter your location.'
      if (formData.sectors.length === 0 || formData.sectors.length > 3) preErrors.sectors = 'Select 1–3 sectors.'
      
      if (Object.keys(preErrors).length > 0) {
        setErrors(preErrors)
        const missingStep = preErrors.name || preErrors.email || preErrors.age || preErrors.education || preErrors.phone ? 1 : 2
        setStep(missingStep)
        setTimeout(() => {
          const focusOrder = missingStep === 1 ? ['name', 'email', 'age', 'education', 'phone'] : ['stage-select', 'location', 'sectors-select']
          for (const id of focusOrder) {
            const el = document.getElementById(id) as HTMLInputElement | null
            if (el) { el.focus(); break }
          }
        }, 0)
        throw new Error('Please complete required profile fields before continuing.')
      }

      const response = await fetch('/api/founder/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
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

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to save profile')
      }
  }, [formData, errors])

  const handleSubmit = async () => {
    setSaving(true)
    
    try {
      await ensureProfileSaved()

      localStorage.removeItem(CLIENT_STORAGE.ONBOARDING_DRAFT)
      localStorage.removeItem(CLIENT_STORAGE.ONBOARDING_DRAFT_LEGACY)
      fetch('/api/onboarding/founder/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      }).catch(() => {})
      setSaving(false)
      // Small delay to show success state before redirect
      await new Promise(resolve => setTimeout(resolve, 1500))
      // Redirect to discover after successful onboarding
      router.push('/founder/discover')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save profile. Please try again.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const displayStep = step

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 via-background to-primary/5">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Founder Onboarding</h1>
          <div className="flex items-center gap-4">
            <button
              className="text-sm underline underline-offset-4 hover:text-primary transition-colors"
              onClick={async () => {
                try { localStorage.setItem(CLIENT_STORAGE.ONBOARDING_DRAFT, JSON.stringify(formData)) } catch {}
                fetch('/api/onboarding/founder/draft', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify(formData),
                }).catch(() => {})
                router.push('/')
              }}
            >
              Save & Exit
            </button>
            <span className="text-sm text-muted-foreground font-medium">Step {displayStep} of 3</span>
          </div>
        </div>
        
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (s <= displayStep) setStep(s)
                }}
                className={`h-2 rounded-full transition-all ${
                  s <= displayStep ? 'bg-gradient-to-r from-primary to-blue-600 shadow-sm' : 'bg-slate-200'
                }`}
                aria-label={`Step ${s}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Basic Info</span>
            <span>Startup Details</span>
            <span>Preferences</span>
          </div>
        </div>

        {step === 1 && (
          <Step1BasicInfo
            formData={formData as any}
            setFormData={setFormData as any}
            errors={errors}
            setErrors={setErrors}
            setStep={setStep}
          />
        )}

        {step === 2 && (
          <Step2StartupDetails
            formData={formData as any}
            setFormData={setFormData as any}
            errors={errors}
            setErrors={setErrors}
            setStep={setStep}
            toggleArrayItem={toggleArrayItem as any}
          />
        )}

        {step === 3 && (
          <Step3Preferences
            formData={formData as any}
            setFormData={setFormData as any}
            setStep={setStep}
            toggleArrayItem={toggleArrayItem as any}
            onFinish={() => void handleSubmit()}
            saving={saving}
          />
        )}
      </div>
      <div className="mt-10 text-center text-xs text-muted-foreground">
        <a className="underline hover:text-foreground" href="/terms">Terms</a> ·{' '}
        <a className="underline hover:text-foreground" href="/privacy">Privacy</a> ·{' '}
        <a className="underline hover:text-foreground" href="/cookies">Cookies</a> ·{' '}
        <a className="underline hover:text-foreground" href="/security">Security</a> ·{' '}
        <a className="underline hover:text-foreground" href="/disclaimer">Disclaimer</a>
      </div>
    </div>
  )
}
