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
