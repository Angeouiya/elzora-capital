CREATE TABLE "PortfolioStatement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "statementNumber" TEXT NOT NULL,
  "documentVersion" TEXT NOT NULL DEFAULT '1.0',
  "locale" TEXT NOT NULL,
  "snapshot" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "periodEnd" TEXT NOT NULL,
  "issuedAt" DATETIME NOT NULL,
  "lastDownloadedAt" DATETIME,
  "downloadCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PortfolioStatement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PortfolioStatement_statementNumber_key"
  ON "PortfolioStatement"("statementNumber");
CREATE UNIQUE INDEX "PortfolioStatement_userId_contentHash_key"
  ON "PortfolioStatement"("userId", "contentHash");
CREATE INDEX "PortfolioStatement_userId_issuedAt_idx"
  ON "PortfolioStatement"("userId", "issuedAt");

CREATE TRIGGER "PortfolioStatement_immutable_evidence"
BEFORE UPDATE OF "userId", "statementNumber", "documentVersion", "locale",
                 "snapshot", "contentHash", "periodEnd", "issuedAt"
ON "PortfolioStatement"
BEGIN
  SELECT RAISE(ABORT, 'portfolio statement evidence is immutable');
END;
