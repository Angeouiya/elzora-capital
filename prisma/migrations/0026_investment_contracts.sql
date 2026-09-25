CREATE TABLE "InvestmentContract" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "investmentId" TEXT NOT NULL,
  "contractNumber" TEXT NOT NULL,
  "documentVersion" TEXT NOT NULL DEFAULT '1.0',
  "locale" TEXT NOT NULL DEFAULT 'fr',
  "snapshot" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "issuedAt" DATETIME NOT NULL,
  "lastDownloadedAt" DATETIME,
  "downloadCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "InvestmentContract_investmentId_fkey"
    FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvestmentContract_investmentId_key"
  ON "InvestmentContract"("investmentId");
CREATE UNIQUE INDEX "InvestmentContract_contractNumber_key"
  ON "InvestmentContract"("contractNumber");
CREATE INDEX "InvestmentContract_issuedAt_idx"
  ON "InvestmentContract"("issuedAt");

CREATE TRIGGER "InvestmentContract_requires_confirmed_payment"
BEFORE INSERT ON "InvestmentContract"
WHEN NOT EXISTS (
  SELECT 1 FROM "Investment" i
  WHERE i."id" = NEW."investmentId"
    AND i."status" = 'confirmed'
    AND i."paymentConfirmedAt" IS NOT NULL
    AND i."signedAt" IS NOT NULL
    AND i."signatureHash" IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'investment contract requires a confirmed and signed payment');
END;
