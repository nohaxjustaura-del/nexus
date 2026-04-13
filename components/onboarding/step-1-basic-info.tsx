'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, FileText, Loader2, X } from "lucide-react"
import { isKnownUniversity, SUGGESTED_UNIVERSITIES } from "@/lib/universities"
import { track } from "@/lib/analytics"
import { toast } from '@/components/ui/toast-simple'
import { useState } from 'react'

interface FormData {
  name: string
  email: string
  age: string
  education: string
  gender: string
  phone: string
  altEmail: string
  marketingOptIn: boolean
  willingToDropOut: boolean
  isStudent: boolean
  isImmigrant: boolean
  isUnderrepresented: boolean
  isVeteran: boolean
  needsImmigrationSupport: boolean
  universityAffiliation: string
  resumeUrl?: string
  resumeFileName?: string
  [key: string]: any
}

interface Step1BasicInfoProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  errors: { name?: string; email?: string; age?: string; education?: string; phone?: string }
  setErrors: (errors: { name?: string; email?: string; age?: string; education?: string; phone?: string }) => void
  setStep: (step: number) => void
  /** Hide Continue (e.g. account profile editor with a single global Save). */
  hideNavigation?: boolean
  /** Lock primary email to the signed-in account */
  readOnlyEmail?: boolean
  /** Override card heading (e.g. account profile settings) */
  sectionTitle?: string
  sectionDescription?: string
}

export function Step1BasicInfo({
  formData,
  setFormData,
  errors,
  setErrors,
  setStep,
  hideNavigation = false,
  readOnlyEmail = false,
  sectionTitle = "Let's Get Started",
  sectionDescription = 'Tell us about yourself',
}: Step1BasicInfoProps) {
  const [resumeBusy, setResumeBusy] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{sectionTitle}</CardTitle>
        <CardDescription>{sectionDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
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
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="jane@startup.com"
            readOnly={readOnlyEmail}
            className={readOnlyEmail ? 'bg-muted/60 text-muted-foreground cursor-not-allowed' : undefined}
          />
          {readOnlyEmail && (
            <p className="text-xs text-muted-foreground">
              This is your login email. Use “Alternate Email” below for a different contact address.
            </p>
          )}
          {errors?.email && <p className="text-xs text-red-600">{errors.email}</p>}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="age">Age *</Label>
            <Input
              id="age"
              name="age"
              type="number"
              autoComplete="off"
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
              name="education"
              autoComplete="organization"
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
              {SUGGESTED_UNIVERSITIES.map(u => (
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
            name="gender"
            autoComplete="sex"
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

          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
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
              name="altEmail"
              type="email"
              autoComplete="email"
              value={formData.altEmail}
              onChange={(e) => setFormData({ ...formData, altEmail: e.target.value })}
              placeholder="you@personal.com"
            />
            <p className="text-xs text-muted-foreground">
              Optional: For backup communication
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-dashed border-muted-foreground/25 p-4 bg-muted/20">
          <Label htmlFor="resume-upload">Resume (optional)</Label>
          <p className="text-xs text-muted-foreground">
            PDF only, up to 10MB. You can add or replace your resume anytime from your account profile.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              id="resume-upload"
              type="file"
              accept="application/pdf,.pdf"
              className="max-w-xs cursor-pointer"
              disabled={resumeBusy}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                if (file.type !== 'application/pdf') {
                  toast.error('Please choose a PDF file.')
                  return
                }
                setResumeBusy(true)
                try {
                  const body = new FormData()
                  body.append('file', file)
                  const res = await fetch('/api/founder/resume-upload', {
                    method: 'POST',
                    body,
                    credentials: 'include',
                  })
                  const data = await res.json().catch(() => ({}))
                  if (!res.ok) {
                    throw new Error(data?.error || data?.message || 'Upload failed')
                  }
                  setFormData({
                    ...formData,
                    resumeUrl: data.resumeUrl as string,
                    resumeFileName: (data.fileName as string) || file.name,
                  })
                  toast.success('Resume uploaded.')
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not upload resume.')
                } finally {
                  setResumeBusy(false)
                }
              }}
            />
            {resumeBusy ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden /> : null}
            {(formData.resumeUrl || formData.resumeFileName) && !resumeBusy ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  setFormData({ ...formData, resumeUrl: '', resumeFileName: '' })
                }
              >
                <X className="mr-1 h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>
          {(formData.resumeUrl || formData.resumeFileName) && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{formData.resumeFileName || 'Resume attached'}</span>
            </p>
          )}
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

        {!hideNavigation && (
        <Button onClick={() => {
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
        )}
      </CardContent>
    </Card>
  )
}


