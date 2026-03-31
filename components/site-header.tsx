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
  { next: '/founder/resources', label: 'Resources' },
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
      { href: `/signup?next=${encodeURIComponent('/founder/resources')}`, label: 'Resources' },
      { section: 'More', href: `/signup?next=${encodeURIComponent('/pricing')}`, label: 'Pricing' },
    ],
    []
  )

  const founderMobileLinks: MobileNavItem[] = useMemo(() => {
    const base: MobileNavItem[] = [
      { section: 'Workspace', href: '/founder/dashboard', label: 'Hub' },
      { href: '/founder/discover', label: 'Investors' },
      { href: '/founder/ai-analysis', label: 'Analyze' },
      { href: '/founder/resources', label: 'Resources' },
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
      { href: '/founder/resources', label: 'Resources' },
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
      <div className="container mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-4 lg:px-6 lg:py-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3 lg:min-w-0 lg:justify-self-start">
          <div className="group flex min-w-0 items-center gap-2 rounded-md py-0.5 pr-1 sm:gap-2 sm:pr-1.5">
            <Link
              href={logoHref}
              className="block shrink-0 rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background group-hover:bg-muted/30"
            >
              <NexusWordmark
                priority
                heightClass="h-16 sm:h-20 lg:h-24"
                className="max-w-[16rem] sm:max-w-[22rem] lg:max-w-[28rem]"
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
                  <ProtectedNavLink href="/founder/resources">Resources</ProtectedNavLink>
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
                  <DesktopNavLink href="/founder/resources" label="Resources" pathname={pathname} />
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
          {showInvestorSwitch && chrome === 'founder' && (
            <button
              type="button"
              title="Open investor workspace"
              aria-label="Switch to investor workspace"
              onClick={() => {
                setPreferredChrome('investor')
                router.push('/vc/profile')
              }}
              className="hidden h-8 shrink-0 rounded-full border border-border/80 bg-muted/20 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:inline-flex lg:items-center lg:justify-center"
            >
              Investor
            </button>
          )}
          {authenticated && showFounderSwitch && chrome === 'investor' && (
            <button
              type="button"
              title="Open founder workspace"
              aria-label="Switch to founder workspace"
              onClick={() => {
                setPreferredChrome('founder')
                router.push('/founder/dashboard')
              }}
              className="hidden h-8 shrink-0 rounded-full border border-border/80 bg-muted/20 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:inline-flex lg:items-center lg:justify-center"
            >
              Founder
            </button>
          )}
          <div className="hidden h-5 w-px bg-border/60 lg:block" aria-hidden />
          <NavAuth />
        </div>
      </div>
    </header>
  )
}
