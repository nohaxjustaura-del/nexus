-- YC Insider Ask/Book requests (premium-gated in app; table required for persistence)

CREATE TABLE "YCInsiderFounderRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "founderKey" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YCInsiderFounderRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "YCInsiderFounderRequest_createdAt_idx" ON "YCInsiderFounderRequest"("createdAt");
CREATE INDEX "YCInsiderFounderRequest_userId_idx" ON "YCInsiderFounderRequest"("userId");

ALTER TABLE "YCInsiderFounderRequest" ADD CONSTRAINT "YCInsiderFounderRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
