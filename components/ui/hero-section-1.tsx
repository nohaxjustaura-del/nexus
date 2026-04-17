'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X, Sparkles, Users, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NexusWordmark } from '@/components/nexus-wordmark'
import { BRAND_HERO_EYEBROW } from '@/lib/brand'
import { useAuthSession } from '@/components/auth-session-provider'
import { track as trackEvent } from '@/lib/analytics'
import { AnimatedCounter } from '@/components/ui/animated-counter'

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
  showHeader?: boolean
  verifiedInvestorCountLabel: string
  analysesCountLabel: string
}

export function HeroSection({ showHeader = true, verifiedInvestorCountLabel, analysesCountLabel }: HeroSectionProps) {
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

  const investorCount = parseInt(verifiedInvestorCountLabel.replace(/,/g, ''), 10) || 1200
  const analysesCount = parseInt(analysesCountLabel.replace(/,/g, ''), 10) || 3000
  const trustedLogoItems = React.useMemo(
    () => [
      { id: 'yc', label: 'Y Combinator', src: 'https://www.google.com/s2/favicons?domain=ycombinator.com&sz=64' },
      { id: 'stanford', label: 'Stanford', src: 'https://www.google.com/s2/favicons?domain=stanford.edu&sz=64' },
      { id: 'berkeley', label: 'Berkeley', src: 'https://www.google.com/s2/favicons?domain=berkeley.edu&sz=64' },
      { id: 'mit', label: 'MIT', src: 'https://www.google.com/s2/favicons?domain=mit.edu&sz=64' },
      { id: 'sequoia', label: 'Sequoia', src: 'https://www.google.com/s2/favicons?domain=sequoiacap.com&sz=64' },
      { id: 'a16z', label: 'a16z', src: 'https://www.google.com/s2/favicons?domain=a16z.com&sz=64' },
    ],
    []
  )
  const [trustedLogoIndex, setTrustedLogoIndex] = React.useState(0)

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setTrustedLogoIndex((prev) => (prev + 1) % trustedLogoItems.length)
    }, 2200)
    return () => window.clearInterval(interval)
  }, [trustedLogoItems.length])

  return (
    <>
      {showHeader ? <HeroHeader /> : null}
      <main className="overflow-hidden">
        <section className="relative">
          <div
            className={cn(
              'relative pb-16 md:pb-20',
              showHeader ? 'pt-24 md:pt-36' : 'pt-12 md:pt-16'
            )}
          >
            {/* Background glow effects */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
              <div className="absolute left-1/2 top-[-16%] h-[min(30rem,50vh)] w-[min(100%,50rem)] -translate-x-1/2 rounded-[100%] bg-primary/[0.07] blur-[80px]" />
              <div className="absolute left-1/3 top-[10%] h-48 w-48 rounded-full bg-primary/[0.04] blur-[60px]" />
              <div className="absolute right-1/4 top-[20%] h-36 w-36 rounded-full bg-primary/[0.03] blur-[50px]" />
            </div>
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <div className="hero-stagger mx-auto max-w-4xl">
                  {/* Announcement pill with shimmer */}
                  <Link
                    href={secondaryHref}
                    className="hero-reveal-item group mx-auto flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.06] px-4 py-2 text-sm text-foreground shadow-sm transition-all duration-300 hover:border-primary/40 hover:bg-primary/[0.1] hover:shadow-md"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                      <Sparkles className="h-3 w-3 text-primary" />
                    </span>
                    <span>
                      {verifiedInvestorCountLabel}+ profiles across stages, sectors, and check sizes
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-primary/60 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                  </Link>

                  <p className="hero-reveal-item mt-6 eyebrow-label text-primary/80">
                    {BRAND_HERO_EYEBROW}
                  </p>
                  <h1 className="hero-reveal-item hero-title mx-auto mt-3 max-w-4xl lg:mt-6 lg:text-[3.25rem]">
                    Fundraise with a <span className="gradient-text">fit engine</span>, not a static investor list
                  </h1>
                  <p className="hero-reveal-item hero-copy mt-8 max-w-xl">
                    NEXUS reads your pitch like a first-pass partner, then ranks real investors by mandate fit, stage, sector,
                    and check size so founders target the right people and investors see stronger, better-matched opportunities.
                  </p>
                </div>

                {/* CTAs */}
                <div className="hero-stagger-delayed mt-10 flex flex-col items-center justify-center gap-3 md:flex-row">
                  <Button asChild size="lg" className="hero-reveal-item rounded-xl px-7 text-base shadow-lg shadow-primary/20">
                    <Link
                      href={mounted && isVerifiedUser ? '/founder/ai-analysis' : '/signup'}
                      onClick={() => track('cta_clicked', { name: 'hero_primary', page: 'home' })}
                    >
                      <span className="text-nowrap">
                        {mounted && isVerifiedUser ? 'Analyze your pitch' : 'Analyze your pitch free'}
                      </span>
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="hero-reveal-item h-12 rounded-xl px-7">
                    <Link
                      href={secondaryHref}
                      onClick={() => track('cta_clicked', { name: 'hero_secondary', page: 'home' })}
                    >
                      <span className="text-nowrap">Browse investors</span>
                    </Link>
                  </Button>
                </div>

                {/* Animated stats bar */}
                <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4 md:gap-8">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-primary/70" strokeWidth={1.75} />
                      <AnimatedCounter
                        value={investorCount}
                        suffix="+"
                        className="text-2xl font-bold text-foreground md:text-3xl"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Verified Investors</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary/70" strokeWidth={1.75} />
                      <AnimatedCounter
                        value={analysesCount}
                        suffix="+"
                        className="text-2xl font-bold text-foreground md:text-3xl"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Analyses Run</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-primary/70" strokeWidth={1.75} />
                      <AnimatedCounter
                        value={94}
                        suffix="%"
                        className="text-2xl font-bold text-foreground md:text-3xl"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Match Accuracy</p>
                  </div>
                </div>

                {/* Social proof */}
                <div className="mx-auto mt-14 max-w-lg">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                    Trusted by founders from
                  </p>
                  <div className="mt-3 flex items-center justify-center">
                    <div className="relative h-11 w-11 overflow-hidden rounded-full border border-border/55 bg-background/85 ring-1 ring-border/30">
                      {trustedLogoItems.map((item, idx) => {
                        const isActive = idx === trustedLogoIndex
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              'absolute inset-0 flex items-center justify-center transition-all duration-500',
                              isActive
                                ? 'translate-y-0 opacity-100'
                                : idx < trustedLogoIndex || (trustedLogoIndex === 0 && idx === trustedLogoItems.length - 1)
                                  ? '-translate-y-full opacity-0'
                                  : 'translate-y-full opacity-0'
                            )}
                            aria-hidden={!isActive}
                          >
                            <img
                              src={item.src}
                              alt={item.label}
                              className="h-full w-full rounded-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                            <span className="sr-only">{item.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
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
