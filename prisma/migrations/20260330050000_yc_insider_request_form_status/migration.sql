    -- Base table + FK (idempotent): production may only run this migration if 20250327120000 was never applied.
    CREATE TABLE IF NOT EXISTS "YCInsiderFounderRequest" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "userEmail" TEXT NOT NULL,
        "founderKey" TEXT NOT NULL,
        "requestType" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "YCInsiderFounderRequest_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "YCInsiderFounderRequest_createdAt_idx" ON "YCInsiderFounderRequest"("createdAt");
    CREATE INDEX IF NOT EXISTS "YCInsiderFounderRequest_userId_idx" ON "YCInsiderFounderRequest"("userId");

    DO $$
    BEGIN
        ALTER TABLE "YCInsiderFounderRequest" ADD CONSTRAINT "YCInsiderFounderRequest_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;

    -- AlterTable
    ALTER TABLE "YCInsiderFounderRequest" ADD COLUMN IF NOT EXISTS "topic" VARCHAR(300);
    ALTER TABLE "YCInsiderFounderRequest" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(120);
    ALTER TABLE "YCInsiderFounderRequest" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) NOT NULL DEFAULT 'new';

    -- CreateIndex
    CREATE INDEX IF NOT EXISTS "YCInsiderFounderRequest_status_idx" ON "YCInsiderFounderRequest"("status");
