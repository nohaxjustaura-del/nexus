'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Heart, Sparkles, CheckCircle, Building2, ArrowRight, Loader2, TrendingUp, Users, Shield, Zap, Target, BarChart3 } from "lucide-react"
import Link from "next/link"

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
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
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

  // Load existing VC profile on mount
  useEffect(() => {
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
              router.push('/vc/dashboard')
              return
            }
          }
        }
      } catch (error) {
        console.error('Error loading VC profile:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadProfile()
  }, [router])

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">NEXUS</span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <div className="mb-16 text-center">
          <Badge className="mb-6 px-4 py-1.5 text-sm" variant="secondary">
            <Building2 className="mr-2 h-4 w-4" />
            For Investors
          </Badge>
          <h1 className="mb-6 text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Access Premium Deal Flow
          </h1>
          <p className="mx-auto max-w-3xl text-xl md:text-2xl text-slate-600 leading-relaxed mb-8">
            Get matched with highly qualified founders who fit your investment thesis. 
            Save time, improve deal quality, and grow your portfolio.
          </p>
          
          {/* Simplified Key Benefits */}
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
            <div className="text-center p-6 rounded-xl border border-slate-200 bg-white">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">AI-Pre-Screened</h3>
              <p className="text-sm text-slate-600">Quality founders, pre-analyzed for fit</p>
            </div>
            <div className="text-center p-6 rounded-xl border border-slate-200 bg-white">
              <CheckCircle className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Verified</h3>
              <p className="text-sm text-slate-600">Identity-verified, serious founders only</p>
            </div>
            <div className="text-center p-6 rounded-xl border border-slate-200 bg-white">
              <ArrowRight className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Save Time</h3>
              <p className="text-sm text-slate-600">Deal flow that matches your criteria</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
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
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@fund.com"
                  />
                </div>
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

              {/* Simplified Benefits Section */}
              <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-white to-purple-50/30 p-6 mb-6">
                <h3 className="mb-4 text-lg font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  What You Get
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm">Quality Deal Flow</div>
                      <div className="text-xs text-muted-foreground">AI-pre-screened founders who match your thesis</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm">Zero Spam</div>
                      <div className="text-xs text-muted-foreground">Only verified founders who fit your criteria</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-sm">Save Time</div>
                      <div className="text-xs text-muted-foreground">Get pitch decks and founder insights upfront</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  <strong>Next steps:</strong> We'll verify your profile within 24 hours, then you'll start receiving matched founders. Free forever.
                </p>
              </div>

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
