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
  BarChart3,
  Check,
  Compass,
  FileText,
  LineChart,
  Mail,
  Search,
  Shield,
  Sparkles,
  Target,
  Users,
  Video,
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

const SIGNUP_ONBOARD = `/signup?next=${encodeURIComponent('/founder/onboarding')}`
const SIGNUP_DISCOVER = `/signup?next=${encodeURIComponent('/founder/discover')}`
const SIGNUP_PRICING = `/signup?next=${encodeURIComponent('/pricing')}`

export default function FounderLandingClient({
  verifiedInvestorCountLabel,
}: {
  verifiedInvestorCountLabel: string
}) {
  const router = useRouter()
  const { loading, authenticated, verified, user } = useAuthSession()

  useEffect(() => {
    if (loading || !authenticated || !verified) return
    if (isInvestorAccount(user?.userType)) return
    router.replace('/founder/dashboard')
  }, [loading, authenticated, verified, user?.userType, router])

  const primaryCta = authenticated && verified && !isInvestorAccount(user?.userType) ? '/founder/dashboard' : SIGNUP_ONBOARD
  const secondaryCta = '/founder/discover'

  return (
    <div className="relative bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(48vh,28rem)] bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.075),transparent_58%)]"
        aria-hidden
      />

      <section className="relative section-shell pt-12 sm:pt-16 md:pt-20">
        <div className="page-shell-x">
          <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow-label text-[11px]">Founders</p>
          <h1 className="hero-title mt-4">
            Stop cold-emailing the wrong investors
          </h1>
          <p className="hero-copy mt-5">
            {BRAND_NAME} reads your pitch like an investor would, scores fit, and builds a ranked shortlist of who to talk to first from {verifiedInvestorCountLabel} verified profiles.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="rounded-xl px-6">
              <Link href={primaryCta} onClick={() => track('cta_clicked', { name: 'founder_landing_primary' })}>
                {authenticated && verified && !isInvestorAccount(user?.userType) ? 'Open hub' : 'Start free'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl border-border/60 bg-background/80 px-6">
              <Link href={secondaryCta} onClick={() => track('cta_clicked', { name: 'founder_landing_discover' })}>
                Browse the directory
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Explore without a deck. Add your profile when you want ranked matches.
          </p>
          </div>
        </div>
      </section>

      <section className="section-shell" aria-labelledby="founder-cap-heading">
        <div className="page-shell-x">
          <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl">
            <h2 id="founder-cap-heading" className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              Everything in one founder workspace
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              From first draft to outreach: analysis, discovery, saved lists, and prep in one workspace.
            </p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: 'Allocator-style analysis',
                body: 'Structured feedback on deck, resume, or narrative.',
              },
              {
                icon: Search,
                title: 'Discover & filters',
                body: `Search ${verifiedInvestorCountLabel}+ profiles by stage, sector, and check size.`,
              },
              {
                icon: Target,
                title: 'Ranked matches',
                body: 'Shortlists with clear rationale tied to your profile.',
              },
              {
                icon: FileText,
                title: 'Crash courses',
                body: 'Per-investor prep: thesis, proof points, and how to frame your traction for that desk.',
              },
              {
                icon: BarChart3,
                title: 'Track analyses',
                body: 'Keep versions of your pitch analyses and jump back into outreach when you iterate.',
              },
              {
                icon: Shield,
                title: 'Verification & quality',
                body: 'Maintained listings so you avoid stale or low-quality leads.',
              },
              {
                icon: Video,
                title: 'Video pitch',
                body: 'Optional video workflow when you want feedback beyond slides.',
              },
              {
                icon: LineChart,
                title: 'Pricing',
                body: 'Transparent usage for AI-heavy flows; see Pricing for plans.',
              },
              {
                icon: Users,
                title: 'Partner network',
                body: 'Curated partner resources when your plan includes the founder network.',
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

      <section className="section-shell" aria-labelledby="founder-steps-heading">
        <div className="page-shell-x">
          <div className="mx-auto w-full max-w-6xl">
          <h2 id="founder-steps-heading" className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            How you move through {BRAND_NAME}
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3 md:gap-6">
            {[
              {
                step: '1',
                title: 'Share your pitch',
                body: 'Upload a deck, resume, or describe the company. We extract signals investors actually weight.',
              },
              {
                step: '2',
                title: 'See the read + the map',
                body: 'Get scored feedback and a ranked investor map from verified mandates.',
              },
              {
                step: '3',
                title: 'Shortlist & reach out',
                body: 'Bookmark firms, open crash courses, and draft outreach from the same workspace.',
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

      <section className="py-14 sm:py-16" aria-labelledby="founder-faq-heading">
        <div className="page-shell-x">
          <div className="mx-auto w-full max-w-2xl">
          <h2 id="founder-faq-heading" className="font-heading text-2xl font-semibold tracking-tight">
            Founder FAQ
          </h2>
          <Accordion type="single" collapsible className="mt-6 rounded-xl border border-border/40 bg-card/40 px-1">
            {[
              {
                q: 'Do I need an account to browse investors?',
                a: 'You can open the public directory at Discover without a full onboarding path. Creating an account unlocks matches, bookmarks, analyses, and saved progress.',
              },
              {
                q: 'Is this generic ChatGPT advice?',
                a: 'No. Flows are scoped to fundraising fit: stage, sector, check size, thesis fit, and explainable match reasons against a verified investor graph.',
              },
              {
                q: 'What if I am pre-deck?',
                a: 'You can start from narrative or resume-style inputs and still get direction on positioning and who to research first.',
              },
            ].map((item, i) => (
              <AccordionItem key={item.q} value={`f${i}`} className="border-border/35 px-3">
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

      <section className="border-t border-border/30 bg-muted/[0.06] py-14 sm:py-16">
        <div className="page-shell-x">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
          <Compass className="h-10 w-10 text-primary" aria-hidden />
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Ready when you are</h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Join founders using {BRAND_NAME} to compress research cycles and walk into conversations prepared.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-xl px-6">
              <Link href={SIGNUP_ONBOARD} onClick={() => track('cta_clicked', { name: 'founder_landing_footer_primary' })}>
                <Mail className="mr-2 h-4 w-4" />
                Create founder account
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="rounded-xl px-6">
              <Link href={SIGNUP_DISCOVER}>Sign up to save Discover</Link>
            </Button>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            {['Why NEXUS', 'Pricing', 'Investor guide'].map((label) => (
              <li key={label}>
                <Link
                  href={
                    label === 'Why NEXUS'
                      ? '/#why-nexus'
                      : label === 'Pricing'
                        ? authenticated && verified
                          ? '/pricing'
                          : SIGNUP_PRICING
                      : '/vc-guide'
                  }
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
