'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

export type MobileNavItem = {
  href: string
  label: string
  /** Shown as a small section label above the item (omit when same as previous row) */
  section?: string
  /** Runs after closing the menu; use for mode switches before navigation */
  onNavigate?: () => void
}

interface MobileNavProps {
  links: MobileNavItem[]
}

export function MobileNav({ links }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const navRef = useRef<HTMLElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (e.key === 'Tab' && navRef.current) {
      const focusable = navRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      requestAnimationFrame(() => {
        navRef.current?.querySelector<HTMLElement>('a')?.focus()
      })
    } else {
      document.removeEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  return (
    <div className="lg:hidden">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        className="h-9 w-9 rounded-full border border-border/60 bg-card p-0"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <nav
            ref={navRef}
            className={cn(
              'fixed left-3 right-3 top-20 z-50 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-border/70 bg-card p-1 shadow-lg animate-slide-down sm:top-24 sm:max-h-[calc(100vh-7rem)]'
            )}
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1 p-2 pb-3">
              {links.map((link, i) => {
                const showSection = Boolean(link.section && (i === 0 || links[i - 1]?.section !== link.section))
                return (
                  <div key={`${link.href}-${link.label}-${i}`}>
                    {showSection && (
                      <p className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {link.section}
                      </p>
                    )}
                    <Link
                      href={link.href}
                      className="block rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
                      onClick={() => {
                        link.onNavigate?.()
                        setIsOpen(false)
                      }}
                    >
                      {link.label}
                    </Link>
                  </div>
                )
              })}
            </div>
          </nav>
        </>
      )}
    </div>
  )
}
