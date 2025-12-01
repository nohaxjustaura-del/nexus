'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronUp, Filter } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AdvancedFilters({ onApply }: { onApply: (filters: any) => void }) {
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  
  // Initialize filters from URL params
  const [filters, setFilters] = useState({
    // Logistics
    relocationRequired: '',
    dropOutRequired: '',
    timeCommitment: '',
    geographicRestriction: '',
    visaSupport: '',
    
    // Founder Structure
    soloFoundersAccepted: '',
    teamComposition: '',
    
    // Company Stage & Type
    stageMatch: '',
    sectorRestrictions: '',
    entityRequirements: '',
    openSourceFriendly: '',
    hardwareTolerance: '',
    
    // Investment Structure
    willLead: '',
    targetOwnershipMin: '',
    targetOwnershipMax: '',
    documentType: '',
    
    // Hidden Costs
    programFees: '',
    equityForPerks: '',
    mfnOrSideLetters: '',
    
    // Follow-on Support
    proRataRights: '',
    followOnRate: '',
    reserveFund: '',
    bridgeTrackRecord: '',
    
    // Control Terms
    boardSeatAtSeed: '',
    observerRights: '',
    founderVestingReset: '',
    
    // Process & Timing
    applicationType: '',
    decisionSpeed: '',
    interviewFormat: '',
    canStayInStealth: '',
    
    // Value-Add
    customerIntros: '',
    salesPlaybookSupport: '',
    recruitingHelp: '',
    technicalResources: '',
    operationalSupport: '',
    regulatoryExpertise: '',
    gpuComputeAccess: '',
    tokenPolicy: '',
    
    // Student-Specific
    schoolIPPolicy: '',
    loaWrittenPolicies: '',
    examFlexibility: '',
    financialAidImpact: '',
  })

  // Load filters from URL on mount
  useEffect(() => {
    const urlFilters: any = {}
    const filterKeys = [
      'relocationRequired', 'dropOutRequired', 'timeCommitment', 'geographicRestriction', 'visaSupport',
      'soloFoundersAccepted', 'teamComposition',
      'stageMatch', 'sectorRestrictions', 'entityRequirements', 'openSourceFriendly', 'hardwareTolerance',
      'willLead', 'targetOwnershipMin', 'targetOwnershipMax', 'documentType',
      'programFees', 'equityForPerks', 'mfnOrSideLetters',
      'proRataRights', 'followOnRate', 'reserveFund', 'bridgeTrackRecord',
      'boardSeatAtSeed', 'observerRights', 'founderVestingReset',
      'applicationType', 'decisionSpeed', 'interviewFormat', 'canStayInStealth',
      'customerIntros', 'salesPlaybookSupport', 'recruitingHelp', 'technicalResources',
      'operationalSupport', 'regulatoryExpertise', 'gpuComputeAccess', 'tokenPolicy',
      'schoolIPPolicy', 'loaWrittenPolicies', 'examFlexibility', 'financialAidImpact',
    ]
    
    filterKeys.forEach(key => {
      const value = searchParams.get(key)
      if (value) {
        urlFilters[key] = value
      }
    })
    
    if (Object.keys(urlFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...urlFilters }))
    }
  }, [searchParams])

  const handleChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleApply = () => {
    onApply(filters)
  }

  const handleReset = () => {
    const resetFilters: any = {}
    Object.keys(filters).forEach(key => {
      resetFilters[key] = ''
    })
    setFilters(resetFilters)
    onApply(resetFilters)
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="mb-4"
      >
        <Filter className="mr-2 h-4 w-4" />
        Show Advanced Filters
        <ChevronDown className="ml-2 h-4 w-4" />
      </Button>
    )
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced VC/Accelerator Filters
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logistics */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Logistics</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="relocationRequired">Relocation Required?</Label>
              <Select
                id="relocationRequired"
                value={filters.relocationRequired}
                onChange={(e) => handleChange('relocationRequired', e.target.value)}
              >
                <option value="">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="flexible">Flexible</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="dropOutRequired">Must Drop Out/Quit Job?</Label>
              <Select
                id="dropOutRequired"
                value={filters.dropOutRequired}
                onChange={(e) => handleChange('dropOutRequired', e.target.value)}
              >
                <option value="">Any</option>
                <option value="required">Required</option>
                <option value="soft">Soft Pressure</option>
                <option value="no">No</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeCommitment">Time Commitment</Label>
              <Select
                id="timeCommitment"
                value={filters.timeCommitment}
                onChange={(e) => handleChange('timeCommitment', e.target.value)}
              >
                <option value="">Any</option>
                <option value="fulltime">Full-time Only</option>
                <option value="parttime">Part-time OK</option>
                <option value="evening">Evening-friendly</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="geographicRestriction">Geographic Restriction</Label>
              <Select
                id="geographicRestriction"
                value={filters.geographicRestriction}
                onChange={(e) => handleChange('geographicRestriction', e.target.value)}
              >
                <option value="">Any</option>
                <option value="must-be-city">Must be in X city</option>
                <option value="us-only">US Only</option>
                <option value="remote-ok">Remote OK</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="visaSupport">Visa Support Available?</Label>
              <Select
                id="visaSupport"
                value={filters.visaSupport}
                onChange={(e) => handleChange('visaSupport', e.target.value)}
              >
                <option value="">Any</option>
                <option value="none">None</option>
                <option value="letters">Letters Only</option>
                <option value="full">Full Counsel</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Founder Structure */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Founder Structure</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="soloFoundersAccepted">Solo Founders Accepted?</Label>
              <Select
                id="soloFoundersAccepted"
                value={filters.soloFoundersAccepted}
                onChange={(e) => handleChange('soloFoundersAccepted', e.target.value)}
              >
                <option value="">Any</option>
                <option value="no">No</option>
                <option value="discouraged">Yes but Discouraged</option>
                <option value="welcome">Explicitly Welcome</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="teamComposition">Team Composition Requirements</Label>
              <Select
                id="teamComposition"
                value={filters.teamComposition}
                onChange={(e) => handleChange('teamComposition', e.target.value)}
              >
                <option value="">Any</option>
                <option value="tech-business">Tech + Business Required</option>
                <option value="flexible">Flexible</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Company Stage & Type */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Company Stage & Type</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="stageMatch">Stage Match</Label>
              <Select
                id="stageMatch"
                value={filters.stageMatch}
                onChange={(e) => handleChange('stageMatch', e.target.value)}
              >
                <option value="">Any</option>
                <option value="idea-only">Idea Only</option>
                <option value="mvp-required">MVP Required</option>
                <option value="revenue-needed">Revenue Traction Needed</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="sectorRestrictions">Sector Restrictions</Label>
              <Select
                id="sectorRestrictions"
                value={filters.sectorRestrictions}
                onChange={(e) => handleChange('sectorRestrictions', e.target.value)}
              >
                <option value="">Any</option>
                <option value="ai-heavy">AI-Heavy Cohorts</option>
                <option value="no-crypto">No Crypto</option>
                <option value="regulated-ok">Regulated OK</option>
                <option value="open">Open</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="entityRequirements">Entity Requirements</Label>
              <Select
                id="entityRequirements"
                value={filters.entityRequirements}
                onChange={(e) => handleChange('entityRequirements', e.target.value)}
              >
                <option value="">Any</option>
                <option value="delaware-corp">Delaware C-Corp Only</option>
                <option value="non-us-ok">Non-US OK</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="openSourceFriendly">Open Source Friendly?</Label>
              <Select
                id="openSourceFriendly"
                value={filters.openSourceFriendly}
                onChange={(e) => handleChange('openSourceFriendly', e.target.value)}
              >
                <option value="">Any</option>
                <option value="no">No</option>
                <option value="with-conditions">With Conditions</option>
                <option value="yes">Yes</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="hardwareTolerance">Hardware Tolerance</Label>
              <Select
                id="hardwareTolerance"
                value={filters.hardwareTolerance}
                onChange={(e) => handleChange('hardwareTolerance', e.target.value)}
              >
                <option value="">Any</option>
                <option value="software-only">Software Only</option>
                <option value="ok-long-cycles">OK with Long Cycles</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Investment Structure */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Investment Structure</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="willLead">Will They Lead Your Round?</Label>
              <Select
                id="willLead"
                value={filters.willLead}
                onChange={(e) => handleChange('willLead', e.target.value)}
              >
                <option value="">Any</option>
                <option value="never">Never</option>
                <option value="sometimes">Sometimes</option>
                <option value="usually">Usually</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="targetOwnershipMin">Target Ownership Min (%)</Label>
              <Input
                id="targetOwnershipMin"
                type="number"
                value={filters.targetOwnershipMin}
                onChange={(e) => handleChange('targetOwnershipMin', e.target.value)}
                placeholder="5"
              />
            </div>
            <div>
              <Label htmlFor="targetOwnershipMax">Target Ownership Max (%)</Label>
              <Input
                id="targetOwnershipMax"
                type="number"
                value={filters.targetOwnershipMax}
                onChange={(e) => handleChange('targetOwnershipMax', e.target.value)}
                placeholder="20"
              />
            </div>
            <div>
              <Label htmlFor="documentType">Document Type</Label>
              <Select
                id="documentType"
                value={filters.documentType}
                onChange={(e) => handleChange('documentType', e.target.value)}
              >
                <option value="">Any</option>
                <option value="post-money-safe">Post-money SAFE</option>
                <option value="pre-money-safe">Pre-money SAFE</option>
                <option value="priced-round">Priced Round</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Hidden Costs */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Hidden Costs</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="programFees">Program Fees</Label>
              <Select
                id="programFees"
                value={filters.programFees}
                onChange={(e) => handleChange('programFees', e.target.value)}
              >
                <option value="">Any</option>
                <option value="0">$0</option>
                <option value="has-fees">Has Fees</option>
                <option value="equity">Equity %</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="equityForPerks">Equity for Perks?</Label>
              <Select
                id="equityForPerks"
                value={filters.equityForPerks}
                onChange={(e) => handleChange('equityForPerks', e.target.value)}
              >
                <option value="">Any</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="mfnOrSideLetters">MFN or Side Letters</Label>
              <Select
                id="mfnOrSideLetters"
                value={filters.mfnOrSideLetters}
                onChange={(e) => handleChange('mfnOrSideLetters', e.target.value)}
              >
                <option value="">Any</option>
                <option value="standard">Standard</option>
                <option value="custom-restrictions">Custom Restrictions</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Follow-on Support */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Follow-on Support</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="proRataRights">Pro-rata Rights</Label>
              <Select
                id="proRataRights"
                value={filters.proRataRights}
                onChange={(e) => handleChange('proRataRights', e.target.value)}
              >
                <option value="">Any</option>
                <option value="none">None</option>
                <option value="discretionary">Discretionary</option>
                <option value="guaranteed">Guaranteed</option>
                <option value="super">Super Pro-rata</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="followOnRate">Historical Follow-on Rate (%)</Label>
              <Input
                id="followOnRate"
                type="number"
                value={filters.followOnRate}
                onChange={(e) => handleChange('followOnRate', e.target.value)}
                placeholder="50"
              />
            </div>
            <div>
              <Label htmlFor="reserveFund">Reserve Fund Available?</Label>
              <Select
                id="reserveFund"
                value={filters.reserveFund}
                onChange={(e) => handleChange('reserveFund', e.target.value)}
              >
                <option value="">Any</option>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="bridgeTrackRecord">Bridge Track Record</Label>
              <Select
                id="bridgeTrackRecord"
                value={filters.bridgeTrackRecord}
                onChange={(e) => handleChange('bridgeTrackRecord', e.target.value)}
              >
                <option value="">Any</option>
                <option value="punitive">Punitive</option>
                <option value="fair">Fair</option>
                <option value="generous">Generous</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Control Terms */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Control Terms</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="boardSeatAtSeed">Board Seat at Seed?</Label>
              <Select
                id="boardSeatAtSeed"
                value={filters.boardSeatAtSeed}
                onChange={(e) => handleChange('boardSeatAtSeed', e.target.value)}
              >
                <option value="">Any</option>
                <option value="always">Always</option>
                <option value="sometimes">Sometimes</option>
                <option value="never">Never</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="observerRights">Observer Rights</Label>
              <Select
                id="observerRights"
                value={filters.observerRights}
                onChange={(e) => handleChange('observerRights', e.target.value)}
              >
                <option value="">Any</option>
                <option value="standard">Standard</option>
                <option value="with-veto">With Veto</option>
                <option value="none">None</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="founderVestingReset">Founder Vesting Reset Required?</Label>
              <Select
                id="founderVestingReset"
                value={filters.founderVestingReset}
                onChange={(e) => handleChange('founderVestingReset', e.target.value)}
              >
                <option value="">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="negotiable">Negotiable</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Process & Timing */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Process & Timing</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="applicationType">Application Type</Label>
              <Select
                id="applicationType"
                value={filters.applicationType}
                onChange={(e) => handleChange('applicationType', e.target.value)}
              >
                <option value="">Any</option>
                <option value="cold-ok">Cold OK</option>
                <option value="warm-intro">Warm Intro Preferred</option>
                <option value="invite-only">Invite-only</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="decisionSpeed">Decision Speed (days)</Label>
              <Input
                id="decisionSpeed"
                type="number"
                value={filters.decisionSpeed}
                onChange={(e) => handleChange('decisionSpeed', e.target.value)}
                placeholder="14"
              />
            </div>
            <div>
              <Label htmlFor="interviewFormat">Interview Format</Label>
              <Select
                id="interviewFormat"
                value={filters.interviewFormat}
                onChange={(e) => handleChange('interviewFormat', e.target.value)}
              >
                <option value="">Any</option>
                <option value="quick-screen">Quick Screen</option>
                <option value="technical">Technical Deep-dive</option>
                <option value="build-test">Build Test</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="canStayInStealth">Can Stay in Stealth?</Label>
              <Select
                id="canStayInStealth"
                value={filters.canStayInStealth}
                onChange={(e) => handleChange('canStayInStealth', e.target.value)}
              >
                <option value="">Any</option>
                <option value="must-demo">Must do Demo Day</option>
                <option value="private-intros">Private Intros OK</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Value-Add */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Value-Add</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="customerIntros">Customer Intros</Label>
              <Select
                id="customerIntros"
                value={filters.customerIntros}
                onChange={(e) => handleChange('customerIntros', e.target.value)}
              >
                <option value="">Any</option>
                <option value="enterprise">Enterprise Design Partners</option>
                <option value="consumer">Consumer Channels</option>
                <option value="none">None</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="salesPlaybookSupport">Sales Playbook Support</Label>
              <Select
                id="salesPlaybookSupport"
                value={filters.salesPlaybookSupport}
                onChange={(e) => handleChange('salesPlaybookSupport', e.target.value)}
              >
                <option value="">Any</option>
                <option value="generic">Generic</option>
                <option value="vertical">Vertical-specific</option>
                <option value="hands-on">Hands-on</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="recruitingHelp">Recruiting Help</Label>
              <Select
                id="recruitingHelp"
                value={filters.recruitingHelp}
                onChange={(e) => handleChange('recruitingHelp', e.target.value)}
              >
                <option value="">Any</option>
                <option value="intro-network">Intro Network</option>
                <option value="in-house">In-house Recruiter</option>
                <option value="job-board">Job Board Access</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="technicalResources">Technical Resources</Label>
              <Select
                id="technicalResources"
                value={filters.technicalResources}
                onChange={(e) => handleChange('technicalResources', e.target.value)}
              >
                <option value="">Any</option>
                <option value="cloud-credits">Cloud Credits</option>
                <option value="staff-eng">Staff Eng Hours</option>
                <option value="ml-infra">ML Infrastructure</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="operationalSupport">Operational Support</Label>
              <Select
                id="operationalSupport"
                value={filters.operationalSupport}
                onChange={(e) => handleChange('operationalSupport', e.target.value)}
              >
                <option value="">Any</option>
                <option value="pricing">Pricing</option>
                <option value="soc2">SOC2</option>
                <option value="legal-intros">Legal Intros</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="regulatoryExpertise">Regulatory Expertise</Label>
              <Select
                id="regulatoryExpertise"
                value={filters.regulatoryExpertise}
                onChange={(e) => handleChange('regulatoryExpertise', e.target.value)}
              >
                <option value="">Any</option>
                <option value="fintech">Fintech</option>
                <option value="healthcare">Healthcare</option>
                <option value="defense">Defense</option>
                <option value="crypto">Crypto Counsel</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="gpuComputeAccess">GPU/Compute Access</Label>
              <Select
                id="gpuComputeAccess"
                value={filters.gpuComputeAccess}
                onChange={(e) => handleChange('gpuComputeAccess', e.target.value)}
              >
                <option value="">Any</option>
                <option value="real-allocation">Real Allocation</option>
                <option value="just-credits">Just Credits</option>
                <option value="none">None</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="tokenPolicy">Token Policy</Label>
              <Select
                id="tokenPolicy"
                value={filters.tokenPolicy}
                onChange={(e) => handleChange('tokenPolicy', e.target.value)}
              >
                <option value="">Any</option>
                <option value="equity-only">Equity Only</option>
                <option value="dual-structure">Dual Structure OK</option>
                <option value="warrants">Warrants</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Student-Specific */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">Student-Specific (If Applicable)</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="schoolIPPolicy">School IP Policy Guidance?</Label>
              <Select
                id="schoolIPPolicy"
                value={filters.schoolIPPolicy}
                onChange={(e) => handleChange('schoolIPPolicy', e.target.value)}
              >
                <option value="">Any</option>
                <option value="no">No</option>
                <option value="generic">Generic</option>
                <option value="school-specific">School-specific Help</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="loaWrittenPolicies">LOA Written Policies?</Label>
              <Select
                id="loaWrittenPolicies"
                value={filters.loaWrittenPolicies}
                onChange={(e) => handleChange('loaWrittenPolicies', e.target.value)}
              >
                <option value="">Any</option>
                <option value="no">No</option>
                <option value="yes">Leave Process Documented</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="examFlexibility">Exam Flexibility?</Label>
              <Select
                id="examFlexibility"
                value={filters.examFlexibility}
                onChange={(e) => handleChange('examFlexibility', e.target.value)}
              >
                <option value="">Any</option>
                <option value="rigid">Rigid Schedule</option>
                <option value="accommodating">Accommodating</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="financialAidImpact">Financial Aid Impact?</Label>
              <Select
                id="financialAidImpact"
                value={filters.financialAidImpact}
                onChange={(e) => handleChange('financialAidImpact', e.target.value)}
              >
                <option value="">Any</option>
                <option value="could-affect">Could Affect Scholarships</option>
                <option value="cleared">Cleared</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="button" onClick={handleApply} className="flex-1">
            Apply Advanced Filters
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset All
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}



