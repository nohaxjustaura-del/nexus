import type { PrismaClient } from '@prisma/client'

/**
 * Default human reviewers for unified / video pitch reviewer flows.
 * `founderKey` matches partner founder keys used on `/founder/network` (not stored on Reviewer).
 *
 * Emails are stable seed identities (example.com). Replace in production with real
 * reviewer inboxes if you send mail to `Reviewer.email`.
 */
export const DEFAULT_HUMAN_REVIEWERS = [
  {
    founderKey: 'william',
    email: 'william.namgyal+luel-human-review@example.com',
    name: 'William Namgyal',
    acceptedVC: 'Y Combinator',
    acceptedYear: 2026,
    linkedinUrl: 'https://www.linkedin.com/in/william-namgyal/',
    bio: 'YC W26 (Luel). Human reviewer for founder pitch submissions.',
    expertise: ['Early-stage', 'B2B', 'Consumer', 'YC'],
  },
  {
    founderKey: 'inigo',
    email: 'inigo.lenderking+luel-human-review@example.com',
    name: 'Inigo Lenderking',
    acceptedVC: 'Y Combinator',
    acceptedYear: 2026,
    linkedinUrl: 'https://www.linkedin.com/in/inigolenderking/',
    bio: 'YC W26 (Luel). Human reviewer for founder pitch submissions.',
    expertise: ['Early-stage', 'B2B', 'Consumer', 'YC'],
  },
] as const

export async function seedDefaultHumanReviewers(prisma: PrismaClient): Promise<void> {
  for (const row of DEFAULT_HUMAN_REVIEWERS) {
    await prisma.reviewer.upsert({
      where: { email: row.email },
      create: {
        email: row.email,
        name: row.name,
        vcAccepted: true,
        acceptedVC: row.acceptedVC,
        acceptedYear: row.acceptedYear,
        expertise: JSON.stringify(row.expertise),
        bio: row.bio,
        linkedinUrl: row.linkedinUrl,
        verified: true,
        active: true,
      },
      update: {
        name: row.name,
        vcAccepted: true,
        acceptedVC: row.acceptedVC,
        acceptedYear: row.acceptedYear,
        expertise: JSON.stringify(row.expertise),
        bio: row.bio,
        linkedinUrl: row.linkedinUrl,
        verified: true,
        active: true,
      },
    })
  }
}
