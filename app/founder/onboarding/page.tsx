'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Heart, Rocket, ArrowRight, ArrowLeft, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { isKnownUniversity, SUGGESTED_UNIVERSITIES } from "@/lib/universities"
import { track } from "@/lib/analytics"

const SECTORS = [
  'AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'Climate Tech', 'Consumer',
  'Enterprise', 'Crypto/Web3', 'EdTech', 'DeepTech', 'Biotech', 'Hardware',
  'Marketplace', 'Developer Tools', 'Security', 'Infrastructure'
]

const STAGES = ['Idea', 'MVP', 'Revenue', 'Pre-Seed', 'Seed', 'Series A']

const ETHICS_TAGS = [
  'Open Source', 'Diversity', 'Privacy-first', 'Climate Impact',
  'Financial Inclusion', 'Education Access', 'Healthcare Access'
]

const VALUE_ADD_NEEDS = [
  'Hiring Support', 'Go-to-Market Strategy', 'Product Feedback',
  'Industry Connections', 'Technical Mentorship', 'Customer Intros',
  'PR/Marketing', 'Sales Strategy', 'International Expansion'
]

const PERSONALITY_TAGS = ['hands-on', 'hands-off', 'mentor', 'strategic', 'technical']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [idUploading, setIdUploading] = useState(false)
  const [idUploaded, setIdUploaded] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; age?: string; education?: string; phone?: string; stage?: string; location?: string; sectors?: string }>({})
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    education: '',
    gender: '' as string,
    phone: '',
    altEmail: '',
    marketingOptIn: false,
    willingToDropOut: false,
    startupName: '',
    stage: '',
    sectors: [] as string[],
    businessModel: '',
    location: '',
    website: '',
    linkedin: '',
    fundingNeed: '',
    ethicsTags: [] as string[],
    personalityTags: [] as string[],
    valueAddNeeds: [] as string[],
    // New preference fields to replace advanced filters
    geoPreference: 'us-only' as 'us-only' | 'remote-ok',
    decisionSpeedDays: '' as string, // free-form days, e.g., "10" or "21"
    targetOwnershipMax: '' as string, // free-form percent, e.g., "12" or "18.5"
    fundTypePreference: 'either' as 'accelerator' | 'institutional' | 'either',
    leadPreference: 'sometimes' as 'never' | 'sometimes' | 'usually',
    // Enhanced diversity and background questions
    isImmigrant: false,
    isUnderrepresented: false,
    isStudent: false,
    isVeteran: false,
    ethnicity: '' as string,
    needsImmigrationSupport: false,
    universityAffiliation: '' as string, // For university-specific funds
  })

  // Load existing profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch('/api/founder/profile', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.exists && data.profile) {
            // Pre-fill form with existing data
            setFormData(prev => ({
              ...prev,
              name: data.profile.name || '',
              email: data.profile.email || '',
              age: data.profile.age?.toString() || '',
              education: data.profile.education || '',
              gender: data.profile.gender || '',
              willingToDropOut: data.profile.willingToDropOut || false,
              startupName: data.profile.startupName || '',
              stage: data.profile.stage || '',
              sectors: data.profile.sectors || [],
              businessModel: data.profile.businessModel || '',
              location: data.profile.location || '',
              marketingOptIn: Boolean(data.profile.marketingOptIn),
              ethicsTags: data.profile.ethicsTags || [],
              personalityTags: data.profile.personalityTags || [],
              valueAddNeeds: data.profile.valueAddNeeds || [],
            }))
            
            // If profile is complete, redirect to discover
            if (data.profile.name && data.profile.stage && data.profile.location) {
              router.push('/founder/discover')
              return
            }
          } else {
            // Load draft if present
            try {
              const draft = localStorage.getItem('fm_onboarding_draft')
              if (draft) {
                const parsed = JSON.parse(draft)
                setFormData(prev => ({ ...prev, ...parsed }))
              }
            } catch {}
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [router])

  // Autosave draft (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem('fm_onboarding_draft', JSON.stringify(formData)) } catch {}
    }, 400)
    return () => clearTimeout(t)
  }, [formData])

  // Skip the old Step 4 screen entirely and jump straight to verification (Step 5)
  useEffect(() => {
    if (step === 4) {
      setStep(5)
    }
  }, [step])

  const toggleArrayItem = (key: keyof typeof formData, value: string) => {
    setFormData(prev => {
      const current = prev[key] as string[]
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(v => v !== value) }
      } else {
        return { ...prev, [key]: [...current, value] }
      }
    })
  }

  const handleSubmit = async () => {
    setSaving(true)
    
    try {
      // Double-check required fields across steps before sending to server
      const preErrors: { name?: string; email?: string; age?: string; education?: string; phone?: string; stage?: string; location?: string; sectors?: string } = {}
      if (!formData.name?.trim()) preErrors.name = 'Please enter your full name.'
      const emailOk = /.+@.+\..+/.test(formData.email || '')
      if (!emailOk) preErrors.email = 'Please enter a valid email.'
      const ageNumSubmit = Number(formData.age)
      if (!formData.age || Number.isNaN(ageNumSubmit) || ageNumSubmit < 16 || ageNumSubmit > 100) preErrors.age = 'Please enter a valid age (16–100).'
      const digitsSubmit = (formData.phone || '').replace(/\D/g, '')
      if (!formData.phone || digitsSubmit.length < 7) preErrors.phone = 'Please enter a valid phone number.'
      if (!formData.education || !isKnownUniversity(formData.education)) preErrors.education = 'Please enter a recognized university.'
      if (!formData.stage) preErrors.stage = 'Please choose a stage.'
      if (!formData.location) preErrors.location = 'Please enter your location.'
      if (formData.sectors.length === 0 || formData.sectors.length > 3) preErrors.sectors = 'Select 1–3 sectors.'
      if (Object.keys(preErrors).length > 0) {
        setErrors(preErrors)
        // Redirect user to the first missing step and focus the first missing field
        const missingStep = preErrors.name || preErrors.email || preErrors.age || preErrors.education || preErrors.phone ? 1 : 2
        setStep(missingStep)
        setTimeout(() => {
          const focusOrder = missingStep === 1
            ? ['name', 'email', 'age', 'education', 'phone']
            : ['stage-select', 'location', 'sectors-select']
          for (const id of focusOrder) {
            const el = document.getElementById(id) as HTMLInputElement | null
            if (el) { el.focus(); break }
          }
          // If stage is missing, scroll to its section
          if (missingStep === 2 && preErrors.stage) {
            const el = document.getElementById('stage-select')
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 0)
        setSaving(false)
        return
      }

      const response = await fetch('/api/founder/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
          // preferences captured in step 3
          geoPreference: formData.geoPreference,
          decisionSpeedDays: formData.decisionSpeedDays,
          targetOwnershipMax: formData.targetOwnershipMax,
          fundTypePreference: formData.fundTypePreference,
          leadPreference: formData.leadPreference,
          // Enhanced diversity and background
          isImmigrant: formData.isImmigrant,
          isUnderrepresented: formData.isUnderrepresented,
          isStudent: formData.isStudent,
          isVeteran: formData.isVeteran,
          needsImmigrationSupport: formData.needsImmigrationSupport,
          universityAffiliation: formData.universityAffiliation,
        }),
      })

      // Try to parse JSON safely
      let data: any = {}
      try {
        data = await response.json()
      } catch {
        // ignore
      }

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to save profile')
      }

      // Successfully saved - redirect to thank-you if server suggests a redirect
      if (data.redirect) {
        router.push(data.redirect)
        try { localStorage.removeItem('fm_onboarding_draft') } catch {}
        return
      }
      // Fallback: go to thank-you
      router.push('/signup/thank-you')
      try { localStorage.removeItem('fm_onboarding_draft') } catch {}
    } catch (error: any) {
      console.error('Error saving profile:', error)
      alert(error?.message || 'Failed to save profile. Please try again.')
      setSaving(false)
    }
  }

  // Show loading state while checking for existing profile
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        {/* Header info */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Founder Onboarding</h1>
          <div className="flex items-center gap-4">
            <button
              className="text-sm underline underline-offset-4 hover:text-primary transition-colors"
              onClick={() => {
                try { localStorage.setItem('fm_onboarding_draft', JSON.stringify(formData)) } catch {}
                router.push('/')
              }}
            >
              Save & Exit
            </button>
            <span className="text-sm text-muted-foreground font-medium">
              Step {step >= 5 ? 4 : (step === 4 ? 4 : step)} of 4
            </span>
          </div>
        </div>
        
        {/* Progress */}
        <div className="mb-8">
          <div className="grid grid-cols-4 gap-2 mb-2">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  const currentDisplayStep = step >= 5 ? 4 : (step === 4 ? 4 : step)
                  if (s <= currentDisplayStep) {
                    // Map display step 4 to real step 5 (verification)
                    setStep(s === 4 ? 5 : s)
                  }
                }} // allow going back freely; forward only sequentially
                className={`h-2 rounded-full transition-all duration-300 ${
                  s <= (step >= 5 ? 4 : (step === 4 ? 4 : step)) 
                    ? 'bg-gradient-to-r from-primary to-blue-600 shadow-sm' 
                    : 'bg-slate-200'
                }`}
                aria-label={`Step ${s}`}
                title={`Step ${s}`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Basic Info</span>
            <span>Startup Details</span>
            <span>Preferences</span>
            <span>Verification</span>
          </div>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Let's Get Started</CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Jane Doe"
                />
                {errors?.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane@startup.com"
                />
                {errors?.email && <p className="text-xs text-red-600">{errors.email}</p>}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="25"
                    aria-invalid={!!errors.age}
                  />
                  {errors.age && <p className="text-xs text-red-600">{errors.age}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education">Education *</Label>
                  <Input
                    id="education"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    placeholder="e.g. Stanford University, High School, Not in school..."
                    aria-invalid={!!errors.education}
                    list="universities"
                  />
                  <datalist id="universities">
                    <option value="N/A" />
                    <option value="High School" />
                    <option value="Not in school" />
                    <option value="Self-taught" />
                    <option value="Other" />
                    {SUGGESTED_UNIVERSITIES.slice(0, 100).map(u => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                  {errors.education && <p className="text-xs text-red-600">{errors.education}</p>}
                  <p className="text-xs text-muted-foreground">Enter your university, or select High School, Not in school, Self-taught, N/A, or Other</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender (Optional)</Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                </select>
                <p className="text-xs text-muted-foreground">Used to match with diversity-focused investors</p>
              </div>

              {/* Enhanced diversity and background questions */}
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <h3 className="text-sm font-semibold">Background Information (Optional)</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Help us match you with investors who specifically support founders like you
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      id="isStudent"
                      type="checkbox"
                      className="mt-1"
                      checked={formData.isStudent || formData.willingToDropOut}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          isStudent: e.target.checked,
                          willingToDropOut: e.target.checked ? formData.willingToDropOut : formData.willingToDropOut
                        })
                      }}
                    />
                    <div>
                      <Label htmlFor="isStudent" className="cursor-pointer">Currently a student</Label>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      id="isImmigrant"
                      type="checkbox"
                      className="mt-1"
                      checked={formData.isImmigrant}
                      onChange={(e) => setFormData({ ...formData, isImmigrant: e.target.checked })}
                    />
                    <div>
                      <Label htmlFor="isImmigrant" className="cursor-pointer">Immigrant founder</Label>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      id="isUnderrepresented"
                      type="checkbox"
                      className="mt-1"
                      checked={formData.isUnderrepresented}
                      onChange={(e) => setFormData({ ...formData, isUnderrepresented: e.target.checked })}
                    />
                    <div>
                      <Label htmlFor="isUnderrepresented" className="cursor-pointer">Underrepresented founder</Label>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      id="isVeteran"
                      type="checkbox"
                      className="mt-1"
                      checked={formData.isVeteran}
                      onChange={(e) => setFormData({ ...formData, isVeteran: e.target.checked })}
                    />
                    <div>
                      <Label htmlFor="isVeteran" className="cursor-pointer">Veteran</Label>
                    </div>
                  </div>

                  {formData.isImmigrant && (
                    <div className="flex items-start gap-3 ml-6">
                      <input
                        id="needsImmigrationSupport"
                        type="checkbox"
                        className="mt-1"
                        checked={formData.needsImmigrationSupport}
                        onChange={(e) => setFormData({ ...formData, needsImmigrationSupport: e.target.checked })}
                      />
                      <div>
                        <Label htmlFor="needsImmigrationSupport" className="cursor-pointer">Need immigration/visa support</Label>
                        <p className="text-xs text-muted-foreground">Prioritizes funds that help with visas and legal support</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="universityAffiliation">University Affiliation (Optional)</Label>
                    <Input
                      id="universityAffiliation"
                      value={formData.universityAffiliation}
                      onChange={(e) => setFormData({ ...formData, universityAffiliation: e.target.value })}
                      placeholder="e.g., UC Berkeley (for The House Fund)"
                      list="universities-affiliation"
                    />
                    <datalist id="universities-affiliation">
                      {SUGGESTED_UNIVERSITIES.slice(0, 50).map(u => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                    <p className="text-xs text-muted-foreground">Some funds are university-specific (e.g., The House Fund for Berkeley)</p>
                  </div>
                </div>
              </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
                <p className="text-xs text-muted-foreground">Why we ask: Optional. Used for 2FA and urgent account issues. Hidden from investors.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="altEmail">Alternate Email</Label>
                <Input
                  id="altEmail"
                  type="email"
                  value={formData.altEmail}
                  onChange={(e) => setFormData({ ...formData, altEmail: e.target.value })}
                  placeholder="you@personal.com"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: For backup communication
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border p-3">
              <input
                id="marketingOptIn"
                type="checkbox"
                className="mt-1"
                checked={formData.marketingOptIn}
                onChange={(e) => setFormData({ ...formData, marketingOptIn: e.target.checked })}
              />
              <div>
                <Label htmlFor="marketingOptIn">Send me product updates and tips</Label>
                <p className="text-xs text-muted-foreground">
                  Occasional emails about new features and matching improvements. You can unsubscribe anytime.
                </p>
              </div>
            </div>

              {/* Commitment question was moved to Step 3 to reduce friction on first step */}

              <Button onClick={() => {
                track('cta_clicked', { name: 'onboarding_step1_continue', page: 'onboarding' })
                const nextErrors: { name?: string; email?: string; age?: string; education?: string; phone?: string } = {}
                if (!formData.name?.trim()) {
                  nextErrors.name = 'Please enter your full name.'
                }
                const emailOk = /.+@.+\..+/.test(formData.email || '')
                if (!emailOk) {
                  nextErrors.email = 'Please enter a valid email.'
                }
                const ageNum = Number(formData.age)
                if (!formData.age || Number.isNaN(ageNum) || ageNum < 16 || ageNum > 100) {
                  nextErrors.age = 'Please enter a valid age (16–100).'
                }
                const digits = (formData.phone || '').replace(/\D/g, '')
                if (!formData.phone || digits.length < 7) {
                  nextErrors.phone = 'Please enter a valid phone number.'
                }
                if (!formData.education || !isKnownUniversity(formData.education)) {
                  nextErrors.education = 'Please enter a recognized university.'
                }
                setErrors(nextErrors)
                if (Object.keys(nextErrors).length === 0) {
                  setStep(2)
                }
              }} className="w-full" size="lg">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Startup Details */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Startup</CardTitle>
              <CardDescription>Tell us about what you're building</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="startupName">Startup Name *</Label>
                <Input
                  id="startupName"
                  value={formData.startupName}
                  onChange={(e) => setFormData({ ...formData, startupName: e.target.value })}
                  placeholder="Acme Corp"
                />
                
              </div>

              <div className="space-y-2">
                <Label>Current Stage *</Label>
                <div id="stage-select" className="flex flex-wrap gap-2">
                  {STAGES.map((stage) => (
                    <Badge
                      key={stage}
                      variant={formData.stage === stage ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setFormData({ ...formData, stage })}
                    >
                      {formData.stage === stage && <CheckCircle className="mr-1 h-3 w-3" />}
                      {stage}
                    </Badge>
                  ))}
                </div>
                {errors.stage && <p className="text-xs text-red-600">{errors.stage}</p>}
              </div>

              <div className="space-y-2">
                <Label>Sectors * (Select 1-3)</Label>
                <div id="sectors-select" className="flex flex-wrap gap-2">
                  {SECTORS.map((sector) => (
                    <Badge
                      key={sector}
                      variant={formData.sectors.includes(sector) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('sectors', sector)}
                    >
                      {formData.sectors.includes(sector) && <CheckCircle className="mr-1 h-3 w-3" />}
                      {sector}
                    </Badge>
                  ))}
                </div>
                {errors.sectors && <p className="text-xs text-red-600">{errors.sectors}</p>}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessModel">Business Model</Label>
                  <Input
                    id="businessModel"
                    value={formData.businessModel}
                    onChange={(e) => setFormData({ ...formData, businessModel: e.target.value })}
                    placeholder="B2B SaaS"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="San Francisco"
                    aria-invalid={!!errors.location}
                  />
                  {errors.location && <p className="text-xs text-red-600">{errors.location}</p>}
                </div>
              </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://yourstartup.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/you"
                />
              </div>
            </div>

              <div className="flex gap-4">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1 gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => {
                  const nextErrors: { stage?: string; sectors?: string; location?: string } = {}
                  if (!formData.stage) {
                    nextErrors.stage = 'Please choose a stage.'
                  }
                  if (!formData.location) {
                    nextErrors.location = 'Please enter your location.'
                  }
                  if (formData.sectors.length === 0 || formData.sectors.length > 3) {
                    nextErrors.sectors = 'Select 1–3 sectors.'
                  }
                  setErrors(prev => ({ ...prev, ...nextErrors }))
                  if (Object.keys(nextErrors).length === 0) {
                    setStep(5) // Skip the \"Working Style\" step and go straight to verification
                  }
                }} className="flex-1">
                  Continue to Verification
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Funding & Preferences */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Help us find your perfect match</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Removed fundraising question to reduce friction for early founders */}

              {/* Investor Type Preference */}
              <div className="space-y-2">
                <Label>Preferred Investor Type</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'accelerator', label: 'Accelerator' },
                    { key: 'institutional', label: 'Venture Fund' },
                    { key: 'either', label: 'Either' },
                  ].map(opt => (
                    <Badge
                      key={opt.key}
                      variant={formData.fundTypePreference === (opt.key as any) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setFormData({ ...formData, fundTypePreference: opt.key as any })}
                    >
                      {formData.fundTypePreference === opt.key && <CheckCircle className="mr-1 h-3 w-3" />}
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Geography Preference */}
              <div className="space-y-2">
                <Label>Investor Geography Preference</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'us-only', label: 'US‑based Investors' },
                    { key: 'remote-ok', label: 'Global / Remote OK' },
                  ].map(opt => (
                    <Badge
                      key={opt.key}
                      variant={formData.geoPreference === (opt.key as any) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setFormData({ ...formData, geoPreference: opt.key as any })}
                    >
                      {formData.geoPreference === opt.key && <CheckCircle className="mr-1 h-3 w-3" />}
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Decision Speed Preference (free-form) */}
              <div className="space-y-2">
                <Label htmlFor="decisionSpeed">How fast do you need a decision? (in days)</Label>
                <Input
                  id="decisionSpeed"
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g., 10"
                  value={formData.decisionSpeedDays}
                  onChange={(e) => setFormData({ ...formData, decisionSpeedDays: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Tip: Typical ranges are 7–30 days.</p>
              </div>

              {/* Ownership Preference (free-form) */}
              <div className="space-y-2">
                <Label htmlFor="ownershipMax">Max equity you’d give up this round (in %)</Label>
                <Input
                  id="ownershipMax"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="e.g., 15"
                  value={formData.targetOwnershipMax}
                  onChange={(e) => setFormData({ ...formData, targetOwnershipMax: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Used to match funds with compatible ownership targets. Example: 12.5</p>
              </div>

              {/* Lead Preference */}
              <div className="space-y-2">
                <Label>Lead investor preference</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'usually', label: 'Must Lead' },
                    { key: 'sometimes', label: 'Lead or Follow' },
                    { key: 'never', label: 'Follow‑Only' },
                  ].map(opt => (
                    <Badge
                      key={opt.key}
                      variant={formData.leadPreference === (opt.key as any) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setFormData({ ...formData, leadPreference: opt.key as any })}
                    >
                      {formData.leadPreference === opt.key && <CheckCircle className="mr-1 h-3 w-3" />}
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>What kind of help do you need? (Select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {VALUE_ADD_NEEDS.map((need) => (
                    <Badge
                      key={need}
                      variant={formData.valueAddNeeds.includes(need) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('valueAddNeeds', need)}
                    >
                      {formData.valueAddNeeds.includes(need) && <CheckCircle className="mr-1 h-3 w-3" />}
                      {need}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>What values matter to you?</Label>
                <div className="flex flex-wrap gap-2">
                  {ETHICS_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={formData.ethicsTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('ethicsTags', tag)}
                    >
                      {formData.ethicsTags.includes(tag) && <CheckCircle className="mr-1 h-3 w-3" />}
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1 gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Working Style */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Almost Done!</CardTitle>
              <CardDescription>Tell us about your ideal investor relationship</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>What's your preferred working style?</Label>
                <div className="flex flex-wrap gap-2">
                  {PERSONALITY_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={formData.personalityTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('personalityTags', tag)}
                    >
                      {formData.personalityTags.includes(tag) && <CheckCircle className="mr-1 h-3 w-3" />}
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Select all that apply to find investors who match your style
                </p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-6">
                <h3 className="mb-2 font-semibold">What happens next?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>We'll analyze your profile and match you with 20+ compatible VCs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>You can upload your resume for AI-powered compatibility analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>Get crash courses on how to pitch each specific VC</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>Track your applications and get real-time notifications</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setStep(3)} variant="outline" className="flex-1 gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(5)} className="flex-1">
                  Continue to Verification
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Identity Verification (required) */}
        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Verify Your Identity</CardTitle>
              <CardDescription>For trust and safety. Upload a government ID (PNG, JPG, or PDF).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="id-upload">Upload ID (max 10MB)</Label>
                <Input
                  id="id-upload"
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={(e) => setIdFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                  disabled={idUploading || saving}
                />
                {idUploaded && (
                  <p className="text-sm text-green-600">✅ ID uploaded successfully</p>
                )}
                <p className="text-xs text-muted-foreground">Why we ask: Helps prevent impersonation and spam. We store only a verification status and provider reference.</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1 gap-2" disabled={idUploading || saving}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!idFile || idUploading}
                  onClick={async () => {
                    if (!idFile) return
                    setIdUploading(true)
                    try {
                      const fd = new FormData()
                      fd.append('file', idFile)
                      const res = await fetch('/api/founder/verify-id', {
                        method: 'POST',
                        body: fd,
                        credentials: 'include',
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error || 'Upload failed')
                      setIdUploaded(true)
                    } catch (e: any) {
                      alert(e.message || 'Upload failed')
                    } finally {
                      setIdUploading(false)
                    }
                  }}
                >
                  {idUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload ID'
                  )}
                </Button>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={async () => {
                    if (!idUploaded) {
                      alert('Please upload your ID before continuing.')
                      return
                    }
                    await handleSubmit()
                  }} 
                  className="w-full" 
                  size="lg"
                  disabled={saving || !idUploaded}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Finish & Submit
                      <Rocket className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
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

