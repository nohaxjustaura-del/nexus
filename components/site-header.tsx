'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Orbit } from 'lucide-react'
import { BRAND_NAME } from '@/lib/brand'
import { NavAuth } from '@/components/nav-auth'
import { ProtectedNavLink } from '@/components/protected-nav-link'
import { MobileNav } from '@/components/ui/mobile-nav'
import { cn } from '@/lib/utils'

const mobileLinks = [
  { href: '/founder/dashboard', label: 'Hub' },
  { href: '/founder/discover', label: 'Investors' },
  { href: '/founder/ai-analysis', label: 'Analyze' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/vc/claim', label: 'For VCs' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const vcActive = pathname === '/vc/claim' || pathname?.startsWith('/vc/')

  return (
    <header className="sticky top-0 z-50 no-print border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-lg py-0.5 pr-2 transition-colors hover:bg-foreground/[0.04]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/25">
            <Orbit className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
            {BRAND_NAME}
          </span>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <nav
            className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center"
            role="navigation"
            aria-label="Main navigation"
            suppressHydrationWarning
          >
            <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/25 px-1 py-1">
              <ProtectedNavLink href="/founder/dashboard">Hub</ProtectedNavLink>
              <ProtectedNavLink href="/founder/discover">Investors</ProtectedNavLink>
              <ProtectedNavLink href="/founder/ai-analysis">Analyze</ProtectedNavLink>
              <ProtectedNavLink href="/pricing" publicRoute>
                Pricing
              </ProtectedNavLink>
              <Link
                href="/vc/claim"
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  vcActive
                    ? 'bg-primary/15 text-foreground ring-1 ring-primary/25'
                    : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground'
                )}
              >
                For VCs
              </Link>
            </div>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2" suppressHydrationWarning>
            <div className="lg:hidden">
              <MobileNav links={mobileLinks} />
            </div>
            <div className="hidden h-5 w-px bg-border/80 lg:block" aria-hidden />
            <NavAuth />
          </div>
        </div>
      </div>
    </header>
  )
}
