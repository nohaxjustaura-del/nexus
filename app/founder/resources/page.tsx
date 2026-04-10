import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { Badge } from '@/components/ui/badge'
import { RESOURCE_PARTNERS } from '@/lib/partner-resources'
import { cn } from '@/lib/utils'
import { ensureFounderResourcesPageAccess } from '@/lib/founder-resources-page-gate'

export const metadata: Metadata = {
  title: 'Resources - Partners',
  description:
    'Partner resource hubs: YC application teardowns, deck autopsies, interview prep, and optional mentorship.',
}

export default async function FounderResourcesIndexPage() {
  await ensureFounderResourcesPageAccess()
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Resources</h1>
          <p className="max-w-2xl text-sm text-zinc-400 sm:text-base">
            Partner hubs with playbooks, templates, and optional founder access. Open a card to read a short
            company intro and browse resources.
          </p>
        </div>

        <div className="space-y-6">
          {RESOURCE_PARTNERS.map((partner) => (
            <Link
              key={partner.slug}
              href={`/founder/resources/${partner.slug}`}
              className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <article
                className={cn(
                  'overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-sm transition-colors',
                  'group-hover:border-amber-500/35 group-hover:bg-zinc-950',
                )}
              >
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold tracking-tight text-white">{partner.name}</h2>
                      <Badge className="border border-amber-400/40 bg-amber-500/15 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                        {partner.listSummary}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-400">{partner.listDetail}</p>
                  </div>
                  <span
                    className={cn(
                      buttonVariants({ variant: 'default', size: 'sm' }),
                      'inline-flex shrink-0 items-center gap-1.5 bg-amber-500 text-black hover:bg-amber-400',
                    )}
                  >
                    Open resources &amp; playbooks
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {partner.foundersPreview.map((f) => (
                    <div
                      key={f.name}
                      className="flex gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-zinc-700">
                        <Image
                          src={f.imageSrc}
                          alt={f.imageAlt}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-50">{f.name}</p>
                          <Badge className="border border-amber-400/40 bg-amber-500/15 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
                            {partner.listSummary}
                          </Badge>
                        </div>
                        <p className="text-xs leading-snug text-zinc-400">{f.roleLine}</p>
                        <Badge variant="outline" className="mt-1 border-zinc-700 text-[10px] text-zinc-300">
                          {f.tag}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </Link>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-zinc-500">
          Looking for something else?{' '}
          <Link
            href="/pricing"
            className="font-medium text-blue-400 transition-colors hover:text-blue-300 hover:underline"
          >
            Pricing &amp; Premium
          </Link>
        </p>
      </div>
    </div>
  )
}
