/** Client-safe copy (no Resend SDK). Import from here in `use client` components. */
export const RESEND_TESTING_MODE_PUBLIC_MESSAGE =
  'Sign-in email could not be sent. Your Resend project is in test mode: it only delivers to the email on that Resend account until you verify a domain at resend.com/domains and set RESEND_FROM_EMAIL to an address on that domain.'

export const RESEND_DEV_CONSOLE_FALLBACK_HINT =
  'No email was sent (Resend test mode). Check the terminal where you ran the dev server; the magic link and verification code are printed there.'
