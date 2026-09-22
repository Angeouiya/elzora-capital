CREATE TABLE "LegalAcceptance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LegalAcceptance_userId_documentType_version_key"
  ON "LegalAcceptance"("userId", "documentType", "version");
CREATE INDEX "LegalAcceptance_userId_acceptedAt_idx"
  ON "LegalAcceptance"("userId", "acceptedAt");
