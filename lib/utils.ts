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

