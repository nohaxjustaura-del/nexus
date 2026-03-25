'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AdvancedFilters } from "./advanced-filters"

const filterSelectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

const SECTORS = [
  'AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'Climate Tech', 'Consumer',
  'Enterprise', 'Crypto/Web3', 'EdTech', 'DeepTech', 'Biotech', 'Hardware',
  'Marketplace', 'Developer Tools', 'Security', 'Infrastructure'
]

const STAGES = ['Idea', 'MVP', 'Revenue', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+']

const CHECK_AMOUNTS = [
  { value: '', label: 'Any' },
  { value: '10', label: '$10K' },
  { value: '25', label: '$25K' },
  { value: '50', label: '$50K' },
  { value: '100', label: '$100K' },
  { value: '250', label: '$250K' },
  { value: '500', label: '$500K' },
  { value: '1000', label: '$1M' },
  { value: '2000', label: '$2M' },
  { value: '5000', label: '$5M' },
  { value: '10000', label: '$10M' },
  { value: '20000', label: '$20M+' },
]

const FUND_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'accelerator', label: 'Accelerator' },
  { value: 'fellowship', label: 'Fellowship' },
  { value: 'micro-VC', label: 'Micro-VC' },
  { value: 'institutional', label: 'Institutional VC' },
  { value: 'angel', label: 'Angel Network' },
  { value: 'CVC', label: 'Corporate VC' },
]

export function FilterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const params = new URLSearchParams()
    
    const fundType = formData.get('fundType') as string
    const sector = formData.get('sector') as string
    const stage = formData.get('stage') as string
    const min = formData.get('min') as string
    const max = formData.get('max') as string
    
    // Validate min/max
    if (min && max) {
      const minVal = parseInt(min)
      const maxVal = parseInt(max)
      if (!isNaN(minVal) && !isNaN(maxVal) && minVal > maxVal) {
        alert('Minimum check size cannot be greater than maximum check size')
        return
      }
    }
    
    if (fundType) params.set('fundType', fundType)
    if (sector) params.set('sector', sector)
    if (stage) params.set('stage', stage)
    if (min) params.set('min', min)
    if (max) params.set('max', max)
    
    // Preserve existing advanced filters
    searchParams.forEach((value, key) => {
      if (!['fundType', 'sector', 'stage', 'min', 'max'].includes(key)) {
        params.set(key, value)
      }
    })
    
    router.push(`/founder/discover?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 rounded-lg border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Filter Investors</h2>
      <div className="grid gap-4 md:grid-cols-5">
        <div>
          <Label htmlFor="fundType">Type</Label>
          <select
            className={filterSelectClass}
            id="fundType"
            name="fundType"
            defaultValue={searchParams.get('fundType') || ''}
          >
            {FUND_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="sector">Sector</Label>
          <select
            className={filterSelectClass}
            id="sector"
            name="sector"
            defaultValue={searchParams.get('sector') || ''}
          >
            <option value="">All Sectors</option>
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="stage">Stage</Label>
          <select
            className={filterSelectClass}
            id="stage"
            name="stage"
            defaultValue={searchParams.get('stage') || ''}
          >
            <option value="">All Stages</option>
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="min">Min Check ($K)</Label>
          <select
            className={filterSelectClass}
            id="min"
            name="min"
            defaultValue={searchParams.get('min') || ''}
          >
            {CHECK_AMOUNTS.map((amount) => (
              <option key={amount.value} value={amount.value}>
                {amount.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="max">Max Check ($K)</Label>
          <select
            className={filterSelectClass}
            id="max"
            name="max"
            defaultValue={searchParams.get('max') || ''}
          >
            {CHECK_AMOUNTS.map((amount) => (
              <option key={amount.value} value={amount.value}>
                {amount.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button type="submit" className="mt-4">Apply Filters</Button>
      
      <div className="mt-6">
        <AdvancedFilters onApply={(advancedFilters) => {
          // Merge advanced filters with basic filters
          const params = new URLSearchParams()
          
          // Preserve current basic filters
          const fundType = searchParams.get('fundType') || ''
          const sector = searchParams.get('sector') || ''
          const stage = searchParams.get('stage') || ''
          const min = searchParams.get('min') || ''
          const max = searchParams.get('max') || ''
          
          if (fundType) params.set('fundType', fundType)
          if (sector) params.set('sector', sector)
          if (stage) params.set('stage', stage)
          if (min) params.set('min', min)
          if (max) params.set('max', max)
          
          // Add advanced filters (only non-empty ones)
          Object.entries(advancedFilters).forEach(([key, value]) => {
            if (value && value !== '') {
              params.set(key, value as string)
            } else {
              // Remove filter if it was cleared
              params.delete(key)
            }
          })
          
          router.push(`/founder/discover?${params.toString()}`)
        }} />
      </div>
    </form>
  )
}

