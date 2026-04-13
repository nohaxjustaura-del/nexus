import Link from 'next/link'
import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Legal, privacy & security',
  description: `Privacy policy, terms of service, identity verification notice, and security practices for ${BRAND_NAME}.`,
}

const cardClass = 'border border-border/40 bg-card/80 shadow-sm ring-1 ring-border/15'

const sections = [
  { id: 'privacy' as const, label: 'Privacy' },
  { id: 'terms' as const, label: 'Terms' },
  { id: 'verification' as const, label: 'Verification' },
  { id: 'security' as const, label: 'Security' },
] as const

const scrollClass = 'scroll-mt-24'

export default function LegalHubPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(32vh,18rem)] bg-[radial-gradient(ellipse_70%_55%_at_15%_-5%,hsl(var(--primary)/0.06),transparent_58%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <header className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-none lg:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Legal & trust</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Privacy, terms, verification &amp; security
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px] lg:mx-0">
            Everything in one place. Jump to a section below or use the outline on large screens.
          </p>
        </header>

        <nav
          className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-2.5 lg:hidden"
          aria-label="Legal sections"
        >
          {sections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-border/50 bg-muted/30 px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:gap-14">
          <nav
            className="hidden lg:block"
            aria-label="On this page"
          >
            <div className="sticky top-24 space-y-1 border-l border-border/40 pl-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                On this page
              </p>
              {sections.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="block rounded-md py-1.5 pl-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>

          <div className="mx-auto w-full max-w-3xl space-y-10 lg:mx-0 lg:max-w-none">
            <section id="privacy" className={scrollClass}>
              <Card className={cardClass}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-xl font-semibold sm:text-2xl">Privacy policy</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  <p>
                    We collect only what improves matching and trust. Marketing is opt‑in. You can request deletion and
                    export of your data at any time through your account settings or by contacting us.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section id="terms" className={scrollClass}>
              <Card className={cardClass}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-xl font-semibold sm:text-2xl">Terms of service</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  <p>
                    {BRAND_NAME} provides information and tools only. We do not give investment advice, solicit
                    investments, or broker transactions. By using the site you agree to these terms. We reserve the
                    right to modify these terms at any time.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section id="verification" className={scrollClass}>
              <Card className={cardClass}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-xl font-semibold sm:text-2xl">Verification notice</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  <p>
                    We use third‑party providers to verify identity documents. We store only the verification status and
                    a provider reference, not your raw ID image. Uploaded files are scanned for malware and deleted
                    within 30–90 days. See the privacy section above for how we handle personal data.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section id="security" className={scrollClass}>
              <Card className={cardClass}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-xl font-semibold sm:text-2xl">Security</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  <p>
                    Data in transit is protected with TLS; data at rest is encrypted. We apply least‑privilege access and
                    monitor for abuse. We regularly conduct security audits and update our systems to protect your
                    information.
                  </p>
                </CardContent>
              </Card>
            </section>

            <p className="text-center text-xs text-muted-foreground lg:text-left">
              Questions?{' '}
              <Link href="/contact" className="font-medium text-primary underline-offset-2 hover:underline">
                Contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
