import Link from 'next/link'
import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import { cn } from '@/lib/utils'
import { getSiteUrl } from '@/lib/site-url'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: 'Company',
  description: `${BRAND_NAME} is fundraising intelligence built for fit. Verified investor data and clear scoring give founders ranked shortlists with reasons, not static lists or vague AI guesses.`,
  openGraph: {
    title: `Company | ${BRAND_NAME}`,
    description: `${BRAND_TAGLINE}. Teams verify profiles, refresh data on a schedule, and tune the product to how founders actually raise rounds.`,
    url: `${siteUrl}/company`,
    siteName: BRAND_NAME,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Company | ${BRAND_NAME}`,
    description: `${BRAND_NAME} pairs curated mandates with matches tied to your pitch. Credits and subscriptions fit teams that fundraise seriously.`,
  },
}

const sectionCard =
  'border border-border/40 bg-card/80 shadow-sm ring-1 ring-border/15'

export default function CompanyPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(32vh,18rem)] bg-[radial-gradient(ellipse_70%_55%_at_15%_-5%,hsl(var(--primary)/0.07),transparent_58%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <header className="mb-8 border-b border-border/30 pb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{BRAND_NAME}</p>
          <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Company overview</h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
            For partners and strategics evaluating {BRAND_NAME}. Founder-facing product detail is on{' '}
            <Link href="/about" className="font-medium text-primary underline-offset-2 hover:underline">
              About
            </Link>
            .
          </p>
          <nav
            className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-border/30 pt-5 text-xs font-medium text-muted-foreground"
            aria-label="On this page"
          >
            <a href="#company-problem" className="hover:text-foreground">
              Problem
            </a>
            <a href="#company-product" className="hover:text-foreground">
              Product
            </a>
            <a href="#company-moat" className="hover:text-foreground">
              Moat
            </a>
            <a href="#company-model" className="hover:text-foreground">
              Model
            </a>
            <a href="#company-traction" className="hover:text-foreground">
              Traction
            </a>
            <a href="#company-contact" className="hover:text-foreground">
              Contact
            </a>
          </nav>
        </header>

        <div className="flex flex-col gap-8">
          <Card id="company-problem" className={cn(sectionCard, 'scroll-mt-24')}>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Problem and opportunity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              <p>
                Fundraising discovery is noisy: massive directories, weak overlap with a given startup&apos;s stage and
                story, and outreach that burns founder time without improving odds.
              </p>
              <p>
                Founders need a <span className="font-medium text-foreground">ranked, explainable shortlist</span> tied to
                verified mandates, not another export to sort by hand, or a one-off answer from a general model that was not
                built to track who actually backs what.
              </p>
            </CardContent>
          </Card>

          <Card id="company-product" className={cn(sectionCard, 'scroll-mt-24')}>
            <CardHeader>
              <CardTitle className="font-heading text-xl">What {BRAND_NAME} does</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              <p>
                {BRAND_NAME} is{' '}
                <span className="font-medium text-foreground">
                  {BRAND_TAGLINE.charAt(0).toLowerCase() + BRAND_TAGLINE.slice(1)}
                </span>
                : founders submit pitch materials or structured answers; the product scores narrative and fit signals with
                fundraising-specific calibration, then ranks investors from a maintained directory of VCs, angels,
                accelerators, and corporate venture arms.
              </p>
              <p>
                Discovery, bookmarks, and tailored outreach support the workflow from first pass through follow-up, without{' '}
                {BRAND_NAME} brokering securities or sending intros on a founder&apos;s behalf.
              </p>
            </CardContent>
          </Card>

          <Card id="company-moat" className={cn(sectionCard, 'scroll-mt-24')}>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Why it is defensible</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="font-medium text-foreground">Verified directory:</span> investor records are enriched
                  and validated through background workers and admin review, not scraped lists alone.
                </li>
                <li>
                  <span className="font-medium text-foreground">Refresh and quality bar:</span> data is updated on a
                  recurring basis; listings are quality-checked before they drive matching.
                </li>
                <li>
                  <span className="font-medium text-foreground">Match depth:</span> retrieval and scoring combine
                  structured mandates (stage, sector, thesis, geography) with narrative signals so rankings reflect how
                  founders actually tell their story. The product stays scoped to this domain. Unlike a general chat interface,
                  outputs map to verified profiles and explainable fit, not open-ended prose alone.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card id="company-model" className={cn(sectionCard, 'scroll-mt-24')}>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Business model</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              <p>
                Revenue comes from <span className="font-medium text-foreground">usage-based credits</span> and a{' '}
                <span className="font-medium text-foreground">subscription tier</span> (Stripe Checkout and
                subscriptions), aligned with high-intent founder activity on analysis and matching.
              </p>
              <p>
                See public packaging on the{' '}
                <Link href="/pricing" className="font-medium text-primary underline-offset-2 hover:underline">
                  Pricing
                </Link>{' '}
                page.
              </p>
            </CardContent>
          </Card>

          <Card id="company-traction" className={cn(sectionCard, 'scroll-mt-24')}>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Traction (update with your metrics)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-foreground/90">
                Replace this block with verified figures: active founders, paying accounts, MRR or ARR, match runs per
                month, pipeline, and notable design partners or programs.
              </p>
              <p>Until this section is filled, treat public materials as product-in-progress, not audited financials.</p>
            </CardContent>
          </Card>

          <Card id="company-contact" className={cn(sectionCard, 'scroll-mt-24')}>
            <CardHeader>
              <CardTitle className="font-heading text-xl">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              <p>
                <span className="font-medium text-foreground">Partnerships and investor relations:</span>{' '}
                <a href="mailto:partners@nexus.app" className="text-primary underline-offset-2 hover:underline">
                  partners@nexus.app
                </a>
              </p>
              <p>
                <span className="font-medium text-foreground">General inquiries:</span>{' '}
                <a href="mailto:contact@nexus.app" className="text-primary underline-offset-2 hover:underline">
                  contact@nexus.app
                </a>
                , or use the{' '}
                <Link href="/contact" className="text-primary underline-offset-2 hover:underline">
                  Contact
                </Link>{' '}
                page.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/pricing"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/92"
          >
            View pricing
          </Link>
          <Link
            href="/about"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-border/50 bg-background/40 px-8 text-base font-semibold backdrop-blur-sm transition-colors hover:bg-muted/35"
          >
            Product overview
          </Link>
        </div>
      </div>
    </div>
  )
}
