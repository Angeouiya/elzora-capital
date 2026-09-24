ALTER TABLE "Investment" ADD COLUMN "cancellationEventId" TEXT;
ALTER TABLE "Investment" ADD COLUMN "cancelledAt" DATETIME;
ALTER TABLE "Investment" ADD COLUMN "cancellationReason" TEXT;

CREATE UNIQUE INDEX "Investment_cancellationEventId_key"
  ON "Investment"("cancellationEventId");
CREATE INDEX "Investment_investorId_status_reflectionEndsAt_idx"
  ON "Investment"("investorId", "status", "reflectionEndsAt");
