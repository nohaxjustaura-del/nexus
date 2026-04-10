'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, ArrowLeft, CheckCircle } from "lucide-react"

const SECTORS = [
  'AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'Climate Tech', 'Consumer',
  'Enterprise', 'Crypto/Web3', 'EdTech', 'DeepTech', 'Biotech', 'Hardware',
  'Marketplace', 'Developer Tools', 'Security', 'Infrastructure'
]

const STAGES = ['Idea', 'MVP', 'Revenue', 'Pre-Seed', 'Seed', 'Series A']

interface FormData {
  startupName: string
  stage: string
  sectors: string[]
  businessModel: string
  location: string
  website: string
  linkedin: string
  [key: string]: any
}

interface Step2StartupDetailsProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  errors: { stage?: string; sectors?: string; location?: string }
  setErrors: (errors: { stage?: string; sectors?: string; location?: string } | ((prev: any) => any)) => void
  setStep: (step: number) => void
  toggleArrayItem: (key: keyof FormData, value: string) => void
  hideNavigation?: boolean
}

export function Step2StartupDetails({
  formData,
  setFormData,
  errors,
  setErrors,
  setStep,
  toggleArrayItem,
  hideNavigation = false,
}: Step2StartupDetailsProps) {
  return (
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
            name="startupName"
            autoComplete="organization"
            value={formData.startupName}
            onChange={(e) => setFormData({ ...formData, startupName: e.target.value })}
            placeholder="Acme Corp"
          />
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
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              name="location"
              autoComplete="address-level2"
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
              setStep(3)
            }
          }} className="flex-1">
            Continue to Preferences
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        )}
      </CardContent>
    </Card>
  )
}


