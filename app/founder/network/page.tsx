import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { Badge } from '@/components/ui/badge'
import { getResourcePartnersByNetworkSection } from '@/lib/partner-resources'
import { cn } from '@/lib/utils'
import { ensureFounderNetworkPageAccess } from '@/lib/founder-network-page-gate'

export const metadata: Metadata = {
  title: 'Network - Partners',
  description:
    'Partner hubs for approved founders and verified investors: YC application teardowns, deck autopsies, interview prep, and optional mentorship.',
}

export default async function FounderNetworkIndexPage() {
  await ensureFounderNetworkPageAccess()
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh bg-dot-grid" aria-hidden />
      <div className="page-shell-narrow py-8 sm:py-10">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Network</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Partner hubs for members of our network: playbooks, templates, and optional founder access. Open a card to
            read a short company intro and browse materials.
          </p>
        </div>

        <div className="space-y-10">
          {getResourcePartnersByNetworkSection().map(({ section, label, partners }) => (
            <div key={section} className="space-y-4">
              <div className="space-y-1 border-b border-border/40 pb-2">
                <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{label.title}</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">{label.description}</p>
              </div>
              <div className="space-y-6">
                {partners.map((partner) => (
                  <Link
                    key={partner.slug}
                    href={`/founder/network/${partner.slug}`}
                    className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <article
                      className={cn(
                        'overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur-sm transition-colors',
                        'group-hover:border-amber-500/35 group-hover:bg-card/85',
                      )}
                    >
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold tracking-tight text-white">{partner.name}</h3>
                            <Badge className="border border-amber-400/40 bg-amber-500/15 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                              {partner.listSummary}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{partner.listDetail}</p>
                        </div>
                        <span
                          className={cn(
                            buttonVariants({ variant: 'default', size: 'sm' }),
                            'inline-flex shrink-0 items-center gap-1.5 bg-amber-500 text-black hover:bg-amber-400',
                          )}
                        >
                          Open partner hub
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>

                      <div
                        className={cn(
                          'grid gap-4',
                          partner.foundersPreview.length > 1 ? 'sm:grid-cols-2' : 'sm:max-w-xl',
                        )}
                      >
                        {partner.foundersPreview.map((f) => (
                          <div
                            key={f.name}
                            className="flex gap-3 rounded-xl border border-border/60 bg-muted/25 p-3"
                          >
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border/70">
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
                                <p className="truncate text-sm font-semibold text-foreground">{f.name}</p>
                                <Badge className="border border-amber-400/40 bg-amber-500/15 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
                                  {partner.listSummary}
                                </Badge>
                              </div>
                              <p className="text-xs leading-snug text-muted-foreground">{f.roleLine}</p>
                              <Badge variant="outline" className="mt-1 border-border/70 text-[10px] text-muted-foreground">
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
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Looking for something else?{' '}
          <Link
            href="/pricing"
            className="font-medium text-primary transition-colors hover:text-primary/85 hover:underline"
          >
            Pricing &amp; Premium
          </Link>
        </p>
      </div>
    </div>
  )
}
