'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthSession } from '@/components/auth-session-provider'
import { BRAND_NAME } from '@/lib/brand'
import {
  ArrowRight,
  Clock,
  Search,
  Bot,
  Send,
  AlertTriangle,
  Sparkles,
  Target,
  ListFilter,
  Shield,
  RefreshCw,
  Brain,
  Lock,
  Check,
  X,
  TrendingDown,
  Volume2,
  Cpu,
  Rocket,
  ChevronDown,
} from 'lucide-react'

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } },
}

const cardBase =
  'rounded-2xl border border-border/40 bg-card/80 shadow-sm ring-1 ring-border/15 transition-colors'
const cardHover = 'hover:border-border/55 hover:bg-card/90'

function SectionDivider() {
  return (
    <div className="relative my-16 md:my-24" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-px w-[min(100%,28rem)] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-border/90 to-transparent" />
    </div>
  )
}

export default function WhyNexusClient({
  verifiedInvestorCountLabel,
}: {
  verifiedInvestorCountLabel: string
}) {
  const { loading: authLoading, authenticated, verified } = useAuthSession()
  const [mounted, setMounted] = useState(false)
  const isVerifiedUser = !authLoading && authenticated && verified

  useEffect(() => { setMounted(true) }, [])

  const primaryHref = mounted && isVerifiedUser ? '/founder/ai-analysis' : '/signup'
  const secondaryHref = mounted && isVerifiedUser ? '/founder/discover' : `/signup?next=${encodeURIComponent('/founder/discover')}`

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Ambient radials */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(50vh,32rem)] bg-[radial-gradient(ellipse_80%_50%_at_50%_-15%,hsl(var(--primary)/0.09),transparent_60%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(40vh,24rem)] bg-[radial-gradient(ellipse_70%_50%_at_50%_115%,hsl(var(--primary)/0.05),transparent_60%)]"
        aria-hidden
      />

      <div className="relative z-10">
        {/* ═══════════════════════════════════════════════
            HERO
        ═══════════════════════════════════════════════ */}
        <section className="px-4 pb-10 pt-16 sm:px-6 sm:pt-20 md:pt-28 md:pb-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="mx-auto max-w-4xl text-center"
          >
            <motion.p
              variants={staggerItem}
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              Why {BRAND_NAME}
            </motion.p>
            <motion.h1
              variants={staggerItem}
              className="mx-auto mt-5 max-w-3xl text-balance font-heading text-4xl font-bold tracking-tight text-foreground md:text-6xl md:leading-[1.08]"
            >
              You&rsquo;re not bad at fundraising.{' '}
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                You&rsquo;re just doing it blind.
              </span>
            </motion.h1>
            <motion.p
              variants={staggerItem}
              className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground"
            >
              First-time founders spend 6&ndash;9 months raising. Second-time founders? 3&ndash;4.
              The difference isn&rsquo;t the pitch. It&rsquo;s knowing exactly{' '}
              <em className="text-foreground">who</em> to pitch.
            </motion.p>
            <motion.p
              variants={staggerItem}
              className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground/80"
            >
              {BRAND_NAME} gives every founder the second-time founder advantage.
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <div className="rounded-[14px] border border-border/50 bg-foreground/10 p-0.5">
                <Button asChild size="lg" className="rounded-xl px-6 text-base">
                  <Link href={primaryHref}>
                    Start your free analysis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <Button asChild size="lg" variant="ghost" className="h-11 rounded-xl px-5">
                <Link href={secondaryHref}>Browse {verifiedInvestorCountLabel}+ investors</Link>
              </Button>
            </motion.div>

            <motion.div variants={staggerItem} className="mt-12 flex justify-center">
              <ChevronDown className="h-5 w-5 animate-chevron-bounce text-muted-foreground/50" />
            </motion.div>
          </motion.div>
        </section>

        <SectionDivider />

        {/* ═══════════════════════════════════════════════
            THE PROBLEM — 3 cards
        ═══════════════════════════════════════════════ */}
        <section className="px-4 sm:px-6" aria-labelledby="why-problem">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            className="mx-auto max-w-5xl"
          >
            <motion.p
              variants={staggerItem}
              className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              The status quo
            </motion.p>
            <motion.h2
              id="why-problem"
              variants={staggerItem}
              className="mx-auto mt-4 max-w-2xl text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              This is how most founders raise money right now.
            </motion.h2>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: 'The Spreadsheet Spiral',
                  body: 'Google "top VCs for [your sector]." Scroll Crunchbase. Screenshot Twitter threads. Copy names into a shared spreadsheet from 2023. Forty hours later, you have a list. You have no idea if any of them are writing checks right now.',
                  accent: 'text-amber-500 dark:text-amber-400',
                  ring: 'ring-amber-500/10',
                },
                {
                  icon: Bot,
                  title: 'The AI Hallucination',
                  body: 'Ask ChatGPT for investor suggestions. It only knows the big names — Sequoia, a16z, Benchmark — firms that aren\'t reading your cold email. The niche micro-VCs and sector-specific funds that would actually take your meeting? It doesn\'t know they exist. And half the names it does give you are hallucinated or outdated.',
                  accent: 'text-red-500 dark:text-red-400',
                  ring: 'ring-red-500/10',
                },
                {
                  icon: Send,
                  title: 'The Spray & Pray',
                  body: 'Send 200 emails. Hear back from 12. Get meetings with 4. Two don\'t invest in your vertical. You just burned a month of runway on a 1% conversion rate.',
                  accent: 'text-orange-500 dark:text-orange-400',
                  ring: 'ring-orange-500/10',
                },
              ].map(({ icon: Icon, title, body, accent, ring }) => (
                <motion.div
                  key={title}
                  variants={staggerItem}
                  className={cn(cardBase, 'flex flex-col p-6 ring-1', ring)}
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40', accent)}>
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </motion.div>
              ))}
            </div>

            <motion.p
              variants={staggerItem}
              className="mx-auto mt-8 max-w-lg text-center text-sm font-medium text-muted-foreground"
            >
              <AlertTriangle className="mr-1.5 inline-block h-4 w-4 -translate-y-px text-amber-500" />
              Every week chasing the wrong investors is a week your competitors are shipping product.
            </motion.p>
          </motion.div>
        </section>

        <SectionDivider />

        {/* ═══════════════════════════════════════════════
            THE NEXUS DIFFERENCE — 3 columns
        ═══════════════════════════════════════════════ */}
        <section className="px-4 sm:px-6" aria-labelledby="why-difference">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            className="mx-auto max-w-5xl"
          >
            <motion.p
              variants={staggerItem}
              className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              The {BRAND_NAME} difference
            </motion.p>
            <motion.h2
              id="why-difference"
              variants={staggerItem}
              className="mx-auto mt-4 max-w-3xl text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Not a database. Not a chatbot.{' '}
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                A fundraising match engine.
              </span>
            </motion.h2>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <motion.div variants={staggerItem} className={cn(cardBase, cardHover, 'flex flex-col p-6')}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Sparkles className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 font-heading text-base font-semibold leading-snug">
                  We read your pitch like an investor would.
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  Submit your deck, answer questions, or describe your idea. Our{' '}
                  <strong className="text-foreground">multi-pass pipeline</strong> does what a fund partner does
                  in a first read: <strong className="text-foreground">extract your claims</strong>,{' '}
                  <strong className="text-foreground">pressure-test them</strong> against real market data, and
                  run an <strong className="text-foreground">adversarial bull-and-bear analysis</strong>.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  You get a <strong className="text-foreground">fundraising readiness score</strong> and specific
                  feedback &mdash; not <span className="italic">&ldquo;looks great, maybe add traction.&rdquo;</span>
                </p>
              </motion.div>

              <motion.div variants={staggerItem} className={cn(cardBase, cardHover, 'flex flex-col p-6')}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Target className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 font-heading text-base font-semibold leading-snug">
                  We match on mandate fit. Not keywords.
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  Filtering by &ldquo;sector: fintech&rdquo; isn&rsquo;t matching &mdash; it&rsquo;s Ctrl+F.
                  {BRAND_NAME} matches your <strong className="text-foreground">pitch narrative</strong> against
                  investor thesis, then validates every candidate with{' '}
                  <strong className="text-foreground">12 structured questions</strong> drawn from{' '}
                  <strong className="text-foreground">live web evidence</strong>:
                </p>
                <ul className="mt-2.5 space-y-1.5 text-sm text-muted-foreground">
                  {[
                    'Actively deploying capital?',
                    'Invested in this space recently?',
                    'Competitor already in portfolio?',
                  ].map((q) => (
                    <li key={q} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-muted-foreground">
                  Each answer is backed by <strong className="text-foreground">real data</strong>. Not a guess.
                </p>
              </motion.div>

              <motion.div variants={staggerItem} className={cn(cardBase, cardHover, 'flex flex-col p-6')}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <ListFilter className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 font-heading text-base font-semibold leading-snug">
                  You get a shortlist. Not a haystack.
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  No list of 500 names and a &ldquo;good luck.&rdquo; You get a{' '}
                  <strong className="text-foreground">ranked shortlist</strong> of your top investor matches.
                  Each one comes with:
                </p>
                <ul className="mt-2.5 space-y-1.5 text-sm text-muted-foreground">
                  {[
                    <><strong className="text-foreground">Fit score</strong> &mdash; how well they match your pitch</>,
                    <><strong className="text-foreground">Written narrative</strong> &mdash; why they&rsquo;re a match</>,
                    <><strong className="text-foreground">Talking points</strong> &mdash; for your first outreach</>,
                  ].map((content, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                      <span>{content}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <SectionDivider />

        {/* ═══════════════════════════════════════════════
            COMPARISON TABLE
        ═══════════════════════════════════════════════ */}
        <section className="px-4 sm:px-6" aria-labelledby="why-compare">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="mx-auto max-w-5xl"
          >
            <motion.p
              variants={staggerItem}
              className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              Be honest
            </motion.p>
            <motion.h2
              id="why-compare"
              variants={staggerItem}
              className="mx-auto mt-4 max-w-xl text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              You&rsquo;ve tried these.
            </motion.h2>

            <motion.div
              variants={staggerItem}
              className="mt-10 overflow-x-auto rounded-2xl border border-border/40 shadow-sm"
            >
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="w-[120px] border-b border-r border-border/40 bg-muted/15 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 sm:w-[140px]">
                      &nbsp;
                    </th>
                    <th className="border-b border-r border-border/40 bg-muted/30 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                      Crunchbase / PitchBook
                    </th>
                    <th className="border-b border-r border-border/40 bg-muted/30 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                      ChatGPT / Claude
                    </th>
                    <th className="border-b border-border/40 bg-primary/8 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-primary sm:text-sm">
                      {BRAND_NAME}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: 'What you get',
                      old1: 'A phonebook',
                      old2: 'A hallucination',
                      nw: 'A ranked shortlist matched to your pitch',
                    },
                    {
                      label: 'Data',
                      old1: 'Self-reported, stale',
                      old2: 'No database — guesses from training data',
                      nw: 'Verified profiles, refreshed monthly with live data',
                    },
                    {
                      label: 'Matching',
                      old1: 'Keyword filters',
                      old2: 'Pattern-matched guesses',
                      nw: 'Semantic fit + 12 evidence-backed checks per investor',
                    },
                    {
                      label: 'Pitch feedback',
                      old1: 'None',
                      old2: 'Generic writing advice',
                      nw: 'Claim verification, adversarial review, tier classification',
                    },
                    {
                      label: 'After the list',
                      old1: 'Export CSV. Start over.',
                      old2: 'Copy-paste into a doc.',
                      nw: 'Bookmarks, saved analyses, outreach talking points',
                    },
                  ].map(({ label, old1, old2, nw }, i, arr) => (
                    <tr key={label}>
                      <td
                        className={cn(
                          'border-r border-border/40 bg-muted/10 px-4 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 sm:text-[11px]',
                          i < arr.length - 1 && 'border-b border-b-border/30'
                        )}
                      >
                        {label}
                      </td>
                      <td
                        className={cn(
                          'border-r border-border/40 px-4 py-3.5',
                          i < arr.length - 1 && 'border-b border-b-border/30'
                        )}
                      >
                        <span className="flex items-start gap-2 text-sm text-muted-foreground">
                          <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/70" strokeWidth={2} />
                          {old1}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'border-r border-border/40 px-4 py-3.5',
                          i < arr.length - 1 && 'border-b border-b-border/30'
                        )}
                      >
                        <span className="flex items-start gap-2 text-sm text-muted-foreground">
                          <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/70" strokeWidth={2} />
                          {old2}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3.5',
                          i < arr.length - 1 && 'border-b border-b-border/30'
                        )}
                      >
                        <span className="flex items-start gap-2 text-sm text-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                          {nw}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        </section>

        <SectionDivider />

        {/* ═══════════════════════════════════════════════
            OUTCOMES — stat cards
        ═══════════════════════════════════════════════ */}
        <section className="px-4 sm:px-6" aria-labelledby="why-outcomes">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            className="mx-auto max-w-5xl"
          >
            <motion.p
              variants={staggerItem}
              className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              Outcomes
            </motion.p>
            <motion.h2
              id="why-outcomes"
              variants={staggerItem}
              className="mx-auto mt-4 max-w-xl text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              What actually changes.
            </motion.h2>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              className="mt-10 grid gap-5 sm:grid-cols-2"
            >
              {[
                {
                  icon: Clock,
                  stat: '40 hrs → 4 min',
                  title: 'Research time, eliminated.',
                  body: 'The investor research phase that used to take a week of evenings now takes one submission. Upload your deck or describe your idea.',
                },
                {
                  icon: Target,
                  stat: '200 → 12',
                  title: 'Cold emails → targeted conversations.',
                  body: 'Every investor on your shortlist has been validated against your pitch, stage, sector, and narrative. You stop spraying. Your hit rate goes up.',
                },
                {
                  icon: Brain,
                  stat: '"I think" → "Here\'s why"',
                  title: 'Gut feeling → investor-grade rationale.',
                  body: 'Each match comes with a written narrative: why this investor fits, what to lead with, and what to watch for. You walk in prepared.',
                },
                {
                  icon: Shield,
                  stat: 'Guessing → Knowing',
                  title: 'Pitch quality, before the meeting.',
                  body: 'Know where your claims are vague, where your market sizing doesn\'t hold up, and where positioning needs work. Fix it before the meeting — not after the rejection.',
                },
              ].map(({ icon: Icon, stat, title, body }) => (
                <motion.div
                  key={title}
                  variants={staggerItem}
                  className={cn(cardBase, cardHover, 'flex flex-col p-6 sm:p-7')}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <span className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      {stat}
                    </span>
                  </div>
                  <h3 className="mt-4 font-heading text-base font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              variants={staggerItem}
              className="mx-auto mt-8 max-w-lg text-center text-sm text-muted-foreground"
            >
              You spend your time building product and having real conversations — not Googling{' '}
              <span className="italic">&ldquo;top climate tech VCs 2026.&rdquo;</span>
            </motion.p>
          </motion.div>
        </section>

        <SectionDivider />

        {/* ═══════════════════════════════════════════════
            FOUNDERS & PROOF
        ═══════════════════════════════════════════════ */}
        <section className="px-4 sm:px-6" aria-labelledby="why-founders">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            className="mx-auto max-w-4xl"
          >
            <motion.p
              variants={staggerItem}
              className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              The team
            </motion.p>
            <motion.h2
              id="why-founders"
              variants={staggerItem}
              className="mx-auto mt-4 max-w-xl text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Built by founders who lived this problem.
            </motion.h2>

            <motion.div variants={staggerItem} className="mt-8 flex justify-center gap-6 sm:gap-10">
              {[
                { name: 'Athreya', role: 'Co-founder' },
                { name: 'Kelvin', role: 'Co-founder' },
              ].map(({ name, role }) => (
                <div key={name} className="flex flex-col items-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-border/50 bg-muted/30 text-2xl font-bold text-muted-foreground sm:h-24 sm:w-24">
                    {name[0]}
                  </div>
                  <p className="mt-3 font-heading text-sm font-semibold">{name}</p>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
              ))}
            </motion.div>

            <motion.p
              variants={staggerItem}
              className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground"
            >
              {BRAND_NAME} wasn&rsquo;t a side project. It was built because the gap between &ldquo;the right
              investors exist&rdquo; and &ldquo;finding them efficiently&rdquo; was costing founders months of
              runway and thousands of hours of collective productivity.
            </motion.p>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              className="mt-10 grid gap-4 sm:grid-cols-2"
            >
              {[
                {
                  icon: Shield,
                  title: 'Verified investor graph',
                  body: 'Not a scraped list. Every profile is enriched, validated, and quality-checked. Low-confidence profiles are automatically excluded.',
                },
                {
                  icon: RefreshCw,
                  title: 'Data pipeline that doesn\'t sleep',
                  body: 'Background systems continuously refresh investor thesis, recent deals, and deployment activity. The directory reflects what investors are doing today.',
                },
                {
                  icon: Brain,
                  title: 'Research-grade matching',
                  body: 'Multiple AI models, each scoped to what it\'s best at — semantic understanding, evidence retrieval, structured reasoning, narrative generation. Not one mega-prompt.',
                },
                {
                  icon: Lock,
                  title: 'Privacy by default',
                  body: 'Your pitch materials are yours. Nothing is shared with investors without your explicit opt-in. Uploaded content is removed after the retention window.',
                },
              ].map(({ icon: Icon, title, body }) => (
                <motion.div
                  key={title}
                  variants={staggerItem}
                  className={cn(cardBase, 'flex items-start gap-4 p-5')}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <SectionDivider />

        {/* ═══════════════════════════════════════════════
            WHY NOW — 3 market shifts
        ═══════════════════════════════════════════════ */}
        <section className="px-4 sm:px-6" aria-labelledby="why-now">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
            className="mx-auto max-w-4xl"
          >
            <motion.p
              variants={staggerItem}
              className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              Urgency
            </motion.p>
            <motion.h2
              id="why-now"
              variants={staggerItem}
              className="mx-auto mt-4 max-w-xl text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              Three things changed. Your tools didn&rsquo;t.
            </motion.h2>

            <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-5">
              {[
                {
                  icon: TrendingDown,
                  number: '01',
                  title: 'The market tightened.',
                  body: 'Funds that wrote 40 checks a year are writing 15. The margin for error in your investor targeting went from "annoying" to "existential." You cannot afford meetings with investors who aren\'t actively deploying.',
                },
                {
                  icon: Volume2,
                  number: '02',
                  title: 'AI created a noise problem.',
                  body: 'Every founder has ChatGPT now. Every VC inbox is flooded with AI-generated cold emails sent to AI-generated lists. The founders who win are the ones who show up with specific, mandate-aligned reasons for reaching out.',
                },
                {
                  icon: Cpu,
                  number: '03',
                  title: 'The technology finally caught up.',
                  body: 'Two years ago, maintaining a verified investor graph required 50 analysts. Today, the right architecture does it better and faster. That architecture is NEXUS. The window is open.',
                },
              ].map(({ icon: Icon, number, title, body }) => (
                <motion.div
                  key={title}
                  variants={staggerItem}
                  className={cn(cardBase, cardHover, 'flex gap-4 p-5 sm:gap-5 sm:p-6')}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-primary/60">{number}</span>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading text-base font-semibold">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        <SectionDivider />

        {/* ═══════════════════════════════════════════════
            CTA
        ═══════════════════════════════════════════════ */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div
              variants={staggerItem}
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary"
            >
              <Rocket className="h-7 w-7" strokeWidth={1.75} />
            </motion.div>
            <motion.h2
              variants={staggerItem}
              className="mt-6 font-heading text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Your next investor is already in the network.
            </motion.h2>
            <motion.p
              variants={staggerItem}
              className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground"
            >
              Start with a free analysis. No credit card. No 30-minute onboarding call. No
              &ldquo;request a demo&rdquo; form that disappears into a void.
            </motion.p>

            <motion.div variants={staggerItem} className="mx-auto mt-6 max-w-md">
              <div className="grid gap-3 text-left text-sm text-muted-foreground">
                {[
                  'A fundraising readiness score with specific feedback',
                  'A ranked shortlist matched to your pitch, stage & sector',
                  'Written narratives explaining why each investor fits',
                  'Talking points for your first outreach',
                ].map((text) => (
                  <div key={text} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <div className="rounded-[14px] border border-border/50 bg-foreground/10 p-0.5">
                <Button asChild size="lg" className="rounded-xl px-8 text-base font-semibold shadow-sm">
                  <Link href={primaryHref}>
                    Start your free analysis
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-border/50 bg-background/40 px-8 text-base font-semibold backdrop-blur-sm hover:bg-muted/35"
              >
                <Link href={secondaryHref}>Browse investors</Link>
              </Button>
            </motion.div>

            <motion.p
              variants={staggerItem}
              className="mt-6 text-xs text-muted-foreground/60"
            >
              {verifiedInvestorCountLabel}+ verified investors across VCs, angels, accelerators & corporate venture.
            </motion.p>
          </motion.div>
        </section>
      </div>
    </div>
  )
}
