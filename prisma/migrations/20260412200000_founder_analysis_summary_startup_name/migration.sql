-- AlterTable
ALTER TABLE "FounderAnalysisSummary" ADD COLUMN "summaryStartupName" TEXT;

-- Align existing summaries with current founder profile names for pivot detection.
UPDATE "FounderAnalysisSummary" AS fas
SET "summaryStartupName" = f."startupName"
FROM "Founder" AS f
WHERE fas."founderId" = f."id";
