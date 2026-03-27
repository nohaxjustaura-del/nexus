'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { NexusWordmark } from '@/components/nexus-wordmark'
import { NavAuth } from '@/components/nav-auth'
import { ProtectedNavLink } from '@/components/protected-nav-link'
import { MobileNav, type MobileNavItem } from '@/components/ui/mobile-nav'
import { cn } from '@/lib/utils'
import { useChromeMode } from '@/components/chrome-mode-provider'
import { useAuthSession } from '@/components/auth-session-provider'

type Caps = {
  hasFounderProfile?: boolean
  hasInvestorProfile?: boolean
  userType?: string
} | null

/** Logged-out marketing nav: same labels as the founder workspace, gated through signup. */
const GUEST_EXPLORE_TABS = [
  { next: '/founder/dashboard', label: 'Hub' },
  { next: '/founder/discover', label: 'Investors' },
  { next: '/founder/ai-analysis', label: 'Analyze' },
  { next: '/pricing', label: 'Pricing' },
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
        'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/15 text-foreground shadow-sm ring-1 ring-primary/20'
          : 'text-muted-foreground hover:bg-muted/55 hover:text-foreground'
      )}
    >
      {label}
    </Link>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { chrome, setPreferredChrome } = useChromeMode()
  const { authenticated } = useAuthSession()
  const [caps, setCaps] = useState<Caps>(null)

  useEffect(() => {
    if (!authenticated) {
      setCaps(null)
      return
    }
    let cancelled = false
    fetch('/api/account/capabilities', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.authenticated) {
          setCaps({
            hasFounderProfile: data.hasFounderProfile,
            hasInvestorProfile: data.hasInvestorProfile,
            userType: data.userType,
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authenticated])

  const canSwitchToFounderWorkspace =
    caps != null &&
    (Boolean(caps.hasFounderProfile) || caps.userType === 'mentor')

  const canSwitchToInvestorWorkspace =
    caps != null && Boolean(caps.hasInvestorProfile)

  const showFounderSwitch = canSwitchToFounderWorkspace
  const showInvestorSwitch = authenticated && chrome !== 'guest' && canSwitchToInvestorWorkspace

  const guestMobileLinks: MobileNavItem[] = useMemo(
    () => [
      { section: 'Explore', href: `/signup?next=${encodeURIComponent('/founder/dashboard')}`, label: 'Hub' },
      { href: `/signup?next=${encodeURIComponent('/founder/discover')}`, label: 'Investors' },
      { href: `/signup?next=${encodeURIComponent('/founder/ai-analysis')}`, label: 'Analyze' },
      { section: 'More', href: `/signup?next=${encodeURIComponent('/pricing')}`, label: 'Pricing' },
    ],
    []
  )

  const founderMobileLinks: MobileNavItem[] = useMemo(() => {
    const base: MobileNavItem[] = [
      { section: 'Workspace', href: '/founder/dashboard', label: 'Hub' },
      { href: '/founder/discover', label: 'Investors' },
      { href: '/founder/ai-analysis', label: 'Analyze' },
      { section: 'More', href: '/pricing', label: 'Pricing' },
    ]
    if (authenticated) {
      base.push({ href: '/account', label: 'Account' })
    }
    if (showInvestorSwitch) {
      base.push({
        section: 'Switch',
        href: '/vc/profile',
        label: 'Investor workspace',
        onNavigate: () => setPreferredChrome('investor'),
      })
    }
    return base
  }, [authenticated, showInvestorSwitch, setPreferredChrome])

  const investorMobileLinks: MobileNavItem[] = useMemo(() => {
    const base: MobileNavItem[] = [
      { section: 'Workspace', href: '/vc/extract', label: 'Extract' },
      { href: '/vc/profile', label: 'Your listing' },
      { href: '/vc/dashboard', label: 'Matches' },
    ]
    if (authenticated) {
      base.push({ section: 'Account', href: '/account', label: 'Account' })
    }
    if (showFounderSwitch) {
      base.push({
        section: 'Switch',
        href: '/founder/dashboard',
        label: 'Founder workspace',
        onNavigate: () => setPreferredChrome('founder'),
      })
    }
    return base
  }, [authenticated, showFounderSwitch, setPreferredChrome])

  const mobileLinks =
    chrome === 'guest' ? guestMobileLinks : chrome === 'investor' ? investorMobileLinks : founderMobileLinks

  const logoHref =
    chrome === 'investor' ? '/vc/profile' : chrome === 'founder' ? '/founder/dashboard' : '/'

  const isAdminRoute = Boolean(pathname?.startsWith('/admin'))

  const modeLabel =
    chrome === 'guest' ? null : chrome === 'investor' ? 'Investor' : 'Founder'

  const navShellClass =
    'inline-flex flex-wrap items-center justify-center gap-0.5 rounded-full border border-border/50 bg-muted/20 px-2 py-1'

  return (
    <header
      className={cn(
        'sticky top-0 z-50 no-print border-b backdrop-blur-xl supports-[backdrop-filter]:bg-background/75',
        isAdminRoute
          ? 'border-amber-500/25 bg-background/95 supports-[backdrop-filter]:bg-background/88'
          : 'border-border/50 bg-background/90 supports-[backdrop-filter]:bg-background/80'
      )}
    >
      <div className="container mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-6 lg:px-6 lg:py-3">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3 lg:min-w-0 lg:justify-self-start">
          <Link
            href={logoHref}
            className="group flex min-w-0 items-center gap-2 rounded-md py-1 pr-1 transition-colors hover:bg-muted/30 sm:gap-2 sm:pr-1.5"
          >
            <span className="flex min-w-0 flex-col leading-none">
              <NexusWordmark
                priority
                heightClass="h-12 sm:h-14 lg:h-16"
                className="max-w-[15rem] sm:max-w-[19rem] lg:max-w-[24rem]"
              />
              {modeLabel && (
                <span className="mt-1 hidden text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground sm:block">
                  {modeLabel} workspace
                </span>
              )}
            </span>
            {isAdminRoute && (
              <span
                className="hidden shrink-0 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-400 sm:inline"
                title="Admin area"
              >
                Admin
              </span>
            )}
          </Link>
        </div>

        <nav
          className="hidden min-w-0 lg:flex lg:items-center lg:justify-center lg:justify-self-center"
          role="navigation"
          aria-label="Main navigation"
          suppressHydrationWarning
        >
            {chrome === 'guest' && (
              <div className={navShellClass}>
                {GUEST_EXPLORE_TABS.map(({ next, label }) => (
                  <Link
                    key={next}
                    href={`/signup?next=${encodeURIComponent(next)}`}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/55 hover:text-foreground"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}

            {chrome === 'founder' && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className={navShellClass}>
                  <ProtectedNavLink href="/founder/dashboard">Hub</ProtectedNavLink>
                  <ProtectedNavLink href="/founder/discover">Investors</ProtectedNavLink>
                  <ProtectedNavLink href="/founder/ai-analysis">Analyze</ProtectedNavLink>
                  <ProtectedNavLink href="/pricing">Pricing</ProtectedNavLink>
                </div>
              </div>
            )}

            {chrome === 'investor' && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className={navShellClass}>
                  <DesktopNavLink href="/vc/extract" label="Extract" pathname={pathname} />
                  <DesktopNavLink href="/vc/profile" label="Your listing" pathname={pathname} />
                  <DesktopNavLink href="/vc/dashboard" label="Matches" pathname={pathname} />
                </div>
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
          {chrome === 'founder' && showInvestorSwitch && (
            <button
              type="button"
              onClick={() => {
                setPreferredChrome('investor')
                router.push('/vc/profile')
              }}
              className="hidden shrink-0 whitespace-nowrap rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/40 hover:text-foreground lg:inline-flex"
            >
              Investor workspace
            </button>
          )}
          {chrome === 'investor' && showFounderSwitch && (
            <button
              type="button"
              onClick={() => {
                setPreferredChrome('founder')
                router.push('/founder/dashboard')
              }}
              className="hidden shrink-0 whitespace-nowrap rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/40 hover:text-foreground lg:inline-flex"
            >
              Founder workspace
            </button>
          )}
          <div className="hidden h-5 w-px bg-border/60 lg:block" aria-hidden />
          <NavAuth />
        </div>
      </div>
    </header>
  )
}
