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
    <div className="w-full max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="vc-search-input"
          name="vc-search"
          type="text"
          placeholder="Search firms or partners…"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-10 rounded-lg border-border bg-background pl-9 pr-9 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-1"
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
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="mr-0.5">Try</span>
          {(['AI', 'Seed', 'San Francisco'] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSearch(q)}
              className="rounded-md px-2 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default VCSearchSimple
