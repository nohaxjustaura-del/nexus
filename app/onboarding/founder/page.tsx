'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function FounderOnboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Founder Info
    founderName: '',
    founderBackground: '',
    founderExperience: '',
    coFounders: '',
    
    // Startup Info
    startupName: '',
    industry: '',
    stage: '',
    location: '',
    businessModel: '',
    
    // Problem & Solution
    problemStatement: '',
    solution: '',
    uniqueValue: '',
    
    // Traction
    currentTraction: '',
    revenue: '',
    users: '',
    growth: '',
    
    // Fundraising
    fundraisingStage: '',
    targetAmount: '',
    previousFunding: '',
    
    // Additional
    pitchDeck: '',
    competitors: '',
    futureVision: ''
  })

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/onboarding/founder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        router.push('/analysis')
      } else {
        alert('Failed to submit. Please try again.')
      }
    } catch (error) {
      console.error('Onboarding error:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">AI Fund Coach Onboarding</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Tell Us About Your Startup
          </h1>
          <p className="text-lg text-gray-600">
            We'll analyze your startup and match you with the best investors
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-8">
          {/* Section 1: Founder */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">About You</h2>
            
            <div>
              <Label htmlFor="founderName" className="text-base">Your Name *</Label>
              <Input
                id="founderName"
                value={formData.founderName}
                onChange={(e) => updateField('founderName', e.target.value)}
                placeholder="Jane Smith"
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="founderBackground" className="text-base">Your Background *</Label>
              <p className="text-sm text-gray-500 mt-1">Education, previous roles, technical skills</p>
              <Textarea
                id="founderBackground"
                value={formData.founderBackground}
                onChange={(e) => updateField('founderBackground', e.target.value)}
                placeholder="Ex: CS degree from MIT, 5 years as Software Engineer at Google..."
                required
                rows={3}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="founderExperience" className="text-base">Founder Experience *</Label>
              <Input
                id="founderExperience"
                value={formData.founderExperience}
                onChange={(e) => updateField('founderExperience', e.target.value)}
                placeholder="First-time founder, previously led 10-person team"
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="coFounders" className="text-base">Co-Founders (Optional)</Label>
              <Input
                id="coFounders"
                value={formData.coFounders}
                onChange={(e) => updateField('coFounders', e.target.value)}
                placeholder="John Doe (ex-Stripe, sales background)"
                className="mt-2"
              />
            </div>
          </div>

          {/* Section 2: Startup */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">Your Startup</h2>
            
            <div>
              <Label htmlFor="startupName" className="text-base">Startup Name *</Label>
              <Input
                id="startupName"
                value={formData.startupName}
                onChange={(e) => updateField('startupName', e.target.value)}
                placeholder="Acme AI"
                required
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industry" className="text-base">Industry *</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  placeholder="AI/ML, Fintech, SaaS..."
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="location" className="text-base">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="San Francisco, CA"
                  required
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="stage" className="text-base">Stage *</Label>
              <Select value={formData.stage} onValueChange={(v: string) => updateField('stage', v)} required>
                <SelectTrigger id="stage" className="mt-2">
                  <SelectValue placeholder="Select your stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pre-seed">Pre-seed</SelectItem>
                  <SelectItem value="Seed">Seed</SelectItem>
                  <SelectItem value="Series A">Series A</SelectItem>
                  <SelectItem value="Series B">Series B</SelectItem>
                  <SelectItem value="Series C+">Series C+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="businessModel" className="text-base">Business Model *</Label>
              <Input
                id="businessModel"
                value={formData.businessModel}
                onChange={(e) => updateField('businessModel', e.target.value)}
                placeholder="B2B SaaS, subscription-based"
                required
                className="mt-2"
              />
            </div>
          </div>

          {/* Section 3: Problem & Solution */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">The Problem & Solution</h2>
            
            <div>
              <Label htmlFor="problemStatement" className="text-base">What Problem Are You Solving? *</Label>
              <Textarea
                id="problemStatement"
                value={formData.problemStatement}
                onChange={(e) => updateField('problemStatement', e.target.value)}
                placeholder="Companies struggle with X, which costs them Y..."
                required
                rows={4}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="solution" className="text-base">Your Solution *</Label>
              <Textarea
                id="solution"
                value={formData.solution}
                onChange={(e) => updateField('solution', e.target.value)}
                placeholder="We solve this by..."
                required
                rows={4}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="uniqueValue" className="text-base">What Makes You Unique? *</Label>
              <Textarea
                id="uniqueValue"
                value={formData.uniqueValue}
                onChange={(e) => updateField('uniqueValue', e.target.value)}
                placeholder="Our proprietary technology does X, which is 10x better than competitors..."
                required
                rows={3}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="competitors" className="text-base">Who Are Your Competitors? (Optional)</Label>
              <Input
                id="competitors"
                value={formData.competitors}
                onChange={(e) => updateField('competitors', e.target.value)}
                placeholder="Competitor A, Competitor B - but we differentiate by..."
                className="mt-2"
              />
            </div>
          </div>

          {/* Section 4: Traction */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">Traction & Metrics</h2>
            
            <div>
              <Label htmlFor="currentTraction" className="text-base">Current Traction *</Label>
              <Textarea
                id="currentTraction"
                value={formData.currentTraction}
                onChange={(e) => updateField('currentTraction', e.target.value)}
                placeholder="Launched 6 months ago, 5 pilot customers, strong engagement..."
                required
                rows={3}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="revenue" className="text-base">Revenue (Optional)</Label>
                <Input
                  id="revenue"
                  value={formData.revenue}
                  onChange={(e) => updateField('revenue', e.target.value)}
                  placeholder="$15K MRR"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="users" className="text-base">Users (Optional)</Label>
                <Input
                  id="users"
                  value={formData.users}
                  onChange={(e) => updateField('users', e.target.value)}
                  placeholder="250 active"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="growth" className="text-base">Growth (Optional)</Label>
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

          {/* Section 5: Fundraising */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">Fundraising</h2>
            
            <div>
              <Label htmlFor="fundraisingStage" className="text-base">Fundraising Stage *</Label>
              <Select value={formData.fundraisingStage} onValueChange={(v: string) => updateField('fundraisingStage', v)} required>
                <SelectTrigger id="fundraisingStage" className="mt-2">
                  <SelectValue placeholder="What are you raising?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pre-seed">Pre-seed Round</SelectItem>
                  <SelectItem value="Seed">Seed Round</SelectItem>
                  <SelectItem value="Series A">Series A</SelectItem>
                  <SelectItem value="Series B">Series B</SelectItem>
                  <SelectItem value="Bridge">Bridge Round</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="targetAmount" className="text-base">Target Amount *</Label>
              <Input
                id="targetAmount"
                value={formData.targetAmount}
                onChange={(e) => updateField('targetAmount', e.target.value)}
                placeholder="$2M"
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="previousFunding" className="text-base">Previous Funding (Optional)</Label>
              <Input
                id="previousFunding"
                value={formData.previousFunding}
                onChange={(e) => updateField('previousFunding', e.target.value)}
                placeholder="$500K pre-seed from angels"
                className="mt-2"
              />
            </div>
          </div>

          {/* Section 6: Vision & Assets */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">Vision & Materials</h2>
            
            <div>
              <Label htmlFor="futureVision" className="text-base">Long-term Vision *</Label>
              <Textarea
                id="futureVision"
                value={formData.futureVision}
                onChange={(e) => updateField('futureVision', e.target.value)}
                placeholder="In 5 years, we'll be the standard platform for..."
                required
                rows={3}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="pitchDeck" className="text-base">Pitch Deck URL (Optional)</Label>
              <Input
                id="pitchDeck"
                value={formData.pitchDeck}
                onChange={(e) => updateField('pitchDeck', e.target.value)}
                placeholder="https://docsend.com/your-deck"
                className="mt-2"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-6 text-lg bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 hover:from-indigo-700 hover:via-blue-700 hover:to-purple-700 shadow-lg"
            >
              {loading ? (
                <span>Analyzing Your Startup...</span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Get My Personalized Analysis
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
            <p className="text-center text-sm text-gray-500 mt-4">
              Takes ~3 seconds to analyze your startup and match with investors
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
