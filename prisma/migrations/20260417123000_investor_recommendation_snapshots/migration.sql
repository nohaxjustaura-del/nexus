-- Persist investor recommendation snapshots for manual refresh workflow
CREATE TABLE "InvestorRecommendationSnapshot" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual_refresh',
    "contextVersion" INTEGER NOT NULL DEFAULT 1,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorRecommendationSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvestorRecommendationSnapshotItem" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "recommendationRowId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "freshness" INTEGER NOT NULL,
    "strictFilterPass" BOOLEAN NOT NULL DEFAULT true,
    "actionHint" TEXT NOT NULL,
    "matchReasons" TEXT NOT NULL DEFAULT '[]',
    "dimensionBreakdown" TEXT NOT NULL DEFAULT '{}',
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorRecommendationSnapshotItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvestorRecommendationSnapshot_investorId_refreshedAt_idx"
ON "InvestorRecommendationSnapshot"("investorId", "refreshedAt" DESC);

CREATE INDEX "InvestorRecommendationSnapshot_createdAt_idx"
ON "InvestorRecommendationSnapshot"("createdAt");

CREATE UNIQUE INDEX "InvestorRecommendationSnapshotItem_snapshotId_rank_key"
ON "InvestorRecommendationSnapshotItem"("snapshotId", "rank");

CREATE INDEX "InvestorRecommendationSnapshotItem_snapshotId_idx"
ON "InvestorRecommendationSnapshotItem"("snapshotId");

CREATE INDEX "InvestorRecommendationSnapshotItem_founderId_idx"
ON "InvestorRecommendationSnapshotItem"("founderId");

ALTER TABLE "InvestorRecommendationSnapshot"
ADD CONSTRAINT "InvestorRecommendationSnapshot_investorId_fkey"
FOREIGN KEY ("investorId") REFERENCES "Investor"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvestorRecommendationSnapshotItem"
ADD CONSTRAINT "InvestorRecommendationSnapshotItem_snapshotId_fkey"
FOREIGN KEY ("snapshotId") REFERENCES "InvestorRecommendationSnapshot"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvestorRecommendationSnapshotItem"
ADD CONSTRAINT "InvestorRecommendationSnapshotItem_founderId_fkey"
FOREIGN KEY ("founderId") REFERENCES "Founder"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
