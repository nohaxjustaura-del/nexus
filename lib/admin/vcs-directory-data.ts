import { db } from '@/lib/db'
import { analyzeInvestorLinks } from '@/lib/vc-link-quality'

const investorSelect = {
  id: true,
  email: true,
  name: true,
  firmName: true,
  verified: true,
  stages: true,
  sectors: true,
  checkMin: true,
  checkMax: true,
  geoFocus: true,
  applicationUrl: true,
  linkedinUrl: true,
  websiteUrl: true,
  createdAt: true,
  updatedAt: true,
} as const

export type AdminDirectoryInvestor = Awaited<
  ReturnType<typeof loadAdminVcsInvestorsForDirectory>
>[number]

/** Investors with link-quality enrichment for admin VC directory + API. */
export async function loadAdminVcsInvestorsForDirectory() {
  const investors = await db.investor.findMany({
    orderBy: { createdAt: 'desc' },
    select: investorSelect,
  })

  return investors.map((inv) => {
    const linkQuality = analyzeInvestorLinks({
      websiteUrl: inv.websiteUrl,
      linkedinUrl: inv.linkedinUrl,
      applicationUrl: inv.applicationUrl,
    })
    return {
      ...inv,
      linkQuality: {
        safeWebsite: linkQuality.safeWebsite,
        safeLinkedin: linkQuality.safeLinkedin,
        safeApplication: linkQuality.safeApplication,
        issues: linkQuality.issues,
        linkClean: linkQuality.linkClean,
      },
    }
  })
}

export async function loadAdminVcClaimsForDirectory() {
  return db.vCClaim.findMany({
    orderBy: { createdAt: 'desc' },
  })
}
