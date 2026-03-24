import { openrouterGenerateJson } from "./openrouter";
import type { ExaSnippet } from "./exa-service";

const MODEL = "openai/gpt-4o-mini";

export interface VCSummary {
  recentPortfolio: string;
  currentHeat: string;
  founderAlignment: string;
}

export interface ConflictResult {
  isConflict: boolean;
  competitorNames: string[];
  reasoning: string;
}

/**
 * Uses GPT-4o-mini to distill raw Exa search results into a strict
 * 3-sentence VC summary contextualised against the founder's pitch.
 */
export async function generateVCSummary(
  vcName: string,
  deals: ExaSnippet[],
  leadership: ExaSnippet[],
  founderPitch: string,
  fundType: string = 'Venture Capital'
): Promise<VCSummary> {
  const isAccelerator = fundType.toLowerCase().includes('accelerator') || fundType.toLowerCase().includes('fellowship') || fundType.toLowerCase().includes('program')
  const entityLabel = isAccelerator ? 'program' : 'investor'

  const dealsBlock = deals.length > 0
    ? deals.map((d, i) => `${i + 1}. "${d.title}" (${d.date ?? "unknown date"}) — ${d.snippet}`).join("\n")
    : isAccelerator ? "No recent cohort or batch activity found." : "No recent deals found.";

  const leadershipBlock = leadership.length > 0
    ? leadership.map((l, i) => `${i + 1}. "${l.title}" (${l.date ?? "unknown date"}) — ${l.snippet}`).join("\n")
    : "No recent public commentary found.";

  const result = await openrouterGenerateJson<VCSummary>({
    model: MODEL,
    system: `You are an analyst that summarizes ${entityLabel} activity for founders. You MUST return a JSON object with exactly 3 fields, each containing exactly ONE sentence.

Rules:
- "recentPortfolio": ${isAccelerator
  ? `Name the 3 most recent companies accepted into this ${entityLabel}. If fewer than 3 are available, name what you can find.`
  : `Name the 3 most recent companies this ${entityLabel} funded. If fewer than 3 are available, name what you can find.`} Use only facts from the provided data.
- "currentHeat": Based on all available data, describe what this ${entityLabel} is focused on RIGHT NOW in one sentence.
- "founderAlignment": Based on all data, describe the type of founder this ${entityLabel} favors in one sentence (e.g., "They favor technical founders from YC" or "They back repeat founders in enterprise SaaS").

Never fabricate company names. If data is insufficient, say so honestly.`,
    user: `${isAccelerator ? 'Program' : 'Investor'}: ${vcName} (${fundType})

Recent Activity:
${dealsBlock}

Public Commentary & Thesis:
${leadershipBlock}

Founder's Pitch (for context):
${founderPitch}

Return the JSON object with recentPortfolio, currentHeat, and founderAlignment.`,
    temperature: 0.3,
  });

  return {
    recentPortfolio: result.recentPortfolio || `No recent portfolio companies found for ${vcName}.`,
    currentHeat: result.currentHeat || `Insufficient data to determine ${vcName}'s current investment focus.`,
    founderAlignment: result.founderAlignment || `Insufficient data to determine ${vcName}'s founder preferences.`,
  };
}

/**
 * Uses GPT-4o-mini to determine whether any of the VC's recent portfolio
 * companies are direct competitors to the founder's startup.
 */
export async function detectConflict(
  vcName: string,
  deals: ExaSnippet[],
  founderPitch: string,
  fundType: string = 'Venture Capital'
): Promise<ConflictResult> {
  if (deals.length === 0) {
    return { isConflict: false, competitorNames: [], reasoning: "No recent deals to evaluate." };
  }

  const dealsBlock = deals
    .map((d, i) => `${i + 1}. "${d.title}" — ${d.snippet}`)
    .join("\n");

  const result = await openrouterGenerateJson<ConflictResult>({
    model: MODEL,
    system: `You are a competitive analysis expert. Determine if any of the VC's recent portfolio companies are DIRECT competitors to the founder's startup.

A direct competitor means:
- Same target market AND same core solution
- NOT just same broad industry (e.g., two AI companies in different verticals are NOT competitors)

Return a JSON object with:
- "isConflict": boolean — true only if a genuine direct competitor exists
- "competitorNames": string[] — names of the competing companies (empty array if none)
- "reasoning": string — one sentence explaining your decision`,
    user: `VC: ${vcName}

Their Recent Portfolio Companies:
${dealsBlock}

Founder's Pitch:
${founderPitch}

Are any of these portfolio companies direct competitors to this founder?`,
    temperature: 0.1,
  });

  return {
    isConflict: Boolean(result.isConflict),
    competitorNames: Array.isArray(result.competitorNames) ? result.competitorNames : [],
    reasoning: result.reasoning || "",
  };
}
