'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

function VCSearchSimpleInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get('search') || ''
  const [searchQuery, setSearchQuery] = useState(urlQuery)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearchQuery(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const pushSearchToUrl = (value: string) => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const t = value.trim()
    if (t) params.set('search', t)
    else params.delete('search')
    const qs = params.toString()
    const href = qs ? `/founder/discover?${qs}` : '/founder/discover'
    router.push(href, { scroll: false })
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => pushSearchToUrl(value), 300)
  }

  const clearSearch = () => {
    setSearchQuery('')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    pushSearchToUrl('')
  }

  return (
    <div className="w-full max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="vc-search-input"
          name="vc-search"
          type="search"
          placeholder="Search firms or partners…"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-10 rounded-lg border-border bg-background pl-9 pr-9 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-1"
          autoComplete="off"
          enterKeyHint="search"
        />
        {searchQuery ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 p-0 hover:bg-muted/70"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {!searchQuery.trim() ? (
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
      ) : null}
    </div>
  )
}

export default function VCSearchSimple() {
  return (
    <Suspense
      fallback={
        <div className="h-10 w-full max-w-xl animate-pulse rounded-lg bg-muted/60" aria-hidden />
      }
    >
      <VCSearchSimpleInner />
    </Suspense>
  )
}
