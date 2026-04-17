-- CreateEnum
CREATE TYPE "InvestorFounderProgressStage" AS ENUM ('saved', 'contacted', 'meeting', 'closed');

-- CreateTable
CREATE TABLE "InvestorFounderProgress" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "stage" "InvestorFounderProgressStage" NOT NULL DEFAULT 'saved',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorFounderProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestorFounderProgress_investorId_founderId_key" ON "InvestorFounderProgress"("investorId", "founderId");

-- CreateIndex
CREATE INDEX "InvestorFounderProgress_investorId_stage_idx" ON "InvestorFounderProgress"("investorId", "stage");

-- CreateIndex
CREATE INDEX "InvestorFounderProgress_founderId_idx" ON "InvestorFounderProgress"("founderId");

-- AddForeignKey
ALTER TABLE "InvestorFounderProgress" ADD CONSTRAINT "InvestorFounderProgress_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorFounderProgress" ADD CONSTRAINT "InvestorFounderProgress_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "Founder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
