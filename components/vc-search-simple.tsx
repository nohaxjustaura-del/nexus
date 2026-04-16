'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search, X, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const RECENT_KEY = 'nexus-discover-vc-search-recent'
const RECENT_MAX = 5
const SUGGEST_DEBOUNCE_MS = 220
const URL_DEBOUNCE_MS = 420

type Suggestion = {
  id: string
  firmName: string
  partnerName: string | null
  subtitle?: string
  verified: boolean
}

function readRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(arr)) return []
    return arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

function pushRecent(query: string) {
  const t = query.trim()
  if (t.length < 2) return
  const prev = readRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())
  const next = [t, ...prev].slice(0, RECENT_MAX)
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

function VCSearchSimpleInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get('search') || ''
  const [searchQuery, setSearchQuery] = useState(urlQuery)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const urlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestAbortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setRecent(readRecent())
  }, [])

  useEffect(() => {
    setSearchQuery(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    return () => {
      if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current)
      if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current)
      suggestAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = containerRef.current
      if (!el || !open) return
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const pushSearchToUrl = useCallback((value: string, persistRecent: boolean) => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const t = value.trim()
    if (t) {
      params.set('search', t)
      if (persistRecent) pushRecent(t)
    } else params.delete('search')
    const qs = params.toString()
    const href = qs ? `/founder/discover?${qs}` : '/founder/discover'
    router.push(href, { scroll: false })
    setRecent(readRecent())
  }, [router])

  const scheduleUrlPush = useCallback(
    (value: string) => {
      if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current)
      urlTimeoutRef.current = setTimeout(() => pushSearchToUrl(value, false), URL_DEBOUNCE_MS)
    },
    [pushSearchToUrl],
  )

  const fetchSuggestions = useCallback((q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setLoadingSuggest(false)
      return
    }
    suggestAbortRef.current?.abort()
    const ac = new AbortController()
    suggestAbortRef.current = ac
    setLoadingSuggest(true)
    fetch(`/api/founder/discover/suggest?q=${encodeURIComponent(trimmed)}`, {
      credentials: 'include',
      signal: ac.signal,
    })
      .then((res) => {
        if (!res.ok) {
          setSuggestions([])
          return null
        }
        return res.json() as Promise<{ suggestions?: Suggestion[] }>
      })
      .then((data) => {
        if (!data?.suggestions) {
          setSuggestions([])
          return
        }
        setSuggestions(data.suggestions)
        setHighlight(data.suggestions.length > 0 ? 0 : -1)
      })
      .catch(() => {
        if (ac.signal.aborted) return
        setSuggestions([])
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingSuggest(false)
      })
  }, [])

  const onInputChange = (value: string) => {
    setSearchQuery(value)
    setOpen(true)
    scheduleUrlPush(value)
    if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current)
    const t = value.trim()
    if (t.length < 2) {
      setSuggestions([])
      setLoadingSuggest(false)
      suggestAbortRef.current?.abort()
      setHighlight(-1)
      return
    }
    suggestTimeoutRef.current = setTimeout(() => fetchSuggestions(value), SUGGEST_DEBOUNCE_MS)
  }

  const applyQuery = (value: string, fromPick: boolean) => {
    const v = value.trim()
    setSearchQuery(value)
    if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current)
    pushSearchToUrl(v, fromPick || v.length >= 2)
    setOpen(false)
    setSuggestions([])
    setHighlight(-1)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSuggestions([])
    setOpen(false)
    setHighlight(-1)
    if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current)
    suggestAbortRef.current?.abort()
    pushSearchToUrl('', false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && searchQuery.trim().length >= 2) {
      setOpen(true)
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setHighlight(-1)
      return
    }
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') {
        applyQuery(searchQuery, true)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((i) => (i + 1 >= suggestions.length ? 0 : i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = highlight >= 0 && highlight < suggestions.length ? suggestions[highlight] : null
      if (pick) {
        applyQuery(pick.firmName, true)
      } else {
        applyQuery(searchQuery, true)
      }
    }
  }

  const showPanel =
    open &&
    (loadingSuggest ||
      suggestions.length > 0 ||
      (searchQuery.trim().length >= 2 && !loadingSuggest && suggestions.length === 0))

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="vc-search-input"
          name="vc-search"
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="vc-search-listbox"
          aria-autocomplete="list"
          placeholder="Search firms, partners, thesis, sectors…"
          value={searchQuery}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-10 rounded-lg border-border bg-background pl-9 pr-9 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-1"
          autoComplete="off"
          enterKeyHint="search"
        />
        {loadingSuggest ? (
          <Loader2 className="pointer-events-none absolute right-10 top-1/2 z-10 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
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

      {showPanel ? (
        <div
          id="vc-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md"
        >
          {loadingSuggest && suggestions.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              Finding investors…
            </div>
          ) : null}
          {!loadingSuggest && searchQuery.trim().length >= 2 && suggestions.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-muted-foreground">No matches — try another keyword.</div>
          ) : null}
          {suggestions.map((s, idx) => {
            const active = idx === highlight
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={active}
                id={`vc-suggest-${s.id}`}
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors',
                  active ? 'bg-muted' : 'hover:bg-muted/60',
                )}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyQuery(s.firmName, true)}
              >
                <span className="flex w-full min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-foreground">{s.firmName}</span>
                  {s.verified ? (
                    <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Verified
                    </span>
                  ) : null}
                </span>
                {s.subtitle ? (
                  <span className="line-clamp-2 w-full text-xs text-muted-foreground">{s.subtitle}</span>
                ) : s.partnerName ? (
                  <span className="line-clamp-1 w-full text-xs text-muted-foreground">{s.partnerName}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}

      {!searchQuery.trim() ? (
        <div className="mt-1.5 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500/90" aria-hidden />
            <span className="mr-0.5">Try</span>
            {(['B2B SaaS seed', 'climate hardware', 'San Francisco'] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onInputChange(q)}
                className="rounded-md px-2 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
          {recent.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="mr-0.5 shrink-0">Recent</span>
              {recent.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onInputChange(q)}
                  className="max-w-[200px] truncate rounded-md px-2 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title={q}
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}
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
