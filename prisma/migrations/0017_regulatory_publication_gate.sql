CREATE TABLE "RegulatoryReview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "distributionScope" TEXT NOT NULL DEFAULT 'pending',
  "marketAuthorityPath" TEXT NOT NULL DEFAULT 'pending',
  "corporateActsStatus" TEXT NOT NULL DEFAULT 'pending',
  "paymentSafeguardingStatus" TEXT NOT NULL DEFAULT 'pending',
  "beneficialOwnersStatus" TEXT NOT NULL DEFAULT 'pending',
  "riskDisclosureStatus" TEXT NOT NULL DEFAULT 'pending',
  "countryOpinionRef" TEXT,
  "authorityReference" TEXT,
  "restrictions" TEXT,
  "decision" TEXT NOT NULL DEFAULT 'pending',
  "preparedBy" TEXT NOT NULL,
  "reviewedBy" TEXT,
  "reviewedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "RegulatoryReview_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RegulatoryReview_distributionScope_check"
    CHECK ("distributionScope" IN ('pending', 'restricted_private', 'public_offering')),
  CONSTRAINT "RegulatoryReview_marketAuthorityPath_check"
    CHECK ("marketAuthorityPath" IN ('pending', 'private_route_confirmed', 'authority_clearance', 'visa_obtained')),
  CONSTRAINT "RegulatoryReview_corporateActsStatus_check"
    CHECK ("corporateActsStatus" IN ('pending', 'confirmed', 'blocked')),
  CONSTRAINT "RegulatoryReview_paymentSafeguardingStatus_check"
    CHECK ("paymentSafeguardingStatus" IN ('pending', 'confirmed', 'blocked')),
  CONSTRAINT "RegulatoryReview_beneficialOwnersStatus_check"
    CHECK ("beneficialOwnersStatus" IN ('pending', 'confirmed', 'blocked')),
  CONSTRAINT "RegulatoryReview_riskDisclosureStatus_check"
    CHECK ("riskDisclosureStatus" IN ('pending', 'confirmed', 'blocked')),
  CONSTRAINT "RegulatoryReview_decision_check"
    CHECK ("decision" IN ('pending', 'cleared', 'blocked'))
);

CREATE UNIQUE INDEX "RegulatoryReview_projectId_key"
  ON "RegulatoryReview"("projectId");
CREATE INDEX "RegulatoryReview_decision_updatedAt_idx"
  ON "RegulatoryReview"("decision", "updatedAt");

CREATE TRIGGER "RegulatoryReview_clearance_requires_complete_evidence_insert"
BEFORE INSERT ON "RegulatoryReview"
WHEN NEW."decision" = 'cleared' AND (
  NEW."distributionScope" = 'pending' OR
  NEW."marketAuthorityPath" = 'pending' OR
  NEW."corporateActsStatus" <> 'confirmed' OR
  NEW."paymentSafeguardingStatus" <> 'confirmed' OR
  NEW."beneficialOwnersStatus" <> 'confirmed' OR
  NEW."riskDisclosureStatus" <> 'confirmed' OR
  NEW."countryOpinionRef" IS NULL OR TRIM(NEW."countryOpinionRef") = '' OR
  (NEW."distributionScope" = 'public_offering' AND (
    NEW."authorityReference" IS NULL OR TRIM(NEW."authorityReference") = ''
  ))
)
BEGIN
  SELECT RAISE(ABORT, 'regulatory clearance requires complete evidence');
END;

CREATE TRIGGER "RegulatoryReview_clearance_requires_complete_evidence_update"
BEFORE UPDATE ON "RegulatoryReview"
WHEN NEW."decision" = 'cleared' AND (
  NEW."distributionScope" = 'pending' OR
  NEW."marketAuthorityPath" = 'pending' OR
  NEW."corporateActsStatus" <> 'confirmed' OR
  NEW."paymentSafeguardingStatus" <> 'confirmed' OR
  NEW."beneficialOwnersStatus" <> 'confirmed' OR
  NEW."riskDisclosureStatus" <> 'confirmed' OR
  NEW."countryOpinionRef" IS NULL OR TRIM(NEW."countryOpinionRef") = '' OR
  (NEW."distributionScope" = 'public_offering' AND (
    NEW."authorityReference" IS NULL OR TRIM(NEW."authorityReference") = ''
  ))
)
BEGIN
  SELECT RAISE(ABORT, 'regulatory clearance requires complete evidence');
END;

CREATE TRIGGER "Project_approval_requires_regulatory_clearance"
BEFORE UPDATE OF "status" ON "Project"
WHEN NEW."status" IN ('approved', 'published') AND NOT EXISTS (
  SELECT 1 FROM "RegulatoryReview" r
  WHERE r."projectId" = NEW."id" AND r."decision" = 'cleared'
)
BEGIN
  SELECT RAISE(ABORT, 'project approval or publication requires regulatory clearance');
END;
