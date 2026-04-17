'use client'

import { useState, useEffect } from 'react'
import { useAuthSession } from '@/components/auth-session-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast-simple'
import {
  CheckCircle,
  ArrowRight,
  Crown,
  Users,
  Sparkles,
  Search,
  BarChart3,
  Target,
  Shield,
  Zap,
} from 'lucide-react'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { ComparisonTable } from '@/components/marketing/comparison-table'
import { cn } from '@/lib/utils'

export default function PricingClient({ verifiedInvestorCountLabel }: { verifiedInvestorCountLabel: string }) {
  const { loading: authLoading, authenticated, verified } = useAuthSession()
  const isAuthenticated = !authLoading && authenticated && verified
  const [loading, setLoading] = useState<string | null>(null)
  const [sub, setSub] = useState<{ isPro?: boolean; isTeam?: boolean }>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated) return
    fetch('/api/user/credits', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setSub({ isPro: d.isPro, isTeam: d.isTeam }))
      .catch(() => {})
  }, [isAuthenticated])

  const handleSubscribe = async (plan: 'pro' | 'team') => {
    if (authLoading) return
    if (!isAuthenticated) {
      window.location.href = '/signup?redirect=/pricing'
      return
    }
    setLoading(plan)
    try {
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan }),
      })
      const data = await response.json()
      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to create subscription')
        setLoading(null)
      }
    } catch {
      toast.error('Failed to process subscription. Please try again.')
      setLoading(null)
    }
  }

  const currentPlan = sub.isTeam ? 'team' : sub.isPro ? 'pro' : 'free'

  const plans = [
    {
      id: 'free' as const,
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Validate investor fit before you spend',
      audience: 'For first-time fundraising prep',
      outcome: 'Run your first analysis and test whether the platform improves targeting quality.',
      upgradeTrigger: 'Upgrade when you want more analyses and a larger shortlist per raise cycle.',
      perkHeader: 'Starter access',
      perkNote: 'Everything you need to test fundraising fit before committing.',
      features: [
        { icon: Search, label: '50 verified investor profiles', bold: true },
        { icon: Sparkles, label: '5 AI analyses / month', bold: true },
        { icon: Target, label: 'Top 5 investor matches per analysis' },
        { icon: CheckCircle, label: 'Scoring + plain-English feedback' },
      ],
      highlighted: false,
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: '$39',
      period: '/mo',
      description: 'Move faster with full investor intelligence',
      audience: 'For active fundraising founders',
      outcome: 'Generate sharper shortlists, iterate your pitch quickly, and prioritize best-fit investors.',
      upgradeTrigger: 'Best when one analysis per month is slowing your outreach momentum.',
      perkHeader: 'Growth perks',
      perkNote: 'Built to accelerate active outreach, iteration, and investor access.',
      features: [
        { icon: Search, label: `Full database (${verifiedInvestorCountLabel}+)`, bold: true },
        { icon: Sparkles, label: 'Unlimited analyses', bold: true },
        { icon: Target, label: '20 matches per analysis', bold: true },
        { icon: BarChart3, label: 'Market intelligence', bold: true },
        { icon: CheckCircle, label: 'Deal history & profiles' },
        { icon: CheckCircle, label: 'Warm intro pathways' },
        { icon: CheckCircle, label: 'Mentorship resources (top-fund-backed operators)' },
        { icon: CheckCircle, label: 'CSV export' },
      ],
      highlighted: true,
    },
    {
      id: 'team' as const,
      name: 'Team',
      price: '$99',
      period: '/mo',
      description: 'Coordinate one fundraising system across your team',
      audience: 'For co-founders and fundraising operators',
      outcome: 'Keep everyone aligned on targets, notes, and next actions without duplicate research work.',
      upgradeTrigger: 'Upgrade when multiple teammates are sharing investor workflows and accountability.',
      perkHeader: 'Team leverage',
      perkNote: 'Coordinate intros, mentor guidance, and pipeline decisions in one shared workspace.',
      features: [
        { icon: CheckCircle, label: 'Everything in Pro', bold: true },
        { icon: Users, label: '3 team seats', bold: true },
        { icon: CheckCircle, label: 'Shared warm intro tracking' },
        { icon: CheckCircle, label: 'Team mentorship resource access' },
        { icon: CheckCircle, label: 'Shared workspace' },
        { icon: CheckCircle, label: 'Priority support' },
      ],
      highlighted: false,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />
      <div className="page-shell-narrow">
        <ScrollReveal>
          <div className="mb-6 text-center">
            <Badge variant="secondary" className="mb-4 border-primary/20 bg-primary/[0.08] text-primary">
              Early adopter pricing
            </Badge>
            <h1 className="hero-title mb-5 md:text-5xl">
              Investor intelligence for{' '}
              <span className="gradient-text">a fraction of the cost</span>
            </h1>
            <p className="section-copy mx-auto max-w-lg">
              PitchBook charges $30,000+/yr. NEXUS gives you AI pitch analysis, investor matching,
              and {verifiedInvestorCountLabel}+ verified investors -- starting free.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground/70">
              <span className="rounded-full border border-border/60 px-3 py-1">Self-serve, no sales call</span>
              <span className="rounded-full border border-border/60 px-3 py-1">Cancel anytime</span>
              <span className="rounded-full border border-border/60 px-3 py-1">Free re-runs on failures</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Visual price comparison */}
        <ScrollReveal delay={0.1}>
          <div className="mx-auto mb-12 flex items-center justify-center gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">NEXUS Pro</p>
              <p className="mt-1 text-3xl font-bold sm:text-4xl">
                <AnimatedCounter value={468} prefix="$" suffix="/yr" className="gradient-text" formatNumber={false} />
              </p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                Save 64x
              </span>
              <span className="text-xs text-muted-foreground">vs</span>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">PitchBook</p>
              <p className="mt-1 text-3xl font-bold text-muted-foreground/40 line-through decoration-destructive/40 sm:text-4xl">
                $30,000+/yr
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Trust signal */}
        <ScrollReveal delay={0.15}>
          <p className="mb-8 text-center text-sm text-muted-foreground/60">
            Join thousands of founders already using NEXUS
          </p>
        </ScrollReveal>

        {/* Pricing cards */}
        <ScrollReveal delay={0.2}>
          <div className="mb-14 grid gap-5 md:grid-cols-3 md:items-stretch">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  'relative flex h-full flex-col transition-all duration-300',
                  plan.highlighted
                    ? 'border-primary/40 ring-1 ring-primary/15 hover:border-primary/60'
                    : 'border-border/60 hover:border-border'
                )}
              >
                {plan.highlighted && (
                  <Badge variant="glow" className="absolute -top-3 left-1/2 -translate-x-1/2 px-3">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {plan.id === 'pro' && <Crown className="h-5 w-5 text-primary" />}
                    {plan.id === 'team' && <Users className="h-5 w-5 text-primary" />}
                    {plan.name}
                  </CardTitle>
                  <div className="mt-3">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground"> {plan.period}</span>
                  </div>
                  {plan.id !== 'free' && (
                    <p className="mt-1 text-xs font-medium text-primary/80">Cancel anytime</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                  <p className="mt-3 text-xs font-medium text-foreground/90">{plan.audience}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{plan.outcome}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <div
                    className={cn(
                      'rounded-lg border px-3 py-2',
                      plan.id === 'free'
                        ? 'border-border/60 bg-muted/20'
                        : 'border-primary/30 bg-primary/[0.06]'
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/90">
                      {plan.perkHeader}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.perkNote}</p>
                  </div>
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feature) => {
                      const Icon = feature.icon
                      return (
                        <li key={feature.label} className="flex items-center gap-2.5 text-sm text-foreground/80">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/[0.06]">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </span>
                          <span className={feature.bold ? 'font-medium text-foreground' : ''}>
                            {feature.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  {plan.id === 'free' ? (
                    mounted && currentPlan === 'free' ? (
                      <Button variant="outline" className="mt-auto w-full" size="lg" disabled>
                        Current plan
                      </Button>
                    ) : (
                      <Button variant="outline" className="mt-auto w-full" size="lg" disabled={!mounted}>
                        Free forever
                      </Button>
                    )
                  ) : plan.id === 'pro' ? (
                    mounted && currentPlan === 'pro' ? (
                      <Button className="mt-auto w-full" size="lg" disabled>
                        Current plan
                      </Button>
                    ) : (
                      <Button
                        className="mt-auto w-full shadow-md shadow-primary/15"
                        size="lg"
                        onClick={() => handleSubscribe('pro')}
                        disabled={loading !== null || authLoading}
                      >
                        {loading === 'pro' ? (
                          'Processing...'
                        ) : (
                          <>
                            Unlock Pro access
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )
                  ) : mounted && currentPlan === 'team' ? (
                    <Button className="mt-auto w-full" size="lg" disabled>
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      className="mt-auto w-full"
                      size="lg"
                      variant="outline"
                      onClick={() => handleSubscribe('team')}
                      disabled={loading !== null || authLoading}
                    >
                      {loading === 'team' ? (
                        'Processing...'
                      ) : (
                        <>
                          Start Team workspace
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                  {plan.id !== 'free' && (
                    <p className="text-xs leading-relaxed text-muted-foreground">{plan.upgradeTrigger}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="mb-12">
            <ComparisonTable compact />
          </div>
        </ScrollReveal>

        {/* Footer trust signals */}
        <div className="flex flex-wrap items-center justify-center gap-5 pb-4 text-xs text-muted-foreground/50">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Powered by Stripe
          </span>
          <span className="h-3 w-px bg-border/30" />
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Cancel anytime
          </span>
          <span className="h-3 w-px bg-border/30" />
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            Free re-runs on failures
          </span>
        </div>
      </div>
    </div>
  )
}
