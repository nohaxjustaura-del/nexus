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
      <div className="relative rounded-xl ring-1 ring-white/[0.05]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
        <Input
          id="vc-search-input"
          name="vc-search"
          type="text"
          placeholder="Search by firm name, sector, stage, or location..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10 h-12 text-base rounded-xl border-border/70 bg-card/70 backdrop-blur-md shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.04)] placeholder:text-muted-foreground/75 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/25"
          autoComplete="off"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/70"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {!searchQuery && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Try:</span>
          <button
            type="button"
            onClick={() => handleSearch('AI')}
            className="px-2.5 py-1 rounded-md border border-border/80 bg-card/60 hover:bg-muted/80 hover:border-border transition-colors text-muted-foreground hover:text-foreground"
          >
            AI
          </button>
          <button
            type="button"
            onClick={() => handleSearch('Seed')}
            className="px-2.5 py-1 rounded-md border border-border/80 bg-card/60 hover:bg-muted/80 hover:border-border transition-colors text-muted-foreground hover:text-foreground"
          >
            Seed
          </button>
          <button
            type="button"
            onClick={() => handleSearch('San Francisco')}
            className="px-2.5 py-1 rounded-md border border-border/80 bg-card/60 hover:bg-muted/80 hover:border-border transition-colors text-muted-foreground hover:text-foreground"
          >
            San Francisco
          </button>
        </div>
      )}
    </div>
  )
}

export default VCSearchSimple
