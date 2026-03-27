#!/usr/bin/env tsx
/**
 * Audit Investor URLs (website, LinkedIn, application): validation + optional HTTP probe + DB fixes.
 *
 * Usage:
 *   npx tsx scripts/audit-vc-links.ts
 *   npx tsx scripts/audit-vc-links.ts --normalize-urls
 *   npx tsx scripts/audit-vc-links.ts --verify-pristine --unverify-issues
 *   npx tsx scripts/audit-vc-links.ts --probe
 */
import { db } from '../lib/db'
import { analyzeInvestorLinks } from '../lib/vc-link-quality'

const PROBE_MS = 12_000

async function probeUrl(url: string): Promise<{ ok: boolean; status?: number; note?: string }> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), PROBE_MS)
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'NEXUS-VC-LinkAudit/1.0' },
    })
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        signal: ctrl.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'NEXUS-VC-LinkAudit/1.0',
          Range: 'bytes=0-0',
        },
      })
    }
    const ok = res.ok || res.status === 403 || res.status === 401
    if (!ok && res.status >= 400) {
      return { ok: false, status: res.status, note: 'HTTP error' }
    }
    return { ok: true, status: res.status }
  } catch (e: unknown) {
    const name = e && typeof e === 'object' && 'name' in e ? String((e as { name: string }).name) : ''
    if (name === 'AbortError') return { ok: false, note: 'timeout' }
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, note: msg }
  } finally {
    clearTimeout(t)
  }
}

function parseFlags() {
  const argv = process.argv.slice(2)
  return {
    normalizeUrls: argv.includes('--normalize-urls'),
    verifyPristine: argv.includes('--verify-pristine'),
    unverifyIssues: argv.includes('--unverify-issues'),
    probe: argv.includes('--probe'),
  }
}

async function main() {
  const { normalizeUrls, verifyPristine, unverifyIssues, probe } = parseFlags()

  const investors = await db.investor.findMany({
    orderBy: { firmName: 'asc' },
    select: {
      id: true,
      firmName: true,
      email: true,
      verified: true,
      websiteUrl: true,
      linkedinUrl: true,
      applicationUrl: true,
    },
  })

  let normalized = 0
  let verifiedOn = 0
  let verifiedOff = 0
  const reportLines: string[] = []

  for (const inv of investors) {
    const analysisBefore = analyzeInvestorLinks(inv)

    const nextWebsite =
      normalizeUrls && analysisBefore.safeWebsite != null
        ? analysisBefore.safeWebsite
        : inv.websiteUrl
    const nextLinkedin =
      normalizeUrls && analysisBefore.safeLinkedin != null
        ? analysisBefore.safeLinkedin
        : inv.linkedinUrl
    const nextApplication =
      normalizeUrls && analysisBefore.safeApplication != null
        ? analysisBefore.safeApplication
        : inv.applicationUrl

    const analysis = analyzeInvestorLinks({
      websiteUrl: nextWebsite,
      linkedinUrl: nextLinkedin,
      applicationUrl: nextApplication,
    })

    const updates: {
      websiteUrl?: string | null
      linkedinUrl?: string | null
      applicationUrl?: string | null
      verified?: boolean
    } = {}

    if (normalizeUrls) {
      if (nextWebsite !== inv.websiteUrl) updates.websiteUrl = nextWebsite
      if (nextLinkedin !== inv.linkedinUrl) updates.linkedinUrl = nextLinkedin
      if (nextApplication !== inv.applicationUrl) updates.applicationUrl = nextApplication
    }

    if (unverifyIssues && !analysis.linkClean) {
      updates.verified = false
    }
    if (verifyPristine && analysis.linkClean) {
      updates.verified = true
    }

    if (Object.keys(updates).length > 0) {
      await db.investor.update({
        where: { id: inv.id },
        data: updates,
      })
      if (updates.websiteUrl !== undefined || updates.linkedinUrl !== undefined || updates.applicationUrl !== undefined) {
        normalized++
      }
      if (updates.verified === true) verifiedOn++
      if (updates.verified === false) verifiedOff++
    }

    if (!analysis.linkClean || probe) {
      const head = `[${inv.firmName}] ${inv.email} verified=${inv.verified}`
      if (!analysis.linkClean) {
        for (const issue of analysis.issues) {
          reportLines.push(`${head} — ${issue.field}: ${issue.message}`)
        }
      }
      if (probe) {
        for (const [label, u] of [
          ['website', analysis.safeWebsite],
          ['linkedin', analysis.safeLinkedin],
          ['application', analysis.safeApplication],
        ] as const) {
          if (!u) continue
          const p = await probeUrl(u)
          if (!p.ok) {
            reportLines.push(
              `${head} — probe ${label}: ${p.note || 'fail'}${p.status != null ? ` (${p.status})` : ''}`
            )
          }
        }
      }
    }
  }

  console.log(`Scanned ${investors.length} investors.`)
  if (normalizeUrls) console.log(`URL normalization updates applied (rows touched where values changed): ${normalized}`)
  if (verifyPristine) console.log(`Set verified=true for link-clean rows: ${verifiedOn}`)
  if (unverifyIssues) console.log(`Set verified=false for rows with link issues: ${verifiedOff}`)

  const withIssues = investors.filter((inv) => !analyzeInvestorLinks(inv).linkClean).length
  console.log(`Rows with link validation issues: ${withIssues}`)

  if (reportLines.length) {
    console.log('\n--- Detail ---\n')
    console.log(reportLines.join('\n'))
  } else if (probe) {
    console.log('Probe: no failures reported for reachable URLs.')
  } else {
    console.log('No link validation issues found.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
