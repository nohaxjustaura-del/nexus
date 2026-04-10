import { db } from "./db";
import { runExaWithKeyFailover } from "./exa-key-failover";
import { isExaGlobalCooldownActive } from "./exa-global-cooldown";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ExaSnippet {
  title: string;
  date: string | null;
  snippet: string;
}

export interface InvestorPulse {
  vcName: string;
  domain: string;
  snapshot: string;
  recentDeals: ExaSnippet[];
  thoughtLeadership: ExaSnippet[];
  fromCache: boolean;
  isConflict: boolean;
  signalStrength: number;
}

function truncateToSentences(text: string, max: number): string {
  if (!text) return "";
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences) return text.slice(0, 200);
  return sentences.slice(0, max).join(" ").trim();
}

function cleanResults(
  results: Array<{
    title?: string | null
    publishedDate?: string | null
    text?: string | null
  }>
): ExaSnippet[] {
  return results
    .filter((r) => r.title)
    .map((r) => ({
      title: r.title ?? "",
      date: r.publishedDate ?? null,
      snippet: truncateToSentences(r.text ?? "", 2),
    }));
}

function buildSnapshot(
  vcName: string,
  deals: ExaSnippet[],
  leadership: ExaSnippet[]
): string {
  const dealSummary =
    deals.length > 0
      ? `${vcName} recently participated in ${deals.length} funding round(s), including "${deals[0].title}".`
      : `No recent funding announcements found for ${vcName}.`;

  const leadershipSummary =
    leadership.length > 0
      ? `Their partners are actively discussing topics like "${leadership[0].title}".`
      : `No recent thought leadership found from their partners.`;

  const recency =
    deals.length > 0 && deals[0].date
      ? `Last known activity: ${deals[0].date}.`
      : `Activity recency could not be determined.`;

  return `${dealSummary} ${leadershipSummary} ${recency}`;
}

function isAcceleratorType(fundType: string): boolean {
  const ft = fundType.toLowerCase()
  return ft.includes('accelerator') || ft.includes('fellowship') || ft.includes('program')
}

function buildQueries(vcName: string, domain: string, fundType: string): { activityQuery: string; convictionQuery: string } {
  if (isAcceleratorType(fundType)) {
    return {
      activityQuery: `"${vcName}" (cohort OR batch OR "demo day" OR "accepted into" OR program)`,
      convictionQuery: `"${vcName}" ${domain} (application OR "what we look for" OR "why we accepted")`,
    }
  }

  if (fundType.toLowerCase().includes('angel')) {
    return {
      activityQuery: `"${vcName}" (investment OR "backed" OR "angel round" OR funding)`,
      convictionQuery: `"${vcName}" ${domain} (thesis OR "why I invested" OR portfolio)`,
    }
  }

  return {
    activityQuery: `"${vcName}" (investment OR "portfolio company" OR "led the round")`,
    convictionQuery: `"${vcName}" ${domain} (thesis OR "investment memo" OR "why we invested")`,
  }
}

async function fetchFromExa(
  vcName: string,
  domain: string,
  fundType: string = 'Venture Capital'
): Promise<{ deals: ExaSnippet[]; leadership: ExaSnippet[] }> {
  if (isExaGlobalCooldownActive()) {
    return { deals: [], leadership: [] };
  }

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const startDate = threeMonthsAgo.toISOString().split("T")[0];

  const { activityQuery, convictionQuery } = buildQueries(vcName, domain, fundType)

  const failover = await runExaWithKeyFailover(async (exa) => {
    const [dealsResponse, leadershipResponse] = await Promise.all([
      exa.search(activityQuery, {
        type: "auto",
        numResults: 3,
        startPublishedDate: startDate,
        contents: { text: { maxCharacters: 500 } },
      }),
      exa.search(convictionQuery, {
        type: "auto",
        numResults: 3,
        startPublishedDate: startDate,
        contents: { text: { maxCharacters: 500 } },
      }),
    ]);
    return {
      deals: cleanResults(dealsResponse.results),
      leadership: cleanResults(leadershipResponse.results),
    };
  });

  if (failover.ok) {
    return failover.data;
  }
  return { deals: [], leadership: [] };
}

/**
 * Returns live enrichment data for a VC investor. Checks VCEnrichmentCache
 * first and only calls Exa if the cache is stale (>24h) or missing.
 *
 * @deprecated For the VC matching pipeline, use fetchVCExaBundle() from
 * lib/matching/exa-enrichment.ts instead. This function is retained for
 * other callers (e.g. investor profile page enrichment).
 */
export async function getLiveInvestorPulse(
  vcName: string,
  domain: string,
  investorId?: string,
  fundType: string = 'Venture Capital'
): Promise<InvestorPulse> {
  // --- Cache check ---
  if (investorId) {
    const cached = await db.vCEnrichmentCache.findUnique({
      where: { investorId },
    });

    if (cached) {
      const age = Date.now() - cached.lastUpdated.getTime();
      if (age < CACHE_TTL_MS) {
        const recentDeals = JSON.parse(cached.recentDeals) as ExaSnippet[];
        return {
          vcName,
          domain,
          snapshot: cached.snapshot,
          recentDeals,
          thoughtLeadership: [],
          fromCache: true,
          isConflict: cached.isConflict,
          signalStrength: recentDeals.length > 0 ? recentDeals.length : 0,
        };
      }
    }
  }

  // --- Live fetch from Exa ---
  const { deals, leadership } = await fetchFromExa(vcName, domain, fundType);
  const snapshot = buildSnapshot(vcName, deals, leadership);

  const isConflict =
    deals.length > 0 &&
    deals.every(
      (d) => !d.title.toLowerCase().includes(vcName.toLowerCase().split(" ")[0])
    );

  const totalResults = deals.length + leadership.length;
  const signalStrength = Math.min(totalResults, 6);

  // --- Persist to cache ---
  if (investorId) {
    await db.vCEnrichmentCache.upsert({
      where: { investorId },
      update: {
        snapshot,
        recentDeals: JSON.stringify(deals),
        lastUpdated: new Date(),
        isConflict,
      },
      create: {
        investorId,
        snapshot,
        recentDeals: JSON.stringify(deals),
        lastUpdated: new Date(),
        isConflict,
      },
    });
  }

  return {
    vcName,
    domain,
    snapshot,
    recentDeals: deals,
    thoughtLeadership: leadership,
    fromCache: false,
    isConflict,
    signalStrength,
  };
}
