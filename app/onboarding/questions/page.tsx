'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

export default function OnboardingQuestionsPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const DRAFT_KEY = 'nexus_onboarding_questions_draft_v1'
  const [formData, setFormData] = useState({
    // Founder Profile
    background: '',
    technicalSkills: [] as string[],
    previousCompanies: '',
    demographics: [] as string[],
    
    // Startup Profile
    startupName: '',
    oneLiner: '',
    longDescription: '',
    problem: '',
    solution: '',
    targetCustomer: '',
    sectors: [] as string[],
    stage: '',
    businessModel: '',
    
    // Traction
    mrr: '',
    users: '',
    growthRate: '',
    otherTraction: '',
    
    // Fundraising
    fundingAsk: '',
    useOfFunds: '',
    previousFunding: '',
    
    // Pitch Materials
    hasPitchDeck: false,
    pitchDeckUrl: '',
    elevatorPitch: '',
  })

  // Restore onboarding progress on refresh/return.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { step?: unknown; formData?: unknown }

      const sRaw = parsed?.step
      const s =
        typeof sRaw === 'number' ? sRaw : typeof sRaw === 'string' ? parseInt(sRaw, 10) : NaN
      if (Number.isFinite(s) && [1, 2, 3, 4, 5].includes(s)) setStep(s)

      if (parsed?.formData && typeof parsed.formData === 'object') {
        setFormData(parsed.formData as any)
      }
    } catch {}
  }, [])

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (field: string, item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).includes(item)
        ? (prev[field as keyof typeof prev] as string[]).filter(i => i !== item)
        : [...(prev[field as keyof typeof prev] as string[]), item]
    }))
  }

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        try { localStorage.removeItem(DRAFT_KEY) } catch {}
        router.push('/founder/discover')
      }
    } catch (error) {
      console.error('Error saving onboarding:', error)
    }
  }

  // Autosave progress.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, formData }))
      } catch {}
    }, 400)
    return () => clearTimeout(t)
  }, [step, formData])

  return (
    <div className="relative min-h-screen bg-background py-12 px-4 text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(28vh,16rem)] bg-[radial-gradient(ellipse_70%_55%_at_15%_-5%,hsl(var(--primary)/0.06),transparent_58%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="font-heading mb-2 text-3xl font-semibold tracking-tight sm:text-4xl">Tell us about your startup</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            A few questions so we can line up investors, accelerators, and programs that fit your stage and sector
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between">
            <span className="text-sm font-medium text-foreground">Step {step} of 5</span>
            <span className="text-sm text-muted-foreground">{Math.round((step / 5) * 100)}% complete</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted/50">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        <Card className="border border-border/40 bg-card/80 p-8 shadow-sm ring-1 ring-border/15">
          {/* STEP 1: Founder Background */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading mb-4 text-2xl font-semibold tracking-tight">About You (The Founder)</h2>
                <p className="mb-6 text-muted-foreground">Help us understand your background and experience</p>
              </div>

              <div>
                <Label htmlFor="background">What's your background? *</Label>
                <Select value={formData.background} onValueChange={(v) => updateField('background', v)}>
                  <SelectTrigger id="background">
                    <SelectValue placeholder="Select your background" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student / Recent Graduate</SelectItem>
                    <SelectItem value="first-time">First-Time Founder</SelectItem>
                    <SelectItem value="serial">Serial Founder</SelectItem>
                    <SelectItem value="ex-faang">Ex-FAANG / Big Tech</SelectItem>
                    <SelectItem value="operator">Startup Operator (VP/Director level)</SelectItem>
                    <SelectItem value="technical">Technical Lead / Engineer</SelectItem>
                    <SelectItem value="product">Product Manager</SelectItem>
                    <SelectItem value="sales">Sales / GTM Leader</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Technical Skills (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {['Full-Stack Dev', 'AI/ML', 'DevOps', 'Mobile', 'Frontend', 'Backend', 'Data Science', 'Design'].map(skill => (
                    <div key={skill} className="flex items-center space-x-2">
                      <Checkbox
                        id={skill}
                        checked={formData.technicalSkills.includes(skill)}
                        onCheckedChange={() => toggleArrayItem('technicalSkills', skill)}
                      />
                      <label htmlFor={skill} className="text-sm cursor-pointer">{skill}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="previousCompanies">Previous Companies / Notable Achievements (Optional)</Label>
                <Textarea
                  id="previousCompanies"
                  value={formData.previousCompanies}
                  onChange={(e) => updateField('previousCompanies', e.target.value)}
                  placeholder="e.g., Software Engineer at Google, Founded company that reached 10K users, etc."
                  rows={3}
                />
              </div>

              <div>
                <Label>Optional: Help us find diversity-focused programs (Select if applicable)</Label>
                <p className="mb-3 text-xs text-muted-foreground">
                  Some investors and accelerators specifically support underrepresented founders. This info helps us match you with them.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {['Woman Founder', 'BIPOC Founder', 'LGBTQ+ Founder', 'Immigrant Founder', 'First-Gen', 'International Student'].map(demo => (
                    <div key={demo} className="flex items-center space-x-2">
                      <Checkbox
                        id={demo}
                        checked={formData.demographics.includes(demo)}
                        onCheckedChange={() => toggleArrayItem('demographics', demo)}
                      />
                      <label htmlFor={demo} className="text-sm cursor-pointer">{demo}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Startup Overview */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading mb-4 text-2xl font-semibold tracking-tight">Your Startup</h2>
                <p className="mb-6 text-muted-foreground">Tell us about what you're building</p>
              </div>

              <div>
                <Label htmlFor="startupName">Company Name *</Label>
                <Input
                  id="startupName"
                  value={formData.startupName}
                  onChange={(e) => updateField('startupName', e.target.value)}
                  placeholder="Your company name"
                />
              </div>

              <div>
                <Label htmlFor="oneLiner">One-Line Description *</Label>
                <Input
                  id="oneLiner"
                  value={formData.oneLiner}
                  onChange={(e) => updateField('oneLiner', e.target.value)}
                  placeholder="e.g., automated code review for open source maintainers"
                />
                <p className="mt-1 text-xs text-muted-foreground">Make it clear and specific</p>
              </div>

              <div>
                <Label htmlFor="problem">What problem are you solving? *</Label>
                <Textarea
                  id="problem"
                  value={formData.problem}
                  onChange={(e) => updateField('problem', e.target.value)}
                  placeholder="Describe the pain point your customers face"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="solution">How does your product solve it? *</Label>
                <Textarea
                  id="solution"
                  value={formData.solution}
                  onChange={(e) => updateField('solution', e.target.value)}
                  placeholder="Describe your solution and how it works"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="targetCustomer">Who is your target customer? *</Label>
                <Input
                  id="targetCustomer"
                  value={formData.targetCustomer}
                  onChange={(e) => updateField('targetCustomer', e.target.value)}
                  placeholder="e.g., B2B SaaS companies with 50-500 employees"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Sector & Stage */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading mb-4 text-2xl font-semibold tracking-tight">Sector & Stage</h2>
                <p className="mb-6 text-muted-foreground">Help us categorize your startup</p>
              </div>

              <div>
                <Label>Select Your Sectors (Choose 2-4) *</Label>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {['AI/ML', 'B2B SaaS', 'Climate Tech', 'Consumer', 'Crypto/Web3', 'Developer Tools', 'EdTech', 'Fintech', 
                    'Healthcare', 'Infrastructure', 'Marketplace', 'Open Source', 'Security', 'Deep Tech'].map(sector => (
                    <div key={sector} className="flex items-center space-x-2">
                      <Checkbox
                        id={sector}
                        checked={formData.sectors.includes(sector)}
                        onCheckedChange={() => toggleArrayItem('sectors', sector)}
                      />
                      <label htmlFor={sector} className="text-sm cursor-pointer">{sector}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="stage">Current Stage *</Label>
                <Select value={formData.stage} onValueChange={(v) => updateField('stage', v)}>
                  <SelectTrigger id="stage">
                    <SelectValue placeholder="Select your stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea Stage (no product yet)</SelectItem>
                    <SelectItem value="mvp">MVP / Building</SelectItem>
                    <SelectItem value="pre-seed">Pre-Seed (early users, no revenue)</SelectItem>
                    <SelectItem value="seed">Seed (product-market fit, some revenue)</SelectItem>
                    <SelectItem value="series-a">Series A Ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="businessModel">Business Model *</Label>
                <Select value={formData.businessModel} onValueChange={(v) => updateField('businessModel', v)}>
                  <SelectTrigger id="businessModel">
                    <SelectValue placeholder="Select your business model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saas">SaaS Subscription</SelectItem>
                    <SelectItem value="transaction">Transaction Fees</SelectItem>
                    <SelectItem value="marketplace">Marketplace (take rate)</SelectItem>
                    <SelectItem value="usage">Usage-Based Pricing</SelectItem>
                    <SelectItem value="freemium">Freemium</SelectItem>
                    <SelectItem value="ads">Advertising</SelectItem>
                    <SelectItem value="open-source">Open Source (commercial edition)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* STEP 4: Traction */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading mb-4 text-2xl font-semibold tracking-tight">Traction & Metrics</h2>
                <p className="mb-6 text-muted-foreground">Show us what you've achieved so far</p>
              </div>

              <div>
                <Label htmlFor="mrr">Monthly Recurring Revenue (MRR)</Label>
                <Input
                  id="mrr"
                  value={formData.mrr}
                  onChange={(e) => updateField('mrr', e.target.value)}
                  placeholder="e.g., $5,000 or '0' if pre-revenue"
                />
              </div>

              <div>
                <Label htmlFor="users">Total Users / Customers</Label>
                <Input
                  id="users"
                  value={formData.users}
                  onChange={(e) => updateField('users', e.target.value)}
                  placeholder="e.g., 1,000 users or 50 paying customers"
                />
              </div>

              <div>
                <Label htmlFor="growthRate">Growth Rate (Optional)</Label>
                <Input
                  id="growthRate"
                  value={formData.growthRate}
                  onChange={(e) => updateField('growthRate', e.target.value)}
                  placeholder="e.g., 20% MoM or 3x YoY"
                />
              </div>

              <div>
                <Label htmlFor="otherTraction">Other Traction (Optional)</Label>
                <Textarea
                  id="otherTraction"
                  value={formData.otherTraction}
                  onChange={(e) => updateField('otherTraction', e.target.value)}
                  placeholder="e.g., LOIs signed, pilot programs, partnerships, press coverage, waitlist size, etc."
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* STEP 5: Fundraising & Pitch */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-heading mb-4 text-2xl font-semibold tracking-tight">Fundraising Goals</h2>
                <p className="mb-6 text-muted-foreground">Tell us about your fundraising plans</p>
              </div>

              <div>
                <Label htmlFor="fundingAsk">How much are you raising? *</Label>
                <Input
                  id="fundingAsk"
                  value={formData.fundingAsk}
                  onChange={(e) => updateField('fundingAsk', e.target.value)}
                  placeholder="e.g., $500K or $1M - $2M"
                />
              </div>

              <div>
                <Label htmlFor="useOfFunds">How will you use the funds? *</Label>
                <Textarea
                  id="useOfFunds"
                  value={formData.useOfFunds}
                  onChange={(e) => updateField('useOfFunds', e.target.value)}
                  placeholder="e.g., 50% engineering, 30% sales & marketing, 20% operations"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="previousFunding">Previous Funding (if any)</Label>
                <Input
                  id="previousFunding"
                  value={formData.previousFunding}
                  onChange={(e) => updateField('previousFunding', e.target.value)}
                  placeholder="e.g., $100K from friends & family, or 'None' if first round"
                />
              </div>

              <div>
                <Label htmlFor="elevatorPitch">Your 30-Second Elevator Pitch *</Label>
                <Textarea
                  id="elevatorPitch"
                  value={formData.elevatorPitch}
                  onChange={(e) => updateField('elevatorPitch', e.target.value)}
                  placeholder="Write your elevator pitch as if you're speaking to an investor at a conference"
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasPitchDeck"
                  checked={formData.hasPitchDeck}
                  onCheckedChange={(checked) => updateField('hasPitchDeck', checked)}
                />
                <label htmlFor="hasPitchDeck" className="text-sm cursor-pointer">
                  I have a pitch deck ready
                </label>
              </div>

              {formData.hasPitchDeck && (
                <div>
                  <Label htmlFor="pitchDeckUrl">Pitch Deck URL (Google Drive, Dropbox, etc.)</Label>
                  <Input
                    id="pitchDeckUrl"
                    value={formData.pitchDeckUrl}
                    onChange={(e) => updateField('pitchDeckUrl', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between border-t border-border/40 pt-6">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              â† Back
            </Button>

            {step < 5 ? (
              <Button onClick={() => setStep(step + 1)}>Next â†’</Button>
            ) : (
              <Button onClick={handleSubmit}>Complete &amp; get matches</Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}



