'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Building2, ArrowRight, Loader2 } from "lucide-react"
import { useAuthSession } from '@/components/auth-session-provider'

const SECTORS = [
  'AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'Climate Tech', 'Consumer',
  'Enterprise', 'Crypto/Web3', 'EdTech', 'DeepTech', 'Biotech', 'Hardware'
]

const STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B']

const VALUE_ADDS = [
  'Hiring Support', 'Go-to-Market Strategy', 'Product Feedback',
  'Industry Connections', 'Technical Mentorship', 'Customer Intros',
  'PR/Marketing', 'Sales Strategy', 'Board Experience'
]

export default function VCClaimPage() {
  const router = useRouter()
  const { loading: authLoading, authenticated, email: sessionEmail } = useAuthSession()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    firmName: '',
    checkMin: '',
    checkMax: '',
    fundSize: '',
    stages: [] as string[],
    sectors: [] as string[],
    geoFocus: '',
    leadFollow: 'either',
    valueAddTags: [] as string[],
    personalityType: '',
    decisionSpeed: '',
    applicationUrl: '',
    linkedinUrl: '',
    websiteUrl: '',
  })

  useEffect(() => {
    if (authLoading) return
    if (!authenticated) {
      const next = encodeURIComponent('/vc/claim')
      router.replace(`/signup?redirect=${next}`)
    }
  }, [authLoading, authenticated, router])

  useEffect(() => {
    const e = sessionEmail?.trim()
    if (!e) return
    setFormData((prev) => (prev.email === e ? prev : { ...prev, email: e }))
  }, [sessionEmail])

  // Load existing VC profile on mount
  useEffect(() => {
    if (authLoading || !authenticated) return

    async function loadProfile() {
      try {
        const response = await fetch('/api/vc/profile', {
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.exists && data.profile) {
            // Pre-fill form with existing data
            setFormData({
              name: data.profile.name || '',
              email: data.profile.email || '',
              firmName: data.profile.firmName || '',
              checkMin: data.profile.checkMin?.toString() || '',
              checkMax: data.profile.checkMax?.toString() || '',
              fundSize: data.profile.fundSize || '',
              stages: data.profile.stages || [],
              sectors: data.profile.sectors || [],
              geoFocus: Array.isArray(data.profile.geoFocus) ? data.profile.geoFocus.join(', ') : (data.profile.geoFocus || ''),
              leadFollow: data.profile.leadFollow || 'either',
              valueAddTags: data.profile.valueAddTags || [],
              personalityType: data.profile.personalityType || '',
              decisionSpeed: data.profile.decisionSpeed || '',
              applicationUrl: data.profile.applicationUrl || '',
              linkedinUrl: data.profile.linkedinUrl || '',
              websiteUrl: data.profile.websiteUrl || '',
            })
            
            // If profile is verified and complete, redirect to dashboard
            if (data.verified && data.profile.firmName && data.profile.checkMin && data.profile.checkMax) {
              router.push('/vc/profile')
              return
            }
          }
        }
      } catch (error) {
        console.error('Error loading VC profile:', error)
      }
    }
    
    loadProfile()
  }, [router, authLoading, authenticated])

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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/vc-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to submit claim')
      }

      setSuccess(true)
      // Redirect to success page
      router.push('/vc/claim/success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit claim. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (authLoading || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
        <header className="mb-8 text-center">
          <Badge className="mb-3 px-2.5 py-0.5 text-xs font-medium" variant="secondary">
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            For investors
          </Badge>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Claim your firm profile
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Matched founders see your thesis and apply through your link. Three quick steps after you&apos;re signed in.
          </p>
        </header>

        <div className="mb-8 flex gap-1.5" aria-hidden>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell us about yourself and your fund</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">Account email</span>
                <p className="mt-0.5 font-medium text-foreground">{formData.email || sessionEmail || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firmName">Fund/Firm Name *</Label>
                <Input
                  id="firmName"
                  value={formData.firmName}
                  onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
                  placeholder="Acme Ventures"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="checkMin">Min Check Size ($K) *</Label>
                  <Input
                    id="checkMin"
                    type="number"
                    value={formData.checkMin}
                    onChange={(e) => setFormData({ ...formData, checkMin: e.target.value })}
                    placeholder="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkMax">Max Check Size ($K) *</Label>
                  <Input
                    id="checkMax"
                    type="number"
                    value={formData.checkMax}
                    onChange={(e) => setFormData({ ...formData, checkMax: e.target.value })}
                    placeholder="500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fundSize">Fund Size</Label>
                  <Input
                    id="fundSize"
                    value={formData.fundSize}
                    onChange={(e) => setFormData({ ...formData, fundSize: e.target.value })}
                    placeholder="$50M"
                  />
                </div>
              </div>

              <Button onClick={() => setStep(2)} className="w-full" size="lg">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Investment Thesis */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Investment Thesis</CardTitle>
              <CardDescription>Help founders find you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Stages You Invest In *</Label>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((stage) => (
                    <Badge
                      key={stage}
                      variant={formData.stages.includes(stage) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('stages', stage)}
                    >
                      {formData.stages.includes(stage) && <CheckCircle className="mr-1 h-3 w-3" />}
                      {stage}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sectors *</Label>
                <div className="flex flex-wrap gap-2">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="geoFocus">Geographic Focus *</Label>
                <Input
                  id="geoFocus"
                  value={formData.geoFocus}
                  onChange={(e) => setFormData({ ...formData, geoFocus: e.target.value })}
                  placeholder="US, Global"
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple regions with commas
                </p>
              </div>

              <div className="space-y-2">
                <Label>Lead/Follow Preference</Label>
                <div className="flex gap-2">
                  {['lead', 'follow', 'either'].map((type) => (
                    <Badge
                      key={type}
                      variant={formData.leadFollow === type ? 'default' : 'outline'}
                      className="cursor-pointer capitalize"
                      onClick={() => setFormData({ ...formData, leadFollow: type })}
                    >
                      {formData.leadFollow === type && <CheckCircle className="mr-1 h-3 w-3" />}
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Value Prop & Links */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>How You Help Founders</CardTitle>
              <CardDescription>Stand out by showing your value-add</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>What you bring beyond capital</Label>
                <div className="flex flex-wrap gap-2">
                  {VALUE_ADDS.map((value) => (
                    <Badge
                      key={value}
                      variant={formData.valueAddTags.includes(value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayItem('valueAddTags', value)}
                    >
                      {formData.valueAddTags.includes(value) && <CheckCircle className="mr-1 h-3 w-3" />}
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="personalityType">Your Style</Label>
                  <Input
                    id="personalityType"
                    value={formData.personalityType}
                    onChange={(e) => setFormData({ ...formData, personalityType: e.target.value })}
                    placeholder="hands-on mentor"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="decisionSpeed">Decision Timeline</Label>
                  <Input
                    id="decisionSpeed"
                    value={formData.decisionSpeed}
                    onChange={(e) => setFormData({ ...formData, decisionSpeed: e.target.value })}
                    placeholder="2-3 weeks typical"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicationUrl">Application URL *</Label>
                <Input
                  id="applicationUrl"
                  type="url"
                  value={formData.applicationUrl}
                  onChange={(e) => setFormData({ ...formData, applicationUrl: e.target.value })}
                  placeholder="https://yourfund.com/apply"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input
                    id="linkedinUrl"
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                    placeholder="https://yourfund.com"
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                We review claims within about 24 hours. Listing stays free.
              </p>

              {error && (
                <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-green-500 bg-green-50 p-4 text-sm text-green-700">
                  ✓ Your claim request has been submitted! We'll review it and get back to you within 24 hours.
                </div>
              )}

              <div className="flex gap-4">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1" disabled={isSubmitting || success}>
                  Back
                </Button>
                <Button onClick={handleSubmit} className="flex-1" size="lg" disabled={isSubmitting || success}>
                  {isSubmitting ? 'Submitting...' : success ? 'Submitted!' : 'Claim Profile'}
                  {!isSubmitting && !success && <Building2 className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
