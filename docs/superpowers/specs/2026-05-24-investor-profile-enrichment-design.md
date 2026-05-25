# Investor Profile Enrichment v2 — Design Spec

**Date:** 2026-05-24  
**Status:** Approved for implementation planning  
**Scope:** Investor profile data quality when founders click an investor (`/investors/[id]`).  
**Explicitly out of scope:** Match fit algorithm, embeddings, FAISS, matching-time Exa (`lib/matching/`).

---

## 1. Problem statement

Founders open investor profiles to decide whether to pursue outreach. The profile page (`app/investors/[id]/investor-profile-client.tsx`) renders mandate, metrics, partners, and a **portfolio chart** — but most profiles show *"No investment data available yet"* because:

1. Structured deals live in `InvestorPortfolioCompany`, populated only by manual `npm run enrich:one`.
2. Current enrichment uses **3 sequential Exa queries** (~600 ms gaps) with shared sources for firm fields and portfolio.
3. `filterAndNormalizeDeals()` **drops** deals without year/date, and deals with `confidence < 4`.
4. `research-vcs` fills legacy `Investor.portfolio` (name strings) but **not** relational portfolio rows the chart reads.
5. No batch worker exists for corpus-wide enrichment.

The portfolio **chart is a primary product feature**. It requires dated deals; scatter mode (the intended experience) requires **year + round amount**.

---

## 2. Goals and success criteria

### Primary goal (B — research before outreach)

When a founder clicks an investor, they see enough structured data to evaluate fit and activity **without** hitting empty portfolio states.

### Chart-first success metrics

These are **acceptance criteria** for the project — implementation is not complete until measured against them on a staging/production sample.

| Metric | Baseline (approx.) | Target | How to measure |
|--------|-------------------|--------|----------------|
| Public discoverable investors with ≥1 **dated** structured deal | Low | **≥80%** | SQL: `InvestorPortfolioCompany` with `investmentYear IS NOT NULL OR investmentDate IS NOT NULL`, joined to public investors |
| Public investors with **≥5 scatter-ready** deals (year + amount) | Very low | **≥50%** of active VCs* | SQL + script `scripts/measure-enrichment-coverage.ts` (new) |
| Profile portfolio mode = `empty` | High | **<15%** of public investors | Sample 100 profiles; count `portfolioAnalysis.mode === 'empty'` |
| Profile portfolio mode = `scatter` | Low | **≥40%** of enriched investors | Same sample; prefer scatter over timeline |
| Median wall-clock per `enrichInvestorById` | ~20–40 s | **≤15 s** (p50), **≤35 s** (p95) | Log `elapsedMs` in enrichment result |
| Corpus backfill | Manual only | Automated, resume-safe | `npm run enrich:batch -- --all` runs without manual intervention |

\*Active VC = `fundType` contains venture/cvc/angel (exclude pure accelerators from scatter target if deal press is sparse; still require dated deals or timeline).

### Non-goals

- Changes to `lib/matching/`, match scores, ranking, narratives, or live Exa during pitch analysis.
- Profile UI redesign (data-only improvement; existing chart component unchanged).
- Crunchbase / PitchBook paid APIs.
- Outreach talking points generation.

---

## 3. What the profile page consumes (contract)

Do **not** change profile routing or chart logic in v1. Enrichment must populate existing fields.

### Data sources (priority order for chart)

1. **`InvestorPortfolioCompany`** rows (primary) — loaded in `app/investors/[id]/page.tsx`.
2. **`VCEnrichmentCache.recentDeals`** — fallback via `recentDealsToPortfolioRows()` when relational rows empty.
3. **Legacy `Investor.portfolio` JSON** — text list below chart only; not counted toward chart target.

### Chart mode rules (existing UI — must preserve)

From `investor-profile-client.tsx`:

| Mode | Condition | UX |
|------|-----------|-----|
| `empty` | No merged portfolio rows | Empty state message |
| `scatter` | ≥1 row with year **and** ≥1 row with `amount > 0` | Year vs amount scatter |
| `timeline` | Rows with year, none with amount | Year-only timeline |
| `unplotted` | Rows exist, none with year | Name list only |

**Design decision:** Stop persisting undated rows to `InvestorPortfolioCompany`. Unplotted mode becomes rare; legacy JSON still provides name-only context in copy.

### Scalar fields (profile hero / metrics / mandate)

Enrichment continues to write (existing schema):

- `foundedYear`, `partnerNames`, `sectors` (confidence ≥6), `activelyInvesting`, `lastDealDate`, `enrichedAt`, `enrichmentVersion`
- `thesis` synced from `firmSummary` when existing thesis is weak (`isThesisWeakForEnrichment`)
- `VCEnrichmentCache.snapshot` (= firm summary), `recentDeals` (subset of persisted deals, max 12)

---

## 4. Architecture overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    enrichInvestorById (v2)                       │
├─────────────────────────────────────────────────────────────────┤
│  Phase A: Parallel bulk Exa (5 passes, Promise.all)           │
│  Phase B: Parallel LLM — firm fields + initial portfolio       │
│  Phase C: Deal backfill loop (targeted Exa per incomplete deal)│
│  Phase D: Portfolio top-up loop (find new deals until target)  │
│  Phase E: Chart gate + persist (transaction)                   │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  InvestorPortfolioCompany      Investor + VCEnrichmentCache
         │                              │
         └──────────┬───────────────────┘
                    ▼
           /investors/[id] (unchanged)
```

### Module boundaries

| Module | Responsibility |
|--------|----------------|
| `lib/investor-enrichment.ts` | Orchestration, Exa retrieval, LLM extraction, backfill loops, persist |
| `lib/investor-enrichment-chart.ts` *(new)* | Pure functions: chart readiness, deal classification, merge backfill, query budget |
| `scripts/enrich-one-investor.ts` | CLI for single investor (unchanged UX, calls v2 pipeline) |
| `scripts/enrich-batch-investors.ts` *(new)* | Batch worker with concurrency + resume |
| `scripts/measure-enrichment-coverage.ts` *(new)* | Coverage metrics for acceptance testing |

No new Prisma models in v1. Use existing `InvestorPortfolioCompany` fields.

---

## 5. Phase A — Parallel bulk Exa retrieval

Replace sequential queries in `fetchEnrichmentSources()` with **5 parallel passes** via `runExaWithKeyFailover` (round-robin keys, same as today).

### Pass definitions

| Pass | Query template | Purpose |
|------|----------------|---------|
| P1 Deal press | `"${exaName}" invests in site:techcrunch.com OR site:businesswire.com OR site:prnewswire.com` | Announcements with dates/amounts |
| P2 Portfolio general | `"${exaName}" venture capital investments portfolio ${year-4}..${year}` | Broad deal history |
| P3 Fund website | `"${exaName}" portfolio OR companies site:${host}` *(skip if no websiteUrl)* | Fund-published portfolio |
| P4 Team | `"${exaName}" founding partners team general partner GP` | Partner names |
| P5 Mandate | `"${exaName}" investment mandate thesis stages geography fund` | Firm summary, sectors, activity |

Parameters (unchanged defaults unless noted):

- `numResults`: 8 per pass (`EXA_NUM_RESULTS`)
- `maxCharacters`: 3000 per result
- `startPublishedDate`: `2020-01-01` for P1/P2; no date filter for P3–P5

### Merge format

Same as today: sections `=== QUERY N ===` with query string + text block. Log `hitsPerQuery`, `exaKeyIndexByQuery`, `rawSourcesCharCount`.

### Speed

Remove inter-query `sleep(delayMs)` between parallel passes. Expected retrieval: **~1.5–3 s** (one round-trip) vs **~4–8 s** sequential.

---

## 6. Phase B — Parallel initial LLM extraction

After merge, run **in parallel** (`Promise.all`):

1. `extractEnrichedFields(firmName, rawSources)` — existing, unchanged prompts.
2. `extractPortfolioCompanies(firmName, rawSources)` — existing prompt; output is **candidate** deals.

Do not persist yet. Pass candidates to Phase C/D.

---

## 7. Phase C — Deal backfill loop (targeted date/amount)

**Purpose:** For each candidate deal missing year or amount, search *that specific company* before discarding it.

### Deal classification (pure functions in `investor-enrichment-chart.ts`)

```typescript
type DealChartClass = 'scatter-ready' | 'dated-only' | 'incomplete'

function classifyDeal(deal: CleanPortfolioDeal): DealChartClass
function isScatterReady(deal: CleanPortfolioDeal): boolean
// scatter-ready: (investmentYear || investmentDate) && amount > 0 && confidence >= 4
```

### Backfill trigger

For each deal with `class === 'incomplete'` OR `dated-only` (missing amount when scatter target not met):

**Exa query (1 per deal):**

```
"${exaName}" "${companyName}" funding round investment ${stageHint} ${year-1} ${year} ${year+1}
```

- `stageHint`: deal.stage if present, else empty
- `year`: current year if no year on deal, else deal.investmentYear

**LLM call (lightweight, new function `extractSingleDealFacts`):**

- Input: firm name, company name, backfill Exa text (max 8k chars)
- Output JSON: `{ investmentYear, investmentDate, amount, confidence }` only
- Temperature 0.1; Zod validated
- Merge into deal if confidence ≥ 4; prefer more specific date over year-only

### Backfill batching

- Process incomplete deals in **waves of 3** parallel Exa+LLM pairs (respect 10 QPS/key).
- **1200 ms** delay between waves (same as matching exa-enrichment).
- Stop backfill for a deal after **1 failed targeted search** (no year after merge → drop deal).

### Cap

`INVESTOR_ENRICH_MAX_BACKFILL` default **6** queries per investor.

---

## 8. Phase D — Portfolio top-up loop

**Purpose:** If scatter-ready count < target after Phase C, find **different** investments until target met or budget exhausted.

### Loop condition

```typescript
while (
  scatterReadyCount(deals) < CHART_TARGET &&
  topUpQueriesUsed < MAX_TOPUP &&
  !exaGlobalCooldown
) { ... }
```

### Top-up Exa query

Exclude companies already in candidate set:

```
"${exaName}" (investment OR "led the round" OR "portfolio company") ${year} ${year-1} -"${company1}" -"${company2}" ...
```

Cap exclusion list at 8 company names (longest names first).

### Extraction

Run `extractPortfolioCompanies` on **top-up text only** (not full re-merge) with instruction: *only return deals not in exclusion list*.

Append new deals through same normalize + dedupe pipeline (`postProcessPortfolioDeals`).

### Cap

`INVESTOR_ENRICH_MAX_TOPUP` default **3** queries per investor.

### Partial success

If scatter-ready ≥ `INVESTOR_ENRICH_MIN_SCATTER` (default **3**) but < `CHART_TARGET`, **persist dated deals** (timeline mode acceptable). Log `partialChartTarget: true`.

---

## 9. Phase E — Chart gate and persistence

### Persist gate (critical — ensures chart intent)

**Include in `InvestorPortfolioCompany` only if:**

- `confidence >= 4`
- `investmentYear != null OR investmentDate != null` (after backfill)
- `investmentYear >= 2020` if year present
- Valid `sourceUrl` (https)
- Passes existing dedupe (`dedupePortfolioDealsBySourceUrl`)

**Exclude:**

- Name-only deals (no year/date after backfill)
- Pre-2020 deals
- Duplicates

**Do not relax** amount requirement for persistence — amount is optional on row (enables timeline). Scatter requires subset with amount.

### Portfolio row rewrite policy (unchanged)

Only replace relational portfolio when `deals.length > 0` after chart gate (do not wipe on firm-only updates).

### Cache sync

`buildRecentDealsForEnrichmentCache(deals)` — only from **persisted** deals (max 12, sorted by recency). Keeps cache aligned with chart data.

### Transaction

Existing `persistEnrichment()` transaction pattern; add enrichment meta fields to return type:

```typescript
type EnrichmentRunMeta = {
  hitsPerQuery: number[]
  scatterReady: number
  datedOnly: number
  droppedIncomplete: number
  backfillQueries: number
  topupQueries: number
  chartMode: 'scatter' | 'timeline' | 'empty'
  elapsedMs: number
  partialChartTarget: boolean
}
```

---

## 10. Environment configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `INVESTOR_ENRICH_CHART_TARGET` | `5` | Target scatter-ready deals (year + amount) |
| `INVESTOR_ENRICH_MIN_SCATTER` | `3` | Minimum scatter-ready before stopping top-up early |
| `INVESTOR_ENRICH_MAX_BACKFILL` | `6` | Max targeted per-deal Exa searches |
| `INVESTOR_ENRICH_MAX_TOPUP` | `3` | Max portfolio top-up searches |
| `INVESTOR_ENRICH_STALE_DAYS` | `30` | Batch worker skips recently enriched |
| `INVESTOR_ENRICH_BATCH_CONCURRENT` | `2` | Parallel investors in batch worker |
| `INVESTOR_ENRICH_BATCH_DELAY_MS` | `2500` | Delay between investor batches |
| `INVESTOR_ENRICH_EXA_DELAY_MS` | `0` | Deprecated for bulk (parallel); used for backfill wave delay override if set |

Reuse existing: `EXA_API_KEYS`, OpenRouter/Ollama VC pipeline, `EXA_KEY_DEAD_MS`, global cooldown handling.

---

## 11. Batch worker

### New npm scripts

```json
"enrich:batch": "tsx scripts/enrich-batch-investors.ts",
"enrich:coverage": "tsx scripts/measure-enrichment-coverage.ts"
```

### CLI

```bash
npm run enrich:batch -- --all
npm run enrich:batch -- --limit 50
npm run enrich:batch -- --force          # ignore stale-days skip
npm run enrich:batch -- --id <investorId>
npm run enrich:coverage                  # print acceptance metrics
```

### Selection query

Public discoverable investors (`isPublic`, `discoverable`, eligible firm name), ordered stalest-first:

```typescript
orderBy: [{ enrichedAt: 'asc' }, { lastUpdated: 'asc' }]
```

Skip if `enrichedAt` within `INVESTOR_ENRICH_STALE_DAYS` unless `--force`.

### Concurrency

- Process `INVESTOR_ENRICH_BATCH_CONCURRENT` investors in parallel.
- Each investor runs full v2 pipeline independently.
- On `ExaResearchQuotaBlockedError` / global cooldown: stop batch, log resume point (last investor id).

### Integration with `worker:start` (Phase 3 rollout)

Optional job `investor-enrichment-batch` in `lib/background-worker.ts` — **separate from VC research and matching**. Default interval: 24h, batch size 25. Can be disabled via env until coverage validated.

---

## 12. Error handling and edge cases

| Case | Behavior |
|------|----------|
| Exa global cooldown mid-run | Abort after current investor; no partial persist for that investor; return cooldown in meta |
| All Exa keys dead | Fail investor with clear error; batch stops |
| LLM parse failure on backfill | Treat as failed backfill for that deal; continue |
| Zero deals after all phases | Persist firm scalar fields only; skip portfolio rewrite; profile may still show legacy JSON |
| Ambiguous firm name (CLI) | Existing disambiguation in `enrich-one-investor.ts` |
| Accelerator / program fundType | Lower `CHART_TARGET` to 3 automatically when `fundType` matches accelerator/fellowship/program |
| Investor with no websiteUrl | Skip P3 fund-site pass (4 parallel passes) |

---

## 13. Verification plan (results-first)

Implementation order prioritizes **provable chart outcomes** before batch scale.

### Step 1 — Golden investors (manual gate)

Before batch worker, run v2 on **5 canonical VCs** with known public deal history:

1. Sequoia Capital (or similar tier-1)
2. A16z
3. One regional mid-size VC
4. One angel / solo GP
5. One accelerator (e.g. Y Combinator — timeline fallback acceptable)

**Pass criteria per investor:**

- ≥3 scatter-ready deals **or** ≥5 dated deals with explicit log explaining accelerator exception
- `chartMode` in meta matches what profile page would render
- No `unplotted` persisted rows
- `elapsedMs` ≤ 35s

Record results in `docs/superpowers/specs/2026-05-24-enrichment-golden-run.md` (created during implementation).

### Step 2 — Unit tests

Add `lib/investor-enrichment-chart.test.ts` (or test-runner pattern used in repo):

- `classifyDeal` / `isScatterReady`
- `mergeBackfillFacts` prefers ISO date over year
- Chart gate drops incomplete deals
- Dedupe unchanged behavior
- Top-up exclusion list builder

Add fixture tests for `filterAndNormalizeDeals` with backfill-merged deals.

### Step 3 — Coverage script

`measure-enrichment-coverage.ts` prints:

- Total public investors
- % with ≥1 dated deal
- % with ≥5 scatter-ready
- % with 0 deals
- Distribution of `chartMode` if meta stored (optional: add `lastEnrichmentMeta` JSON column — **defer**; compute from rows first)

### Step 4 — Batch pilot

`enrich:batch --limit 100` on staging DB. Re-run coverage script. Compare to targets in §2.

### Step 5 — Production rollout

`enrich:batch --all` with monitoring. Abort if Exa cooldown rate > 10% of batch.

---

## 14. Implementation phases

| Phase | Deliverable | Exit criterion |
|-------|-------------|----------------|
| **1** | `investor-enrichment-chart.ts` + unit tests | Tests pass |
| **2** | Phase A parallel bulk + Phase B parallel LLM | Golden investor #1 scatter or timeline with ≥5 dated |
| **3** | Phase C backfill loop | Golden #1 gains amount on ≥3 deals that lacked it in Phase B alone |
| **4** | Phase D top-up loop | Golden #1 reaches scatter target 5 or partial with log |
| **5** | Phase E chart gate + meta | Profile page shows scatter for golden #1 |
| **6** | `enrich:batch` + `enrich:coverage` | 100-investor pilot meets ≥50% dated deal rate |
| **7** | Optional background job | Documented in README / worker comments |

**Do not merge Phase 7 until Phase 5 golden runs pass.**

---

## 15. Files to create or modify

### New files

- `lib/investor-enrichment-chart.ts`
- `lib/investor-enrichment-chart.test.ts` (or `__tests__` runner)
- `scripts/enrich-batch-investors.ts`
- `scripts/measure-enrichment-coverage.ts`

### Modified files

- `lib/investor-enrichment.ts` — v2 orchestration, parallel fetch, backfill/top-up, meta
- `scripts/enrich-one-investor.ts` — print chart meta in report block
- `package.json` — new scripts
- `lib/background-worker.ts` — optional job (phase 7 only)

### Untouched (by design)

- `lib/matching/**`
- `lib/matching/exa-enrichment.ts`
- `app/investors/[id]/investor-profile-client.tsx` (unless empty-state copy tweak desired later)
- `scripts/auto-research-vcs.ts` (may still fill thesis/bio; structured portfolio comes from enrichment v2)

---

## 16. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Exa cost / rate limits | Hard caps on backfill + top-up; batch concurrency 2; reuse key failover |
| LLM invents dates/amounts | Require sourceUrl; backfill prompt cites excerpt only; confidence threshold |
| Slow p95 latency | Skip C/D when scatter-ready ≥ target after Phase B |
| Fund website pass returns junk | Optional pass; skip without websiteUrl |
| Conflicts with research-vcs portfolio JSON | Legacy JSON remains supplementary; chart reads relational rows only |

---

## 17. Open decisions (resolved)

| Question | Decision |
|----------|----------|
| Scatter target count | **5** (configurable) |
| Match algorithm changes | **None** |
| Persist name-only deals | **No** |
| Minimum acceptable scatter before stop | **3** (`MIN_SCATTER`) |
| UI changes | **None in v1** |

---

## 18. Approval record

- **Design approved:** 2026-05-24 (user: profile-focused enrichment, chart-first, parallel speed, backfill + top-up loops)
- **Next step:** Implementation plan via `writing-plans` skill after spec file review
