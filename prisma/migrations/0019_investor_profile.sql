CREATE TABLE "InvestorProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "experience" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "horizon" TEXT NOT NULL,
  "investableCapitalRange" TEXT NOT NULL,
  "lossCapacity" TEXT NOT NULL,
  "riskComfort" TEXT NOT NULL,
  "understandsCapitalLoss" INTEGER NOT NULL DEFAULT 0,
  "understandsIlliquidity" INTEGER NOT NULL DEFAULT 0,
  "attentionLevel" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "completedAt" DATETIME NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "InvestorProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvestorProfile_userId_key" ON "InvestorProfile"("userId");
CREATE INDEX "InvestorProfile_expiresAt_idx" ON "InvestorProfile"("expiresAt");
