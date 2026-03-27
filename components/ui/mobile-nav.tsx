'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  links: Array<{
    href: string
    label: string
  }>
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

      {/* Mobile menu overlay */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <nav 
            className={cn(
              "fixed left-0 right-0 top-14 z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-border/60 bg-card/95 backdrop-blur-xl animate-slide-down shadow-none sm:top-16 sm:max-h-[calc(100vh-4rem)]"
            )}
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col p-4 space-y-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2 px-4 rounded-lg hover:bg-muted/50"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </div>
  )
}




