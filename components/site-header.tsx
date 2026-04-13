'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { NexusWordmark } from '@/components/nexus-wordmark'
import { NavAuth } from '@/components/nav-auth'
import { ProtectedNavLink } from '@/components/protected-nav-link'
import { MobileNav, type MobileNavItem } from '@/components/ui/mobile-nav'
import { cn } from '@/lib/utils'
import { useChromeMode } from '@/components/chrome-mode-provider'
import { useAuthSession } from '@/components/auth-session-provider'
import { legacyNexusExtrasEnabled } from '@/lib/nexus-surface-flags'

type Caps = {
  hasFounderProfile?: boolean
  hasInvestorProfile?: boolean
  userType?: string
  canAccessFounderNetwork?: boolean
} | null

function guestExploreHref(next: string): string {
  return `/signup?next=${encodeURIComponent(next)}`
}

/** Logged-out marketing nav: same labels as the founder workspace, gated through signup. */
function guestExploreTabs(): readonly { next: string; label: string }[] {
  const base = [
    { next: '/founder/dashboard', label: 'Hub' },
    { next: '/founder/discover', label: 'Investors' },
    { next: '/founder/ai-analysis', label: 'Analyze' },
  ] as const
  if (legacyNexusExtrasEnabled()) {
    return [...base, { next: '/pricing?from=network', label: 'Network' }, { next: '/pricing', label: 'Pricing' }]
  }
  return [...base, { next: '/pricing', label: 'Pricing' }]
}

const navDockClass = 'inline-flex max-w-full flex-nowrap items-center justify-center gap-0.5 sm:gap-1'

function DesktopNavLink({
  href,
  label,
  pathname,
}: {
  href: string
  label: string
  pathname: string | null
}) {
  const active = pathname === href || (href.length > 1 && pathname?.startsWith(`${href}/`))
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-full px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'bg-background/85 text-primary shadow-sm ring-1 ring-border/45 dark:bg-background/60'
          : 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
      )}
    >
      {label}
    </Link>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const { chrome } = useChromeMode()
  const { authenticated } = useAuthSession()
  const [caps, setCaps] = useState<Caps>(null)
  const showFounderNetworkNav = legacyNexusExtrasEnabled() && Boolean(caps?.canAccessFounderNetwork)

  useEffect(() => {
    if (!authenticated) {
      setCaps(null)
      return
    }
    let cancelled = false
    const load = () => {
      if (cancelled) return
      fetch('/api/account/capabilities', { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && data?.authenticated) {
            setCaps({
              hasFounderProfile: data.hasFounderProfile,
              hasInvestorProfile: data.hasInvestorProfile,
              userType: data.userType,
              canAccessFounderNetwork: data.canAccessFounderNetwork,
            })
          }
        })
        .catch(() => {})
    }
    let idleHandle: number | undefined
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    if (typeof requestIdleCallback !== 'undefined') {
      idleHandle = requestIdleCallback(load, { timeout: 2800 })
    } else {
      timeoutHandle = setTimeout(load, 1)
    }
    return () => {
      cancelled = true
      if (idleHandle !== undefined && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleHandle)
      }
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle)
    }
  }, [authenticated])

  const guestMobileLinks: MobileNavItem[] = useMemo(() => {
    const rows: MobileNavItem[] = [
      { section: 'Explore', href: `/signup?next=${encodeURIComponent('/founder/dashboard')}`, label: 'Hub' },
      { href: `/signup?next=${encodeURIComponent('/founder/discover')}`, label: 'Investors' },
      { href: `/signup?next=${encodeURIComponent('/founder/ai-analysis')}`, label: 'Analyze' },
    ]
    if (legacyNexusExtrasEnabled()) {
      rows.push({
        href: `/signup?next=${encodeURIComponent('/pricing?from=network')}`,
        label: 'Network',
      })
    }
    rows.push({ section: 'More', href: `/signup?next=${encodeURIComponent('/pricing')}`, label: 'Pricing' })
    return rows
  }, [])

  const founderMobileLinks: MobileNavItem[] = useMemo(() => {
    const base: MobileNavItem[] = [
      { section: 'Workspace', href: '/founder/dashboard', label: 'Hub' },
      { href: '/founder/discover', label: 'Investors' },
      { href: '/founder/ai-analysis', label: 'Analyze' },
      ...(showFounderNetworkNav ? [{ href: '/founder/network', label: 'Network' as const }] : []),
      { section: 'More', href: '/pricing', label: 'Pricing' },
    ]
    if (authenticated) {
      base.push({ href: '/account', label: 'Account' })
    }
    return base
  }, [authenticated, showFounderNetworkNav])

  const investorMobileLinks: MobileNavItem[] = useMemo(() => {
    const base: MobileNavItem[] = [
      { section: 'Workspace', href: '/investor/dashboard', label: 'Dashboard' },
      { href: '/vc/profile', label: 'Your listing' },
      { href: '/vc/dashboard', label: 'Matches' },
      ...(caps?.canAccessFounderNetwork ? [{ href: '/founder/network', label: 'Network' as const }] : []),
    ]
    if (authenticated) {
      base.push({ section: 'Account', href: '/account', label: 'Account' })
    }
    return base
  }, [authenticated, caps?.canAccessFounderNetwork])

  const mobileLinks =
    chrome === 'guest' ? guestMobileLinks : chrome === 'investor' ? investorMobileLinks : founderMobileLinks

  const logoHref =
    chrome === 'investor' ? '/investor/dashboard' : chrome === 'founder' ? '/founder/dashboard' : '/'

  const isAdminRoute = Boolean(pathname?.startsWith('/admin'))

  const guestNavLinkClass =
    'rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/55 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

  return (
    <header
      className={cn(
        'relative sticky top-0 z-50 no-print border-b backdrop-blur-xl supports-[backdrop-filter]:bg-background/78',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary/45 before:to-transparent',
        isAdminRoute
          ? 'border-amber-500/25 bg-background/95 supports-[backdrop-filter]:bg-background/88'
          : 'border-border/40 bg-background/85 shadow-[0_1px_0_0_hsl(var(--border)/0.35)] supports-[backdrop-filter]:bg-background/72 dark:border-white/[0.06] dark:shadow-[0_18px_50px_-34px_rgba(0,0,0,0.55)]'
      )}
    >
      <div className="container mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-4 lg:px-6 lg:py-3">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3 lg:min-w-0 lg:justify-self-start">
          <div className="group flex min-w-0 items-center gap-2 rounded-md py-0.5 pr-1 sm:gap-2 sm:pr-1.5">
            <Link
              href={logoHref}
              className="block shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <NexusWordmark
                priority
                heightClass="h-14 sm:h-[4.25rem] lg:h-20"
                className="max-w-[14rem] sm:max-w-[19rem] lg:max-w-[24rem]"
              />
            </Link>
            {isAdminRoute && (
              <span
                className="hidden shrink-0 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-400 sm:inline"
                title="Admin area"
              >
                Admin
              </span>
            )}
          </div>
        </div>

        <nav
          className="hidden min-w-0 justify-self-center lg:flex lg:items-center"
          role="navigation"
          aria-label="Main navigation"
          suppressHydrationWarning
        >
            {chrome === 'guest' && (
              <div className={navDockClass}>
                {guestExploreTabs().map(({ next, label }) => (
                  <Link key={next} href={guestExploreHref(next)} className={guestNavLinkClass}>
                    {label}
                  </Link>
                ))}
              </div>
            )}

            {chrome === 'founder' && (
              <div className={navDockClass}>
                <ProtectedNavLink href="/founder/dashboard">Hub</ProtectedNavLink>
                <ProtectedNavLink href="/founder/discover">Investors</ProtectedNavLink>
                <ProtectedNavLink href="/founder/ai-analysis">Analyze</ProtectedNavLink>
                {showFounderNetworkNav ? (
                  <ProtectedNavLink href="/founder/network">Network</ProtectedNavLink>
                ) : null}
                <ProtectedNavLink href="/pricing">Pricing</ProtectedNavLink>
              </div>
            )}

            {chrome === 'investor' && (
              <div className={navDockClass}>
                <DesktopNavLink href="/investor/dashboard" label="Dashboard" pathname={pathname} />
                <DesktopNavLink href="/vc/extract" label="Extract" pathname={pathname} />
                <DesktopNavLink href="/vc/profile" label="Your listing" pathname={pathname} />
                <DesktopNavLink href="/vc/dashboard" label="Matches" pathname={pathname} />
                {caps?.canAccessFounderNetwork ? (
                  <DesktopNavLink href="/founder/network" label="Network" pathname={pathname} />
                ) : null}
              </div>
            )}
        </nav>

        <div
          className="flex shrink-0 items-center justify-end gap-2 sm:gap-2.5 lg:min-w-0 lg:justify-self-end"
          suppressHydrationWarning
        >
          <div className="lg:hidden">
            <MobileNav links={mobileLinks} />
          </div>
          <div className="hidden h-5 w-px bg-border/50 sm:block lg:hidden" aria-hidden />
          <NavAuth />
        </div>
      </div>
    </header>
  )
}
