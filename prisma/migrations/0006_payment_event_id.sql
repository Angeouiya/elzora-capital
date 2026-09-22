ALTER TABLE "Investment" ADD COLUMN "paymentEventId" TEXT;

CREATE UNIQUE INDEX "Investment_paymentEventId_key"
ON "Investment"("paymentEventId");
