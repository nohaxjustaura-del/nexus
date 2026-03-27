/** Client-safe copy (no Resend SDK). Import from here in `use client` components. */
export const RESEND_TESTING_MODE_PUBLIC_MESSAGE =
  'Sign-in email could not be sent. Your Resend project is in test mode: it only delivers to the email on that Resend account until you verify a domain at resend.com/domains and set RESEND_FROM_EMAIL to an address on that domain.'

export const RESEND_DEV_CONSOLE_FALLBACK_HINT =
  'No Resend API key is set, so nothing was emailed. If you run the app locally, open the terminal where `next dev` is running—the magic link is printed there. For production, set RESEND_API_KEY or rely on Supabase Auth email (SMTP) when Resend is not configured.'
