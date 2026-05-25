'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthSession } from '@/components/auth-session-provider'

const TRIGGER_HREF = '/founder/discover'

const SUB_ITEMS = [
  { href: '/founder/my-analyses', label: 'Analyses', desc: 'Past pitch reports' },
  { href: '/founder/bookmarks', label: 'Bookmarks', desc: 'Saved investors' },
] as const

export function FounderInvestorsNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { authenticated, verified } = useAuthSession()
  const authed = authenticated && verified

  const isInvestorsRoute =
    pathname === TRIGGER_HREF ||
    Boolean(pathname?.startsWith(`${TRIGGER_HREF}/`)) ||
    SUB_ITEMS.some((s) => pathname === s.href || Boolean(pathname?.startsWith(`${s.href}/`)))

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const buildHref = (href: string) =>
    authed ? href : `/signup?next=${encodeURIComponent(href)}`

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose()
        setOpen(true)
      }}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) scheduleClose()
      }}
    >
      <div className="flex items-center">
        <Link
          href={buildHref(TRIGGER_HREF)}
          aria-current={pathname === TRIGGER_HREF ? 'page' : undefined}
          className={cn(
            'rounded-full pl-3 pr-1.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            isInvestorsRoute
              ? 'bg-card text-foreground ring-1 ring-border/70'
              : 'text-muted-foreground hover:bg-muted/65 hover:text-foreground',
          )}
        >
          Investors
        </Link>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={open ? 'Close investors menu' : 'Open investors menu'}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            '-ml-0.5 rounded-full p-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            isInvestorsRoute || open
              ? 'text-foreground hover:bg-muted/65'
              : 'text-muted-foreground hover:bg-muted/65 hover:text-foreground',
          )}
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          aria-label="Investors submenu"
          className="absolute left-0 top-full z-50 mt-2 min-w-[15rem] rounded-xl border border-border/60 bg-card/95 p-1.5 shadow-lg backdrop-blur-sm"
        >
          {SUB_ITEMS.map(({ href, label, desc }) => {
            const active = pathname === href || Boolean(pathname?.startsWith(`${href}/`))
            return (
              <Link
                key={href}
                role="menuitem"
                href={buildHref(href)}
                className={cn(
                  'flex flex-col gap-0.5 rounded-lg px-3 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-primary/[0.08] text-foreground ring-1 ring-primary/20'
                    : 'text-foreground hover:bg-muted/60',
                )}
              >
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
