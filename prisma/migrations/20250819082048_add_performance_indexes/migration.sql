-- CreateIndex
CREATE INDEX "DonationEvent_streamerId_createdAt_idx" ON "DonationEvent"("streamerId", "createdAt");

-- CreateIndex
CREATE INDEX "DonationEvent_streamerId_idx" ON "DonationEvent"("streamerId");

-- CreateIndex
CREATE INDEX "DonationIntent_streamerId_createdAt_idx" ON "DonationIntent"("streamerId", "createdAt");

-- CreateIndex
CREATE INDEX "DonationIntent_streamerId_idx" ON "DonationIntent"("streamerId");
