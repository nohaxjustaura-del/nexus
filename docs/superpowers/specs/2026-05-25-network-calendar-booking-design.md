# Network Calendar Booking — Design Spec

**Date:** 2026-05-25  
**Status:** Approved for implementation planning  
**Scope:** Founder-side calendar booking flow on `/founder/network` partner hubs. Founders can request a meeting with any network partner/investor by filling a short pre-booking form, then picking a time via Calendly's popup widget.  
**Explicitly out of scope:** Admin calendar management UI, investor-side Calendly account setup, Calendly webhook processing, real-time availability sync, changes to the Ask flow or YC playbook modules.

---

## 1. Problem Statement

The existing "Book" button on partner hubs (`/founder/network/[slug]`) opens a text-only modal that collects a topic, timezone string, and free-text message — then fires an email to admins, who manually coordinate scheduling. There is no date/time selection; the founder has no visibility into when the meeting will actually happen. This creates friction and delays.

The goal is to replace this with a **seamless two-step flow**: a lightweight pre-booking form (purpose + details) followed immediately by Calendly's popup widget, where the founder picks a real date and time. Calendly handles calendar invites, reminders, and confirmations natively. Our platform logs the pre-booking intent for admin visibility.

---

## 2. Goals and Success Criteria

| Goal | Measure |
|------|---------|
| Founders can pick a real date/time in-app | Calendly popup opens within the same session, no redirect |
| Pre-booking context is captured | `NetworkMeetingBooking` row created before popup opens |
| Available to all approved network members | Non-premium approved users can book |
| Ask flow and playbook modules unchanged | Zero regression in existing YC insider request flow |
| Admin retains visibility | `NetworkMeetingBooking` table queryable; future admin page |

### Non-goals
- Automated calendar sync back to NEXUS
- Calendly webhook processing (deferred to future iteration)
- Building a custom availability grid
- Any UI changes to the `/founder/network` index page
- Changes to `lib/matching/`, investor profiles, or AI analysis

---

## 3. Architecture Overview

```
Founder clicks "Book"
        │
        ▼
InvestorBookingModal opens
  [Purpose (required)]
  [Details (optional)]
        │
        ▼ submit
POST /api/network/booking-request
  ├─ Auth check (getCurrentUser)
  ├─ Network access check (canAccessFounderNetwork)
  ├─ Validate fields
  └─ Create NetworkMeetingBooking (status: pending_calendar)
        │
        ▼ { success: true, bookingId }
Modal closes
        │
        ▼
window.Calendly.initPopupWidget({
  url: calendlyUrl + '?utm_content=' + bookingId
})
        │
        ▼
Calendly popup opens (overlay on page)
Founder selects date + time
Calendly sends its own confirmation emails
```

The Calendly `utm_content` parameter embeds our `bookingId` into every Calendly event. When we implement webhooks in a future iteration, we can match Calendly events back to `NetworkMeetingBooking` rows via that field.

---

## 4. Data Model

### 4.1 New Prisma model: `NetworkMeetingBooking`

A clean, purpose-built model that is not conflated with `YCInsiderFounderRequest`. The YC insider table is left completely untouched.

```prisma
model NetworkMeetingBooking {
  id          String  @id @default(cuid())
  userId      String
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  userEmail   String

  /// Matches ResourcePartner.slug (e.g. "luel", "transworld")
  partnerSlug String  @db.VarChar(100)
  /// Display name of the person being booked (e.g. "William Namgyal")
  founderName String  @db.VarChar(200)

  /// Required: short purpose the founder entered (≤200 chars)
  purpose     String  @db.VarChar(200)
  /// Optional: longer additional context (≤1000 chars)
  details     String? @db.Text

  /// Calendly event URI, populated by webhook handler in a future iteration
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

A migration is required: `npx prisma migrate dev --name add_network_meeting_booking`.

The `User` model in `schema.prisma` must also gain a `networkMeetingBookings` relation field:
```prisma
networkMeetingBookings NetworkMeetingBooking[]
```

### 4.2 No changes to `YCInsiderFounderRequest`

The existing table, API route, and email flows are preserved exactly as they are. The new booking flow uses its own table.

---

## 5. `partner-resources.ts` Changes

### 5.1 `PartnerFounderPreview` — new optional field

```typescript
export type PartnerFounderPreview = {
  // ... existing fields ...

  /**
   * Calendly scheduling link for this contact.
   * When present, the "Book" button uses the new CalendarBooking flow
   * (pre-booking form → Calendly popup).
   * When absent, the button falls back to the legacy YcInsiderFounderRequestModal.
   */
  calendlyUrl?: string
}
```

### 5.2 Populate `calendlyUrl` per founder

Each `PartnerFounderPreview` entry in `RESOURCE_PARTNERS` that should support calendar booking gets a `calendlyUrl`. Partners without a Calendly account (e.g. those that only have a phone number) leave the field unset — the UI renders a phone link instead, unchanged.

Example (values are placeholder URLs until real Calendly links are provided by each partner):
```typescript
{
  name: 'William Namgyal',
  calendlyUrl: 'https://calendly.com/william-namgyal/nexus-intro',
  // ...
}
```

**Real Calendly URLs must be provided by each partner before the feature goes live.** Placeholder URLs should not be deployed to production. The spec records this as a hard dependency.

---

## 6. New Files

### 6.1 `components/investor-booking-modal.tsx`

A client component (`'use client'`). Renders the pre-booking form and, on successful API response, triggers the Calendly popup.

**Props:**
```typescript
type InvestorBookingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerSlug: string
  founderName: string
  founderRole: string    // shown in modal header for context
  calendlyUrl: string
}
```

**State:**
- `purpose: string` — required, max 200 chars
- `details: string` — optional, max 1000 chars
- `submitting: boolean`

Character count is derived from `purpose.length` — no separate state variable needed.

**Behaviour:**
1. Modal shell is visually consistent with `YcInsiderFounderRequestModal` (dark zinc theme, backdrop blur, same max-w-lg, same close button pattern).
2. Fields reset on close (`useEffect([open])`).
3. On submit:
   - Client-side validation: purpose required, min 3 chars
   - `POST /api/network/booking-request` with `{ partnerSlug, founderName, purpose, details }`
   - On API error: `toast.error(data.error)`, stay open
   - On success: `onOpenChange(false)` → `window.Calendly?.initPopupWidget({ url: enrichedUrl })`
   - `enrichedUrl` = `calendlyUrl + (calendlyUrl.includes('?') ? '&' : '?') + 'utm_content=' + bookingId`
4. If `window.Calendly` is not yet loaded when submit succeeds, fall back to `window.open(calendlyUrl, '_blank')` and `toast.info('Opening scheduler in a new tab...')`.
5. Keyboard: `Escape` closes modal (only when not submitting).

**Form fields:**
- **Purpose** — `<Input>` with label "What's the purpose of this meeting?", placeholder "e.g. Intro call to discuss seed round fit", max 200 chars. Character counter shown when >150 chars.
- **Details** — `<Textarea>` (4 rows) with label "Additional details (optional)", placeholder "Company stage, specific questions, anything helpful for context", max 1000 chars.
- **CTA button** — "Continue to scheduling →", disabled while `purpose.trim().length < 3` or `submitting`. Shows "Saving…" during submission.

**Accessibility:**
- `role="dialog"` with `aria-modal="true"` and `aria-labelledby` on the title
- Focus trap: auto-focus the purpose input when modal opens
- All interactive elements have `aria-label` where needed

### 6.2 `components/calendly-loader.tsx`

A small client component that injects the Calendly widget script and stylesheet. Rendered once inside `partner-resources-client.tsx` so the popup is available when needed.

```typescript
'use client'

import Script from 'next/script'
import { useEffect } from 'react'

export function CalendlyLoader() {
  useEffect(() => {
    // Only inject the CSS once
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

**Why `lazyOnload`:** Defers loading until after the page is idle; the script is not needed until the user clicks Book. If the user clicks before the script loads, `window.Calendly` will be `undefined` and the fallback (new tab) handles it gracefully.

### 6.3 `types/calendly.d.ts`

TypeScript global declaration so `window.Calendly` is typed:

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

---

## 7. Modified Files

### 7.1 `app/founder/network/partner-resources-client.tsx`

**Imports added:**
- `InvestorBookingModal` from `@/components/investor-booking-modal`
- `CalendlyLoader` from `@/components/calendly-loader`

**State added:**
```typescript
const [bookingModal, setBookingModal] = useState<{
  open: boolean
  partnerSlug: string
  founderName: string
  founderRole: string
  calendlyUrl: string
} | null>(null)
```

**`openFounderRequest` function — extended, not replaced:**

The existing function handles `founderKey`-based Ask/Book (legacy Premium flow). We add a separate `openCalendarBooking` function for the new flow:

```typescript
const openCalendarBooking = (f: PartnerFounderPreview) => {
  setBookingModal({
    open: true,
    partnerSlug: partner.slug,
    founderName: f.name,
    founderRole: f.roleLine,
    calendlyUrl: f.calendlyUrl!,
  })
}
```

**Button rendering logic for each founder — updated:**

For a founder with `calendlyUrl`:
- "Book" button is **always enabled** (no Premium check). No `disabled` prop.
- `onClick` calls `openCalendarBooking(f)`

For a founder with only `founderKey` (legacy Ask/Book):
- Behaviour unchanged — Premium-gated, opens `YcInsiderFounderRequestModal`

For a founder with only a phone number (advisor hubs like Transworld):
- No "Book" button — unchanged, phone link is shown

A founder can theoretically have both `founderKey` and `calendlyUrl`. In this case:
- "Ask" button: legacy premium flow
- "Book" button: new Calendly flow (Calendly takes priority for booking)

**Premium upsell card — text update:**

Current: `"Premium: full founder profiles, LinkedIn, Ask / Book, and every playbook below at no extra charge."`

New: `"Premium: full founder profiles, LinkedIn, Ask questions directly, and every playbook below at no extra charge. Meeting bookings are open to all network members."`

**Rendered at the top of the component return:**
```tsx
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
```

### 7.2 `app/api/network/booking-request/route.ts` (new file, new API route)

```
Method: POST
Path:   /api/network/booking-request
Auth:   Required (getCurrentUser)
Access: canAccessFounderNetwork (not premium-only)
```

**Request body:**
```typescript
{
  partnerSlug: string   // max 100 chars
  founderName: string   // max 200 chars
  purpose: string       // required, 3–200 chars
  details?: string      // optional, max 1000 chars
}
```

**Validation:**
- All strings trimmed before validation
- `partnerSlug`: required, 1–100 chars, must match an entry in `RESOURCE_PARTNERS` (validated server-side via `getResourcePartner`)
- `founderName`: required, 1–200 chars
- `purpose`: required, 3–200 chars
- `details`: optional, max 1000 chars. If over limit, return 400.

**Success response:**
```typescript
{ success: true, bookingId: string }
```

**Error responses:** 401 (no session), 403 (network access denied), 400 (validation), 500 (internal).

**No email is sent** at this point. Calendly handles confirmation and calendar invites. If we later implement admin notification emails, they should be added as a non-blocking fire-and-forget, not on the critical path.

**Rate limiting:** No more than 5 booking requests per user per 24-hour window. Return 429 with `{ error: 'Too many booking requests. Please wait before submitting another.' }`. Implement with a DB count query: `count where userId = user.id AND createdAt > 24h ago`.

**Full route implementation outline:**
```typescript
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // 1. Auth
  const user = await getCurrentUser()
  if (!user) return 401

  // 2. Network access (mirrors ensureFounderNetworkPageAccess logic)
  const [uc, approval, investor] = await Promise.all([...])
  if (!canAccessFounderNetwork({...})) return 403

  // 3. Rate limit
  const recentCount = await db.networkMeetingBooking.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 86400000) } }
  })
  if (recentCount >= 5) return 429

  // 4. Parse + validate body
  const body = await request.json()
  // ... trim + validate all fields ...
  // ... validate partnerSlug against RESOURCE_PARTNERS ...

  // 5. Create record
  const booking = await db.networkMeetingBooking.create({
    data: {
      userId: user.id,
      userEmail: user.email,
      partnerSlug,
      founderName,
      purpose,
      details: details || null,
      status: 'pending_calendar',
    },
  })

  // 6. Return bookingId
  return NextResponse.json({ success: true, bookingId: booking.id })
}
```

### 7.3 `prisma/schema.prisma`

- Add `NetworkMeetingBooking` model (see §4.1)
- Add relation backref to `User` model

---

## 8. Access Control

| Action | Who can perform it |
|--------|-------------------|
| View `/founder/network` index | Network access gate (`ensureFounderNetworkPageAccess`) |
| View `/founder/network/[slug]` | Same gate |
| Click "Book" (calendar) | All users who pass the network access gate |
| Click "Ask" | Premium only (unchanged) |
| Access playbook modules | Premium or credits purchase (unchanged) |
| `POST /api/network/booking-request` | Auth + network access (not premium-only) |
| `POST /api/yc-insider/founder-request` | Auth + premium (unchanged) |

The network access gate itself (`canAccessFounderNetwork`) already allows: admins, approved users, verified investors, premium subscribers, and legacy module purchasers. The calendar booking feature inherits this exact gate — no new access criteria.

---

## 9. Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Network error during API call | `toast.error('Could not save your request. Please try again.')`, modal stays open |
| API returns 401 | `toast.error('Your session expired. Please sign in again.')`, modal stays open |
| API returns 403 | `toast.error('Network access required to book meetings.')`, modal stays open |
| API returns 429 | `toast.error('You\'ve submitted several requests recently. Please wait a bit before booking again.')` |
| API returns 400 with `error` | `toast.error(data.error)` |
| `window.Calendly` not yet loaded | `window.open(calendlyUrl, '_blank')` + `toast.info('Opening the scheduler in a new tab...')` |
| `calendlyUrl` is an empty string | Button should not render at all (guard in `partner-resources-client.tsx`) |
| Modal closed mid-form | State resets on re-open; no partial record is created (POST only happens on submit) |

---

## 10. Calendly Integration Details

### Widget loading
- Script URL: `https://assets.calendly.com/assets/external/widget.js`
- CSS URL: `https://assets.calendly.com/assets/external/widget.css`
- Loaded **only on partner hub pages** (`partner-resources-client.tsx`), not globally
- `strategy="lazyOnload"` — does not block page rendering

### Popup trigger
```typescript
window.Calendly.initPopupWidget({ url: enrichedCalendlyUrl })
```

### URL enrichment with `bookingId`
```typescript
const sep = calendlyUrl.includes('?') ? '&' : '?'
const enrichedCalendlyUrl = `${calendlyUrl}${sep}utm_content=${bookingId}`
```

Calendly passes UTM parameters through to webhook payloads. When webhook processing is implemented (future), the `utm_content` field in the Calendly event payload maps to our `NetworkMeetingBooking.id`, allowing us to set `status: 'scheduled'` and store `calendlyEventUri`.

### What Calendly handles natively
- Calendar slot availability (managed by the partner in their Calendly account)
- Calendar invites to both parties
- Confirmation emails
- Reminder emails
- Rescheduling and cancellation flows
- Timezone detection for the invitee

### Partner Calendly account requirements
Each partner who wants calendar booking enabled must:
1. Have an active Calendly account (free tier is sufficient for basic scheduling)
2. Create a booking page / event type (recommended: 30-minute "Nexus Intro Call")
3. Provide the booking page URL to NEXUS (e.g. `https://calendly.com/[handle]/nexus-intro`)
4. NEXUS adds the URL to `calendlyUrl` in `partner-resources.ts`

This is a **pre-launch dependency**. The feature must not be deployed with placeholder URLs.

---

## 11. Styling and Visual Design

The `InvestorBookingModal` follows the existing dark zinc design language used throughout the partner hub:

- Background: `bg-zinc-900`, border: `border-zinc-700`
- Backdrop: `bg-black/70 backdrop-blur-[2px]`
- Title: `text-zinc-50 text-lg font-semibold`
- Labels: `text-zinc-200`
- Input/Textarea: existing `<Input>` / `<Textarea>` components (dark theme)
- CTA button: `bg-amber-500 text-zinc-950 hover:bg-amber-400` (consistent with primary CTAs on this page)
- Close button: `text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100`
- Character counter: `text-xs text-zinc-500` (right-aligned under the purpose input, shown when `purpose.length > 150`)

The modal header includes the partner/founder name and role line so the founder has context about who they're booking with:
```
Book a meeting with William Namgyal
Co-Founder & CEO, Luel (YC W26)
```

---

## 12. Future Iterations (Out of Scope Now)

These are documented here so the implementation leaves the right hooks without over-engineering.

1. **Calendly webhooks** — A `/api/webhooks/calendly` route that receives `invitee.created` / `invitee.canceled` events, validates HMAC signature, and updates `NetworkMeetingBooking.status` and `calendlyEventUri`. The `utm_content` parameter (set to `bookingId`) is the matching key.

2. **Admin visibility** — An `/admin/network-bookings` page listing all `NetworkMeetingBooking` rows with status, partner, and founder info. The DB model and indexes support this query pattern.

3. **Booking history for founders** — A "My Meetings" tab on the founder dashboard showing past booking requests with status.

4. **Multiple Calendly event types per partner** — The `calendlyUrl` field on `PartnerFounderPreview` can hold any Calendly URL. If a partner offers multiple meeting types (intro, deep dive, office hours), a future iteration can add a selection step before the popup.

---

## 13. Testing Checklist

These are manual verification steps that must pass before the feature ships.

**Happy path:**
- [ ] Approved non-premium founder sees "Book" button enabled on a partner with `calendlyUrl`
- [ ] Clicking "Book" opens the pre-booking modal
- [ ] Purpose field under 3 chars: CTA is disabled
- [ ] Filling valid purpose enables CTA
- [ ] Submitting creates a `NetworkMeetingBooking` row with `status: 'pending_calendar'`
- [ ] Calendly popup opens after submit with `utm_content=<bookingId>` in URL
- [ ] Completing Calendly flow results in calendar invite on both sides
- [ ] Modal closes after submit and does not reopen on re-render

**Access control:**
- [ ] Unauthenticated user cannot call `POST /api/network/booking-request` (401)
- [ ] Authenticated user without network access gets 403
- [ ] Premium-only paths (Ask, playbooks) still require Premium — no regression
- [ ] Rate limit: 6th booking request in 24h returns 429

**Error handling:**
- [ ] Network failure during submit: toast error, modal stays open
- [ ] `window.Calendly` undefined: fallback to new tab + info toast
- [ ] Empty `calendlyUrl` in partner data: Book button does not render

**Legacy flow:**
- [ ] William Namgyal / Inigo Lenderking Ask/Book still works for Premium users via `YcInsiderFounderRequestModal`
- [ ] Existing `YCInsiderFounderRequest` admin email still fires correctly
- [ ] Non-premium users still see Premium upsell card on playbook hubs

**Regression:**
- [ ] `/founder/network` index page renders correctly
- [ ] Transworld hub (phone-only, `showYcPlaybookModules: false`) unchanged
- [ ] Luel hub modules and credits purchase unchanged

---

## 14. Acceptance Criteria

The feature is complete when:

1. A founder with network access (any tier) can click "Book", fill the pre-booking form, and complete a Calendly scheduling flow without leaving the app.
2. A `NetworkMeetingBooking` row is created with the correct `partnerSlug`, `founderName`, `purpose`, and `status: 'pending_calendar'` for every successful booking initiation.
3. The `bookingId` appears as `utm_content` in the Calendly popup URL.
4. No regression in the Ask flow, playbook modules, credit purchases, or Transworld contact hub.
5. All tests in §13 pass.

---

## 15. File Change Summary

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `NetworkMeetingBooking` model + `User` relation |
| `lib/partner-resources.ts` | Add `calendlyUrl?: string` to `PartnerFounderPreview` type; populate for each partner |
| `components/investor-booking-modal.tsx` | **New** — pre-booking form + Calendly popup trigger |
| `components/calendly-loader.tsx` | **New** — injects Calendly script + CSS |
| `types/calendly.d.ts` | **New** — `window.Calendly` TypeScript declaration |
| `app/api/network/booking-request/route.ts` | **New** — API endpoint for pre-booking |
| `app/founder/network/partner-resources-client.tsx` | Add `InvestorBookingModal`, `CalendlyLoader`, `openCalendarBooking`, update button logic, update upsell text |
| `components/yc-insider-founder-request-modal.tsx` | No changes |
| `app/api/yc-insider/founder-request/route.ts` | No changes |
| `lib/email.ts` | No changes |
