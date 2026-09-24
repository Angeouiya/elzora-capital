CREATE TABLE "EquityDividend" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "issuanceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "totalDeclaredAmount" BIGINT NOT NULL,
  "platformGrossAmount" BIGINT NOT NULL,
  "withholdingAmount" BIGINT NOT NULL DEFAULT 0,
  "netPayableAmount" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XOF',
  "recordDate" TEXT NOT NULL,
  "resolutionRef" TEXT NOT NULL,
  "resolutionDate" TEXT NOT NULL,
  "taxReference" TEXT,
  "rejectionReason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "submittedBy" TEXT NOT NULL,
  "reviewedBy" TEXT,
  "approvedBy" TEXT,
  "reviewedAt" DATETIME,
  "approvedAt" DATETIME,
  "paymentRef" TEXT,
  "paymentEventId" TEXT,
  "paidAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "EquityDividend_issuanceId_fkey" FOREIGN KEY ("issuanceId") REFERENCES "EquityIssuance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EquityDividend_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EquityDividend_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EquityDividend_amounts_check" CHECK (
    "totalDeclaredAmount" > 0 AND "platformGrossAmount" > 0 AND
    "withholdingAmount" >= 0 AND "withholdingAmount" < "platformGrossAmount" AND
    "netPayableAmount" = "platformGrossAmount" - "withholdingAmount"
  ),
  CONSTRAINT "EquityDividend_currency_check" CHECK ("currency" = 'XOF'),
  CONSTRAINT "EquityDividend_status_check" CHECK ("status" IN ('submitted', 'reviewed', 'approved', 'verifying', 'paid', 'rejected', 'cancelled'))
);

CREATE UNIQUE INDEX "EquityDividend_issuanceId_resolutionRef_key" ON "EquityDividend"("issuanceId", "resolutionRef");
CREATE UNIQUE INDEX "EquityDividend_paymentRef_key" ON "EquityDividend"("paymentRef");
CREATE UNIQUE INDEX "EquityDividend_paymentEventId_key" ON "EquityDividend"("paymentEventId");
CREATE INDEX "EquityDividend_companyId_status_idx" ON "EquityDividend"("companyId", "status");
CREATE INDEX "EquityDividend_projectId_createdAt_idx" ON "EquityDividend"("projectId", "createdAt");

CREATE TABLE "EquityDividendAllocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "dividendId" TEXT NOT NULL,
  "equityAllocationId" TEXT NOT NULL,
  "investmentId" TEXT NOT NULL,
  "investorType" TEXT NOT NULL,
  "investorId" TEXT NOT NULL,
  "ownershipMicroPct" BIGINT NOT NULL,
  "grossAmount" BIGINT NOT NULL,
  "withholdingAmount" BIGINT NOT NULL DEFAULT 0,
  "netAmount" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "availableAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "EquityDividendAllocation_dividendId_fkey" FOREIGN KEY ("dividendId") REFERENCES "EquityDividend" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EquityDividendAllocation_equityAllocationId_fkey" FOREIGN KEY ("equityAllocationId") REFERENCES "EquityAllocation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EquityDividendAllocation_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EquityDividendAllocation_amounts_check" CHECK (
    "ownershipMicroPct" > 0 AND "grossAmount" > 0 AND
    "withholdingAmount" >= 0 AND "withholdingAmount" <= "grossAmount" AND
    "netAmount" = "grossAmount" - "withholdingAmount"
  ),
  CONSTRAINT "EquityDividendAllocation_status_check" CHECK ("status" IN ('pending', 'available', 'cancelled'))
);

CREATE UNIQUE INDEX "EquityDividendAllocation_dividendId_equityAllocationId_key" ON "EquityDividendAllocation"("dividendId", "equityAllocationId");
CREATE INDEX "EquityDividendAllocation_investorId_status_idx" ON "EquityDividendAllocation"("investorId", "status");
CREATE INDEX "EquityDividendAllocation_investmentId_idx" ON "EquityDividendAllocation"("investmentId");

CREATE TRIGGER "EquityDividend_distinct_reviewers"
BEFORE UPDATE OF "approvedBy" ON "EquityDividend"
WHEN NEW."approvedBy" IS NOT NULL AND NEW."approvedBy" = NEW."reviewedBy"
BEGIN
  SELECT RAISE(ABORT, 'equity dividend reviewer cannot approve the same declaration');
END;

CREATE TRIGGER "EquityDividend_paid_requires_approval"
BEFORE UPDATE OF "status" ON "EquityDividend"
WHEN NEW."status" = 'paid' AND (
  NEW."reviewedBy" IS NULL OR NEW."approvedBy" IS NULL OR
  NEW."reviewedBy" = NEW."approvedBy" OR NEW."paymentRef" IS NULL OR
  NEW."paymentEventId" IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'equity dividend requires distinct approval and verified payment');
END;

CREATE TRIGGER "EquityDividendAllocation_available_requires_parent"
BEFORE UPDATE OF "status" ON "EquityDividendAllocation"
WHEN NEW."status" = 'available' AND NOT EXISTS (
  SELECT 1 FROM "EquityDividend" d
  WHERE d."id" = NEW."dividendId" AND d."status" = 'paid'
)
BEGIN
  SELECT RAISE(ABORT, 'dividend allocation cannot be released before verified payment');
END;
