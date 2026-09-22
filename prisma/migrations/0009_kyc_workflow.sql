CREATE TABLE "KycProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "identityType" TEXT NOT NULL,
  "identityNumberHash" TEXT NOT NULL,
  "identityNumberLast4" TEXT NOT NULL,
  "documentCountry" TEXT NOT NULL,
  "expiresAt" TEXT,
  "residentialAddress" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "occupation" TEXT NOT NULL,
  "sourceOfFunds" TEXT NOT NULL,
  "politicallyExposed" BOOLEAN NOT NULL DEFAULT false,
  "actingForSelf" BOOLEAN NOT NULL DEFAULT true,
  "consentAt" DATETIME NOT NULL,
  "reviewedAt" DATETIME,
  "reviewedBy" TEXT,
  "decidedBy" TEXT,
  "decisionReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "KycProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "KycDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" DATETIME,
  CONSTRAINT "KycDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "KycProfile_userId_key" ON "KycProfile"("userId");
CREATE UNIQUE INDEX "KycDocument_storageKey_key" ON "KycDocument"("storageKey");
CREATE INDEX "KycDocument_userId_status_idx" ON "KycDocument"("userId", "status");
