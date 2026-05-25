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
