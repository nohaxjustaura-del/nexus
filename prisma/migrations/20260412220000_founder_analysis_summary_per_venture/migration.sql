-- One AI summary row per (founder, startup name); allow multiple ventures per founder.

-- Align names from founder profile (single row per founder today).
UPDATE "FounderAnalysisSummary" AS fas
SET "summaryStartupName" = COALESCE(NULLIF(TRIM(BOTH FROM f."startupName"), ''), '')
FROM "Founder" AS f
WHERE fas."founderId" = f."id";

UPDATE "FounderAnalysisSummary" SET "summaryStartupName" = '' WHERE "summaryStartupName" IS NULL;

ALTER TABLE "FounderAnalysisSummary" ALTER COLUMN "summaryStartupName" SET DEFAULT '';
ALTER TABLE "FounderAnalysisSummary" ALTER COLUMN "summaryStartupName" SET NOT NULL;

-- Drop old 1:1 unique on founderId (name varies by Prisma version / DB).
ALTER TABLE "FounderAnalysisSummary" DROP CONSTRAINT IF EXISTS "FounderAnalysisSummary_founderId_key";
ALTER TABLE "FounderAnalysisSummary" DROP CONSTRAINT IF EXISTS "FounderAnalysisSummary_founderId_unique";

-- Composite uniqueness for multi-venture.
CREATE UNIQUE INDEX "FounderAnalysisSummary_founderId_summaryStartupName_key" ON "FounderAnalysisSummary"("founderId", "summaryStartupName");

CREATE INDEX IF NOT EXISTS "FounderAnalysisSummary_founderId_idx" ON "FounderAnalysisSummary"("founderId");
