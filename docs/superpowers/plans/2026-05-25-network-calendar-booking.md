# Network Calendar Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the text-only "Book" button on founder network partner hubs with a seamless two-step flow: a pre-booking form (purpose + details) followed by Calendly's popup widget for actual date/time selection.

**Architecture:** A new `NetworkMeetingBooking` Prisma model stores pre-booking intent. A new API route (`POST /api/network/booking-request`) validates the request and creates the record. A new `InvestorBookingModal` component renders the pre-booking form and, on success, triggers `window.Calendly.initPopupWidget`. Calendly handles all scheduling, calendar invites, and confirmations. The Calendly widget script is lazy-loaded by a dedicated `CalendlyLoader` component only on partner hub pages.

**Tech Stack:** Next.js 14 App Router, Prisma (PostgreSQL), TypeScript (strict), Tailwind CSS, Calendly popup widget (vanilla JS via `window.Calendly`), Sonner toasts.

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Add `NetworkMeetingBooking` model + `User` relation |
| `types/calendly.d.ts` | Create | TypeScript declaration for `window.Calendly` |
| `lib/network/validate-booking-request.ts` | Create | Pure validation function (testable without HTTP) |
| `lib/network/__tests__/validate-booking-request.test-runner.ts` | Create | `tsx`-based unit tests for validation |
| `lib/partner-resources.ts` | Modify | Add `calendlyUrl?: string` to `PartnerFounderPreview` |
| `components/calendly-loader.tsx` | Create | Injects Calendly script + CSS, lazy-loaded |
| `components/investor-booking-modal.tsx` | Create | Pre-booking form; triggers Calendly popup on success |
| `app/api/network/booking-request/route.ts` | Create | POST endpoint: auth, access check, rate limit, DB write |
| `app/founder/network/partner-resources-client.tsx` | Modify | Wire modal + loader, new Book button logic, upsell text |

---

## Task 1: DB Schema — Add `NetworkMeetingBooking` model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1.1: Add the `NetworkMeetingBooking` model**

Open `prisma/schema.prisma`. After the closing `}` of the `YCInsiderFounderRequest` model (currently ends around line 544), add:

```prisma
/// Calendar booking intent logged before the founder enters Calendly.
/// status: pending_calendar | scheduled | cancelled | no_show
model NetworkMeetingBooking {
  id          String  @id @default(cuid())
  userId      String
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  userEmail   String

  /// Matches ResourcePartner.slug (e.g. "luel", "transworld")
  partnerSlug String  @db.VarChar(100)
  /// Display name of the person being booked (e.g. "William Namgyal")
  founderName String  @db.VarChar(200)

  /// Required: meeting purpose entered by the founder (≤200 chars)
  purpose     String  @db.VarChar(200)
  /// Optional: additional context (≤1000 chars)
  details     String? @db.Text

  /// Calendly event URI — populated by webhook handler in a future iteration.
  /// utm_content=<id> in the Calendly URL is the matching key.
  calendlyEventUri String? @db.VarChar(500)

  /// pending_calendar | scheduled | cancelled | no_show
  status      String  @default("pending_calendar") @db.VarChar(32)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([partnerSlug])
  @@index([status])
  @@index([createdAt])
}
```

- [ ] **Step 1.2: Add the relation backref to the `User` model**

In `prisma/schema.prisma`, find the `model User` block (around line 500). It currently has:

```prisma
  ycInsiderFounderRequests YCInsiderFounderRequest[]

  createdAt DateTime @default(now())
```

Change it to:

```prisma
  ycInsiderFounderRequests YCInsiderFounderRequest[]
  networkMeetingBookings   NetworkMeetingBooking[]

  createdAt DateTime @default(now())
```

- [ ] **Step 1.3: Run the migration**

```bash
npx prisma migrate dev --name add_network_meeting_booking
```

Expected output: `✔  Your database is now in sync with your schema.`

If you are in a production-like environment (no local DB), use `npx prisma migrate deploy` after committing.

- [ ] **Step 1.4: Verify Prisma client regenerated**

```bash
npx prisma generate
```

Expected: no errors. Then confirm the new type exists:

```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; const db = new PrismaClient(); console.log(typeof db.networkMeetingBooking.create)"
```

Expected output: `function`

- [ ] **Step 1.5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add NetworkMeetingBooking model for calendar booking pre-intents"
```

---

## Task 2: TypeScript Declaration for `window.Calendly`

**Files:**
- Create: `types/calendly.d.ts`

The `tsconfig.json` already includes `"types/**/*.d.ts"` so this file is picked up automatically.

- [ ] **Step 2.1: Create the declaration file**

Create `types/calendly.d.ts` with the full contents:

```typescript
interface CalendlyWidget {
  initPopupWidget: (options: { url: string }) => void
  closePopupWidget: () => void
  initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void
}

declare global {
  interface Window {
    Calendly?: CalendlyWidget
  }
}

export {}
```

- [ ] **Step 2.2: Verify TypeScript accepts it**

```bash
npx tsc --noEmit
```

Expected: 0 new errors introduced (pre-existing errors are not your concern here).

- [ ] **Step 2.3: Commit**

```bash
git add types/calendly.d.ts
git commit -m "feat(types): add window.Calendly TypeScript declaration"
```

---

## Task 3: Validation Utility + Tests (TDD)

We extract all field-validation logic into a pure function so it can be tested without spinning up a server.

**Files:**
- Create: `lib/network/validate-booking-request.ts`
- Create: `lib/network/__tests__/validate-booking-request.test-runner.ts`

- [ ] **Step 3.1: Write the failing test first**

Create `lib/network/__tests__/validate-booking-request.test-runner.ts`:

```typescript
/**
 * Unit tests for booking-request field validation.
 * Run: npx tsx lib/network/__tests__/validate-booking-request.test-runner.ts
 */
import assert from 'node:assert/strict'
import { validateBookingRequest } from '../validate-booking-request.js'

// Valid base payload
const valid = {
  partnerSlug: 'luel',
  founderName: 'William Namgyal',
  purpose: 'Intro call to discuss seed round fit',
  details: 'We are pre-seed, B2B SaaS, $15k MRR.',
}

// Passes on valid input
assert.deepEqual(validateBookingRequest(valid), { ok: true })

// partnerSlug: required
assert.deepEqual(
  validateBookingRequest({ ...valid, partnerSlug: '' }),
  { ok: false, field: 'partnerSlug', error: 'Partner is required.' }
)

// partnerSlug: too long
assert.deepEqual(
  validateBookingRequest({ ...valid, partnerSlug: 'a'.repeat(101) }),
  { ok: false, field: 'partnerSlug', error: 'Partner identifier is too long.' }
)

// founderName: required
assert.deepEqual(
  validateBookingRequest({ ...valid, founderName: '' }),
  { ok: false, field: 'founderName', error: 'Contact name is required.' }
)

// founderName: too long
assert.deepEqual(
  validateBookingRequest({ ...valid, founderName: 'a'.repeat(201) }),
  { ok: false, field: 'founderName', error: 'Contact name is too long.' }
)

// purpose: too short
assert.deepEqual(
  validateBookingRequest({ ...valid, purpose: 'Hi' }),
  { ok: false, field: 'purpose', error: 'Please add a purpose (at least 3 characters).' }
)

// purpose: too long
assert.deepEqual(
  validateBookingRequest({ ...valid, purpose: 'a'.repeat(201) }),
  { ok: false, field: 'purpose', error: 'Purpose must be 200 characters or fewer.' }
)

// details: undefined is fine
assert.deepEqual(
  validateBookingRequest({ ...valid, details: undefined }),
  { ok: true }
)

// details: too long
assert.deepEqual(
  validateBookingRequest({ ...valid, details: 'a'.repeat(1001) }),
  { ok: false, field: 'details', error: 'Additional details must be 1000 characters or fewer.' }
)

console.log('validate-booking-request: all tests passed ✓')
```

- [ ] **Step 3.2: Run the test — expect it to fail**

```bash
npx tsx lib/network/__tests__/validate-booking-request.test-runner.ts
```

Expected: `Error: Cannot find module '../validate-booking-request.js'` (or similar). This confirms the test is wired correctly before the implementation exists.

- [ ] **Step 3.3: Implement the validation utility**

Create `lib/network/validate-booking-request.ts`:

```typescript
export type BookingRequestInput = {
  partnerSlug: unknown
  founderName: unknown
  purpose: unknown
  details?: unknown
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; field: string; error: string }

/**
 * Pure validation for POST /api/network/booking-request.
 * All string inputs are expected to already be trimmed by the caller.
 */
export function validateBookingRequest(input: BookingRequestInput): ValidationResult {
  const { partnerSlug, founderName, purpose, details } = input

  if (typeof partnerSlug !== 'string' || partnerSlug.length === 0) {
    return { ok: false, field: 'partnerSlug', error: 'Partner is required.' }
  }
  if (partnerSlug.length > 100) {
    return { ok: false, field: 'partnerSlug', error: 'Partner identifier is too long.' }
  }

  if (typeof founderName !== 'string' || founderName.length === 0) {
    return { ok: false, field: 'founderName', error: 'Contact name is required.' }
  }
  if (founderName.length > 200) {
    return { ok: false, field: 'founderName', error: 'Contact name is too long.' }
  }

  if (typeof purpose !== 'string' || purpose.length < 3) {
    return { ok: false, field: 'purpose', error: 'Please add a purpose (at least 3 characters).' }
  }
  if (purpose.length > 200) {
    return { ok: false, field: 'purpose', error: 'Purpose must be 200 characters or fewer.' }
  }

  if (details !== undefined && details !== null) {
    if (typeof details !== 'string') {
      return { ok: false, field: 'details', error: 'Additional details must be a string.' }
    }
    if (details.length > 1000) {
      return { ok: false, field: 'details', error: 'Additional details must be 1000 characters or fewer.' }
    }
  }

  return { ok: true }
}
```

- [ ] **Step 3.4: Run the test — expect it to pass**

```bash
npx tsx lib/network/__tests__/validate-booking-request.test-runner.ts
```

Expected: `validate-booking-request: all tests passed ✓`

- [ ] **Step 3.5: Commit**

```bash
git add lib/network/validate-booking-request.ts lib/network/__tests__/validate-booking-request.test-runner.ts
git commit -m "feat(network): add booking-request validation utility with tests"
```

---

## Task 4: Extend `partner-resources.ts` with `calendlyUrl`

**Files:**
- Modify: `lib/partner-resources.ts`

- [ ] **Step 4.1: Add `calendlyUrl` to the `PartnerFounderPreview` type**

In `lib/partner-resources.ts`, find the `PartnerFounderPreview` type. The current last field before the closing `}` is `locationLine?: string`. Add the new field after it:

```typescript
export type PartnerFounderPreview = {
  name: string
  imageSrc: string
  imageAlt: string
  roleLine: string
  tag: string
  founderKey?: ResourcePartnerFounderKey
  linkedInUrl?: string
  phone?: string
  locationLine?: string
  /**
   * Calendly scheduling URL for this contact.
   * When set, the "Book" button uses the CalendarBooking flow
   * (pre-booking form → Calendly popup) instead of the legacy text modal.
   * Must be a real Calendly URL before deploying to production.
   */
  calendlyUrl?: string
}
```

- [ ] **Step 4.2: Add placeholder `calendlyUrl` values to existing partners**

In the `RESOURCE_PARTNERS` array, update the `foundersPreview` entries to include `calendlyUrl`. Use `undefined` (omit the field) for partners without a Calendly link. For partners that should support booking, add a clearly-marked placeholder:

For William Namgyal in the `luel` partner entry:
```typescript
{
  name: 'William Namgyal',
  imageSrc: '/yc-insider/william-namgyal.png',
  imageAlt: 'William Namgyal',
  roleLine: 'Co-Founder & CEO, Luel (YC W26). Berkeley M.E.T. dropout.',
  tag: 'Product + Strategy',
  founderKey: 'william',
  linkedInUrl: 'https://www.linkedin.com/in/william-namgyal/',
  // TODO: Replace with real Calendly URL from partner before going live
  // calendlyUrl: 'https://calendly.com/william-namgyal/nexus-intro',
},
```

For Inigo Lenderking:
```typescript
{
  name: 'Inigo Lenderking',
  imageSrc: '/yc-insider/inigo-lenderking.png',
  imageAlt: 'Inigo Lenderking',
  roleLine: 'Co-Founder & COO, Luel (YC W26). Berkeley dropout.',
  tag: 'COO + Operations',
  founderKey: 'inigo',
  linkedInUrl: 'https://www.linkedin.com/in/ingolenderking/',
  // TODO: Replace with real Calendly URL from partner before going live
  // calendlyUrl: 'https://calendly.com/inigo-lenderking/nexus-intro',
},
```

For Calvin Tampubolon (Transworld) — no `calendlyUrl`, phone is the contact method:
```typescript
{
  name: 'Calvin Tampubolon',
  imageSrc: '/network-partners/calvin-tampubolon.png',
  imageAlt: 'Calvin Tampubolon',
  roleLine: 'Managing Partner. Business brokerage, M&A, and exit consulting; franchise owner; board member.',
  tag: 'Los Angeles metro',
  phone: '(800) 205-7605',
  locationLine: 'Los Angeles metropolitan area',
  // No calendlyUrl — contact via phone
},
```

**Note:** The `calendlyUrl` lines are commented out intentionally. When a partner provides their real Calendly link, uncomment and replace the placeholder URL. The Book button only renders the Calendly flow when `calendlyUrl` is set (truthy) on the founder entry.

- [ ] **Step 4.3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 4.4: Commit**

```bash
git add lib/partner-resources.ts
git commit -m "feat(network): add calendlyUrl field to PartnerFounderPreview type"
```

---

## Task 5: `CalendlyLoader` Component

**Files:**
- Create: `components/calendly-loader.tsx`

- [ ] **Step 5.1: Create the component**

Create `components/calendly-loader.tsx`:

```typescript
'use client'

import Script from 'next/script'
import { useEffect } from 'react'

/**
 * Injects the Calendly popup widget script and stylesheet.
 * Rendered once on partner hub pages. Uses lazyOnload so it never
 * blocks page rendering. If window.Calendly is undefined when the
 * Book button is clicked, InvestorBookingModal falls back to opening
 * the Calendly URL in a new tab.
 */
export function CalendlyLoader() {
  useEffect(() => {
    if (document.querySelector('link[data-calendly-css]')) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://assets.calendly.com/assets/external/widget.css'
    link.setAttribute('data-calendly-css', '1')
    document.head.appendChild(link)
  }, [])

  return (
    <Script
      src="https://assets.calendly.com/assets/external/widget.js"
      strategy="lazyOnload"
    />
  )
}
```

- [ ] **Step 5.2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 5.3: Commit**

```bash
git add components/calendly-loader.tsx
git commit -m "feat(network): add CalendlyLoader component for lazy Calendly widget injection"
```

---

## Task 6: `InvestorBookingModal` Component

**Files:**
- Create: `components/investor-booking-modal.tsx`

This is the pre-booking form. On submit it calls the API, then triggers the Calendly popup.

- [ ] **Step 6.1: Create the component**

Create `components/investor-booking-modal.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast-simple'

export type InvestorBookingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerSlug: string
  founderName: string
  /** Shown under the name in the modal header for context. */
  founderRole: string
  calendlyUrl: string
}

export function InvestorBookingModal({
  open,
  onOpenChange,
  partnerSlug,
  founderName,
  founderRole,
  calendlyUrl,
}: InvestorBookingModalProps) {
  const [purpose, setPurpose] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const purposeRef = useRef<HTMLInputElement>(null)

  // Reset fields when modal opens/closes
  useEffect(() => {
    if (!open) {
      setPurpose('')
      setDetails('')
      setSubmitting(false)
    } else {
      // Auto-focus purpose input on next tick
      setTimeout(() => purposeRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onOpenChange(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, submitting, onOpenChange])

  if (!open) return null

  const purposeTrimmed = purpose.trim()
  const canSubmit = purposeTrimmed.length >= 3 && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/network/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          partnerSlug,
          founderName,
          purpose: purposeTrimmed,
          details: details.trim() || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg =
          res.status === 429
            ? "You've submitted several requests recently. Please wait before booking again."
            : res.status === 403
            ? 'Network access is required to book meetings.'
            : res.status === 401
            ? 'Your session expired. Please sign in again.'
            : typeof data.error === 'string'
            ? data.error
            : 'Could not save your request. Please try again.'
        toast.error(msg)
        return
      }

      const bookingId: string = typeof data.bookingId === 'string' ? data.bookingId : ''
      const sep = calendlyUrl.includes('?') ? '&' : '?'
      const enrichedUrl = bookingId
        ? `${calendlyUrl}${sep}utm_content=${encodeURIComponent(bookingId)}`
        : calendlyUrl

      onOpenChange(false)

      if (typeof window !== 'undefined' && window.Calendly) {
        window.Calendly.initPopupWidget({ url: enrichedUrl })
      } else {
        window.open(enrichedUrl, '_blank', 'noopener,noreferrer')
        toast.info('Opening the scheduler in a new tab...')
      }
    } catch {
      toast.error('Could not save your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="investor-booking-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={() => !submitting && onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl sm:p-6">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id="investor-booking-title"
              className="text-lg font-semibold text-zinc-50"
            >
              Book a meeting with {founderName}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">{founderRole}</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => !submitting && onOpenChange(false)}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4 rounded-lg border border-zinc-700/80 bg-zinc-950/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Before scheduling
            </p>

            {/* Purpose */}
            <div className="space-y-1.5">
              <Label
                htmlFor="booking-purpose"
                className="text-zinc-200"
              >
                What&apos;s the purpose of this meeting?{' '}
                <span className="text-zinc-500">(required)</span>
              </Label>
              <Input
                id="booking-purpose"
                ref={purposeRef}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value.slice(0, 200))}
                placeholder="e.g. Intro call to discuss seed round fit"
                className="border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-500/50"
                disabled={submitting}
                maxLength={200}
                autoComplete="off"
              />
              {purpose.length > 150 && (
                <p className="text-right text-xs text-zinc-500">
                  {purpose.length}/200
                </p>
              )}
            </div>

            {/* Details */}
            <div className="space-y-1.5">
              <Label
                htmlFor="booking-details"
                className="text-zinc-200"
              >
                Additional details{' '}
                <span className="text-zinc-500">(optional)</span>
              </Label>
              <Textarea
                id="booking-details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                placeholder="Company stage, specific questions, anything helpful for context"
                className="border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-500/50"
                rows={4}
                disabled={submitting}
                maxLength={1000}
              />
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            After saving, you&apos;ll pick a time directly in the scheduling
            window. You&apos;ll receive a calendar invite once confirmed.
          </p>

          <Button
            type="submit"
            className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            disabled={!canSubmit}
          >
            {submitting ? 'Saving…' : 'Continue to scheduling →'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 6.2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 6.3: Commit**

```bash
git add components/investor-booking-modal.tsx
git commit -m "feat(network): add InvestorBookingModal pre-booking form with Calendly popup trigger"
```

---

## Task 7: API Route — `POST /api/network/booking-request`

**Files:**
- Create: `app/api/network/booking-request/route.ts`

- [ ] **Step 7.1: Create the route**

Create the directory and file `app/api/network/booking-request/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { canAccessFounderNetwork } from '@/lib/founder-network-access'
import { getResourcePartner } from '@/lib/partner-resources'
import { validateBookingRequest } from '@/lib/network/validate-booking-request'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Network access check (same criteria as ensureFounderNetworkPageAccess)
    const [uc, approval, investor] = await Promise.all([
      db.userCredits.findUnique({
        where: { userId: user.id },
        select: { isPremium: true, purchases: true },
      }),
      db.userApproval.findUnique({
        where: { email: user.email },
        select: { status: true },
      }),
      db.investor.findUnique({
        where: { email: user.email },
        select: { verified: true },
      }),
    ])

    if (
      !canAccessFounderNetwork({
        isPremium: Boolean(uc?.isPremium),
        purchasesJson: uc?.purchases ?? null,
        email: user.email,
        userApprovalStatus: approval?.status ?? null,
        investorVerified: Boolean(investor?.verified),
      })
    ) {
      return NextResponse.json(
        { error: 'Network access required to book meetings.' },
        { status: 403 }
      )
    }

    // 3. Rate limit: max 5 booking requests per user per 24 hours
    const recentCount = await db.networkMeetingBooking.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      },
    })
    if (recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Too many booking requests. Please wait before submitting another.' },
        { status: 429 }
      )
    }

    // 4. Parse and validate body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const raw = body as Record<string, unknown>

    // Trim strings before validation
    const partnerSlug =
      typeof raw.partnerSlug === 'string' ? raw.partnerSlug.trim() : ''
    const founderName =
      typeof raw.founderName === 'string' ? raw.founderName.trim() : ''
    const purpose =
      typeof raw.purpose === 'string' ? raw.purpose.trim() : ''
    const details =
      typeof raw.details === 'string' ? raw.details.trim() : undefined

    const validation = validateBookingRequest({
      partnerSlug,
      founderName,
      purpose,
      details,
    })

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // 5. Validate partnerSlug exists in our registry
    if (!getResourcePartner(partnerSlug)) {
      return NextResponse.json(
        { error: 'Unknown partner.' },
        { status: 400 }
      )
    }

    // 6. Create the booking record
    const booking = await db.networkMeetingBooking.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        partnerSlug,
        founderName,
        purpose,
        details: details && details.length > 0 ? details : null,
        status: 'pending_calendar',
      },
    })

    return NextResponse.json({ success: true, bookingId: booking.id })
  } catch (error) {
    logger.error('[NETWORK-BOOKING-REQUEST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 7.2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 7.3: Spot-check the route manually**

Start the dev server if it isn't running:
```bash
npm run dev
```

Then in another terminal, verify the 401 path (no session):
```bash
curl -s -X POST http://localhost:3000/api/network/booking-request \
  -H "Content-Type: application/json" \
  -d '{"partnerSlug":"luel","founderName":"William Namgyal","purpose":"Test"}' | cat
```
Expected: `{"error":"Unauthorized"}`

- [ ] **Step 7.4: Commit**

```bash
git add app/api/network/booking-request/route.ts
git commit -m "feat(api): add POST /api/network/booking-request with auth, access, rate-limit, and DB write"
```

---

## Task 8: Wire Up `partner-resources-client.tsx`

This task modifies the existing partner hub client component to integrate the new modal, loader, and button logic.

**Files:**
- Modify: `app/founder/network/partner-resources-client.tsx`

- [ ] **Step 8.1: Add new imports**

At the top of `app/founder/network/partner-resources-client.tsx`, add two imports after the existing imports:

```typescript
import { InvestorBookingModal } from '@/components/investor-booking-modal'
import { CalendlyLoader } from '@/components/calendly-loader'
```

Also add `PartnerFounderPreview` to the import from `@/lib/partner-resources` (it's needed for the `openCalendarBooking` function signature):

The existing import line is:
```typescript
import { getResourcePartner } from '@/lib/partner-resources'
```

Change it to:
```typescript
import { getResourcePartner, type PartnerFounderPreview } from '@/lib/partner-resources'
```

- [ ] **Step 8.2: Add `bookingModal` state**

Immediately after the existing state declarations near the top of the `PartnerResourcesClient` function (after `const [requestModal, setRequestModal] = useState<...>(...)`), add:

```typescript
const [bookingModal, setBookingModal] = useState<{
  open: boolean
  partnerSlug: string
  founderName: string
  founderRole: string
  calendlyUrl: string
} | null>(null)
```

- [ ] **Step 8.3: Add `openCalendarBooking` function**

Immediately after the existing `openFounderRequest` function, add:

```typescript
const openCalendarBooking = (f: PartnerFounderPreview, partnerSlug: string) => {
  if (!f.calendlyUrl) return
  setBookingModal({
    open: true,
    partnerSlug,
    founderName: f.name,
    founderRole: f.roleLine,
    calendlyUrl: f.calendlyUrl,
  })
}
```

- [ ] **Step 8.4: Render `<CalendlyLoader />` and `<InvestorBookingModal />`**

Find the opening `<div>` of the return statement:

```tsx
return (
  <div className="min-h-screen bg-zinc-950 text-zinc-100">
    <YcInsiderFounderRequestModal
```

Add the new components immediately after the opening `<div>` tag, before `<YcInsiderFounderRequestModal>`:

```tsx
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
```

- [ ] **Step 8.5: Update the "Book" button for founders with `calendlyUrl`**

Find the section that renders the Book button for founders with `founderKey`. It currently looks like:

```tsx
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
```

Replace it with logic that branches on `f.calendlyUrl`:

```tsx
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
```

- [ ] **Step 8.6: Update the Premium upsell card description**

Find the `<CardDescription>` in the Premium upsell card (the card with `<Lock />` icon and title "Premium unlocks mentorship"). It currently reads:

```
Premium: full founder profiles, LinkedIn, Ask / Book, and every playbook below at no extra charge.
Without Premium, browse module descriptions and unlock each section from your balance, or buy the bundle.
```

Change just the first sentence:

```tsx
<CardDescription className="text-zinc-400">
  Premium: full founder profiles, LinkedIn, Ask questions directly, and every playbook below at no extra charge.
  Meeting bookings are open to all approved network members.
  Without Premium, browse module descriptions and unlock each section from your balance, or buy the bundle.
</CardDescription>
```

- [ ] **Step 8.7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 new errors.

- [ ] **Step 8.8: Commit**

```bash
git add app/founder/network/partner-resources-client.tsx
git commit -m "feat(network): wire InvestorBookingModal and CalendlyLoader into partner hub; update Book button logic"
```

---

## Task 9: Final Verification

- [ ] **Step 9.1: Run the validation test suite**

```bash
npx tsx lib/network/__tests__/validate-booking-request.test-runner.ts
```

Expected: `validate-booking-request: all tests passed ✓`

- [ ] **Step 9.2: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 new errors introduced by this feature.

- [ ] **Step 9.3: Start dev server and load the network hub**

```bash
npm run dev
```

Navigate to `http://localhost:3000/founder/network/luel` (as a logged-in network member).

Verify:
- [ ] Page loads without errors
- [ ] The Book button renders for founders (William, Inigo)
- [ ] Clicking Book opens the `InvestorBookingModal` (not the old `YcInsiderFounderRequestModal`)
- [ ] The modal header shows `"Book a meeting with William Namgyal"` and the role line
- [ ] CTA is disabled when purpose is empty
- [ ] CTA is enabled after typing 3+ chars in purpose
- [ ] Ask button still opens the `YcInsiderFounderRequestModal` for Premium users (unchanged)
- [ ] Transworld hub (`/founder/network/transworld`) shows phone link, no Book button — unchanged

- [ ] **Step 9.4: Test the API route directly**

With the dev server running, test as an authenticated user by calling the API from the browser console on a page where you're logged in:

```javascript
fetch('/api/network/booking-request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    partnerSlug: 'luel',
    founderName: 'William Namgyal',
    purpose: 'Intro call to discuss seed round fit',
    details: 'Pre-seed B2B SaaS, $15k MRR.',
  }),
}).then(r => r.json()).then(console.log)
```

Expected: `{ success: true, bookingId: "clXXXXXXXX..." }`

Then confirm the DB row exists:

```bash
npx prisma studio
```

Open `NetworkMeetingBooking` table — the new row should be there with `status: "pending_calendar"`.

- [ ] **Step 9.5: Activate a real Calendly URL and test the popup**

When a partner provides their real Calendly URL, uncomment it in `lib/partner-resources.ts`. Then test end-to-end:

1. Click "Book" on the partner's profile
2. Fill purpose field, click "Continue to scheduling →"
3. Calendly popup opens (overlaid on page)
4. Select a time slot and complete the Calendly flow
5. Both parties receive calendar invites from Calendly
6. `NetworkMeetingBooking` row has `status: "pending_calendar"` (will become `"scheduled"` once webhooks are implemented)

- [ ] **Step 9.6: Add the new test script to `package.json`**

In `package.json`, find the `"scripts"` section and add:

```json
"test:network-booking": "tsx lib/network/__tests__/validate-booking-request.test-runner.ts"
```

Place it alongside the other `test:*` entries.

- [ ] **Step 9.7: Final commit**

```bash
git add package.json
git commit -m "chore: register test:network-booking script in package.json"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by task |
|-----------------|----------------|
| `NetworkMeetingBooking` Prisma model | Task 1 |
| `User.networkMeetingBookings` relation | Task 1 |
| `types/calendly.d.ts` | Task 2 |
| `calendlyUrl?: string` on `PartnerFounderPreview` | Task 4 |
| `CalendlyLoader` component | Task 5 |
| `InvestorBookingModal` component with all fields/states | Task 6 |
| API route auth check | Task 7 |
| API route network access check | Task 7 |
| API route rate limiting (5/24h) | Task 7 |
| API route validation (uses `validateBookingRequest`) | Tasks 3 + 7 |
| API route `partnerSlug` registry check | Task 7 |
| `bookingId` returned in API response | Task 7 |
| `utm_content=bookingId` in Calendly URL | Task 6 |
| Calendly fallback to new tab if `window.Calendly` undefined | Task 6 |
| Book button no longer Premium-gated when `calendlyUrl` set | Task 8 |
| Legacy Ask/Book flow unchanged for `founderKey`-only founders | Task 8 |
| Premium upsell card text updated | Task 8 |
| `YCInsiderFounderRequest` table unchanged | (zero changes) |
| `yc-insider/founder-request` route unchanged | (zero changes) |
| Calendly CSS injected once via `useEffect` | Task 5 |

All 20 spec requirements are covered. No gaps.

**Placeholder scan:** No "TBD", "TODO", "implement later", or incomplete steps found.

**Type consistency check:**
- `InvestorBookingModalProps.founderRole` → set in `openCalendarBooking` as `f.roleLine` (Task 8) — consistent.
- `validateBookingRequest` defined in Task 3, imported in Task 7 as `@/lib/network/validate-booking-request` — consistent path.
- `PartnerFounderPreview` type extended in Task 4 with `calendlyUrl?: string`, used in Task 8 as `f.calendlyUrl` — consistent.
- `db.networkMeetingBooking` (lowercase camel) is the Prisma client accessor for `model NetworkMeetingBooking` — this is Prisma's standard convention.
- `bookingId` returned from API (Task 7) consumed in modal (Task 6) as `data.bookingId` — consistent.
