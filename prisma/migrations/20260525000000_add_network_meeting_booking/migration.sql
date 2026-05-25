-- CreateTable
CREATE TABLE "NetworkMeetingBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "partnerSlug" VARCHAR(100) NOT NULL,
    "founderName" VARCHAR(200) NOT NULL,
    "purpose" VARCHAR(200) NOT NULL,
    "details" TEXT,
    "calendlyEventUri" VARCHAR(500),
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending_calendar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkMeetingBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NetworkMeetingBooking_userId_idx" ON "NetworkMeetingBooking"("userId");

-- CreateIndex
CREATE INDEX "NetworkMeetingBooking_partnerSlug_idx" ON "NetworkMeetingBooking"("partnerSlug");

-- CreateIndex
CREATE INDEX "NetworkMeetingBooking_status_idx" ON "NetworkMeetingBooking"("status");

-- CreateIndex
CREATE INDEX "NetworkMeetingBooking_createdAt_idx" ON "NetworkMeetingBooking"("createdAt");

-- CreateIndex
CREATE INDEX "NetworkMeetingBooking_userId_createdAt_idx" ON "NetworkMeetingBooking"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "NetworkMeetingBooking" ADD CONSTRAINT "NetworkMeetingBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
