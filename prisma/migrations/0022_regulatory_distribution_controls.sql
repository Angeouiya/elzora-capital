ALTER TABLE "Offer" ADD COLUMN "isDemo" INTEGER NOT NULL DEFAULT 0;

UPDATE "Offer"
SET "isDemo" = 1
WHERE "id" LIKE 'showcase-%' OR "id" LIKE 'pw-%';

DROP TRIGGER IF EXISTS "RegulatoryReview_clearance_requires_complete_evidence_insert";
DROP TRIGGER IF EXISTS "RegulatoryReview_clearance_requires_complete_evidence_update";
DROP TRIGGER IF EXISTS "Project_approval_requires_regulatory_clearance";

CREATE TRIGGER "RegulatoryReview_clearance_requires_complete_evidence_insert"
BEFORE INSERT ON "RegulatoryReview"
WHEN NEW."decision" = 'cleared' AND (
  NEW."distributionScope" = 'pending' OR
  NEW."marketAuthorityPath" = 'pending' OR
  (NEW."distributionScope" = 'restricted_private' AND
    NEW."marketAuthorityPath" NOT IN ('private_route_confirmed', 'authority_clearance')) OR
  (NEW."distributionScope" = 'public_offering' AND
    NEW."marketAuthorityPath" <> 'visa_obtained') OR
  NEW."corporateActsStatus" <> 'confirmed' OR
  NEW."paymentSafeguardingStatus" <> 'confirmed' OR
  NEW."beneficialOwnersStatus" <> 'confirmed' OR
  NEW."riskDisclosureStatus" <> 'confirmed' OR
  NEW."countryOpinionRef" IS NULL OR TRIM(NEW."countryOpinionRef") = '' OR
  (NEW."distributionScope" = 'public_offering' AND (
    NEW."authorityReference" IS NULL OR TRIM(NEW."authorityReference") = ''
  )) OR
  NEW."reviewedBy" IS NULL OR
  NEW."reviewedBy" = NEW."preparedBy" OR
  NEW."reviewedAt" IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'regulatory clearance requires complete evidence and independent review');
END;

CREATE TRIGGER "RegulatoryReview_clearance_requires_complete_evidence_update"
BEFORE UPDATE ON "RegulatoryReview"
WHEN NEW."decision" = 'cleared' AND (
  NEW."distributionScope" = 'pending' OR
  NEW."marketAuthorityPath" = 'pending' OR
  (NEW."distributionScope" = 'restricted_private' AND
    NEW."marketAuthorityPath" NOT IN ('private_route_confirmed', 'authority_clearance')) OR
  (NEW."distributionScope" = 'public_offering' AND
    NEW."marketAuthorityPath" <> 'visa_obtained') OR
  NEW."corporateActsStatus" <> 'confirmed' OR
  NEW."paymentSafeguardingStatus" <> 'confirmed' OR
  NEW."beneficialOwnersStatus" <> 'confirmed' OR
  NEW."riskDisclosureStatus" <> 'confirmed' OR
  NEW."countryOpinionRef" IS NULL OR TRIM(NEW."countryOpinionRef") = '' OR
  (NEW."distributionScope" = 'public_offering' AND (
    NEW."authorityReference" IS NULL OR TRIM(NEW."authorityReference") = ''
  )) OR
  NEW."reviewedBy" IS NULL OR
  NEW."reviewedBy" = NEW."preparedBy" OR
  NEW."reviewedAt" IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'regulatory clearance requires complete evidence and independent review');
END;

CREATE TRIGGER "Project_approval_requires_regulatory_clearance"
BEFORE UPDATE OF "status" ON "Project"
WHEN NEW."status" IN ('approved', 'published') AND NOT EXISTS (
  SELECT 1 FROM "RegulatoryReview" r
  WHERE r."projectId" = NEW."id"
    AND r."decision" = 'cleared'
    AND r."distributionScope" IN ('restricted_private', 'public_offering')
    AND (
      (r."distributionScope" = 'restricted_private' AND
        r."marketAuthorityPath" IN ('private_route_confirmed', 'authority_clearance')) OR
      (r."distributionScope" = 'public_offering' AND
        r."marketAuthorityPath" = 'visa_obtained' AND
        r."authorityReference" IS NOT NULL AND TRIM(r."authorityReference") <> '')
    )
    AND r."corporateActsStatus" = 'confirmed'
    AND r."paymentSafeguardingStatus" = 'confirmed'
    AND r."beneficialOwnersStatus" = 'confirmed'
    AND r."riskDisclosureStatus" = 'confirmed'
    AND r."countryOpinionRef" IS NOT NULL AND TRIM(r."countryOpinionRef") <> ''
    AND r."reviewedBy" IS NOT NULL
    AND r."reviewedBy" <> r."preparedBy"
    AND r."reviewedAt" IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'project approval or publication requires independent regulatory clearance');
END;

CREATE TRIGGER "Offer_public_requires_market_visa_insert"
BEFORE INSERT ON "Offer"
WHEN NEW."isDemo" = 0 AND NEW."visibility" = 'public' AND NOT EXISTS (
  SELECT 1 FROM "RegulatoryReview" r
  WHERE r."projectId" = NEW."projectId"
    AND r."decision" = 'cleared'
    AND r."distributionScope" = 'public_offering'
    AND r."marketAuthorityPath" = 'visa_obtained'
    AND r."corporateActsStatus" = 'confirmed'
    AND r."paymentSafeguardingStatus" = 'confirmed'
    AND r."beneficialOwnersStatus" = 'confirmed'
    AND r."riskDisclosureStatus" = 'confirmed'
    AND r."countryOpinionRef" IS NOT NULL AND TRIM(r."countryOpinionRef") <> ''
    AND r."authorityReference" IS NOT NULL AND TRIM(r."authorityReference") <> ''
    AND r."reviewedBy" IS NOT NULL AND r."reviewedBy" <> r."preparedBy"
    AND r."reviewedAt" IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'public offer requires market authority visa');
END;

CREATE TRIGGER "Offer_public_requires_market_visa_update"
BEFORE UPDATE OF "visibility", "isDemo" ON "Offer"
WHEN NEW."isDemo" = 0 AND NEW."visibility" = 'public' AND NOT EXISTS (
  SELECT 1 FROM "RegulatoryReview" r
  WHERE r."projectId" = NEW."projectId"
    AND r."decision" = 'cleared'
    AND r."distributionScope" = 'public_offering'
    AND r."marketAuthorityPath" = 'visa_obtained'
    AND r."corporateActsStatus" = 'confirmed'
    AND r."paymentSafeguardingStatus" = 'confirmed'
    AND r."beneficialOwnersStatus" = 'confirmed'
    AND r."riskDisclosureStatus" = 'confirmed'
    AND r."countryOpinionRef" IS NOT NULL AND TRIM(r."countryOpinionRef") <> ''
    AND r."authorityReference" IS NOT NULL AND TRIM(r."authorityReference") <> ''
    AND r."reviewedBy" IS NOT NULL AND r."reviewedBy" <> r."preparedBy"
    AND r."reviewedAt" IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'public offer requires market authority visa');
END;

CREATE TRIGGER "Investment_demo_offer_blocked"
BEFORE INSERT ON "Investment"
WHEN EXISTS (
  SELECT 1 FROM "Offer" o WHERE o."id" = NEW."offerId" AND o."isDemo" = 1
)
BEGIN
  SELECT RAISE(ABORT, 'demo offers cannot accept investments');
END;
