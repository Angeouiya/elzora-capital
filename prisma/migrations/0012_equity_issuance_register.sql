CREATE TABLE "EquityIssuance" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "offerId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "shareClass" TEXT NOT NULL DEFAULT 'ordinary',
  "totalOwnershipMicroPct" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending_documents',
  "resolutionRef" TEXT,
  "resolutionDate" TEXT,
  "declarationRef" TEXT,
  "shareRegisterRef" TEXT,
  "preparedBy" TEXT,
  "approvedBy" TEXT,
  "preparedAt" DATETIME,
  "approvedAt" DATETIME,
  "issuedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "EquityIssuance_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EquityIssuance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EquityIssuance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EquityIssuance_totalOwnershipMicroPct_check" CHECK ("totalOwnershipMicroPct" > 0 AND "totalOwnershipMicroPct" <= 100000000),
  CONSTRAINT "EquityIssuance_status_check" CHECK ("status" IN ('pending_documents', 'prepared', 'approved', 'issued', 'cancelled'))
);

CREATE UNIQUE INDEX "EquityIssuance_offerId_key" ON "EquityIssuance"("offerId");
CREATE UNIQUE INDEX "EquityIssuance_projectId_key" ON "EquityIssuance"("projectId");
CREATE INDEX "EquityIssuance_companyId_status_idx" ON "EquityIssuance"("companyId", "status");

CREATE TABLE "EquityAllocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "issuanceId" TEXT NOT NULL,
  "investmentId" TEXT NOT NULL,
  "investorType" TEXT NOT NULL,
  "investorId" TEXT NOT NULL,
  "ownershipMicroPct" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending_issuance',
  "certificateNo" TEXT,
  "issuedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "EquityAllocation_issuanceId_fkey" FOREIGN KEY ("issuanceId") REFERENCES "EquityIssuance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EquityAllocation_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EquityAllocation_ownershipMicroPct_check" CHECK ("ownershipMicroPct" > 0 AND "ownershipMicroPct" <= 100000000),
  CONSTRAINT "EquityAllocation_status_check" CHECK ("status" IN ('pending_issuance', 'issued', 'cancelled'))
);

CREATE UNIQUE INDEX "EquityAllocation_investmentId_key" ON "EquityAllocation"("investmentId");
CREATE UNIQUE INDEX "EquityAllocation_certificateNo_key" ON "EquityAllocation"("certificateNo");
CREATE INDEX "EquityAllocation_investorId_status_idx" ON "EquityAllocation"("investorId", "status");
CREATE INDEX "EquityAllocation_issuanceId_idx" ON "EquityAllocation"("issuanceId");

CREATE TRIGGER "EquityIssuance_distinct_approvers_insert"
BEFORE INSERT ON "EquityIssuance"
WHEN NEW."preparedBy" IS NOT NULL AND NEW."approvedBy" = NEW."preparedBy"
BEGIN
  SELECT RAISE(ABORT, 'equity issuance preparer cannot approve the same issuance');
END;

CREATE TRIGGER "EquityIssuance_distinct_approvers_update"
BEFORE UPDATE OF "preparedBy", "approvedBy" ON "EquityIssuance"
WHEN NEW."preparedBy" IS NOT NULL AND NEW."approvedBy" = NEW."preparedBy"
BEGIN
  SELECT RAISE(ABORT, 'equity issuance preparer cannot approve the same issuance');
END;

CREATE TRIGGER "EquityIssuance_issued_requires_evidence"
BEFORE UPDATE OF "status" ON "EquityIssuance"
WHEN NEW."status" = 'issued' AND (
  NEW."approvedBy" IS NULL OR
  NEW."resolutionRef" IS NULL OR
  NEW."resolutionDate" IS NULL OR
  NEW."declarationRef" IS NULL OR
  NEW."shareRegisterRef" IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'equity issuance requires approval and corporate evidence');
END;

CREATE TRIGGER "EquityAllocation_issued_requires_parent"
BEFORE UPDATE OF "status" ON "EquityAllocation"
WHEN NEW."status" = 'issued' AND NOT EXISTS (
  SELECT 1 FROM "EquityIssuance" e
  WHERE e."id" = NEW."issuanceId" AND e."status" = 'issued'
)
BEGIN
  SELECT RAISE(ABORT, 'equity allocation cannot be issued before its parent issuance');
END;
