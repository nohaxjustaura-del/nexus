'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useAuthSession } from '@/components/auth-session-provider'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import { track as trackEvent } from '@/lib/analytics'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  FileSearch,
  LineChart,
  ListChecks,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'

const track = (event: string, props?: Record<string, unknown>) => {
  try {
    trackEvent(event as never, props as never)
  } catch {
    /* optional */
  }
}

function isInvestorAccount(userType: string | undefined) {
  const t = (userType || '').toLowerCase()
  return t === 'vc' || t === 'investor'
}

const SIGNUP_INVESTOR = `/signup?redirect=${encodeURIComponent('/vc/claim')}`

export default function InvestorLandingClient({
  verifiedInvestorCountLabel,
}: {
  verifiedInvestorCountLabel: string
}) {
  const router = useRouter()
  const { loading, authenticated, verified, user } = useAuthSession()

  useEffect(() => {
    if (loading || !authenticated || !isInvestorAccount(user?.userType)) return
    if (!verified) {
      router.replace('/vc/claim')
      return
    }
    router.replace('/investor/dashboard')
  }, [loading, authenticated, verified, user?.userType, router])

  const dashboardHref = '/investor/dashboard'
  const claimHref = '/vc/claim'

  const primaryCta =
    authenticated && isInvestorAccount(user?.userType)
      ? verified
        ? dashboardHref
        : claimHref
      : SIGNUP_INVESTOR

  const primaryLabel =
    authenticated && isInvestorAccount(user?.userType)
      ? verified
        ? 'Open investor workspace'
        : 'Complete listing'
      : 'List your mandate'

  return (
    <div className="relative bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(48vh,28rem)] bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.05),transparent_60%)]"
        aria-hidden
      />

      <section className="relative section-shell pt-12 sm:pt-16 md:pt-20">
        <div className="page-shell-x">
          <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow-label text-[11px]">
            Investors &amp; funds
          </p>
          <h1 className="hero-title mt-4">
            Meet founders who already fit your thesis
          </h1>
          <p className="hero-copy mt-5">
            {BRAND_NAME} is built for double opt-in intros. Claim your verified listing, keep your mandate current, and
            review applicants alongside the same verified graph of {verifiedInvestorCountLabel}+ investor profiles
            founders use for discovery.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="rounded-xl px-6">
              <Link href={primaryCta} onClick={() => track('cta_clicked', { name: 'investor_landing_primary' })}>
                {primaryLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl border-border/60 bg-background/80 px-6">
              <Link href="/vc-guide" onClick={() => track('cta_clicked', { name: 'investor_landing_guide' })}>
                Read the VC guide
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Already on the graph? Log in to open your investor dashboard and review founder recommendations.
          </p>
          </div>
        </div>
      </section>

      <section className="section-shell" aria-labelledby="investor-cap-heading">
        <div className="page-shell-x">
          <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <h2 id="investor-cap-heading" className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              Your investor portal on {BRAND_NAME}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              After you verify email, claim your fund profile once. From there you manage how founders see you and
              review structured applicant context.
            </p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {[
              {
                icon: Building2,
                title: 'Claim & edit listing',
                body: 'Firm name, stages, sectors, check range, geo focus, value-add tags: what founders filter on.',
              },
              {
                icon: Users,
                title: 'Investor dashboard',
                body: 'Founder recommendations with stage, sector, traction hints, and fit scores for your mandate.',
              },
              {
                icon: FileSearch,
                title: 'Applicant detail',
                body: 'Open a founder to see profile context before you decide to engage.',
              },
              {
                icon: Download,
                title: 'CSV export',
                body: 'Download the current pipeline for your CRM or partner meeting prep.',
              },
              {
                icon: Sparkles,
                title: 'Listing quality',
                body: 'A complete mandate profile improves how founders discover you and how recommendations are ranked.',
              },
              {
                icon: Shield,
                title: 'Verification',
                body: 'Listings stay trusted: updates flow through the same quality bar founders rely on.',
              },
              {
                icon: ListChecks,
                title: 'Profile completeness',
                body: 'Clearer mandates surface in better founder matches, with less noise in your inbox.',
              },
              {
                icon: LineChart,
                title: 'Signals, not spam',
                body: 'Founders arrive with analysis-backed context, not cold blasts with no fit rationale.',
              },
              {
                icon: CheckCircle2,
                title: 'Log in anytime',
                body: 'Use Log in from the header; investors route to claim until the profile is approved.',
              },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="minimal-feature-card">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/30 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-medium text-foreground">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          </div>
        </div>
      </section>

      <section className="section-shell" aria-labelledby="investor-steps-heading">
        <div className="page-shell-x">
          <div className="mx-auto w-full max-w-6xl">
          <h2 id="investor-steps-heading" className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            Getting live as an investor
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
            {[
              {
                step: '1',
                title: 'Sign up as Investor / VC',
                body: 'Use your work email so we can tie the listing to your firm and approval workflow.',
              },
              {
                step: '2',
                title: 'Claim your profile',
                body: 'Fill mandate, check size, sectors, and how you like to be approached.',
              },
              {
                step: '3',
                title: 'Review recommendations',
                body: 'Use the investor dashboard to scan founder profiles, drill into fit context, and bookmark prospects.',
              },
            ].map(({ step, title, body }) => (
              <li key={step} className="minimal-step-card">
                <span className="font-mono text-xs font-semibold text-primary">{step}</span>
                <h3 className="mt-2 font-heading text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16" aria-labelledby="investor-faq-heading">
        <div className="page-shell-x">
          <div className="mx-auto w-full max-w-2xl">
          <h2 id="investor-faq-heading" className="font-heading text-2xl font-semibold tracking-tight">
            Investor FAQ
          </h2>
          <Accordion type="single" collapsible className="mt-6 rounded-xl border border-border/40 bg-card/40 px-1">
            {[
              {
                q: 'Does NEXUS charge funds to be listed?',
                a: 'See Pricing for current plans. Claiming and core listing flows are designed to stay straightforward for verified investors.',
              },
              {
                q: 'How do founders reach me?',
                a: 'Founders discover you through the verified graph and prepared context. Engagement stays opt-in; you control how you respond outside the product.',
              },
              {
                q: 'What if our thesis changes?',
                a: 'Update your listing from the investor profile workspace so filters and founder-side matches stay accurate.',
              },
            ].map((item, i) => (
              <AccordionItem key={item.q} value={`i${i}`} className="border-border/35 px-3">
                <AccordionTrigger className="text-left text-sm hover:no-underline">{item.q}</AccordionTrigger>
                <AccordionContent>
                  <p className="pb-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          </div>
        </div>
      </section>

      <section className="border-t border-border/50 bg-card/40 py-14 sm:py-16">
        <div className="page-shell-x">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Claim your mandate</h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Help founders stop guessing. A precise listing improves match quality on both sides.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-xl px-6">
              <Link href={SIGNUP_INVESTOR} onClick={() => track('cta_clicked', { name: 'investor_landing_footer' })}>
                Create investor account
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="rounded-xl px-6">
              <Link href="/login?redirect=%2Fvc%2Fclaim">Log in to finish claim</Link>
            </Button>
          </div>
          </div>
        </div>
      </section>
    </div>
  )
}
