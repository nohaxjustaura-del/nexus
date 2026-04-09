'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { toast } from '@/components/ui/toast-simple'
import { cn } from '@/lib/utils'

const STEPS = [
  { title: 'About you', short: 'You' },
  { title: 'Your startup', short: 'Startup' },
  { title: 'Problem & solution', short: 'Product' },
  { title: 'Traction', short: 'Traction' },
  { title: 'Fundraising', short: 'Raise' },
  { title: 'Vision & materials', short: 'Vision' },
] as const

export default function FounderOnboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    founderName: '',
    founderBackground: '',
    founderExperience: '',
    coFounders: '',
    startupName: '',
    industry: '',
    stage: '',
    location: '',
    businessModel: '',
    problemStatement: '',
    solution: '',
    uniqueValue: '',
    currentTraction: '',
    revenue: '',
    users: '',
    growth: '',
    fundraisingStage: '',
    targetAmount: '',
    previousFunding: '',
    pitchDeck: '',
    competitors: '',
    futureVision: '',
  })

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateStep = (s: number): boolean => {
    const missing: string[] = []
    if (s === 0) {
      if (!formData.founderName.trim()) missing.push('Your name')
      if (!formData.founderBackground.trim()) missing.push('Background')
      if (!formData.founderExperience.trim()) missing.push('Founder experience')
    }
    if (s === 1) {
      if (!formData.startupName.trim()) missing.push('Startup name')
      if (!formData.industry.trim()) missing.push('Industry')
      if (!formData.stage.trim()) missing.push('Stage')
      if (!formData.location.trim()) missing.push('Location')
      if (!formData.businessModel.trim()) missing.push('Business model')
    }
    if (s === 2) {
      if (!formData.problemStatement.trim()) missing.push('Problem')
      if (!formData.solution.trim()) missing.push('Solution')
      if (!formData.uniqueValue.trim()) missing.push('What makes you unique')
    }
    if (s === 3) {
      if (!formData.currentTraction.trim()) missing.push('Current traction')
    }
    if (s === 4) {
      if (!formData.fundraisingStage.trim()) missing.push('Fundraising stage')
      if (!formData.targetAmount.trim()) missing.push('Target amount')
    }
    if (s === 5) {
      if (!formData.futureVision.trim()) missing.push('Long-term vision')
    }
    if (missing.length > 0) {
      toast.warning(`Complete this step: ${missing.join(', ')}`)
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    const requiredFields = {
      founderName: formData.founderName,
      founderBackground: formData.founderBackground,
      founderExperience: formData.founderExperience,
      startupName: formData.startupName,
      industry: formData.industry,
      stage: formData.stage,
      location: formData.location,
      businessModel: formData.businessModel,
      problemStatement: formData.problemStatement,
      solution: formData.solution,
      uniqueValue: formData.uniqueValue,
      currentTraction: formData.currentTraction,
      fundraisingStage: formData.fundraisingStage,
      targetAmount: formData.targetAmount,
      futureVision: formData.futureVision,
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value || value.trim() === '')
      .map(([key]) => key)

    if (missingFields.length > 0) {
      toast.warning(`Please fill in all required fields. Missing: ${missingFields.join(', ')}`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/onboarding/founder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await response.json().catch(() => null)
        router.push('/analysis')
      } else {
        let errorMessage = 'Unknown error'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          const errorText = await response.text().catch(() => 'Unknown error')
          errorMessage = errorText || errorMessage
        }

        if (response.status === 401) {
          toast.info('Please sign in to continue. Redirecting to sign in page...')
          router.push('/signup')
        } else if (response.status === 403) {
          toast.warning(`Email verification required: ${errorMessage}`)
          router.push('/verify')
        } else if (response.status === 400) {
          toast.error(`Please check your form: ${errorMessage}`)
        } else {
          toast.error(
            `Failed to submit: ${errorMessage}\n\nIf this problem persists, please check your internet connection and try again.`,
          )
        }
      }
    } catch (error) {
      toast.error(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const goNext = () => {
    if (!validateStep(step)) return
    if (step < STEPS.length - 1) setStep((s) => s + 1)
    else void handleSubmit()
  }

  const goBack = () => setStep((s) => Math.max(0, s - 1))

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void goNext()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span className="text-sm font-semibold">Founder onboarding</span>
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Tell us about your startup
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Step-by-step so you can focus on one topic at a time.
          </p>
        </div>

        <div className="mb-8 space-y-3">
          <div className="flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-muted')}
              />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground sm:text-sm">
            Step {step + 1} of {STEPS.length}: <span className="font-medium text-foreground">{STEPS[step].title}</span>
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
            {STEPS.map((s, i) => (
              <span
                key={s.short}
                className={cn(
                  'rounded-full px-2 py-0.5',
                  i === step ? 'bg-primary/15 font-medium text-foreground' : i < step ? 'text-foreground/70' : '',
                )}
              >
                {s.short}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={onFormSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="founderName">Your name *</Label>
                <Input
                  id="founderName"
                  value={formData.founderName}
                  onChange={(e) => updateField('founderName', e.target.value)}
                  placeholder="Jane Smith"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="founderBackground">Your background *</Label>
                <p className="mt-1 text-xs text-muted-foreground">Education, previous roles, technical skills</p>
                <Textarea
                  id="founderBackground"
                  value={formData.founderBackground}
                  onChange={(e) => updateField('founderBackground', e.target.value)}
                  placeholder="Ex: CS degree from MIT, 5 years as Software Engineer at Google..."
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="founderExperience">Founder experience *</Label>
                <Input
                  id="founderExperience"
                  value={formData.founderExperience}
                  onChange={(e) => updateField('founderExperience', e.target.value)}
                  placeholder="First-time founder, previously led 10-person team"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="coFounders">Co-founders (optional)</Label>
                <Input
                  id="coFounders"
                  value={formData.coFounders}
                  onChange={(e) => updateField('coFounders', e.target.value)}
                  placeholder="John Doe (ex-Stripe, sales background)"
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="startupName">Startup name *</Label>
                <Input
                  id="startupName"
                  value={formData.startupName}
                  onChange={(e) => updateField('startupName', e.target.value)}
                  placeholder="Acme AI"
                  className="mt-2"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="industry">Industry *</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    placeholder="AI/ML, Fintech, SaaS..."
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="San Francisco, CA"
                    className="mt-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="stage">Stage *</Label>
                <Select value={formData.stage} onValueChange={(v: string) => updateField('stage', v)}>
                  <SelectTrigger id="stage" className="mt-2">
                    <SelectValue placeholder="Select your stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Idea">Idea</SelectItem>
                    <SelectItem value="Pre-seed">Pre-seed</SelectItem>
                    <SelectItem value="Seed">Seed</SelectItem>
                    <SelectItem value="Series A">Series A</SelectItem>
                    <SelectItem value="Series B">Series B</SelectItem>
                    <SelectItem value="Series C+">Series C+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="businessModel">Business model *</Label>
                <Input
                  id="businessModel"
                  value={formData.businessModel}
                  onChange={(e) => updateField('businessModel', e.target.value)}
                  placeholder="B2B SaaS, subscription-based"
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="problemStatement">What problem are you solving? *</Label>
                <Textarea
                  id="problemStatement"
                  value={formData.problemStatement}
                  onChange={(e) => updateField('problemStatement', e.target.value)}
                  placeholder="Companies struggle with X, which costs them Y..."
                  rows={4}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="solution">Your solution *</Label>
                <Textarea
                  id="solution"
                  value={formData.solution}
                  onChange={(e) => updateField('solution', e.target.value)}
                  placeholder="We solve this by..."
                  rows={4}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="uniqueValue">What makes you unique? *</Label>
                <Textarea
                  id="uniqueValue"
                  value={formData.uniqueValue}
                  onChange={(e) => updateField('uniqueValue', e.target.value)}
                  placeholder="Our proprietary technology does X, which is 10x better than competitors..."
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="competitors">Competitors (optional)</Label>
                <Input
                  id="competitors"
                  value={formData.competitors}
                  onChange={(e) => updateField('competitors', e.target.value)}
                  placeholder="Competitor A, Competitor B — we differentiate by..."
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="currentTraction">Current traction *</Label>
                <Textarea
                  id="currentTraction"
                  value={formData.currentTraction}
                  onChange={(e) => updateField('currentTraction', e.target.value)}
                  placeholder="Launched 6 months ago, 5 pilot customers, strong engagement..."
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="revenue">Revenue (optional)</Label>
                  <Input
                    id="revenue"
                    value={formData.revenue}
                    onChange={(e) => updateField('revenue', e.target.value)}
                    placeholder="$15K MRR"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="users">Users (optional)</Label>
                  <Input
                    id="users"
                    value={formData.users}
                    onChange={(e) => updateField('users', e.target.value)}
                    placeholder="250 active"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="growth">Growth (optional)</Label>
                  <Input
                    id="growth"
                    value={formData.growth}
                    onChange={(e) => updateField('growth', e.target.value)}
                    placeholder="25% MoM"
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="fundraisingStage">Fundraising stage *</Label>
                <Select value={formData.fundraisingStage} onValueChange={(v: string) => updateField('fundraisingStage', v)}>
                  <SelectTrigger id="fundraisingStage" className="mt-2">
                    <SelectValue placeholder="What are you raising?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Idea">Idea Stage</SelectItem>
                    <SelectItem value="Pre-seed">Pre-seed Round</SelectItem>
                    <SelectItem value="Seed">Seed Round</SelectItem>
                    <SelectItem value="Series A">Series A</SelectItem>
                    <SelectItem value="Series B">Series B</SelectItem>
                    <SelectItem value="Bridge">Bridge Round</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="targetAmount">Target amount *</Label>
                <Input
                  id="targetAmount"
                  value={formData.targetAmount}
                  onChange={(e) => updateField('targetAmount', e.target.value)}
                  placeholder="$2M"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="previousFunding">Previous funding (optional)</Label>
                <Input
                  id="previousFunding"
                  value={formData.previousFunding}
                  onChange={(e) => updateField('previousFunding', e.target.value)}
                  placeholder="$500K pre-seed from angels"
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="futureVision">Long-term vision *</Label>
                <Textarea
                  id="futureVision"
                  value={formData.futureVision}
                  onChange={(e) => updateField('futureVision', e.target.value)}
                  placeholder="In 5 years, we'll be the standard platform for..."
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="pitchDeck">Pitch deck URL (optional)</Label>
                <Input
                  id="pitchDeck"
                  value={formData.pitchDeck}
                  onChange={(e) => updateField('pitchDeck', e.target.value)}
                  placeholder="https://docsend.com/your-deck"
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={goBack} disabled={step === 0 || loading} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              Back
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                'Submitting...'
              ) : step < STEPS.length - 1 ? (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </>
              ) : (
                <>
                  Get my personalized analysis
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
          {step === STEPS.length - 1 ? (
            <p className="text-center text-xs text-muted-foreground">We analyze your answers and match you to investors.</p>
          ) : null}
        </form>
      </div>
    </div>
  )
}
