/**
 * Closed taxonomy for investor enrichment (LLM must normalize to these labels only).
 * Order is stable for prompts and tests — do not reorder without updating snapshots.
 */
export const INVESTOR_SECTORS = [
  'Artificial Intelligence',
  'Software & SaaS',
  'Cloud & DevOps',
  'Cybersecurity',
  'Developer Tools',
  'Data & Analytics',
  'Semiconductors & Hardware',
  'Fintech',
  'Healthcare & Digital Health',
  'Biotech & Life Sciences',
  'EdTech',
  'LegalTech',
  'PropTech',
  'InsurTech',
  'Deep Tech',
  'Robotics & Automation',
  'Space Tech',
  'Advanced Manufacturing',
  'Energy & CleanTech',
  'Consumer',
  'E-Commerce & Retail',
  'Media & Entertainment',
  'Gaming',
  'Travel & Hospitality',
  'Web3 & Crypto',
  'AR & VR',
  'Agriculture & FoodTech',
  'B2B & Enterprise',
  'Marketplace',
  'Mobility & Transportation',
  'Sustainability & Climate',
] as const

export type InvestorSector = (typeof INVESTOR_SECTORS)[number]

const sectorSet = new Set<string>(INVESTOR_SECTORS)

export function isInvestorSector(s: string): s is InvestorSector {
  return sectorSet.has(s)
}

/** Comma-separated list for LLM system prompts (bounded; full list is ~600 chars). */
export function investorSectorsPromptList(): string {
  return INVESTOR_SECTORS.join(', ')
}
