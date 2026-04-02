/** Client-safe copy (no Resend SDK). Import from here in `use client` components. */

/**
 * Transactional auth email often hits spam until the sending domain has strong SPF/DKIM/DMARC
 * and users mark messages as “not spam.” Shown on login, signup, verify, and in API success messages.
 */
export const AUTH_EMAIL_SPAM_DELIVERABILITY_HINT =
  'If you do not see the message within a couple of minutes, check your spam or junk folder. Mark it as not spam so future emails are more likely to land in your inbox.'

/** Short line for form headers / descriptions (login, signup). */
export const AUTH_EMAIL_SPAM_DELIVERABILITY_LINE =
  'If the email does not appear in your inbox, check spam or junk and mark it as not spam—first messages from a new domain often filter there.'

/** Paragraph for the post-login “check your email” screen. */
export const AUTH_EMAIL_VERIFY_PAGE_SPAM_NOTE =
  'Gmail and other providers sometimes file the first message as spam. If you do not see it in your inbox within a minute or two, open your spam or junk folder, find the message from us, and choose “Not spam” or “Move to inbox.” That trains your mailbox for the next email.'

export const RESEND_TESTING_MODE_PUBLIC_MESSAGE =
  'Sign-in email could not be sent. Your Resend project is in test mode: it only delivers to the email on that Resend account until you verify a domain at resend.com/domains and set RESEND_FROM_EMAIL to an address on that domain.'

export const RESEND_DEV_CONSOLE_FALLBACK_HINT =
  'No Resend API key is set, so nothing was emailed. If you run the app locally, open the terminal where `next dev` is running—the magic link is printed there. For production, set RESEND_API_KEY or rely on Supabase Auth email (SMTP) when Resend is not configured.'
