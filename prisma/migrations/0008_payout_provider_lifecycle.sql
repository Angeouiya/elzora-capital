ALTER TABLE "Payout" ADD COLUMN "withdrawMode" TEXT;
ALTER TABLE "Payout" ADD COLUMN "providerEventId" TEXT;
ALTER TABLE "Payout" ADD COLUMN "failureReason" TEXT;

CREATE UNIQUE INDEX "Payout_partnerRef_key" ON "Payout"("partnerRef");
CREATE UNIQUE INDEX "Payout_providerEventId_key" ON "Payout"("providerEventId");
