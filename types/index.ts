import type { Investor, VCEnrichmentCache } from "@prisma/client";

export type EnrichedVC = Investor & {
  enrichmentCache: VCEnrichmentCache | null;
};
