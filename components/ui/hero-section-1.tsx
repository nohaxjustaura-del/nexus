'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NexusWordmark } from '@/components/nexus-wordmark'
import { BRAND_NAME, BRAND_HERO_EYEBROW, BRAND_TAGLINE } from '@/lib/brand'
import { useAuthSession } from '@/components/auth-session-provider'
import { track as trackEvent } from '@/lib/analytics'

const track = (event: string, props?: Record<string, unknown>) => {
  try {
    trackEvent(event as never, props as never)
  } catch {
    /* analytics optional */
  }
}

const SIGNUP_DISCOVER = `/signup?next=${encodeURIComponent('/founder/discover')}`
const SIGNUP_PRICING = `/signup?next=${encodeURIComponent('/pricing')}`

const menuItems = [
  { name: 'How it works', href: '/#home-how-heading' },
  { name: 'Investors', href: SIGNUP_DISCOVER },
  { name: 'Pricing', href: SIGNUP_PRICING },
  { name: 'About', href: '/about' },
]

export type HeroSectionProps = {
  /** When false, use with an existing app shell (e.g. `SiteHeader`) to avoid duplicate nav bars. */
  showHeader?: boolean
  verifiedInvestorCountLabel: string
}

export function HeroSection({ showHeader = true, verifiedInvestorCountLabel }: HeroSectionProps) {
  const { loading: authLoading, authenticated, verified } = useAuthSession()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isVerifiedUser = !authLoading && authenticated && verified

  const primaryHref =
    mounted && isVerifiedUser ? '/founder/dashboard' : '/signup'
  const secondaryHref =
    mounted && isVerifiedUser ? '/founder/discover' : SIGNUP_DISCOVER

  return (
    <>
      {showHeader ? <HeroHeader /> : null}
      <main className="overflow-hidden">
        <section className="relative">
          <div
            className={cn(
              'relative pb-10 md:pb-14',
              showHeader ? 'pt-24 md:pt-36' : 'pt-10 md:pt-14'
            )}
          >
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
              <div className="absolute left-1/2 top-[-18%] h-[min(28rem,48vh)] w-[min(100%,48rem)] -translate-x-1/2 rounded-[100%] bg-primary/[0.1] blur-[72px] dark:bg-primary/[0.14]" />
              <div className="absolute right-[-8%] top-[8%] h-56 w-56 rounded-full bg-[hsl(265_42%_52%/0.07)] blur-3xl dark:bg-[hsl(265_38%_48%/0.09)]" />
              <div className="absolute bottom-[10%] left-[-6%] h-48 w-48 rounded-full bg-[hsl(200_45%_45%/0.05)] blur-3xl dark:bg-[hsl(200_42%_42%/0.07)]" />
            </div>
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <div className="hero-stagger mx-auto max-w-4xl">
                  <Link
                    href={secondaryHref}
                    className="hero-reveal-item mx-auto flex w-fit items-center gap-2 rounded-full border border-border/45 bg-muted/20 px-4 py-2 text-sm text-foreground shadow-sm shadow-black/10 backdrop-blur-sm transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/30 hover:bg-muted/35 dark:border-white/[0.08] dark:bg-white/[0.04] dark:shadow-black/30"
                  >
                    <span>{verifiedInvestorCountLabel}+ verified investors in the network</span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>

                  <p className="hero-reveal-item mt-6 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {BRAND_HERO_EYEBROW}
                  </p>
                  <h1 className="hero-reveal-item mx-auto mt-3 max-w-4xl text-balance font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl md:leading-[1.1] lg:mt-6 lg:text-[3.25rem] lg:leading-[1.08]">
                    Find the investors most likely to fund your startup
                  </h1>
                  <p className="hero-reveal-item mx-auto mt-8 max-w-2xl text-balance text-lg text-muted-foreground">
                    {BRAND_TAGLINE}. {BRAND_NAME} scores your pitch in an allocator-style lens and ranks best-fit names
                    from verified mandates, not a generic chat summary.
                  </p>
                </div>

                <div className="hero-stagger-delayed mt-12 flex flex-col items-center justify-center gap-3 md:flex-row">
                  <Button asChild size="lg" className="hero-reveal-item rounded-xl px-6 text-base">
                    <Link
                      href={primaryHref}
                      onClick={() => track('cta_clicked', { name: 'hero_primary', page: 'home' })}
                    >
                      <span className="text-nowrap">
                        {mounted && isVerifiedUser ? 'Open founder hub' : 'Try it with your pitch'}
                      </span>
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="hero-reveal-item h-12 rounded-xl px-6">
                    <Link
                      href={secondaryHref}
                      onClick={() => track('cta_clicked', { name: 'hero_secondary', page: 'home' })}
                    >
                      <span className="text-nowrap">Search the network</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const { loading: authLoading, authenticated, verified } = useAuthSession()
  const [headerMounted, setHeaderMounted] = React.useState(false)

  React.useEffect(() => {
    setHeaderMounted(true)
  }, [])

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const canViewPricing = headerMounted && !authLoading && authenticated && verified
  const navMenuItems = React.useMemo(
    () =>
      menuItems.map((item) =>
        item.name === 'Pricing' ? { ...item, href: canViewPricing ? '/pricing' : SIGNUP_PRICING } : item
      ),
    [canViewPricing]
  )

  return (
    <header>
      <nav
        data-state={menuState ? 'active' : undefined}
        className="group fixed z-20 w-full px-2"
      >
        <div
          className={cn(
            'mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12',
            isScrolled &&
              'max-w-4xl rounded-2xl border border-border/50 bg-background/50 backdrop-blur-lg lg:px-5'
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link href="/" aria-label="home" className="flex items-center space-x-2">
                <NexusWordmark heightClass="h-7 w-auto max-w-[10rem] sm:h-8" className="object-left" />
              </Link>

              <button
                type="button"
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="m-auto size-6 duration-200 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 group-data-[state=active]:rotate-180" />
                <X className="absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200 group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {navMenuItems.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="block text-muted-foreground duration-150 hover:text-accent-foreground"
                    >
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-border/50 bg-background p-6 shadow-2xl shadow-zinc-300/20 group-data-[state=active]:block dark:shadow-none md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {navMenuItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="block text-muted-foreground duration-150 hover:text-accent-foreground"
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button asChild variant="outline" size="sm" className={cn(isScrolled && 'lg:hidden')}>
                  <Link href="/login">
                    <span>Login</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className={cn(isScrolled && 'lg:hidden')}>
                  <Link href="/signup">
                    <span>Sign Up</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className={cn(isScrolled ? 'lg:inline-flex' : 'hidden')}>
                  <Link href="/signup">
                    <span>Get Started</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
