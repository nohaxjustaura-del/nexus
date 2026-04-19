-- AlterTable
ALTER TABLE "Investor" ADD COLUMN "foundedYear" INTEGER,
ADD COLUMN "partnerNames" TEXT,
ADD COLUMN "activelyInvesting" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastDealDate" TIMESTAMP(3),
ADD COLUMN "enrichedAt" TIMESTAMP(3),
ADD COLUMN "enrichmentVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "InvestorPortfolioCompany" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyWebsite" TEXT,
    "sector" TEXT,
    "stage" TEXT,
    "investmentYear" INTEGER,
    "investmentDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION,
    "amountCurrency" TEXT DEFAULT 'USD',
    "isLead" BOOLEAN,
    "coInvestors" TEXT NOT NULL DEFAULT '[]',
    "sourceUrl" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorPortfolioCompany_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestorPortfolioCompany_investorId_idx" ON "InvestorPortfolioCompany"("investorId");

-- CreateIndex
CREATE INDEX "InvestorPortfolioCompany_investmentYear_idx" ON "InvestorPortfolioCompany"("investmentYear");

-- AddForeignKey
ALTER TABLE "InvestorPortfolioCompany" ADD CONSTRAINT "InvestorPortfolioCompany_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
