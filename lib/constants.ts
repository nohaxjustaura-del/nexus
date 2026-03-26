/**
 * Application-wide constants
 * Centralized configuration values to avoid magic numbers and strings
 */

// Admin: set ADMIN_EMAIL in .env (comma-separated for multiple). Used server-side; client UI should use /api/auth/check `isAdmin`.
const DEFAULT_ADMIN_EMAIL = 'nohaxjustaura@gmail.com'

function buildAdminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL
  const set = new Set<string>()
  for (const part of raw.split(',')) {
    const e = part.trim().toLowerCase()
    if (e.includes('@')) set.add(e)
  }
  if (set.size === 0) set.add(DEFAULT_ADMIN_EMAIL.toLowerCase())
  return set
}

const adminEmailSet = buildAdminEmailSet()

/** First admin in the list (legacy); use isAdminEmail() for access checks. */
export const ADMIN_EMAIL = [...adminEmailSet][0]!

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmailSet.has(email.trim().toLowerCase())
}

// Credit Costs for AI Analysis Features
export const CREDIT_COSTS = {
  PITCH_IDEA: 15,
  PITCH_DECK: 30, // Fixed: was 50, should be 30
  VIDEO_PITCH: {
    REGULAR: 50,
    REVIEWER: 100,
  },
  FOUNDER_FEEDBACK: 200,
  UNLOCK_TOP_MATCHES: 10,
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


