'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { NexusWordmark } from '@/components/nexus-wordmark'
import { NavAuth } from '@/components/nav-auth'
import { ProtectedNavLink } from '@/components/protected-nav-link'
import { MobileNav, type MobileNavItem } from '@/components/ui/mobile-nav'
import { cn } from '@/lib/utils'
import { useChromeMode } from '@/components/chrome-mode-provider'
import { useAuthSession } from '@/components/auth-session-provider'
import { useAccountCapabilities } from '@/components/account-capabilities-provider'
function guestExploreHref(next: string): string {
  return `/signup?next=${encodeURIComponent(next)}`
}

/** Logged-out marketing nav: same labels as the founder workspace, gated through signup. */
function guestExploreTabs(): readonly { next: string; label: string }[] {
  return [
    { next: '/founder/dashboard', label: 'Hub' },
    { next: '/founder/discover', label: 'Investors' },
    { next: '/founder/ai-analysis', label: 'Analyze' },
    { next: '/pricing?from=network', label: 'Network' },
    { next: '/pricing', label: 'Pricing' },
  ] as const
}

const navDockClass = 'inline-flex max-w-full flex-nowrap items-center justify-center gap-1'
const adminDesktopTabs = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/approvals', label: 'Founders' },
  { href: '/admin/vcs', label: 'VCs' },
  { href: '/admin/more', label: 'More' },
] as const

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
        'relative rounded-full px-3.5 py-1.5 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'bg-primary/[0.08] text-foreground ring-1 ring-primary/20'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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
  const { capabilities } = useAccountCapabilities()
  const showFounderNetworkNav = Boolean(capabilities?.canAccessFounderNetwork)
  const isAdminRoute = Boolean(pathname?.startsWith('/admin'))

  const guestMobileLinks: MobileNavItem[] = useMemo(() => {
    const rows: MobileNavItem[] = [
      { section: 'Explore', href: `/signup?next=${encodeURIComponent('/founder/dashboard')}`, label: 'Hub' },
      { href: `/signup?next=${encodeURIComponent('/founder/discover')}`, label: 'Investors' },
      { href: `/signup?next=${encodeURIComponent('/founder/ai-analysis')}`, label: 'Analyze' },
      { href: `/signup?next=${encodeURIComponent('/pricing?from=network')}`, label: 'Network' },
    ]
    rows.push({ section: 'More', href: `/signup?next=${encodeURIComponent('/pricing')}`, label: 'Pricing' })
    return rows
  }, [])

  const founderMobileLinks: MobileNavItem[] = useMemo(() => {
    const base: MobileNavItem[] = [
      { section: 'Workspace', href: '/founder/dashboard', label: 'Hub' },
      { href: '/founder/discover', label: 'Investors' },
      { href: '/founder/ai-analysis', label: 'Analyze' },
      { href: '/market-intelligence', label: 'Market' },
      ...(showFounderNetworkNav ? [{ href: '/founder/network', label: 'Network' as const }] : []),
      { section: 'More', href: '/pricing', label: 'Upgrade' },
    ]
    if (authenticated) {
      base.push({ href: '/account', label: 'Account' })
    }
    return base
  }, [authenticated, showFounderNetworkNav])

  const mentorMobileLinks: MobileNavItem[] = useMemo(() => {
    const base: MobileNavItem[] = [
      { section: 'Mentor', href: '/mentor/dashboard', label: 'Dashboard' },
      { href: '/mentor/onboarding', label: 'Setup' },
      { href: '/vc-guide', label: 'Guide' },
      { section: 'More', href: '/pricing', label: 'Pricing' },
    ]
    if (authenticated) {
      base.push({ href: '/account', label: 'Account' })
    }
    return base
  }, [authenticated])

  const investorMobileLinks: MobileNavItem[] = useMemo(() => {
    const base: MobileNavItem[] = [
      { section: 'Workspace', href: '/investor/dashboard', label: 'Dashboard' },
      { href: '/vc/profile', label: 'Listing' },
      { href: '/investor/network', label: 'Network' },
    ]
    if (authenticated) {
      base.push({ section: 'Account', href: '/account', label: 'Account' })
    }
    return base
  }, [authenticated])

  const mobileLinks =
    isAdminRoute
      ? ([
          { section: 'Admin', href: '/admin/dashboard', label: 'Overview' },
          { href: '/admin/approvals', label: 'Founders' },
          { href: '/admin/vcs', label: 'VCs' },
          { href: '/admin/more', label: 'More' },
          { section: 'Switch', href: '/founder/dashboard', label: 'Switch to Founder' },
        ] as MobileNavItem[])
      : chrome === 'guest'
      ? guestMobileLinks
      : chrome === 'investor'
        ? investorMobileLinks
        : chrome === 'mentor'
          ? mentorMobileLinks
          : founderMobileLinks

  const logoHref =
    isAdminRoute
      ? '/admin/dashboard'
      : chrome === 'investor'
      ? '/investor/dashboard'
      : chrome === 'mentor'
        ? '/mentor/dashboard'
        : chrome === 'founder'
          ? '/founder/dashboard'
          : '/'

  const guestNavLinkClass =
    'rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/65 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

  return (
    <header
      className={cn(
        'relative sticky top-0 z-50 no-print border-b backdrop-blur-xl supports-[backdrop-filter]:bg-background/78',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-border before:to-transparent',
        isAdminRoute
          ? 'border-amber-500/25 bg-background/95 supports-[backdrop-filter]:bg-background/88'
          : 'border-border/60 bg-background/90 shadow-[0_1px_0_0_hsl(var(--border)/0.2)] supports-[backdrop-filter]:bg-background/82'
      )}
    >
        <div className="container mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6 sm:py-2 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-4 lg:px-6 lg:py-2">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3 lg:min-w-0 lg:justify-self-start">
          <div className="group flex min-w-0 items-center gap-2 rounded-md py-0.5 pr-1 sm:gap-2 sm:pr-1.5">
            <Link
              href={logoHref}
              className="block shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <NexusWordmark
                priority
                heightClass="h-8 sm:h-10 lg:h-11"
                className="max-w-[8rem] sm:max-w-[10rem] lg:max-w-[11.5rem]"
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
            {isAdminRoute && (
              <div className={navDockClass}>
                {adminDesktopTabs.map(({ href, label }) => (
                  <DesktopNavLink key={href} href={href} label={label} pathname={pathname} />
                ))}
                <DesktopNavLink href="/founder/dashboard" label="Switch to Founder" pathname={pathname} />
              </div>
            )}

            {!isAdminRoute && chrome === 'guest' && (
              <div className={navDockClass}>
                {guestExploreTabs().map(({ next, label }) => (
                  <Link key={next} href={guestExploreHref(next)} className={guestNavLinkClass}>
                    {label}
                  </Link>
                ))}
              </div>
            )}

            {!isAdminRoute && chrome === 'founder' && (
              <div className={navDockClass}>
                <ProtectedNavLink href="/founder/dashboard">Hub</ProtectedNavLink>
                <ProtectedNavLink href="/founder/discover">Investors</ProtectedNavLink>
                <ProtectedNavLink href="/founder/ai-analysis">Analyze</ProtectedNavLink>
                <ProtectedNavLink href="/market-intelligence">Market</ProtectedNavLink>
                {showFounderNetworkNav ? (
                  <ProtectedNavLink href="/founder/network">Network</ProtectedNavLink>
                ) : null}
              </div>
            )}

            {!isAdminRoute && chrome === 'mentor' && (
              <div className={navDockClass}>
                <DesktopNavLink href="/mentor/dashboard" label="Dashboard" pathname={pathname} />
                <DesktopNavLink href="/mentor/onboarding" label="Setup" pathname={pathname} />
                <DesktopNavLink href="/vc-guide" label="Guide" pathname={pathname} />
                <DesktopNavLink href="/pricing" label="Pricing" pathname={pathname} />
              </div>
            )}

            {!isAdminRoute && chrome === 'investor' && (
              <div className={navDockClass}>
                <DesktopNavLink href="/investor/dashboard" label="Dashboard" pathname={pathname} />
                <DesktopNavLink href="/vc/profile" label="Listing" pathname={pathname} />
                <DesktopNavLink href="/investor/network" label="Network" pathname={pathname} />
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
