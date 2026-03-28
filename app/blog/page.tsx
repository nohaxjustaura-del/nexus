import Link from 'next/link'
import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Founder Resources',
  description: `Guides and benchmarks from ${BRAND_NAME} are not published here yet. See the product overview and pricing on the main site.`,
  robots: {
    index: false,
    follow: false,
  },
}

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Founder resources</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          We are not publishing articles on this URL yet. For how {BRAND_NAME} works today, start with{' '}
          <Link href="/about" className="font-medium text-primary underline-offset-2 hover:underline">
            About
          </Link>{' '}
          and{' '}
          <Link href="/pricing" className="font-medium text-primary underline-offset-2 hover:underline">
            Pricing
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
