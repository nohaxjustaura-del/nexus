# NEXUS

**Fundraising match engine for founders.** NEXUS produces ranked investor shortlists from your pitch -- scoring VCs, angels, accelerators, and corporate venture arms on stage, sector, thesis, and narrative fit.

**Deployed app:** Set `NEXT_PUBLIC_URL` to your production origin (e.g. Vercel). **Company narrative** for partners and investors lives at `/about` on that host.

---

## What it does

- **Pitch analysis** -- upload a deck, record a video, or answer structured questions. A multi-pass scoring pipeline (fact extraction, vagueness audit, adversarial bull/bear review, tier classification) evaluates fundraising readiness.
- **Investor matching** -- semantic similarity (Voyage embeddings + FAISS), live web evidence (Exa), structured gate questions (Gemini), and per-match narratives (OpenRouter) produce a ranked shortlist with explanation.
- **Verified directory** -- investor records are enriched and validated by background workers and admin review.
- **Credits & premium** -- Stripe-powered one-time credit packs and a subscription tier.
- **Admin ops** -- approval queues, founder verification, VC directory management, worker dashboards.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3.4, Radix UI, Framer Motion |
| Database | PostgreSQL via Prisma 5 (hosted on Supabase) |
| Auth | Supabase Auth (magic link / OTP), SSR session middleware |
| AI / LLM | OpenRouter, Google Gemini, OpenAI (optional) |
| Embeddings | Voyage AI (voyage-3, 1024-d) |
| Vector search | FAISS microservice (Python), in-memory cosine fallback |
| Web retrieval | Exa |
| Payments | Stripe (Checkout + Subscriptions + Webhooks) |
| Email | Resend (optional, falls back to Supabase SMTP) |
| Deployment | Vercel |

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project (Postgres + Auth)
- At least one LLM key (OpenRouter recommended)

### Setup

```bash
# Install dependencies
npm install

# Copy environment template and fill in your keys
cp .env.example .env.local

# Push Prisma schema to your database
npx prisma db push

# (Optional) Seed investor data
npm run db:seed

# Start development server
npm run dev
```

The app runs at `http://localhost:3000`.

### Required environment variables

At minimum, set these in `.env.local`:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DATABASE_URL` | Postgres connection (transaction pooler) |
| `DIRECT_DATABASE_URL` | Postgres direct connection (migrations) |
| `ADMIN_EMAIL` | Comma-separated admin email addresses |

For full AI analysis, also set: `OPENROUTER_API_KEY`, `VOYAGE_API_KEY`, `GEMINI_API_KEY` or `GOOGLE_API_KEY`, and Exa keys (`EXA_API_KEYS` comma-separated, or `EXA_API_KEY` — see `lib/exa-keys.ts` and `.env.example`).

### Key scripts

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript check
npm run db:push          # Push schema to DB
npm run db:studio        # Prisma Studio
npm run worker:start     # Background worker (VC research, embeddings)
```

## Project structure

```
app/
  ├── api/               # 50+ API routes (auth, analysis, admin, payments)
  ├── founder/           # Founder hub (dashboard, analysis, discover, matches)
  ├── vc/                # VC-side (dashboard, claim, applicants)
  ├── admin/             # Admin panel (approvals, directory, workers)
  └── (marketing)        # Landing, about, pricing, legal pages
components/              # React components (ui/, ai-analysis/, admin/)
lib/                     # Server/client utilities, AI pipelines, matching
  ├── matching/          # v3 orchestrator (gates, ranking, narratives)
  ├── scoring/           # Multi-pass pitch scoring pipeline
  └── supabase/          # Auth helpers (server, middleware, route handler)
prisma/                  # Schema + seeds
scripts/                 # Operational scripts (VC import, embeddings, workers)
faiss-service/           # Python FAISS microservice (see faiss-service/README)
```

## License

Proprietary. All rights reserved.
