'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, ArrowLeft, CheckCircle } from "lucide-react"

const ETHICS_TAGS = [
  'Open Source', 'Diversity', 'Privacy-first', 'Climate Impact',
  'Financial Inclusion', 'Education Access', 'Healthcare Access'
]

const VALUE_ADD_NEEDS = [
  'Hiring Support', 'Go-to-Market Strategy', 'Product Feedback',
  'Industry Connections', 'Technical Mentorship', 'Customer Intros',
  'PR/Marketing', 'Sales Strategy', 'International Expansion'
]

interface FormData {
  fundTypePreference: 'accelerator' | 'institutional' | 'either'
  geoPreference: 'us-only' | 'remote-ok'
  decisionSpeedDays: string
  targetOwnershipMax: string
  leadPreference: 'never' | 'sometimes' | 'usually'
  valueAddNeeds: string[]
  ethicsTags: string[]
  [key: string]: any
}

interface Step3PreferencesProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  setStep: (step: number) => void
  toggleArrayItem: (key: keyof FormData, value: string) => void
  hideNavigation?: boolean
}

export function Step3Preferences({
  formData,
  setFormData,
  setStep,
  toggleArrayItem,
  hideNavigation = false,
}: Step3PreferencesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>Help us find your perfect match</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            name="decisionSpeed"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g., 10"
            value={formData.decisionSpeedDays}
            onChange={(e) => setFormData({ ...formData, decisionSpeedDays: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Tip: Typical ranges are 7–30 days.</p>
        </div>

        {/* Ownership Preference (free-form) */}
        <div className="space-y-2">
          <Label htmlFor="ownershipMax">Max equity you'd give up this round (in %)</Label>
          <Input
            id="ownershipMax"
            name="ownershipMax"
            type="number"
            inputMode="decimal"
            step="0.1"
            autoComplete="off"
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

        {!hideNavigation && (
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
        )}
      </CardContent>
    </Card>
  )
}


