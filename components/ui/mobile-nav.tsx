'use client'

import { useState } from 'react'
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

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        className="p-2"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <nav
            className={cn(
              'fixed left-0 right-0 top-28 z-50 max-h-[calc(100vh-7rem)] overflow-y-auto border-b border-border/50 bg-card/98 shadow-lg animate-slide-down sm:top-[7.5rem] sm:max-h-[calc(100vh-7.5rem)] lg:top-40 lg:max-h-[calc(100vh-10rem)]'
            )}
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col gap-1 p-3 pb-5">
              {links.map((link, i) => {
                const showSection = Boolean(link.section && (i === 0 || links[i - 1]?.section !== link.section))
                return (
                  <div key={`${link.href}-${link.label}-${i}`}>
                    {showSection && (
                      <p className="mb-1 mt-3 first:mt-0 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {link.section}
                      </p>
                    )}
                    <Link
                      href={link.href}
                      className="block rounded-lg px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
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
