# Investor Profile Enrichment v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate founder-facing investor profiles with chart-ready portfolio data (year + amount) via a fast, parallel enrichment pipeline with per-deal backfill and top-up loops — without changing the match algorithm.

**Architecture:** Extend `lib/investor-enrichment.ts` with five phases (parallel Exa → parallel LLM → backfill → top-up → chart-gated persist). Pure chart logic lives in new `lib/investor-enrichment-chart.ts`. Batch tooling backfills the corpus. A focused UI pass on `/investors/[id]` makes the portfolio chart intuitive and visually polished when data lands.

**Tech Stack:** TypeScript, Prisma, Exa (`exa-js` + `runExaWithKeyFailover`), OpenRouter/Ollama VC LLM pipeline, Next.js App Router, Recharts, tsx test runners.

**Spec reference:** `docs/superpowers/specs/2026-05-24-investor-profile-enrichment-design.md`

**Vision guardrails (do not violate):**
- Match fit algorithm untouched (`lib/matching/**` off limits)
- Chart is the hero: target 5 scatter-ready deals (year + amount); backfill specific companies before dropping; top-up until target or budget cap
- No name-only rows in `InvestorPortfolioCompany`
- Golden VC validation before batch scale

---

## File map

| File | Responsibility |
|------|----------------|
| `lib/investor-enrichment-chart.ts` | Deal classification, scatter counts, chart gate, merge backfill, top-up query builder, env config |
| `lib/investor-enrichment-chart.test-runner.ts` | Unit tests (repo pattern: tsx runner + assert) |
| `lib/investor-enrichment.ts` | v2 orchestration: parallel fetch, backfill/top-up loops, meta, persist integration |
| `scripts/enrich-one-investor.ts` | Print chart meta in CLI report |
| `scripts/enrich-batch-investors.ts` | Corpus batch worker |
| `scripts/measure-enrichment-coverage.ts` | Acceptance metrics SQL |
| `components/investor/portfolio-activity-section.tsx` | Extracted portfolio UI: chart, legend, deal table, empty states |
| `app/investors/[id]/investor-profile-client.tsx` | Import portfolio section; remove debug ingest fetch |
| `package.json` | `enrich:batch`, `enrich:coverage`, `test:enrichment-chart` scripts |
| `lib/background-worker.ts` | Optional scheduled batch job (last task only) |

---

### Task 1: Chart helpers module + tests

**Files:**
- Create: `lib/investor-enrichment-chart.ts`
- Create: `lib/investor-enrichment-chart.test-runner.ts`
- Modify: `package.json` (add `test:enrichment-chart` script)

- [ ] **Step 1: Create test runner with failing imports**

Create `lib/investor-enrichment-chart.test-runner.ts`:

```typescript
/**
 * Run: npm run test:enrichment-chart
 */
import assert from 'node:assert/strict'
import type { CleanPortfolioDeal } from '@/lib/investor-enrichment'
import {
  classifyDeal,
  isScatterReady,
  scatterReadyCount,
  applyChartPersistGate,
  mergeBackfillFacts,
  buildBackfillQuery,
  buildTopUpQuery,
  resolveEnrichmentChartConfig,
  predictChartMode,
} from '@/lib/investor-enrichment-chart'

function deal(partial: Partial<CleanPortfolioDeal>): CleanPortfolioDeal {
  return {
    companyName: 'Acme',
    companyWebsite: null,
    sector: null,
    stage: 'Seed',
    investmentYear: 2024,
    investmentDate: null,
    amount: 5,
    isLead: true,
    coInvestors: [],
    sourceUrl: 'https://example.com/a',
    confidence: 8,
    ...partial,
  }
}

// classifyDeal
assert.equal(classifyDeal(deal({ amount: 5, investmentYear: 2024 })), 'scatter-ready')
assert.equal(classifyDeal(deal({ amount: null, investmentYear: 2024 })), 'dated-only')
assert.equal(classifyDeal(deal({ amount: null, investmentYear: null, investmentDate: null })), 'incomplete')

// isScatterReady
assert.equal(isScatterReady(deal({ confidence: 3 })), false)
assert.equal(isScatterReady(deal({ amount: 0 })), false)

// mergeBackfillFacts
const merged = mergeBackfillFacts(
  deal({ investmentYear: null, amount: null }),
  { investmentYear: 2023, investmentDate: '2023-06-15', amount: 12, confidence: 7 },
)
assert.equal(merged.investmentYear, 2023)
assert.equal(merged.investmentDate?.toISOString().slice(0, 10), '2023-06-15')
assert.equal(merged.amount, 12)

// chart gate drops incomplete
const gated = applyChartPersistGate([
  deal({ companyName: 'Good' }),
  deal({ companyName: 'Bad', investmentYear: null, investmentDate: null }),
  deal({ companyName: 'Old', investmentYear: 2018 }),
])
assert.equal(gated.length, 1)
assert.equal(gated[0]!.companyName, 'Good')

// top-up exclusion query
const q = buildTopUpQuery('Sequoia Capital', ['Acme', 'Beta Co'], 2026)
assert.ok(q.includes('-\"Acme\"'))
assert.ok(q.includes('Sequoia Capital'))

// predictChartMode
assert.equal(predictChartMode([deal({ amount: 5 }), deal({ amount: 3, companyName: 'B' })]), 'scatter')
assert.equal(predictChartMode([deal({ amount: null }), deal({ amount: null, companyName: 'B' })]), 'timeline')
assert.equal(predictChartMode([]), 'empty')

// config defaults
const cfg = resolveEnrichmentChartConfig({})
assert.equal(cfg.chartTarget, 5)
assert.equal(cfg.maxBackfill, 6)

console.log('investor-enrichment-chart tests: ok')
```

Add to `package.json` scripts:

```json
"test:enrichment-chart": "tsx lib/investor-enrichment-chart.test-runner.ts"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:enrichment-chart`  
Expected: FAIL — cannot find module `@/lib/investor-enrichment-chart`

- [ ] **Step 3: Implement `lib/investor-enrichment-chart.ts`**

```typescript
import type { CleanPortfolioDeal } from '@/lib/investor-enrichment'
import { firmNameForExaSearch } from '@/lib/investor-enrichment'

export type DealChartClass = 'scatter-ready' | 'dated-only' | 'incomplete'
export type ChartMode = 'scatter' | 'timeline' | 'empty'

export type EnrichmentChartConfig = {
  chartTarget: number
  minScatter: number
  maxBackfill: number
  maxTopUp: number
}

export type BackfillFacts = {
  investmentYear?: number | null
  investmentDate?: string | null
  amount?: number | null
  confidence: number
}

export type EnrichmentRunMeta = {
  hitsPerQuery: number[]
  scatterReady: number
  datedOnly: number
  droppedIncomplete: number
  backfillQueries: number
  topupQueries: number
  chartMode: ChartMode
  elapsedMs: number
  partialChartTarget: boolean
}

function parseIntEnv(key: string, fallback: number): number {
  const raw = process.env[key]?.trim()
  const n = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function resolveEnrichmentChartConfig(input?: {
  fundType?: string | null
}): EnrichmentChartConfig {
  let chartTarget = parseIntEnv('INVESTOR_ENRICH_CHART_TARGET', 5)
  const ft = (input?.fundType ?? '').toLowerCase()
  if (/accelerator|fellowship|program/.test(ft)) {
    chartTarget = Math.min(chartTarget, 3)
  }
  return {
    chartTarget,
    minScatter: parseIntEnv('INVESTOR_ENRICH_MIN_SCATTER', 3),
    maxBackfill: parseIntEnv('INVESTOR_ENRICH_MAX_BACKFILL', 6),
    maxTopUp: parseIntEnv('INVESTOR_ENRICH_MAX_TOPUP', 3),
  }
}

export function hasDealYear(d: CleanPortfolioDeal): boolean {
  if (typeof d.investmentYear === 'number' && Number.isFinite(d.investmentYear)) return true
  return d.investmentDate instanceof Date && !Number.isNaN(d.investmentDate.getTime())
}

export function isScatterReady(d: CleanPortfolioDeal): boolean {
  if (d.confidence < 4) return false
  if (!hasDealYear(d)) return false
  return typeof d.amount === 'number' && Number.isFinite(d.amount) && d.amount > 0
}

export function classifyDeal(d: CleanPortfolioDeal): DealChartClass {
  if (!hasDealYear(d)) return 'incomplete'
  if (isScatterReady(d)) return 'scatter-ready'
  return 'dated-only'
}

export function scatterReadyCount(deals: CleanPortfolioDeal[]): number {
  return deals.filter(isScatterReady).length
}

export function predictChartMode(deals: CleanPortfolioDeal[]): ChartMode {
  if (deals.length === 0) return 'empty'
  const withYear = deals.filter(hasDealYear)
  if (withYear.length === 0) return 'empty'
  return withYear.some((d) => typeof d.amount === 'number' && d.amount > 0) ? 'scatter' : 'timeline'
}

export function applyChartPersistGate(deals: CleanPortfolioDeal[]): CleanPortfolioDeal[] {
  return deals.filter((d) => {
    if (d.confidence < 4) return false
    if (!hasDealYear(d)) return false
    const y = d.investmentYear ?? d.investmentDate?.getFullYear()
    if (y != null && y < 2020) return false
    if (!/^https?:\/\//i.test(d.sourceUrl)) return false
    return true
  })
}

export function mergeBackfillFacts(deal: CleanPortfolioDeal, facts: BackfillFacts): CleanPortfolioDeal {
  if (facts.confidence < 4) return deal
  let investmentDate = deal.investmentDate
  let investmentYear = deal.investmentYear
  if (facts.investmentDate) {
    const dt = new Date(facts.investmentDate)
    if (!Number.isNaN(dt.getTime())) {
      investmentDate = dt
      investmentYear = dt.getUTCFullYear()
    }
  } else if (facts.investmentYear != null) {
    investmentYear = facts.investmentYear
  }
  const amount =
    facts.amount != null && Number.isFinite(facts.amount) && facts.amount > 0
      ? facts.amount
      : deal.amount
  return {
    ...deal,
    investmentDate,
    investmentYear,
    amount,
    confidence: Math.max(deal.confidence, facts.confidence),
  }
}

export function buildBackfillQuery(firmName: string, deal: CleanPortfolioDeal, nowYear = new Date().getFullYear()): string {
  const exaName = firmNameForExaSearch(firmName)
  const stageHint = deal.stage ? ` ${deal.stage}` : ''
  const anchorYear = deal.investmentYear ?? nowYear
  return `"${exaName}" "${deal.companyName}" funding round investment${stageHint} ${anchorYear - 1} ${anchorYear} ${anchorYear + 1}`
}

export function buildTopUpQuery(
  firmName: string,
  excludeCompanies: string[],
  nowYear = new Date().getFullYear(),
): string {
  const exaName = firmNameForExaSearch(firmName)
  const exclusions = [...excludeCompanies]
    .sort((a, b) => b.length - a.length)
    .slice(0, 8)
    .map((c) => `-"${c.replace(/"/g, '')}"`)
    .join(' ')
  return `"${exaName}" (investment OR "led the round" OR "portfolio company") ${nowYear} ${nowYear - 1} ${exclusions}`.trim()
}

export function dealsNeedingBackfill(
  deals: CleanPortfolioDeal[],
  chartTarget: number,
): CleanPortfolioDeal[] {
  const scatter = scatterReadyCount(deals)
  if (scatter >= chartTarget) return []
  return deals.filter((d) => {
    const cls = classifyDeal(d)
    return cls === 'incomplete' || cls === 'dated-only'
  })
}
```

Export `CleanPortfolioDeal` type from `lib/investor-enrichment.ts` if not already exported (it is exported today).

- [ ] **Step 4: Run tests**

Run: `npm run test:enrichment-chart`  
Expected: `investor-enrichment-chart tests: ok`

- [ ] **Step 5: Commit**

```bash
git add lib/investor-enrichment-chart.ts lib/investor-enrichment-chart.test-runner.ts package.json
git commit -m "feat(enrichment): add chart helper module with tests"
```

---

### Task 2: Parallel bulk Exa retrieval (Phase A)

**Files:**
- Modify: `lib/investor-enrichment.ts` (replace sequential `fetchEnrichmentSources`)

- [ ] **Step 1: Add `runSingleExaSearchOnce` optional `startPublishedDate` param**

In `lib/investor-enrichment.ts`, change `runSingleExaSearchOnce` to accept options:

```typescript
async function runSingleExaSearchOnce(
  query: string,
  verbose: boolean,
  options?: { startPublishedDate?: string | null },
): Promise<{ textBlock: string; resultCount: number; retryAfterCooldown: boolean; keyIndex?: number }> {
  const startPublishedDate = options?.startPublishedDate ?? EXA_SINCE
  const failover = await runExaWithKeyFailover(async (exa) => {
    const res = await exa.search(query, {
      type: 'auto',
      numResults: EXA_NUM_RESULTS,
      ...(startPublishedDate ? { startPublishedDate } : {}),
      contents: { text: { maxCharacters: EXA_MAX_CHARS } },
    })
    // ... rest unchanged
  })
  // ... rest unchanged
}
```

Thread the optional param through `runSingleExaSearchWithRetry`.

- [ ] **Step 2: Replace sequential loop with 5 parallel passes**

Replace body of `fetchEnrichmentSources` after building `exaQueryName`:

```typescript
const year = new Date().getFullYear()
const yearSpan = `${year - 4} ${year - 3} ${year - 2} ${year - 1} ${year}`

let host = ''
if (websiteUrl?.trim()) {
  try {
    host = new URL(websiteUrl.trim().startsWith('http') ? websiteUrl.trim() : `https://${websiteUrl.trim()}`).hostname
  } catch { /* ignore */ }
}

type PassDef = { label: string; query: string; dated: boolean }
const passes: PassDef[] = [
  {
    label: 'deal_press',
    query: `"${exaQueryName}" invests in site:techcrunch.com OR site:businesswire.com OR site:prnewswire.com`,
    dated: true,
  },
  {
    label: 'portfolio_general',
    query: `"${exaQueryName}" venture capital investments portfolio ${yearSpan}`,
    dated: true,
  },
  ...(host
    ? [{
        label: 'fund_website',
        query: `"${exaQueryName}" portfolio OR companies OR investments site:${host}`,
        dated: false,
      }]
    : []),
  {
    label: 'team',
    query: `"${exaQueryName}" founding partners team general partner GP`,
    dated: false,
  },
  {
    label: 'mandate',
    query: `"${exaQueryName}" investment mandate thesis stages geography fund`,
    dated: false,
  },
]

await waitUntilExaNotPaused(verbose)

const results = await Promise.all(
  passes.map(async (p, i) => {
    const { textBlock, resultCount, keyIndex } = await runSingleExaSearchWithRetry(p.query, verbose, {
      startPublishedDate: p.dated ? EXA_SINCE : null,
    })
    if (verbose) console.log(`[ENRICH] Exa pass ${i + 1}/${passes.length} (${p.label}) hits: ${resultCount}`)
    return { pass: p, textBlock, resultCount, keyIndex }
  }),
)

const hitsPerQuery = results.map((r) => r.resultCount)
const exaKeyIndexByQuery = results.map((r) => (r.keyIndex != null ? r.keyIndex + 1 : null))
const sections: string[] = []
for (let i = 0; i < results.length; i++) {
  const r = results[i]!
  if (r.textBlock.trim()) {
    sections.push(`=== QUERY ${i + 1} (${r.pass.label}) ===\n${r.pass.query}\n\n${r.textBlock}`)
  }
}
```

Remove the old `for` loop with `sleep(delayMs)` between queries.

- [ ] **Step 3: Smoke test one firm**

Run: `npm run enrich:one -- --firm "Benchmark" --verbose`  
Expected: log shows 4–5 parallel passes with combined hit counts; no functional regression on firm fields.

- [ ] **Step 4: Commit**

```bash
git add lib/investor-enrichment.ts
git commit -m "perf(enrichment): parallelize bulk Exa retrieval passes"
```

---

### Task 3: Parallel LLM extraction (Phase B) + orchestration skeleton

**Files:**
- Modify: `lib/investor-enrichment.ts` (`enrichInvestorById`)

- [ ] **Step 1: Run firm + portfolio LLM in parallel**

In `enrichInvestorById`, replace sequential calls:

```typescript
const started = Date.now()
const { rawSources, meta } = await fetchEnrichmentSources(row.firmName, row.websiteUrl, { verbose })
const [firm, initialDeals] = await Promise.all([
  extractEnrichedFields(row.firmName, rawSources, { verbose }),
  extractPortfolioCompanies(row.firmName, rawSources, { verbose }),
])
```

- [ ] **Step 2: Add `EnrichmentRunMeta` to return type**

Extend `EnrichInvestorByIdResult`:

```typescript
import type { EnrichmentRunMeta } from '@/lib/investor-enrichment-chart'

export type EnrichInvestorByIdResult = {
  investor: Investor & { portfolioCompanies: InvestorPortfolioCompany[] }
  meta: FetchEnrichmentSourcesMeta
  runMeta: EnrichmentRunMeta
  firm: FirmEnrichmentFields
  deals: CleanPortfolioDeal[]
  skippedPersist: boolean
  sectorsUpdated: boolean
}
```

Temporarily set `runMeta` with placeholder counts until Tasks 4–5 complete.

- [ ] **Step 3: Commit**

```bash
git add lib/investor-enrichment.ts
git commit -m "perf(enrichment): parallel firm and portfolio LLM extraction"
```

---

### Task 4: Deal backfill loop (Phase C)

**Files:**
- Modify: `lib/investor-enrichment.ts`
- Modify: `lib/investor-enrichment-chart.test-runner.ts` (optional extra cases)

- [ ] **Step 1: Add `extractSingleDealFacts`**

In `lib/investor-enrichment.ts`:

```typescript
const singleDealFactsSchema = z.object({
  investmentYear: z.number().int().nullable().optional(),
  investmentDate: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  confidence: z.number(),
})

export async function extractSingleDealFacts(
  firmName: string,
  companyName: string,
  rawSources: string,
  options?: { verbose?: boolean },
): Promise<z.infer<typeof singleDealFactsSchema> | null> {
  const system = `Extract ONLY date and round size for one investment from the excerpts.
Return JSON: investmentYear (4-digit or null), investmentDate (YYYY-MM-DD or null), amount (USD millions or null), confidence (0-10).
Use only facts stated in the excerpts; do not invent.`
  const user = `Fund: "${firmName}"\nCompany: "${companyName}"\n\nSources:\n${rawSources.slice(0, 8000)}`
  const raw = await openrouterGenerateJson<unknown>({
    system,
    user,
    temperature: 0.1,
    useVcPipeline: true,
    retryOnParseError: true,
  })
  const parsed = singleDealFactsSchema.safeParse(raw)
  if (!parsed.success) return null
  return parsed.data
}
```

- [ ] **Step 2: Add `runDealBackfillLoop`**

```typescript
const BACKFILL_WAVE_SIZE = 3
const BACKFILL_WAVE_DELAY_MS = 1200

async function runDealBackfillLoop(
  firmName: string,
  deals: CleanPortfolioDeal[],
  config: EnrichmentChartConfig,
  verbose: boolean,
): Promise<{ deals: CleanPortfolioDeal[]; queriesUsed: number; droppedIncomplete: number }> {
  let working = [...deals]
  let queriesUsed = 0
  let droppedIncomplete = 0

  const queue = dealsNeedingBackfill(working, config.chartTarget)
  for (let i = 0; i < queue.length && queriesUsed < config.maxBackfill; i += BACKFILL_WAVE_SIZE) {
    const wave = queue.slice(i, i + BACKFILL_WAVE_SIZE)
    await Promise.all(
      wave.map(async (deal) => {
        if (queriesUsed >= config.maxBackfill) return
        queriesUsed += 1
        const query = buildBackfillQuery(firmName, deal)
        const { textBlock } = await runSingleExaSearchWithRetry(query, verbose, { startPublishedDate: EXA_SINCE })
        if (!textBlock.trim()) return
        const facts = await extractSingleDealFacts(firmName, deal.companyName, textBlock, { verbose })
        if (!facts) return
        const idx = working.findIndex((d) => d.companyName === deal.companyName && d.sourceUrl === deal.sourceUrl)
        if (idx === -1) return
        working[idx] = mergeBackfillFacts(working[idx]!, facts)
      }),
    )
    if (i + BACKFILL_WAVE_SIZE < queue.length && queriesUsed < config.maxBackfill) {
      await sleep(BACKFILL_WAVE_DELAY_MS)
    }
  }

  const before = working.length
  working = applyChartPersistGate(working)
  droppedIncomplete += before - working.length

  return { deals: working, queriesUsed, droppedIncomplete }
}
```

- [ ] **Step 3: Wire into `enrichInvestorById` before persist**

```typescript
const investorRow = await db.investor.findUnique({
  where: { id: investorId },
  select: { id: true, firmName: true, websiteUrl: true, sectors: true, fundType: true },
})
const config = resolveEnrichmentChartConfig({ fundType: investorRow?.fundType })
// ... fetch + parallel LLM ...
let deals = initialDeals
let backfillQueries = 0
let droppedIncomplete = 0

if (scatterReadyCount(deals) < config.chartTarget) {
  const backfill = await runDealBackfillLoop(row.firmName, deals, config, verbose)
  deals = backfill.deals
  backfillQueries = backfill.queriesUsed
  droppedIncomplete = backfill.droppedIncomplete
}
```

- [ ] **Step 4: Golden check (manual)**

Run: `npm run enrich:one -- --firm "Sequoia Capital" --verbose`  
Expected: log shows `backfillQueries > 0` for at least some firms; more scatter-ready deals than Phase B alone.

- [ ] **Step 5: Commit**

```bash
git add lib/investor-enrichment.ts
git commit -m "feat(enrichment): add per-deal backfill loop for chart dates and amounts"
```

---

### Task 5: Portfolio top-up loop (Phase D)

**Files:**
- Modify: `lib/investor-enrichment.ts`

- [ ] **Step 1: Add `runPortfolioTopUpLoop`**

```typescript
async function runPortfolioTopUpLoop(
  firmName: string,
  deals: CleanPortfolioDeal[],
  config: EnrichmentChartConfig,
  verbose: boolean,
): Promise<{ deals: CleanPortfolioDeal[]; queriesUsed: number }> {
  let working = [...deals]
  let queriesUsed = 0
  const nowYear = new Date().getFullYear()

  while (
    scatterReadyCount(working) < config.chartTarget &&
    queriesUsed < config.maxTopUp &&
    !isExaGlobalCooldownActive()
  ) {
  // Partial success: stop top-up once minScatter met (persist timeline/scatter mix)
  if (scatterReadyCount(working) >= config.minScatter) break

  const exclude = working.map((d) => d.companyName)
  const query = buildTopUpQuery(firmName, exclude, nowYear)
  queriesUsed += 1
  const { textBlock } = await runSingleExaSearchWithRetry(query, verbose, { startPublishedDate: EXA_SINCE })
  if (!textBlock.trim()) break

  const newDeals = await extractPortfolioCompanies(firmName, textBlock, { verbose })
  const gated = applyChartPersistGate(newDeals)
  if (gated.length === 0) break

  working = postProcessPortfolioDeals(
    [...working, ...gated],
    firmName,
    textBlock,
  )
  // dedupe by companyName + sourceUrl
  const seen = new Set<string>()
  working = working.filter((d) => {
    const k = `${d.companyName.toLowerCase()}|${d.sourceUrl}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  await sleep(BACKFILL_WAVE_DELAY_MS)
}

return { deals: applyChartPersistGate(working), queriesUsed }
```

- [ ] **Step 2: Wire after backfill in `enrichInvestorById`**

Skip top-up if `scatterReadyCount(deals) >= config.chartTarget` after Phase B (fast path).

- [ ] **Step 3: Build full `runMeta`**

```typescript
const elapsedMs = Date.now() - started
const scatterReady = scatterReadyCount(deals)
const datedOnly = deals.filter((d) => classifyDeal(d) === 'dated-only').length
const chartMode = predictChartMode(deals)
const partialChartTarget = scatterReady >= config.minScatter && scatterReady < config.chartTarget

const runMeta: EnrichmentRunMeta = {
  hitsPerQuery: meta.hitsPerQuery,
  scatterReady,
  datedOnly,
  droppedIncomplete,
  backfillQueries,
  topupQueries,
  chartMode,
  elapsedMs,
  partialChartTarget,
}
```

- [ ] **Step 4: Golden gate — document results**

Run enrich on 5 golden firms. Create `docs/superpowers/specs/2026-05-24-enrichment-golden-run.md` with table:

| Firm | scatterReady | chartMode | elapsedMs | pass/fail |

Do not proceed to Task 7 batch until ≥1 tier-1 VC shows `chartMode: scatter` with `scatterReady >= 3`.

- [ ] **Step 5: Commit**

```bash
git add lib/investor-enrichment.ts docs/superpowers/specs/2026-05-24-enrichment-golden-run.md
git commit -m "feat(enrichment): add portfolio top-up loop and run metadata"
```

---

### Task 6: Chart-gated persist + CLI report

**Files:**
- Modify: `lib/investor-enrichment.ts` (`persistEnrichment` call site)
- Modify: `scripts/enrich-one-investor.ts`

- [ ] **Step 1: Apply chart gate before `persistEnrichment`**

```typescript
const gatedDeals = applyChartPersistGate(deals)
const persist = await persistEnrichment({
  investorId: row.id,
  firm,
  deals: gatedDeals,
})
```

- [ ] **Step 2: Extend CLI report in `printEnrichmentReport`**

Add after portfolio deals block:

```typescript
console.log(`Chart mode (predicted): ${result.runMeta.chartMode}`)
console.log(`Scatter-ready deals:    ${result.runMeta.scatterReady} (target ${process.env.INVESTOR_ENRICH_CHART_TARGET ?? '5'})`)
console.log(`Backfill queries:       ${result.runMeta.backfillQueries}`)
console.log(`Top-up queries:         ${result.runMeta.topupQueries}`)
console.log(`Dropped incomplete:     ${result.runMeta.droppedIncomplete}`)
console.log(`Elapsed:                ${result.runMeta.elapsedMs} ms`)
if (result.runMeta.partialChartTarget) {
  console.log('Note:                   partial chart target (timeline fallback likely)')
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/investor-enrichment.ts scripts/enrich-one-investor.ts
git commit -m "feat(enrichment): chart-gated persist and enriched CLI reporting"
```

---

### Task 7: Portfolio UI — intuitive, visually appealing display

**Files:**
- Create: `components/investor/portfolio-activity-section.tsx`
- Modify: `app/investors/[id]/investor-profile-client.tsx`

**Design intent:** When scatter data exists, founders immediately understand *when* and *how much* the investor deploys capital. Keep NEXUS visual language (`minimal-surface`, `eyebrow-label`, sector colors).

- [ ] **Step 1: Extract portfolio section into dedicated component**

Create `components/investor/portfolio-activity-section.tsx` by moving from `investor-profile-client.tsx`:

- Types: `PortfolioCompanyRow`, `ChartPoint`, `PortfolioListItem` (import or re-export)
- Functions: `dealYear`, `buildChartPoints`, `applyCoincidenceJitter`, `PortfolioChart`, `DealTooltip`, `sectorColor`, `formatInvestmentDate`, `recentDealsToPortfolioRows`, `legacyPortfolioPlainLines`
- New exported component:

```typescript
export function PortfolioActivitySection(props: {
  portfolioCompanies: PortfolioCompanyRow[]
  enrichment: { snapshot: string | null; recentDeals: RecentDealInput[] } | null
  portfolio: PortfolioListItem[]
  notableInvestments: string | null
  enrichedAt: string | null
}) { /* section JSX */ }
```

- [ ] **Step 2: Add chart mode badge + helper copy**

Above the chart, when mode is `scatter`:

```tsx
<div className="flex flex-wrap items-center gap-2">
  <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1 text-xs font-medium text-foreground">
    Round size chart
  </span>
  <p className="helper-copy text-xs text-muted-foreground">
    Each dot is one disclosed round · vertical axis = amount · color = sector
  </p>
</div>
```

When mode is `timeline`:

```tsx
<span className="...">Activity timeline</span>
<p className="helper-copy text-xs text-muted-foreground">
  Each dot is one investment by year (amount not disclosed in sources)
</p>
```

- [ ] **Step 3: Add accessible deal table below chart**

For `scatter` and `timeline` modes, render a clean table under the chart:

```tsx
<div className="overflow-hidden rounded-xl border border-border/50">
  <table className="w-full text-sm">
    <thead className="bg-muted/30 text-left">
      <tr>
        <th className="px-4 py-2.5 font-medium text-muted-foreground">Company</th>
        <th className="px-4 py-2.5 font-medium text-muted-foreground">Year</th>
        <th className="px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
        <th className="px-4 py-2.5 font-medium text-muted-foreground">Stage</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border/40">
      {sortedRows.map((row) => (
        <tr key={row.id} className="hover:bg-muted/20">
          <td className="px-4 py-3 font-medium text-foreground">{row.companyName}</td>
          <td className="px-4 py-3 tabular-nums text-muted-foreground">{dealYear(row) ?? '—'}</td>
          <td className="px-4 py-3 tabular-nums text-muted-foreground">
            {row.amount != null ? `$${row.amount >= 10 ? row.amount.toFixed(0) : row.amount.toFixed(1)}M` : '—'}
          </td>
          <td className="px-4 py-3 text-muted-foreground">{row.stage ?? '—'}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

Sort rows by year descending.

- [ ] **Step 4: Polish chart container**

In `PortfolioChart`, update wrapper:

```tsx
<div className="minimal-surface relative h-[min(28rem,72vw)] w-full min-h-[300px] rounded-2xl border border-border/40 bg-gradient-to-b from-card/80 to-card/40 p-4 sm:p-5 md:h-[24rem]">
```

Add subtle X-axis label under chart for scatter: `Year of investment` (muted, centered, text-xs).

- [ ] **Step 5: Improve empty state copy**

Replace empty state body with founder-friendly text:

```tsx
<h3 className="font-heading text-lg font-semibold text-foreground">Portfolio activity coming soon</h3>
<p className="section-copy max-w-xl text-sm md:text-base">
  We are still collecting verified round history for this investor. Use mandate, check size, and links above to evaluate fit today.
</p>
```

- [ ] **Step 6: Show last enriched timestamp when present**

```tsx
{enrichedAt ? (
  <p className="meta-copy text-xs text-muted-foreground">
    Portfolio data updated {new Date(enrichedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
  </p>
) : null}
```

- [ ] **Step 7: Remove debug agent ingest `useEffect`**

Delete the `#region agent log` fetch block in `investor-profile-client.tsx` (lines ~532–558).

- [ ] **Step 8: Wire component in profile client**

Replace inline portfolio `<section>` with `<PortfolioActivitySection ... />`.

- [ ] **Step 9: Visual QA**

Run: `npm run dev`  
Open `/investors/[id]` for a golden-enriched investor.  
Verify: scatter chart renders, table matches dots, badge + helper text visible, no console errors.

- [ ] **Step 10: Commit**

```bash
git add components/investor/portfolio-activity-section.tsx app/investors/[id]/investor-profile-client.tsx
git commit -m "feat(profile): polish portfolio activity chart and deal table"
```

---

### Task 8: Batch worker + coverage metrics

**Files:**
- Create: `scripts/enrich-batch-investors.ts`
- Create: `scripts/measure-enrichment-coverage.ts`
- Modify: `package.json`

- [ ] **Step 1: Create coverage script**

`scripts/measure-enrichment-coverage.ts`:

```typescript
#!/usr/bin/env tsx
import '@/lib/load-env'
import { db } from '@/lib/db'

async function main() {
  const publicInvestors = await db.investor.count({
    where: { isPublic: true, discoverable: true },
  })
  const withDatedDeal = await db.investor.count({
    where: {
      isPublic: true,
      discoverable: true,
      portfolioCompanies: {
        some: {
          OR: [{ investmentYear: { not: null } }, { investmentDate: { not: null } }],
        },
      },
    },
  })
  const scatterReadyRows = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(DISTINCT i.id) AS count
    FROM "Investor" i
    INNER JOIN "InvestorPortfolioCompany" p ON p."investorId" = i.id
    WHERE i."isPublic" = true AND i.discoverable = true
      AND (p."investmentYear" IS NOT NULL OR p."investmentDate" IS NOT NULL)
      AND p.amount IS NOT NULL AND p.amount > 0
    GROUP BY i.id
    HAVING COUNT(*) >= 5
  `
  // print formatted report with % vs targets from spec
  console.log(`Public investors: ${publicInvestors}`)
  console.log(`With ≥1 dated deal: ${withDatedDeal} (${pct(withDatedDeal, publicInvestors)}%)`)
  // ...
}

function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10
}

main().finally(() => db.$disconnect())
```

Refine scatter≥5 query using subquery/HAVING as needed for Prisma/raw SQL correctness.

- [ ] **Step 2: Create batch worker**

`scripts/enrich-batch-investors.ts` — pattern from `scripts/auto-research-vcs.ts` batch tuning:

```typescript
#!/usr/bin/env tsx
import '@/lib/load-env'
import { db } from '@/lib/db'
import { enrichInvestorById } from '@/lib/investor-enrichment'
import { isInvestorEligibleForWorkers } from '@/lib/investor-worker-eligibility'
import { isExaGlobalCooldownActive } from '@/lib/exa-global-cooldown'

function parseArgs() {
  const argv = process.argv.slice(2)
  let all = false
  let limit = 25
  let force = false
  let id: string | null = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--all') all = true
    else if (argv[i] === '--force') force = true
    else if (argv[i] === '--limit' && argv[i + 1]) limit = parseInt(argv[++i]!, 10) || limit
    else if (argv[i] === '--id' && argv[i + 1]) id = argv[++i]!.trim()
  }
  return { all, limit, force, id }
}

async function main() {
  const { all, limit, force, id } = parseArgs()
  const staleDays = parseInt(process.env.INVESTOR_ENRICH_STALE_DAYS || '30', 10)
  const concurrent = parseInt(process.env.INVESTOR_ENRICH_BATCH_CONCURRENT || '2', 10)
  const delayMs = parseInt(process.env.INVESTOR_ENRICH_BATCH_DELAY_MS || '2500', 10)

  if (id) {
    const result = await enrichInvestorById(id, { verbose: true })
    console.log(result.runMeta)
    return
  }

  const staleBefore = new Date(Date.now() - staleDays * 86400000)
  let processed = 0

  while (all || processed < limit) {
    if (isExaGlobalCooldownActive()) {
      console.error('[ENRICH-BATCH] Exa cooldown — stopping.')
      break
    }
    const take = all ? 50 : Math.min(limit - processed, 50)
    const rows = await db.investor.findMany({
      where: {
        isPublic: true,
        discoverable: true,
        ...(force ? {} : { OR: [{ enrichedAt: null }, { enrichedAt: { lt: staleBefore } }] }),
      },
      select: { id: true, firmName: true },
      orderBy: [{ enrichedAt: 'asc' }, { lastUpdated: 'asc' }],
      take,
    })
    const eligible = rows.filter((r) => isInvestorEligibleForWorkers(r.firmName))
    if (eligible.length === 0) break

    for (let i = 0; i < eligible.length; i += concurrent) {
      const chunk = eligible.slice(i, i + concurrent)
      await Promise.all(
        chunk.map(async (row) => {
          try {
            const result = await enrichInvestorById(row.id, { verbose: false })
            console.log(`[OK] ${row.firmName} scatter=${result.runMeta.scatterReady} mode=${result.runMeta.chartMode} ${result.runMeta.elapsedMs}ms`)
          } catch (e) {
            console.error(`[FAIL] ${row.firmName}`, e instanceof Error ? e.message : e)
          }
        }),
      )
      processed += chunk.length
      await new Promise((r) => setTimeout(r, delayMs))
    }
    if (!all) break
  }
}

main().finally(() => db.$disconnect())
```

- [ ] **Step 3: Add npm scripts**

```json
"enrich:batch": "tsx scripts/enrich-batch-investors.ts",
"enrich:coverage": "tsx scripts/measure-enrichment-coverage.ts"
```

- [ ] **Step 4: Pilot**

Run: `npm run enrich:batch -- --limit 10`  
Then: `npm run enrich:coverage`  
Expected: coverage percentages increase; logs show scatter counts.

- [ ] **Step 5: Commit**

```bash
git add scripts/enrich-batch-investors.ts scripts/measure-enrichment-coverage.ts package.json
git commit -m "feat(enrichment): add batch worker and coverage metrics script"
```

---

### Task 9: Optional background worker job (Phase 7 — after golden pass)

**Files:**
- Modify: `lib/background-worker.ts`
- Modify: `package.json` (document env in comment only)

- [ ] **Step 1: Add job only if `WORKER_INVESTOR_ENRICH_ENABLED=1`**

Register job `investor-enrichment-batch` that shells to batch logic (import `enrichInvestorById` in a loop, batch size 25, interval 24h). Do not enable by default.

- [ ] **Step 2: Commit**

```bash
git add lib/background-worker.ts
git commit -m "feat(worker): optional investor enrichment batch job"
```

---

### Task 10: Final acceptance checklist

- [ ] **Step 1: Run all tests**

```bash
npm run test:enrichment-chart
npm run type-check
```

- [ ] **Step 2: Golden run doc complete**

`docs/superpowers/specs/2026-05-24-enrichment-golden-run.md` — all 5 firms pass criteria.

- [ ] **Step 3: Coverage pilot**

`npm run enrich:batch -- --limit 100` then `npm run enrich:coverage`  
Targets: ≥50% dated deal rate on pilot sample (adjust if corpus is mostly accelerators).

- [ ] **Step 4: Profile visual QA on 3 enriched investors**

Confirm scatter chart, deal table, badge, enriched date, improved empty state.

- [ ] **Step 5: Final commit if any doc updates**

```bash
git add docs/superpowers/specs/2026-05-24-enrichment-golden-run.md
git commit -m "docs: record enrichment golden run acceptance results"
```

---

## Plan self-review

**Spec coverage:**
| Spec section | Task |
|--------------|------|
| Parallel Exa (Phase A) | Task 2 |
| Parallel LLM (Phase B) | Task 3 |
| Backfill (Phase C) | Task 4 |
| Top-up (Phase D) | Task 5 |
| Chart gate + meta (Phase E) | Task 6 |
| Batch worker | Task 8 |
| Coverage script | Task 8 |
| Golden validation | Task 5 Step 4, Task 10 |
| No matching changes | Guardrail — no `lib/matching/**` tasks |
| UI polish (user request) | Task 7 |
| Background job optional | Task 9 |

**Placeholder scan:** No TBD/TODO steps.

**Type consistency:** `EnrichmentRunMeta`, `CleanPortfolioDeal`, `EnrichmentChartConfig` defined in Task 1 and used consistently through Task 6.

**Vision alignment:** Chart-first backfill/top-up preserved; profile display enhanced for clarity and visual appeal; match algorithm untouched.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-24-investor-profile-enrichment.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
