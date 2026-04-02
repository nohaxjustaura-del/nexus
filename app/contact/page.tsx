import Link from 'next/link'
import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contact ${BRAND_NAME} for general questions, feedback, VC partnerships, and strategic inquiries.`,
}

const cardClass = 'border border-border/40 bg-card/80 shadow-sm ring-1 ring-border/15'

export default function ContactPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(28vh,16rem)] bg-[radial-gradient(ellipse_70%_55%_at_15%_-5%,hsl(var(--primary)/0.06),transparent_58%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <header className="mb-10">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Contact us</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Questions, feedback, partnerships, or investment-related conversations: we read everything.
          </p>
        </header>

        <div className="flex flex-col gap-6">
          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg font-semibold">General</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              <p>
                <a href="mailto:contact@nexus.app" className="font-medium text-primary underline-offset-2 hover:underline">
                  contact@nexus.app
                </a>
              </p>
              <p className="mt-2">Product questions, support, and founder feedback.</p>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg font-semibold">Partnerships &amp; investor relations</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              <p>
                <a href="mailto:partners@nexus.app" className="font-medium text-primary underline-offset-2 hover:underline">
                  partners@nexus.app
                </a>
              </p>
              <p className="mt-2">
                VC programs, strategics, and capital allocators evaluating {BRAND_NAME}. For a concise company narrative,
                see{' '}
                <Link href="/company" className="font-medium text-primary underline-offset-2 hover:underline">
                  Company overview
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
