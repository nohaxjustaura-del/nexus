'use client'

import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  ListFilter,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { BRAND_NAME } from '@/lib/brand'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

export const whyNexusStaggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}

export const whyNexusStaggerItem = {
  /** Keep opacity at 1 so below-the-fold blocks never read as a giant empty void before / without in-view animation. */
  hidden: { opacity: 1, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] } },
}

export const whyNexusCardBase =
  'rounded-2xl border border-border/40 bg-card/80 shadow-sm ring-1 ring-border/15 transition-colors'

export const whyNexusCardHover = 'hover:border-border/55 hover:bg-card/90'

export function WhyNexusSectionDivider() {
  return (
    <div className="relative my-12 md:my-16" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-px w-[min(100%,28rem)] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-border/90 to-transparent" />
    </div>
  )
}

export function WhyNexusProblemSection() {
  return (
    <section className="px-4 sm:px-6" aria-labelledby="why-problem">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={whyNexusStaggerContainer}
        className="mx-auto max-w-5xl"
      >
        <motion.p
          variants={whyNexusStaggerItem}
          className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
        >
          The status quo
        </motion.p>
        <motion.h2
          id="why-problem"
          variants={whyNexusStaggerItem}
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
              body: "Ask ChatGPT for investor suggestions. It only knows the big names (Sequoia, a16z, Benchmark): firms that aren't reading your cold email. The niche micro-VCs and sector-specific funds that would actually take your meeting? It doesn't know they exist. And half the names it does give you are hallucinated or outdated.",
              accent: 'text-red-500 dark:text-red-400',
              ring: 'ring-red-500/10',
            },
            {
              icon: Send,
              title: 'The Spray & Pray',
              body: "Send 200 emails. Hear back from 12. Get meetings with 4. Two don't invest in your vertical. You just burned a month of runway on a 1% conversion rate.",
              accent: 'text-orange-500 dark:text-orange-400',
              ring: 'ring-orange-500/10',
            },
          ].map(({ icon: Icon, title, body, accent, ring }) => (
            <motion.div
              key={title}
              variants={whyNexusStaggerItem}
              className={cn(whyNexusCardBase, 'flex flex-col p-6 ring-1', ring)}
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
          variants={whyNexusStaggerItem}
          className="mx-auto mt-8 max-w-lg text-center text-sm font-medium text-muted-foreground"
        >
          <AlertTriangle className="mr-1.5 inline-block h-4 w-4 -translate-y-px text-amber-500" />
          Every week chasing the wrong investors is a week your competitors are shipping product.
        </motion.p>
      </motion.div>
    </section>
  )
}

export function WhyNexusDifferenceSection() {
  return (
    <section className="px-4 sm:px-6" aria-labelledby="why-difference">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={whyNexusStaggerContainer}
        className="mx-auto max-w-5xl"
      >
        <motion.p
          variants={whyNexusStaggerItem}
          className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
        >
          The {BRAND_NAME} difference
        </motion.p>
        <motion.h2
          id="why-difference"
          variants={whyNexusStaggerItem}
          className="mx-auto mt-4 max-w-3xl text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Not a database. Not a chatbot.{' '}
          <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            A fundraising match engine.
          </span>
        </motion.h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <motion.div variants={whyNexusStaggerItem} className={cn(whyNexusCardBase, whyNexusCardHover, 'flex flex-col p-6')}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Sparkles className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h3 className="mt-4 font-heading text-base font-semibold leading-snug">We read your pitch like an investor would.</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Submit your deck, answer questions, or describe your idea. Our{' '}
              <strong className="text-foreground">multi-pass pipeline</strong> does what a fund partner does in a first read:{' '}
              <strong className="text-foreground">extract your claims</strong>, <strong className="text-foreground">pressure-test them</strong> against
              real market data, and run an <strong className="text-foreground">adversarial bull-and-bear analysis</strong>.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You get a <strong className="text-foreground">fundraising readiness score</strong> and specific feedback, not{' '}
              <span className="italic">&ldquo;looks great, maybe add traction.&rdquo;</span>
            </p>
          </motion.div>

          <motion.div variants={whyNexusStaggerItem} className={cn(whyNexusCardBase, whyNexusCardHover, 'flex flex-col p-6')}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Target className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h3 className="mt-4 font-heading text-base font-semibold leading-snug">We match on mandate fit. Not keywords.</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Filtering by &ldquo;sector: fintech&rdquo; isn&rsquo;t matching; it&rsquo;s Ctrl+F. {BRAND_NAME} matches your{' '}
              <strong className="text-foreground">pitch narrative</strong> against investor thesis, then validates every candidate with{' '}
              <strong className="text-foreground">12 structured questions</strong> drawn from <strong className="text-foreground">live web evidence</strong>:
            </p>
            <ul className="mt-2.5 space-y-1.5 text-sm text-muted-foreground">
              {['Actively deploying capital?', 'Invested in this space recently?', 'Competitor already in portfolio?'].map((q) => (
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

          <motion.div variants={whyNexusStaggerItem} className={cn(whyNexusCardBase, whyNexusCardHover, 'flex flex-col p-6')}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <ListFilter className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <h3 className="mt-4 font-heading text-base font-semibold leading-snug">You get a shortlist. Not a haystack.</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              No list of 500 names and a &ldquo;good luck.&rdquo; You get a <strong className="text-foreground">ranked shortlist</strong> of your top
              investor matches. Each one comes with:
            </p>
            <ul className="mt-2.5 space-y-1.5 text-sm text-muted-foreground">
              {[
                <>
                  <strong className="text-foreground">Fit score</strong>: how well they match your pitch
                </>,
                <>
                  <strong className="text-foreground">Written narrative</strong>: why they&apos;re a match
                </>,
                <>
                  <strong className="text-foreground">Talking points</strong> for your first outreach
                </>,
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
  )
}

const processStepClass =
  'relative flex gap-3 rounded-xl border border-border/35 bg-background/60 px-3 py-2.5 text-sm text-muted-foreground'

const homeVsLlmChatSteps = [
  { n: '1', title: 'Prompt', body: 'You describe the company in a chat box; context is whatever fits in the thread.' },
  { n: '2', title: 'Pattern fill', body: 'The model blends training-time patterns: familiar fund names, generic sector tags.' },
  { n: '3', title: 'No mandate graph', body: 'No maintained investor profiles, freshness checks, or structured mandate data in the loop.' },
  { n: '4', title: 'One-shot reply', body: 'A free-form answer: bullets, caveats, and “do your own research”, not a product workflow.' },
] as const

const homeVsLlmNexusSteps = [
  { n: '1', title: 'Structured intake', body: 'Deck, answers, or idea text is captured once and fed into a fundraising-specific pipeline.' },
  { n: '2', title: 'Multi-pass read', body: 'Claims extracted, stress-tested, and scored the way a partner skims a first pass, not a single mega-prompt.' },
  { n: '3', title: 'Evidence + graph', body: 'Matching uses maintained investor data plus live web checks where the product requires them.' },
  { n: '4', title: 'Ranked output', body: 'You get scores, rationale, and next actions tied to real targets, not a wall of text.' },
] as const

export type HomeVsLlmRow = { id: string; left: string; right: string }

/** Paired rows aligned by theme; synthesized from problem, difference, process, and outputs copy on the home page. */
export function getHomeVsLlmPrimaryRows(verifiedInvestorCountLabel: string): HomeVsLlmRow[] {
  return [
    {
      id: 'intake',
      left: 'Static lists, ad hoc prompts, or chat context limited to whatever fits in the thread.',
      right: 'Structured intake: deck, answers, or idea captured once and fed into a fundraising-specific pipeline.',
    },
    {
      id: 'read',
      left: 'Generic bullets and deck feedback with no link to who you should actually pitch next.',
      right: "Allocator-style read: claims extracted, stress-tested against real data, and scored like a partner's first pass.",
    },
    {
      id: 'match',
      left: 'Manual search, vague "who should I pitch?" replies, keyword tags, big-name skew; niche strategics easy to miss.',
      right: 'Mandate fit to your pitch narrative, not Ctrl+F on "sector: fintech," with evidence-backed checks where the product needs them.',
    },
    {
      id: 'data',
      left: 'Stale spreadsheets, scraped lists, or hallucinated / outdated firm names when nothing is grounded in a directory.',
      right: `Verified investor graph: ${verifiedInvestorCountLabel}+ maintained profiles, quality-checked rather than scraped noise.`,
    },
    {
      id: 'output',
      left: 'Unstructured paragraphs and lists you still have to turn into targets, scores, and outreach yourself.',
      right: 'Ranked shortlist with fit score, written rationale, and talking points per target in the same flow as pitch feedback.',
    },
    {
      id: 'workflow',
      left: 'One-shot answer; follow-up is on you: re-prompt, copy into spreadsheets, manually track outreach.',
      right: 'Bookmarks, saved analyses, and next-step actions on your targets, not a one-off chat reply.',
    },
  ]
}

export function getHomeVsLlmExtraRows(): HomeVsLlmRow[] {
  return [
    {
      id: 'explain',
      left: "No per-investor fit score or explainable link between your story and a specific fund's mandate.",
      right: 'Each match ties fit to thesis, stage, and what you actually said, not keyword bingo.',
    },
    {
      id: 'scope',
      left: 'One general model for every task, with no product layer scoped to how fundraising actually works.',
      right: 'Product logic scoped to fundraising: multi-pass pipeline and investor graph built for fit, not generic chat.',
    },
  ]
}

const vsCellIcon = 'mt-0.5 h-4 w-4 shrink-0'
const vsCellText = 'min-w-0 text-sm leading-relaxed text-muted-foreground'
const vsRowGrid =
  'grid grid-cols-1 border-b border-border/35 last:border-b-0 md:grid-cols-2 md:divide-x md:divide-border/35'

export function HomeVsLlmCompareSection({ verifiedInvestorCountLabel }: { verifiedInvestorCountLabel: string }) {
  const primaryRows = getHomeVsLlmPrimaryRows(verifiedInvestorCountLabel)
  const extraRows = getHomeVsLlmExtraRows()

  return (
    <section
      className="px-4 sm:px-6"
      aria-labelledby="home-vs-llm-heading"
      id="home-vs-llm"
    >
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.12 }}
        variants={whyNexusStaggerContainer}
        className="mx-auto max-w-5xl"
      >
        <motion.p
          variants={whyNexusStaggerItem}
          className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
        >
          {BRAND_NAME} vs general AI
        </motion.p>
        <motion.h2
          id="home-vs-llm-heading"
          variants={whyNexusStaggerItem}
          className="mx-auto mt-4 max-w-3xl text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Why not a spreadsheet, a static list, or a general chatbot?
        </motion.h2>
        <motion.p
          variants={whyNexusStaggerItem}
          className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground"
        >
          Verified mandates and a fundraising-focused read on your materials. You get a ranked shortlist and clear rationale
          in one flow, not a wall of text to operationalize on your own.
        </motion.p>

        {/* md+: table-style matrix */}
        <motion.div variants={whyNexusStaggerItem} className="mt-10 hidden md:block">
          <div className={cn(whyNexusCardBase, 'overflow-hidden')}>
            <div className="grid grid-cols-2 border-b border-border/40 bg-muted/25">
              <div className="flex items-center gap-2 border-r border-border/35 px-4 py-3 sm:px-5">
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                <p className="font-heading text-xs font-semibold text-foreground sm:text-sm">General LLMs &amp; lists</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                <p className="font-heading text-xs font-semibold text-primary sm:text-sm">{BRAND_NAME}</p>
              </div>
            </div>
            {primaryRows.map((row) => (
              <div key={row.id} className={vsRowGrid}>
                <div className="flex gap-2.5 px-4 py-3.5 sm:px-5 md:border-r-0">
                  <X className={cn(vsCellIcon, 'text-muted-foreground/55')} strokeWidth={2.25} aria-hidden />
                  <span className={vsCellText}>{row.left}</span>
                </div>
                <div className="flex gap-2.5 border-t border-border/35 px-4 py-3.5 sm:px-5 md:border-t-0">
                  <Check className={cn(vsCellIcon, 'text-emerald-600 dark:text-emerald-400')} strokeWidth={2.25} aria-hidden />
                  <span className={cn(vsCellText, 'text-foreground/90')}>{row.right}</span>
                </div>
              </div>
            ))}

            <Collapsible className="group/vs-more border-t border-border/35">
              <CollapsibleTrigger className="flex w-full items-center justify-center gap-1.5 rounded-none bg-muted/10 px-4 py-3 text-xs font-medium text-primary transition-colors hover:bg-muted/20 sm:text-sm">
                <span className="rounded-full border border-primary/35 px-3 py-1">Show full comparison</span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/vs-more:rotate-180"
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                {extraRows.map((row) => (
                  <div key={row.id} className={vsRowGrid}>
                    <div className="flex gap-2.5 px-4 py-3.5 sm:px-5">
                      <X className={cn(vsCellIcon, 'text-muted-foreground/55')} strokeWidth={2.25} aria-hidden />
                      <span className={vsCellText}>{row.left}</span>
                    </div>
                    <div className="flex gap-2.5 border-t border-border/35 px-4 py-3.5 sm:px-5 md:border-t-0">
                      <Check className={cn(vsCellIcon, 'text-emerald-600 dark:text-emerald-400')} strokeWidth={2.25} aria-hidden />
                      <span className={cn(vsCellText, 'text-foreground/90')}>{row.right}</span>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </motion.div>

        {/* sm: stacked pair cards */}
        <motion.div variants={whyNexusStaggerItem} className="mt-10 flex flex-col gap-3 md:hidden">
          {primaryRows.map((row) => (
            <div key={row.id} className={cn(whyNexusCardBase, 'overflow-hidden p-4')}>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">General LLMs &amp; lists</p>
              <div className="mt-2 flex gap-2.5">
                <X className={cn(vsCellIcon, 'text-muted-foreground/55')} strokeWidth={2.25} aria-hidden />
                <span className={vsCellText}>{row.left}</span>
              </div>
              <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">{BRAND_NAME}</p>
              <div className="mt-2 flex gap-2.5">
                <Check className={cn(vsCellIcon, 'text-emerald-600 dark:text-emerald-400')} strokeWidth={2.25} aria-hidden />
                <span className={cn(vsCellText, 'text-foreground/90')}>{row.right}</span>
              </div>
            </div>
          ))}

          <Collapsible className="group/vs-more-m">
            <CollapsibleTrigger className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/35 bg-muted/10 px-4 py-3 text-xs font-medium text-primary hover:bg-muted/20 sm:text-sm">
              <span>Show full comparison</span>
              <ChevronDown
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/vs-more-m:rotate-180"
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              {extraRows.map((row) => (
                <div key={row.id} className={cn(whyNexusCardBase, 'overflow-hidden p-4')}>
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">General LLMs &amp; lists</p>
                  <div className="mt-2 flex gap-2.5">
                    <X className={cn(vsCellIcon, 'text-muted-foreground/55')} strokeWidth={2.25} aria-hidden />
                    <span className={vsCellText}>{row.left}</span>
                  </div>
                  <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">{BRAND_NAME}</p>
                  <div className="mt-2 flex gap-2.5">
                    <Check className={cn(vsCellIcon, 'text-emerald-600 dark:text-emerald-400')} strokeWidth={2.25} aria-hidden />
                    <span className={cn(vsCellText, 'text-foreground/90')}>{row.right}</span>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </motion.div>

        <motion.div variants={whyNexusStaggerItem} className="mt-10">
          <Collapsible className="group/vs-pipeline">
            <CollapsibleTrigger className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-xs font-medium text-primary hover:bg-muted/30 sm:text-sm">
              <span>Show how the four-stage pipeline differs</span>
              <ChevronDown
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/vs-pipeline:rotate-180"
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Same four stages, completely different machinery under the hood.
              </p>
              <div className="mt-6 grid gap-6 md:grid-cols-2 md:gap-8">
                <div className={cn(whyNexusCardBase, 'flex flex-col p-5 sm:p-6')}>
                  <div className="flex items-center gap-2 border-b border-border/35 pb-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                    <p className="font-heading text-sm font-semibold text-foreground">ChatGPT-style workflow</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Typical use of a general-purpose assistant (ChatGPT, Claude, Gemini, etc.), not a fundraising product.
                  </p>
                  <ol className="mt-4 flex flex-col gap-2.5">
                    {homeVsLlmChatSteps.map((s) => (
                      <li key={s.n} className={processStepClass}>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted/50 text-[10px] font-semibold text-muted-foreground">
                          {s.n}
                        </span>
                        <span className="min-w-0">
                          <span className="font-medium text-foreground">{s.title}.</span> {s.body}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div
                  className={cn(
                    whyNexusCardBase,
                    whyNexusCardHover,
                    'flex flex-col border-primary/20 bg-primary/[0.03] p-5 ring-primary/10 sm:p-6',
                  )}
                >
                  <div className="flex items-center gap-2 border-b border-border/35 pb-3">
                    <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.75} />
                    <p className="font-heading text-sm font-semibold text-primary">{BRAND_NAME}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Fundraising-specific pipeline and investor graph, built for fit, not chat.
                  </p>
                  <ol className="mt-4 flex flex-col gap-2.5">
                    {homeVsLlmNexusSteps.map((s) => (
                      <li key={s.n} className={cn(processStepClass, 'border-primary/15 bg-background/80')}>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                          {s.n}
                        </span>
                        <span className="min-w-0">
                          <span className="font-medium text-foreground">{s.title}.</span> {s.body}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>
      </motion.div>
    </section>
  )
}
