'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Coins,
  Lock,
  MessageSquare,
  Calendar,
  Download,
  Video,
  FileText,
  CheckCircle,
  ExternalLink,
  Target,
  Zap,
  BarChart3,
  Phone,
  Mail,
} from 'lucide-react'
import { toast } from '@/components/ui/toast-simple'
import {
  YcInsiderFounderRequestModal,
  type YcFounderKey,
  type YcRequestType,
} from '@/components/yc-insider-founder-request-modal'
import { normalizeUserCreditsApiPayload } from '@/lib/client/normalize-user-credits-api'
import { getResourcePartner, type PartnerFounderPreview } from '@/lib/partner-resources'
import { InvestorBookingModal } from '@/components/investor-booking-modal'
import { CalendlyLoader } from '@/components/calendly-loader'

const PACK_MODULE_IDS = [
  'application-deconstruction',
  'pitch-deck-autopsy',
  'interview-simulator',
  'metrics-timeline',
  'distribution-diary',
  'demo-teardown',
] as const

/** À-la-carte balance cost per module (multiples of 5; tiered by depth / prep value). */
const PARTNER_MODULE_CREDITS: Record<(typeof PACK_MODULE_IDS)[number], number> = {
  'application-deconstruction': 100,
  'interview-simulator': 90,
  'pitch-deck-autopsy': 85,
  'distribution-diary': 80,
  'demo-teardown': 75,
  'metrics-timeline': 70,
}

const PARTNER_MODULES_A_LA_CARTE_TOTAL = PACK_MODULE_IDS.reduce(
  (sum, id) => sum + PARTNER_MODULE_CREDITS[id],
  0
)
/** All six modules + bonus; priced below sum of individuals. */
const PARTNER_COMPLETE_PACK_CREDITS = 400
const PARTNER_BUNDLE_SAVE_CREDITS =
  PARTNER_MODULES_A_LA_CARTE_TOTAL - PARTNER_COMPLETE_PACK_CREDITS

export default function PartnerResourcesClient({ partnerSlug }: { partnerSlug: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [credits, setCredits] = useState(0)
  const [purchases, setPurchases] = useState<string[]>([])
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [requestModal, setRequestModal] = useState<{
    open: boolean
    founderKey: YcFounderKey
    founderName: string
    requestType: YcRequestType
  }>({
    open: false,
    founderKey: 'william',
    founderName: '',
    requestType: 'ask',
  })
  const [bookingModal, setBookingModal] = useState<{
    open: boolean
    partnerSlug: string
    founderName: string
    founderRole: string
    calendlyUrl: string
  } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/user/credits', { credentials: 'include' })
        if (res.ok) {
          const raw = await res.json()
          const n = normalizeUserCreditsApiPayload(raw)
          setIsPremium(n.isPremium)
          setCredits(n.credits)
          setPurchases(n.purchases)
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handlePurchase = async (itemId: string, cost: number) => {
    // Skip balance check for premium users (unlimited shown as MAX_SAFE_INTEGER)
    if (!isPremium && credits < cost) {
      toast.error('Not enough balance. Add funds on the Pricing page.')
      return
    }
    
    setPurchasing(itemId)
    try {
      const res = await fetch('/api/yc-insider/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId, cost })
      })
      
      if (res.ok) {
        const data = await res.json()
        setCredits(data.remainingCredits)
        setPurchases((prev) => {
          if (itemId === 'complete-pack') {
            return [...new Set([...prev, ...PACK_MODULE_IDS, 'complete-pack'])]
          }
          return prev.includes(itemId) ? prev : [...prev, itemId]
        })
        toast.success('Purchase successful! You can now access this material.')
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || 'Purchase failed. Please try again.')
      }
    } catch (e) {
      toast.error('Purchase failed. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  const hasPurchased = (itemId: string) =>
    isPremium || purchases.includes('complete-pack') || purchases.includes(itemId)

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  const partner = getResourcePartner(partnerSlug)
  if (!partner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Unknown partner.
      </div>
    )
  }

  const showPlaybooks = partner.showYcPlaybookModules !== false
  const advisorHub = !showPlaybooks
  const openFounderRequest = (founderKey: YcFounderKey, founderName: string, requestType: YcRequestType) => {
    if (!isPremium) {
      router.push(`/pricing?from=${encodeURIComponent(pathname || '/founder/network')}`)
      return
    }
    setRequestModal({ open: true, founderKey, founderName, requestType })
  }

  const openCalendarBooking = (f: PartnerFounderPreview, slug: string) => {
    if (!f.calendlyUrl) return
    setBookingModal({
      open: true,
      partnerSlug: slug,
      founderName: f.name,
      founderRole: f.roleLine,
      calendlyUrl: f.calendlyUrl,
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <CalendlyLoader />
      {bookingModal && (
        <InvestorBookingModal
          open={bookingModal.open}
          onOpenChange={(open) => {
            if (!open) setBookingModal(null)
          }}
          partnerSlug={bookingModal.partnerSlug}
          founderName={bookingModal.founderName}
          founderRole={bookingModal.founderRole}
          calendlyUrl={bookingModal.calendlyUrl}
        />
      )}
      <YcInsiderFounderRequestModal
        open={requestModal.open}
        onOpenChange={(open) => setRequestModal((m) => ({ ...m, open }))}
        founderKey={requestModal.founderKey}
        founderName={requestModal.founderName}
        requestType={requestModal.requestType}
      />
      <div className="container max-w-7xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <Link href="/founder/dashboard" className="text-zinc-500 hover:text-zinc-300">
                ← Back to hub
              </Link>
              <Link href="/founder/network" className="text-zinc-500 hover:text-zinc-300">
                ← All partners
              </Link>
            </div>
            {showPlaybooks ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="inline-flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-100">
                  <Coins className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="text-sm font-semibold">
                    Balance: {credits >= Number.MAX_SAFE_INTEGER / 2 ? '∞' : credits}
                  </span>
                  <Link href="/pricing">
                    <Button size="sm" variant="secondary" className="h-7 bg-zinc-800 text-xs text-zinc-100 hover:bg-zinc-700">
                      Buy more
                    </Button>
                  </Link>
                </div>
                {!isPremium ? (
                  <Link
                    href="/pricing"
                    className={cn(
                      buttonVariants(),
                      'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                    )}
                  >
                    Upgrade for mentorship &amp; playbooks
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="text-center">
            <h1 className="mb-3 text-4xl font-bold text-zinc-50 md:text-5xl">{partner.heroTitle}</h1>
            {partner.heroSubtitlePlain ? (
              <p className="mx-auto max-w-2xl text-pretty text-lg leading-relaxed text-zinc-400">
                {partner.heroSubtitlePlain}
              </p>
            ) : (
              <p className="mx-auto max-w-2xl text-pretty text-lg leading-relaxed text-zinc-400">
                {partner.heroSubtitleBeforePremium}
                <strong className="text-zinc-300">Premium</strong>
                {partner.heroSubtitleAfterPremium}
              </p>
            )}
          </div>
        </div>

        {showPlaybooks && !isPremium && (
          <Card className="mb-10 border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-zinc-900/90 text-zinc-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-100">
                <Lock className="h-5 w-5 text-amber-400" />
                Premium unlocks mentorship
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Premium: full founder profiles, LinkedIn, Ask questions directly, and every playbook below at no extra charge.
                Meeting bookings are open to all approved network members.
                Without Premium, browse module descriptions and unlock each section from your balance, or buy the bundle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 border-t border-zinc-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-400">
                  Pay per module from your balance, or upgrade for unlimited access to partner playbooks and founder
                  requests.
                </p>
                <Link
                  href="/pricing"
                  className={cn(
                    buttonVariants(),
                    'shrink-0 bg-amber-500 text-zinc-950 hover:bg-amber-400'
                  )}
                >
                  Upgrade for mentorship &amp; playbooks
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-8">
          {/* Company + founders (single panel) */}
          <Card className="border border-zinc-700 bg-zinc-900/80 shadow-none">
            <CardHeader className="space-y-3 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl text-zinc-50">{partner.name}</CardTitle>
                <Badge className="border border-amber-400/40 bg-amber-500/15 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                  {partner.listSummary}
                </Badge>
              </div>
              <CardDescription className="text-base leading-relaxed text-zinc-300">
                {partner.companyIntro}
              </CardDescription>
              {partner.eligibilityNote ? (
                <p className="rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-sm leading-relaxed text-amber-100/90">
                  {partner.eligibilityNote}
                </p>
              ) : null}
              <p className="text-sm text-zinc-500">{partner.resourcesTagline}</p>
            </CardHeader>
            <CardContent className="pt-2">
              <div
                className={cn(
                  'relative rounded-xl border p-4 md:p-5',
                  advisorHub
                    ? 'min-h-[240px] border-amber-500/30 bg-gradient-to-br from-zinc-950 via-zinc-950/80 to-amber-950/25 p-6 shadow-[0_0_0_1px_rgba(251,191,36,0.08)] md:p-8'
                    : 'min-h-[220px] border-zinc-800/80 bg-zinc-950/30',
                )}
              >
                <div
                  className={cn(
                    'rounded-xl',
                    showPlaybooks && !isPremium && 'pointer-events-none select-none blur-sm',
                  )}
                >
                  <div
                    className={cn(
                      'gap-8',
                      advisorHub
                        ? 'flex flex-col items-stretch gap-8'
                        : 'grid md:grid-cols-2 md:gap-10',
                    )}
                  >
                    {partner.foundersPreview.map((f) => {
                      const telHref = f.phone ? `tel:${f.phone.replace(/\D/g, '')}` : undefined
                      const mailHref = f.email
                        ? `mailto:${f.email}${f.emailSubject ? `?subject=${encodeURIComponent(f.emailSubject)}` : ''}`
                        : undefined
                      if (advisorHub) {
                        return (
                          <div
                            key={f.name}
                            className="flex w-full max-w-3xl flex-col items-center gap-6 text-center md:flex-row md:items-start md:gap-10 md:text-left"
                          >
                            <div className="relative shrink-0">
                              <div
                                className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-400/35 via-amber-500/15 to-transparent blur-md"
                                aria-hidden
                              />
                              <Image
                                src={f.imageSrc}
                                alt={f.imageAlt}
                                width={144}
                                height={144}
                                className="relative h-32 w-32 rounded-full object-cover ring-4 ring-amber-500/40 ring-offset-4 ring-offset-zinc-950 md:h-36 md:w-36"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                                  <h4 className="text-2xl font-bold tracking-tight text-zinc-50 md:text-3xl">{f.name}</h4>
                                  <Badge className="border-amber-500/45 bg-amber-500/20 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                                    {partner.listSummary}
                                  </Badge>
                                </div>
                                {f.locationLine ? (
                                  <p className="text-sm font-medium text-zinc-400">{f.locationLine}</p>
                                ) : null}
                              </div>
                              <p className="text-sm leading-relaxed text-zinc-300 md:text-base">{f.roleLine}</p>
                              <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                                <Badge
                                  variant="outline"
                                  className="border-zinc-600 bg-zinc-900/80 text-xs text-zinc-300"
                                >
                                  {f.tag}
                                </Badge>
                              </div>
                              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:justify-center md:justify-start">
                                {telHref ? (
                                  <a
                                    href={telHref}
                                    className={cn(
                                      buttonVariants({ size: 'lg' }),
                                      'inline-flex items-center justify-center gap-2 bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25 hover:bg-amber-400',
                                    )}
                                  >
                                    <Phone className="h-4 w-4 shrink-0" />
                                    {f.phone}
                                  </a>
                                ) : null}
                                {mailHref ? (
                                  <a
                                    href={mailHref}
                                    className={cn(
                                      buttonVariants({ size: 'lg' }),
                                      'inline-flex items-center justify-center gap-2 bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/25 hover:bg-amber-400',
                                    )}
                                  >
                                    <Mail className="h-4 w-4 shrink-0" />
                                    {f.email}
                                  </a>
                                ) : null}
                                {partner.partnerSiteUrl ? (
                                  <a
                                    href={partner.partnerSiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      buttonVariants({ variant: 'outline', size: 'lg' }),
                                      'inline-flex items-center justify-center gap-2 border-zinc-600 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white',
                                    )}
                                  >
                                    {partner.partnerSiteLabel ?? 'Firm website'}
                                    <ExternalLink className="h-4 w-4 shrink-0" />
                                  </a>
                                ) : null}
                                {partner.extraPartnerLinks?.map((link) => (
                                  <a
                                    key={link.href}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      buttonVariants({ variant: 'outline', size: 'lg' }),
                                      'inline-flex items-center justify-center gap-2 border-zinc-600 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white',
                                    )}
                                  >
                                    {link.label}
                                    <ExternalLink className="h-4 w-4 shrink-0" />
                                  </a>
                                ))}
                                {f.linkedInUrl ? (
                                  <a
                                    href={f.linkedInUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      buttonVariants({ variant: 'secondary', size: 'lg' }),
                                      'inline-flex items-center justify-center gap-2 bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
                                    )}
                                  >
                                    LinkedIn
                                    <ExternalLink className="h-4 w-4 shrink-0" />
                                  </a>
                                ) : null}
                                {f.calendlyUrl ? (
                                  <Button
                                    size="lg"
                                    variant="outline"
                                    className="inline-flex items-center justify-center gap-2 border-zinc-600 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white"
                                    onClick={() => openCalendarBooking(f, partner.slug)}
                                  >
                                    <Calendar className="h-4 w-4 shrink-0" />
                                    Book meeting
                                  </Button>
                                ) : null}
                              </div>
                              {f.emailNote ? (
                                <p className="text-sm leading-relaxed text-zinc-400">{f.emailNote}</p>
                              ) : null}
                            </div>
                          </div>
                        )
                      }
                      return (
                        <div key={f.name} className="flex items-start gap-3">
                          <Image
                            src={f.imageSrc}
                            alt={f.imageAlt}
                            width={56}
                            height={56}
                            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-zinc-700"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-zinc-50">{f.name}</h4>
                              <Badge className="border-amber-500/40 bg-amber-500/20 text-xs text-amber-100 hover:bg-amber-500/25">
                                {partner.listSummary}
                              </Badge>
                            </div>
                            <p className="mb-2 text-sm leading-snug text-zinc-400">{f.roleLine}</p>
                            <div className="mb-3">
                              <Badge
                                variant="outline"
                                className="border-zinc-600 bg-zinc-800/80 text-xs text-zinc-300"
                              >
                                {f.tag}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {f.founderKey ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={!isPremium}
                                  className="border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white"
                                  onClick={() => openFounderRequest(f.founderKey!, f.name, 'ask')}
                                >
                                  <MessageSquare className="mr-1.5 h-3 w-3" />
                                  Ask
                                </Button>
                              ) : null}
                              {f.calendlyUrl ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white"
                                  onClick={() => openCalendarBooking(f, partner.slug)}
                                >
                                  <Calendar className="mr-1.5 h-3 w-3" />
                                  Book
                                </Button>
                              ) : f.founderKey ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={!isPremium}
                                  className="border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 hover:text-white"
                                  onClick={() => openFounderRequest(f.founderKey!, f.name, 'book')}
                                >
                                  <Calendar className="mr-1.5 h-3 w-3" />
                                  Book
                                </Button>
                              ) : null}
                              {f.linkedInUrl ? (
                                <a
                                  href={f.linkedInUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`${f.name} on LinkedIn`}
                                  className={cn(
                                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                                    'text-zinc-300 hover:bg-zinc-800 hover:text-white',
                                  )}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {showPlaybooks && !isPremium ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-zinc-950/70 px-4 text-center backdrop-blur-[3px]">
                    <p className="max-w-sm text-sm text-zinc-200">
                      Upgrade to Premium for LinkedIn, Ask / Book, and full founder access with {partner.name}.
                    </p>
                    <Button
                      onClick={() =>
                        router.push(`/pricing?from=${encodeURIComponent(pathname || '/founder/network')}`)
                      }
                      className="bg-amber-500 text-zinc-950 hover:bg-amber-400"
                    >
                      Upgrade for mentorship &amp; playbooks
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {partner.secondaryHub ? (
            <Card className="border border-zinc-700 bg-zinc-900/80 shadow-none">
              <CardHeader className="space-y-2 pb-2">
                <CardTitle className="text-lg text-zinc-50">{partner.secondaryHub.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-zinc-400">
                  {partner.secondaryHub.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <a
                  href={partner.secondaryHub.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'inline-flex items-center justify-center gap-2 border-zinc-600 bg-zinc-950 text-zinc-100 hover:bg-zinc-800 hover:text-white',
                  )}
                >
                  {partner.secondaryHub.ctaLabel}
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              </CardContent>
            </Card>
          ) : null}

          {showPlaybooks ? (
            <>
          <div className="space-y-4 [&_h3]:text-zinc-50 [&_.text-muted-foreground]:text-zinc-400">
            
            {/* Module 1: Application Deconstruction */}
            <Card className="relative border border-zinc-700 bg-zinc-900/50 transition-colors hover:border-violet-500/40">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15">
                    <FileText className="h-5 w-5 text-violet-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">Application Deconstruction</CardTitle>
                      <Badge className="border border-violet-500/35 bg-violet-500/20 text-xs text-violet-200">
                        Most Valuable
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">Raw YC application answers + why each works + fill-in templates</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>What you get:</strong> Every YC application question with their actual answer, breakdown of why it works, risk flags they avoided, and a rewrite template you can use.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Raw application answers</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>"Why this works" analysis</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Risk flags avoided</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Fill-in templates</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('application-deconstruction') ? (
                  <Button 
                    className="w-full bg-zinc-100 text-zinc-900 hover:bg-white" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=application-deconstruction`, {
                          credentials: 'include'
                        })
                        if (res.ok) {
                          const data = await res.json()
                          toast.info(
                            `Download would start: ${data.filename}\n\nNote: Actual materials will be available in production.`,
                            8000
                          )
                        } else {
                          toast.error('Failed to access material. Please try again.')
                        }
                      } catch (e) {
                        toast.error('Failed to download. Please try again.')
                      }
                    }}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Access Application Breakdown
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase(
                        'application-deconstruction',
                        PARTNER_MODULE_CREDITS['application-deconstruction']
                      )
                    }}
                    disabled={purchasing === 'application-deconstruction'}
                  >
                    {purchasing === 'application-deconstruction' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for {PARTNER_MODULE_CREDITS['application-deconstruction']}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Module 2: Pitch Deck Autopsy */}
            <Card className="relative border border-zinc-700 bg-zinc-900/50 transition-colors hover:border-sky-500/40">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/15">
                    <FileText className="h-5 w-5 text-sky-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">Pitch Deck Autopsy</CardTitle>
                    </div>
                    <CardDescription className="text-xs">Annotated deck + critical slides + what YC questioned</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>What you get:</strong> Their full deck with slide-by-slide annotations explaining what each slide must prove, why the wording works, and what YC likely questioned.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Full annotated deck</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Critical 5 slides spotlight</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>YC question predictions</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Deck checklist</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('pitch-deck-autopsy') ? (
                  <Button 
                    className="w-full bg-zinc-100 text-zinc-900 hover:bg-white" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=pitch-deck-autopsy`, {
                          credentials: 'include'
                        })
                        if (res.ok) {
                          const data = await res.json()
                          toast.info(
                            `Download would start: ${data.filename}\n\nNote: Actual materials will be available in production.`,
                            8000
                          )
                        } else {
                          toast.error('Failed to access material. Please try again.')
                        }
                      } catch (e) {
                        toast.error('Failed to download. Please try again.')
                      }
                    }}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Access Deck Autopsy
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('pitch-deck-autopsy', PARTNER_MODULE_CREDITS['pitch-deck-autopsy'])
                    }}
                    disabled={purchasing === 'pitch-deck-autopsy'}
                  >
                    {purchasing === 'pitch-deck-autopsy' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for {PARTNER_MODULE_CREDITS['pitch-deck-autopsy']}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Module 3: Interview Simulator */}
            <Card className="relative border border-zinc-700 bg-zinc-900/50 transition-colors hover:border-blue-500/40">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                    <Target className="h-5 w-5 text-blue-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">Interview Simulator</CardTitle>
                    </div>
                    <CardDescription className="text-xs">YC questions + their answers + what YC was testing + drill mode</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>What you get:</strong> Interactive drill with actual YC interview questions, their answers, YC's intent behind each question, and follow-up patterns.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Actual interview questions</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Their winning answers</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>YC intent analysis</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Follow-up patterns</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('interview-simulator') ? (
                  <Button 
                    className="w-full bg-zinc-100 text-zinc-900 hover:bg-white" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=interview-simulator`, {
                          credentials: 'include'
                        })
                        if (res.ok) {
                          const data = await res.json()
                          toast.info(
                            `Download would start: ${data.filename}\n\nNote: Actual materials will be available in production.`,
                            8000
                          )
                        } else {
                          toast.error('Failed to access material. Please try again.')
                        }
                      } catch (e) {
                        toast.error('Failed to download. Please try again.')
                      }
                    }}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Access Interview Prep
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('interview-simulator', PARTNER_MODULE_CREDITS['interview-simulator'])
                    }}
                    disabled={purchasing === 'interview-simulator'}
                  >
                    {purchasing === 'interview-simulator' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for {PARTNER_MODULE_CREDITS['interview-simulator']}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Module 4: Metrics Timeline */}
            <Card className="relative border border-zinc-700 bg-zinc-900/50 transition-colors hover:border-amber-500/40">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                    <BarChart3 className="h-5 w-5 text-amber-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">Metrics Snapshot Timeline</CardTitle>
                    </div>
                    <CardDescription className="text-xs">Their traction at 90/30/0 days before YC + growth story</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>What you get:</strong> Exact metrics at 90 days, 30 days, and application week, with emphasis on progress velocity, not just scale.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>90/30/0 day snapshots</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Growth rate analysis</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Retention signals</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>How they framed progress</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('metrics-timeline') ? (
                  <Button 
                    className="w-full bg-zinc-100 text-zinc-900 hover:bg-white" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=metrics-timeline`, {
                          credentials: 'include'
                        })
                        if (res.ok) {
                          const data = await res.json()
                          toast.info(
                            `Download would start: ${data.filename}\n\nNote: Actual materials will be available in production.`,
                            8000
                          )
                        } else {
                          toast.error('Failed to access material. Please try again.')
                        }
                      } catch (e) {
                        toast.error('Failed to download. Please try again.')
                      }
                    }}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Access Metrics Timeline
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-amber-600 hover:bg-amber-700" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('metrics-timeline', PARTNER_MODULE_CREDITS['metrics-timeline'])
                    }}
                    disabled={purchasing === 'metrics-timeline'}
                  >
                    {purchasing === 'metrics-timeline' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for {PARTNER_MODULE_CREDITS['metrics-timeline']}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Module 5: Distribution Diary */}
            <Card className="relative border border-zinc-700 bg-zinc-900/50 transition-colors hover:border-indigo-500/40">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15">
                    <Zap className="h-5 w-5 text-indigo-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">Distribution Diary</CardTitle>
                    </div>
                    <CardDescription className="text-xs">First 10 customers + outreach scripts + what worked/failed</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>What you get:</strong> Copy/paste scripts, channel playbooks, and the exact experiments they ran to get early traction.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>First 10 customer stories</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Outreach scripts (DM/email)</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Channel experiments</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>What didn't work + why</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('distribution-diary') ? (
                  <Button 
                    className="w-full bg-zinc-100 text-zinc-900 hover:bg-white" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=distribution-diary`, {
                          credentials: 'include'
                        })
                        if (res.ok) {
                          const data = await res.json()
                          toast.info(
                            `Download would start: ${data.filename}\n\nNote: Actual materials will be available in production.`,
                            8000
                          )
                        } else {
                          toast.error('Failed to access material. Please try again.')
                        }
                      } catch (e) {
                        toast.error('Failed to download. Please try again.')
                      }
                    }}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Access Distribution Playbook
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('distribution-diary', PARTNER_MODULE_CREDITS['distribution-diary'])
                    }}
                    disabled={purchasing === 'distribution-diary'}
                  >
                    {purchasing === 'distribution-diary' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for {PARTNER_MODULE_CREDITS['distribution-diary']}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Module 6: Demo Teardown */}
            <Card className="relative border border-zinc-700 bg-zinc-900/50 transition-colors hover:border-rose-500/40">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/15">
                    <Video className="h-5 w-5 text-rose-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <CardTitle className="text-lg">Demo Teardown</CardTitle>
                    </div>
                    <CardDescription className="text-xs">Application video + timestamp notes + what to copy</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>What you get:</strong> Their application video with timestamp annotations showing what's being proven at each moment and what to replicate.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Full application video</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Timestamp breakdowns</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>What to copy</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span>Demo script</span>
                    </div>
                  </div>
                </div>
                {hasPurchased('demo-teardown') ? (
                  <Button 
                    className="w-full bg-zinc-100 text-zinc-900 hover:bg-white" 
                    size="sm"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      try {
                        const res = await fetch(`/api/yc-insider/download?itemId=demo-teardown`, {
                          credentials: 'include'
                        })
                        if (res.ok) {
                          const data = await res.json()
                          toast.info(
                            `Download would start: ${data.filename}\n\nNote: Actual materials will be available in production.`,
                            8000
                          )
                        } else {
                          toast.error('Failed to access material. Please try again.')
                        }
                      } catch (e) {
                        toast.error('Failed to download. Please try again.')
                      }
                    }}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Watch Demo Teardown
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-rose-600 hover:bg-rose-700" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handlePurchase('demo-teardown', PARTNER_MODULE_CREDITS['demo-teardown'])
                    }}
                    disabled={purchasing === 'demo-teardown'}
                  >
                    {purchasing === 'demo-teardown' ? (
                      'Processing...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3 mr-2" />
                        Unlock for {PARTNER_MODULE_CREDITS['demo-teardown']}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Bundle Deal */}
            <Card className="border border-amber-500/35 bg-gradient-to-br from-amber-950/50 to-zinc-900/90">
              <CardHeader>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  <CardTitle className="text-xl">Complete Insider Pack</CardTitle>
                  <Badge className="border border-amber-500/40 bg-amber-500/20 text-amber-100">
                    Save {PARTNER_BUNDLE_SAVE_CREDITS} vs à la carte
                  </Badge>
                </div>
                <CardDescription>Get all 6 modules + bonus templates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-zinc-400">
                    Everything above plus exclusive bonus: Founder Operating System (weekly cadence, decision principles, tool stack)
                  </p>
                  <div className="flex flex-col gap-3 rounded-lg border border-zinc-700 bg-zinc-950/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm text-zinc-400">
                        À la carte total: {PARTNER_MODULES_A_LA_CARTE_TOTAL}
                      </div>
                      <div className="text-2xl font-bold text-zinc-50">
                        Bundle: {PARTNER_COMPLETE_PACK_CREDITS} (all modules)
                      </div>
                    </div>
                    <Button
                      className="bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handlePurchase('complete-pack', PARTNER_COMPLETE_PACK_CREDITS)
                      }}
                      disabled={hasPurchased('complete-pack') || purchasing === 'complete-pack'}
                    >
                      {hasPurchased('complete-pack')
                        ? isPremium
                          ? 'Included with Premium'
                          : 'Bundle unlocked'
                        : purchasing === 'complete-pack'
                          ? 'Processing...'
                          : 'Unlock Complete Pack'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Why This Matters */}
          <Card className="border border-zinc-700 bg-zinc-900/60">
            <CardHeader>
              <CardTitle>Why This Is Different</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 text-sm md:grid-cols-3">
                <div>
                  <div className="mb-1 font-semibold text-zinc-100">Not Google-able</div>
                  <p className="text-zinc-400">Decision logic, templates, and insider patterns you can't find anywhere else</p>
                </div>
                <div>
                  <div className="mb-1 font-semibold text-zinc-100">Actionable Templates</div>
                  <p className="text-zinc-400">Fill-in frameworks you can use immediately for your own application</p>
                </div>
                <div>
                  <div className="mb-1 font-semibold text-zinc-100">Verified & Current</div>
                  <p className="text-zinc-400">From founders currently in YC W26, not outdated advice from years ago</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="pt-4 text-center text-sm text-zinc-500">
            Looking for something else?{' '}
            <Link
              href="/pricing"
              className="font-medium text-blue-400 transition-colors hover:text-blue-300 hover:underline"
            >
              Pricing &amp; Premium
            </Link>
          </p>
            </>
          ) : null}

        </div>
      </div>
    </div>
  )
}

