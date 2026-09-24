CREATE TABLE "SubscriptionEvidence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "investmentId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "investorId" TEXT NOT NULL,
  "offerVersion" INTEGER NOT NULL,
  "agreementVersion" TEXT NOT NULL,
  "termsVersion" TEXT NOT NULL,
  "riskVersion" TEXT NOT NULL,
  "agreementSnapshot" TEXT NOT NULL,
  "agreementHash" TEXT NOT NULL,
  "signedPayloadHash" TEXT NOT NULL,
  "signatureMethod" TEXT NOT NULL DEFAULT 'authenticated_clickwrap',
  "locale" TEXT NOT NULL DEFAULT 'fr',
  "termsAcceptedAt" DATETIME NOT NULL,
  "riskAcceptedAt" DATETIME NOT NULL,
  "signedAt" DATETIME NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionEvidence_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SubscriptionEvidence_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SubscriptionEvidence_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SubscriptionEvidence_investmentId_key"
  ON "SubscriptionEvidence"("investmentId");
CREATE UNIQUE INDEX "SubscriptionEvidence_signedPayloadHash_key"
  ON "SubscriptionEvidence"("signedPayloadHash");
CREATE INDEX "SubscriptionEvidence_investorId_signedAt_idx"
  ON "SubscriptionEvidence"("investorId", "signedAt");
CREATE INDEX "SubscriptionEvidence_offerId_idx"
  ON "SubscriptionEvidence"("offerId");
