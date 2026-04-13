/**
 * Application-wide constants
 * Centralized configuration values to avoid magic numbers and strings
 */

// Admin: set ADMIN_EMAIL in .env (comma-separated for multiple). No baked-in default — unset means no admin emails.
// Client UI should use /api/auth/check `isAdmin`.
function parseAdminEmails(): { ordered: string[]; set: Set<string> } {
  const raw = process.env.ADMIN_EMAIL ?? ''
  const ordered: string[] = []
  const set = new Set<string>()
  for (const part of raw.split(',')) {
    const e = part.trim().toLowerCase()
    if (e.includes('@') && !set.has(e)) {
      set.add(e)
      ordered.push(e)
    }
  }
  return { ordered, set }
}

const { ordered: adminEmailsOrdered, set: adminEmailSet } = parseAdminEmails()

/** Env order (deduped); used when resolving an admin DB user without a session. */
export const ADMIN_EMAILS_ORDERED: readonly string[] = adminEmailsOrdered

/** First admin in the list (legacy); use isAdminEmail() for access checks. */
export const ADMIN_EMAIL: string | undefined =
  adminEmailsOrdered.length > 0 ? adminEmailsOrdered[0] : undefined

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmailSet.has(email.trim().toLowerCase())
}

// Credit Costs for AI Analysis Features
export const CREDIT_COSTS = {
  PITCH_IDEA: 15,
  PITCH_DECK: 30, // Fixed: was 50, should be 30
  UNIFIED_PITCH: 50,
  VIDEO_PITCH: {
    REGULAR: 50,
    REVIEWER: 100,
  },
  FOUNDER_FEEDBACK: 200,
  UNLOCK_TOP_MATCHES: 0,
  RESUME_ANALYSIS: 25, // Note: Feature is disabled but keeping for reference
} as const

// File Upload Limits
export const FILE_LIMITS = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['.png', '.jpg', '.jpeg', '.pdf'],
  ALLOWED_VIDEO_TYPES: ['.mp4', '.mov', '.avi', '.webm'],
  ALLOWED_DOCUMENT_TYPES: ['.pdf', '.doc', '.docx'],
} as const

// API Configuration
export const API_CONFIG = {
  DEFAULT_TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
} as const

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const

// User Limits
export const USER_LIMITS = {
  FREE_TIER_VC_MATCHES: 5,
  PREMIUM_TIER_VC_MATCHES: 20,
  /** Pitch idea analyses per UTC week (Mon 00:00) without spending credits; non-premium only. */
  FREE_PITCH_IDEA_ANALYSES_PER_WEEK: 2,
  MIN_AGE: 16,
  MAX_AGE: 100,
} as const

// Validation Constants
export const VALIDATION = {
  MIN_PHONE_LENGTH: 7,
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 5000,
} as const

// Feature Flags (for future use)
export const FEATURES = {
  RESUME_ANALYSIS_ENABLED: false,
  VIDEO_PITCH_ENABLED: true,
  PITCH_DECK_ENABLED: true,
  PITCH_IDEA_ENABLED: true,
} as const

// Error Messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  INVALID_INPUT: 'Invalid input',
  INSUFFICIENT_CREDITS: 'Insufficient credits',
  FILE_TOO_LARGE: 'File too large',
  INVALID_FILE_TYPE: 'Invalid file type',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully',
  ANALYSIS_COMPLETE: 'Analysis complete',
  CREDITS_DEDUCTED: 'Credits deducted successfully',
} as const


