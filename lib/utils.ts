import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}M`
  }
  return `$${amount}K`
}

/**
 * Format a check-size value into a human-readable string like "$500K" or "$5M".
 *
 * The DB stores check sizes in two fields with different units:
 *   checkMin/checkMax   – in thousands  (500 = $500K)
 *   checkSizeMin/Max    – whole dollars  (500000 = $500K)
 *
 * API code often merges them via `checkMin || checkSizeMin`, so the caller
 * may not know which convention a value follows.  Values >= 10 000 are treated
 * as whole dollars; smaller values as thousands.
 */
export function fmtCheckSize(val: number | null | undefined): string {
  if (val == null || val <= 0) return '$0'
  if (val >= 10_000) {
    if (val >= 1_000_000) {
      const m = val / 1_000_000
      return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
    }
    return `$${Math.round(val / 1_000)}K`
  }
  if (val >= 1_000) {
    const m = val / 1_000
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  return `$${val}K`
}

/** Format a min–max check-size range. */
export function fmtCheckRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  const a = fmtCheckSize(min)
  const b = fmtCheckSize(max)
  if (a === '$0' && b === '$0') return 'N/A'
  if (a === '$0') return `Up to ${b}`
  if (b === '$0') return `From ${a}`
  if (a === b) return a
  return `${a}–${b}`
}

export function parseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

/**
 * Parse Investor `stages` / `sectors` / similar: may be JSON array, JSON string, CSV, or plain text.
 * Never throws; always returns a string[] safe for `.map()`.
 */
export function parseStringArray(value: string | null | undefined, fallback: string[] = []): string[] {
  if (value == null) return fallback
  const s = String(value).trim()
  if (!s) return fallback
  try {
    const parsed = JSON.parse(s) as unknown
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x) => x != null && String(x).trim() !== '')
        .map((x) => String(x).trim())
    }
    if (typeof parsed === 'string' && parsed.trim()) {
      return [parsed.trim()]
    }
    if (parsed != null && typeof parsed === 'object') {
      return fallback
    }
  } catch {
    // not JSON — treat as raw
  }
  if (s.includes(',')) {
    return s
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
  }
  return [s]
}

