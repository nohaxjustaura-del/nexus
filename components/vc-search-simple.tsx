'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

function VCSearchSimple() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize from URL params on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setSearchQuery(params.get('search') || '')
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const updateURL = (value: string) => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        
        if (value.trim()) {
          params.set('search', value.trim())
        } else {
          params.delete('search')
        }
        
        router.push(`/founder/discover?${params.toString()}`)
      }
    } catch (error) {
      // Silently fail
    }
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Debounce the URL update
    timeoutRef.current = setTimeout(() => {
      updateURL(value)
    }, 300)
  }

  const clearSearch = () => {
    setSearchQuery('')
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    updateURL('')
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="vc-search-input"
          name="vc-search"
          type="text"
          placeholder="Search by firm name, sector, stage, or location..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10 h-12 text-base border-2 focus:border-primary transition-colors"
          autoComplete="off"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {!searchQuery && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
          <span>Try searching for:</span>
          <button
            onClick={() => handleSearch('AI')}
            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            AI
          </button>
          <button
            onClick={() => handleSearch('Seed')}
            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Seed
          </button>
          <button
            onClick={() => handleSearch('San Francisco')}
            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            San Francisco
          </button>
        </div>
      )}
    </div>
  )
}

export default VCSearchSimple
