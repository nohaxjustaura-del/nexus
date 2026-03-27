#!/usr/bin/env tsx
/**
 * One-time corrections for investors that fail vc-link-quality checks.
 * Re-run: npm run vc:audit-links
 */
import { db } from '../lib/db'

const PATCHES: { email: string; data: Record<string, unknown> }[] = [
  {
    email: 'vc.golden.gate.ventures.12bdbc@placeholder.invalid',
    data: {
      websiteUrl: 'https://www.goldengate.vc/',
      linkedinUrl: 'https://www.linkedin.com/company/goldengateventures/',
    },
  },
  {
    email: 'vc.superhero.capital.7fc8a2@placeholder.invalid',
    data: {
      websiteUrl: 'https://www.superherocapital.com/',
      applicationUrl: 'https://www.superherocapital.com/contact',
    },
  },
  {
    email: 'vc.overlay.capital.fund.7419e7@placeholder.invalid',
    data: {
      websiteUrl: 'https://overlaycapital.com/',
      applicationUrl: 'https://overlaycapital.com/contact',
    },
  },
  {
    email: 'vc.orbital.edge.accelerator.2026.partners.0b3eae@placeholder.invalid',
    data: {
      websiteUrl: 'https://orbitaledge.techconnect.org/',
      applicationUrl: 'https://orbitaledge.techconnect.org/partners/',
    },
  },
  {
    email: 'vc.lps.capital.commitments.or.final.close.mentioned.980627@placeholder.invalid',
    data: {
      websiteUrl: null,
      linkedinUrl: null,
      applicationUrl: null,
      verified: false,
    },
  },
  {
    email: 'vc.family.office.investments.4cb50e@placeholder.invalid',
    data: {
      websiteUrl: null,
      linkedinUrl: null,
      applicationUrl: null,
      verified: false,
    },
  },
  {
    email: 'vc.patient.capital.and.support.for.smes.to.accelera.8ddc67@placeholder.invalid',
    data: {
      applicationUrl: null,
      verified: false,
    },
  },
]

async function main() {
  for (const { email, data } of PATCHES) {
    const res = await db.investor.updateMany({ where: { email }, data })
    if (res.count === 0) {
      console.warn(`No row for ${email}`)
    } else {
      console.log(`Updated ${email} (${res.count})`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
