/**
 * Browser storage keys for NEXUS. Legacy `fm_*` keys are still read or removed for migration.
 */
export const CLIENT_STORAGE = {
  PENDING_VERIFY_EMAIL: 'nexus_pending_verify_email',
  PENDING_VERIFY_EMAIL_LEGACY: 'fm_pending_verify_email',
  USER_EMAIL: 'nexus_user_email',
  USER_EMAIL_LEGACY: 'fm_user_email',
  LOGGED_IN: 'nexus_logged_in',
  LOGGED_IN_LEGACY: 'fm_logged_in',
  ONBOARDING_DRAFT: 'nexus_onboarding_draft',
  ONBOARDING_DRAFT_LEGACY: 'fm_onboarding_draft',
} as const
