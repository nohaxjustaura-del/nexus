'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ISO_COUNTRIES_SORTED } from '@/lib/geo/iso3166-countries'
import { countryHasSubdivisionList, getSubdivisionsForCountry } from '@/lib/geo/subdivisions'
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'

const SECTORS = [
  'AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'Climate Tech', 'Consumer',
  'Enterprise', 'Crypto/Web3', 'EdTech', 'DeepTech', 'Biotech', 'Hardware',
  'Marketplace', 'Developer Tools', 'Security', 'Infrastructure',
]

const STAGES = ['Idea', 'MVP', 'Revenue', 'Pre-Seed', 'Seed', 'Series A']

export interface Step2FormSlice {
  startupName: string
  stage: string
  sectors: string[]
  businessModel: string
  location: string
  countryCode: string
  regionCode: string
  website: string
  linkedin: string
  [key: string]: unknown
}

export type Step2Errors = {
  startupName?: string
  stage?: string
  sectors?: string
  location?: string
  countryCode?: string
  regionCode?: string
}

interface Step2StartupDetailsProps {
  formData: Step2FormSlice
  setFormData: (data: Step2FormSlice | ((prev: Step2FormSlice) => Step2FormSlice)) => void
  errors: Step2Errors
  setErrors: (errors: Step2Errors | ((prev: Step2Errors) => Step2Errors)) => void
  setStep: (step: number) => void
  toggleArrayItem: (key: keyof Step2FormSlice, value: string) => void
  hideNavigation?: boolean
  sectionTitle?: string
  sectionDescription?: string
}

export function Step2StartupDetails({
  formData,
  setFormData,
  errors,
  setErrors,
  setStep,
  toggleArrayItem,
  hideNavigation = false,
  sectionTitle = 'Your Startup',
  sectionDescription = "Tell us about what you're building",
}: Step2StartupDetailsProps) {
  const cc = formData.countryCode?.trim().toUpperCase() || ''
  const subdivisions = cc ? getSubdivisionsForCountry(cc) : []
  const needsRegion = countryHasSubdivisionList(cc)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{sectionTitle}</CardTitle>
        <CardDescription>{sectionDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="startupName">Startup Name *</Label>
          <Input
            id="startupName"
            name="startupName"
            autoComplete="organization"
            value={formData.startupName}
            onChange={(e) => setFormData({ ...formData, startupName: e.target.value })}
            placeholder="Acme Corp"
            aria-invalid={!!errors.startupName}
          />
          {errors.startupName && <p className="text-xs text-red-600">{errors.startupName}</p>}
        </div>

        <div className="space-y-2">
          <Label>Current Stage *</Label>
          <div id="stage-select" className="flex flex-wrap gap-2" role="radiogroup" aria-label="Current Stage">
            {STAGES.map((stage) => (
              <button
                key={stage}
                type="button"
                role="radio"
                aria-checked={formData.stage === stage}
                onClick={() => setFormData({ ...formData, stage })}
              >
                <Badge
                  variant={formData.stage === stage ? 'default' : 'outline'}
                  className="cursor-pointer"
                >
                  {formData.stage === stage && <CheckCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
                  {stage}
                </Badge>
              </button>
            ))}
          </div>
          {errors.stage && <p className="text-xs text-red-600">{errors.stage}</p>}
        </div>

        <div className="space-y-2">
          <Label>Sectors * (Select 1-3)</Label>
          <div id="sectors-select" className="flex flex-wrap gap-2" role="group" aria-label="Sectors">
            {SECTORS.map((sector) => (
              <button
                key={sector}
                type="button"
                aria-pressed={formData.sectors.includes(sector)}
                onClick={() => toggleArrayItem('sectors', sector)}
              >
                <Badge
                  variant={formData.sectors.includes(sector) ? 'default' : 'outline'}
                  className="cursor-pointer"
                >
                  {formData.sectors.includes(sector) && <CheckCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
                  {sector}
                </Badge>
              </button>
            ))}
          </div>
          {errors.sectors && <p className="text-xs text-red-600">{errors.sectors}</p>}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="businessModel">Business Model</Label>
            <Input
              id="businessModel"
              name="businessModel"
              autoComplete="off"
              value={formData.businessModel}
              onChange={(e) => setFormData({ ...formData, businessModel: e.target.value })}
              placeholder="B2B SaaS"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">City / town *</Label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Choose your country and region below so investor geography matching uses the correct state or province.
            </p>
            <Input
              id="location"
              name="location"
              autoComplete="address-level2"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Cerritos"
              aria-invalid={!!errors.location}
            />
            {errors.location && <p className="text-xs text-red-600">{errors.location}</p>}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="country-select">Country *</Label>
            <Select
              value={formData.countryCode ? formData.countryCode.toUpperCase() : undefined}
              onValueChange={(v) =>
                setFormData({
                  ...formData,
                  countryCode: v,
                  regionCode: '',
                })
              }
            >
              <SelectTrigger id="country-select" aria-invalid={!!errors.countryCode}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(360px,70vh)]">
                {ISO_COUNTRIES_SORTED.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.countryCode && <p className="text-xs text-red-600">{errors.countryCode}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="region-select">
              {needsRegion ? 'State / province *' : 'State / province'}
            </Label>
            {needsRegion ? (
              <Select
                value={formData.regionCode ? formData.regionCode.toUpperCase() : undefined}
                onValueChange={(v) => setFormData({ ...formData, regionCode: v })}
              >
                <SelectTrigger id="region-select" aria-invalid={!!errors.regionCode}>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(360px,70vh)]">
                  {subdivisions.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground pt-2">
                {cc ? 'No region list for this country; city and country are enough.' : 'Select a country first.'}
              </p>
            )}
            {errors.regionCode && <p className="text-xs text-red-600">{errors.regionCode}</p>}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              autoComplete="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://yourstartup.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              name="linkedin"
              type="url"
              autoComplete="url"
              value={formData.linkedin}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              placeholder="https://linkedin.com/in/you"
            />
          </div>
        </div>

        {!hideNavigation && (
          <div className="flex gap-4">
            <Button onClick={() => setStep(1)} variant="outline" className="flex-1 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => {
                const nextErrors: Step2Errors = {}
                if (!formData.startupName?.trim()) {
                  nextErrors.startupName = 'Please enter your startup name.'
                }
                if (!formData.stage) {
                  nextErrors.stage = 'Please choose a stage.'
                }
                if (!formData.location?.trim()) {
                  nextErrors.location = 'Please enter your city or town.'
                }
                if (!formData.countryCode?.trim()) {
                  nextErrors.countryCode = 'Please select your country.'
                }
                if (countryHasSubdivisionList(formData.countryCode) && !formData.regionCode?.trim()) {
                  nextErrors.regionCode = 'Please select your state or province.'
                }
                if (formData.sectors.length === 0 || formData.sectors.length > 3) {
                  nextErrors.sectors = 'Select 1–3 sectors.'
                }
                setErrors((prev) => ({ ...prev, ...nextErrors }))
                if (Object.keys(nextErrors).length === 0) {
                  setStep(3)
                }
              }}
              className="flex-1"
            >
              Continue to Preferences
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
