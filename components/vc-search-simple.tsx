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
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="vc-search-input"
        name="vc-search"
        type="text"
        placeholder="Search VCs by name..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-10 pr-10 h-10"
        autoComplete="off"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSearch}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export default VCSearchSimple
