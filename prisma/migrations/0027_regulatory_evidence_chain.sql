ALTER TABLE "RegulatoryReview" ADD COLUMN "corporateApprovalRef" TEXT;
ALTER TABLE "RegulatoryReview" ADD COLUMN "paymentProviderName" TEXT;
ALTER TABLE "RegulatoryReview" ADD COLUMN "paymentProviderApprovalRef" TEXT;
ALTER TABLE "RegulatoryReview" ADD COLUMN "fundSafeguardingRef" TEXT;

-- A previously cleared review must be independently confirmed again once the
-- supporting corporate and payment evidence has been recorded.
UPDATE "RegulatoryReview"
SET "decision" = 'pending',
    "reviewedBy" = NULL,
    "reviewedAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "decision" = 'cleared';

DROP TRIGGER IF EXISTS "RegulatoryReview_clearance_requires_complete_evidence_insert";
DROP TRIGGER IF EXISTS "RegulatoryReview_clearance_requires_complete_evidence_update";
DROP TRIGGER IF EXISTS "Project_approval_requires_regulatory_clearance";
DROP TRIGGER IF EXISTS "Offer_public_requires_market_visa_insert";
DROP TRIGGER IF EXISTS "Offer_public_requires_market_visa_update";
DROP TRIGGER IF EXISTS "PrivateOfferInvitation_restricted_offer_insert";

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
  NEW."corporateApprovalRef" IS NULL OR TRIM(NEW."corporateApprovalRef") = '' OR
  NEW."paymentProviderName" IS NULL OR TRIM(NEW."paymentProviderName") = '' OR
  NEW."paymentProviderApprovalRef" IS NULL OR TRIM(NEW."paymentProviderApprovalRef") = '' OR
  NEW."fundSafeguardingRef" IS NULL OR TRIM(NEW."fundSafeguardingRef") = '' OR
  NEW."countryOpinionRef" IS NULL OR TRIM(NEW."countryOpinionRef") = '' OR
  (NEW."distributionScope" = 'public_offering' AND (
    NEW."authorityReference" IS NULL OR TRIM(NEW."authorityReference") = ''
  )) OR
  NEW."reviewedBy" IS NULL OR
  NEW."reviewedBy" = NEW."preparedBy" OR
  NEW."reviewedAt" IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'regulatory clearance requires complete traceable evidence and independent review');
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
  NEW."corporateApprovalRef" IS NULL OR TRIM(NEW."corporateApprovalRef") = '' OR
  NEW."paymentProviderName" IS NULL OR TRIM(NEW."paymentProviderName") = '' OR
  NEW."paymentProviderApprovalRef" IS NULL OR TRIM(NEW."paymentProviderApprovalRef") = '' OR
  NEW."fundSafeguardingRef" IS NULL OR TRIM(NEW."fundSafeguardingRef") = '' OR
  NEW."countryOpinionRef" IS NULL OR TRIM(NEW."countryOpinionRef") = '' OR
  (NEW."distributionScope" = 'public_offering' AND (
    NEW."authorityReference" IS NULL OR TRIM(NEW."authorityReference") = ''
  )) OR
  NEW."reviewedBy" IS NULL OR
  NEW."reviewedBy" = NEW."preparedBy" OR
  NEW."reviewedAt" IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'regulatory clearance requires complete traceable evidence and independent review');
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
    AND r."corporateApprovalRef" IS NOT NULL AND TRIM(r."corporateApprovalRef") <> ''
    AND r."paymentProviderName" IS NOT NULL AND TRIM(r."paymentProviderName") <> ''
    AND r."paymentProviderApprovalRef" IS NOT NULL AND TRIM(r."paymentProviderApprovalRef") <> ''
    AND r."fundSafeguardingRef" IS NOT NULL AND TRIM(r."fundSafeguardingRef") <> ''
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
    AND r."corporateApprovalRef" IS NOT NULL AND TRIM(r."corporateApprovalRef") <> ''
    AND r."paymentProviderName" IS NOT NULL AND TRIM(r."paymentProviderName") <> ''
    AND r."paymentProviderApprovalRef" IS NOT NULL AND TRIM(r."paymentProviderApprovalRef") <> ''
    AND r."fundSafeguardingRef" IS NOT NULL AND TRIM(r."fundSafeguardingRef") <> ''
    AND r."countryOpinionRef" IS NOT NULL AND TRIM(r."countryOpinionRef") <> ''
    AND r."authorityReference" IS NOT NULL AND TRIM(r."authorityReference") <> ''
    AND r."reviewedBy" IS NOT NULL AND r."reviewedBy" <> r."preparedBy"
    AND r."reviewedAt" IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'public offer requires complete market authority evidence');
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
    AND r."corporateApprovalRef" IS NOT NULL AND TRIM(r."corporateApprovalRef") <> ''
    AND r."paymentProviderName" IS NOT NULL AND TRIM(r."paymentProviderName") <> ''
    AND r."paymentProviderApprovalRef" IS NOT NULL AND TRIM(r."paymentProviderApprovalRef") <> ''
    AND r."fundSafeguardingRef" IS NOT NULL AND TRIM(r."fundSafeguardingRef") <> ''
    AND r."countryOpinionRef" IS NOT NULL AND TRIM(r."countryOpinionRef") <> ''
    AND r."authorityReference" IS NOT NULL AND TRIM(r."authorityReference") <> ''
    AND r."reviewedBy" IS NOT NULL AND r."reviewedBy" <> r."preparedBy"
    AND r."reviewedAt" IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'public offer requires complete market authority evidence');
END;

CREATE TRIGGER "PrivateOfferInvitation_restricted_offer_insert"
BEFORE INSERT ON "PrivateOfferInvitation"
WHEN NOT EXISTS (
  SELECT 1 FROM "Offer" o
  JOIN "RegulatoryReview" r ON r."projectId" = o."projectId"
  WHERE o."id" = NEW."offerId"
    AND o."isDemo" = 0
    AND o."visibility" = 'restricted'
    AND o."status" = 'open'
    AND r."decision" = 'cleared'
    AND r."distributionScope" = 'restricted_private'
    AND r."marketAuthorityPath" IN ('private_route_confirmed', 'authority_clearance')
    AND r."corporateActsStatus" = 'confirmed'
    AND r."paymentSafeguardingStatus" = 'confirmed'
    AND r."beneficialOwnersStatus" = 'confirmed'
    AND r."riskDisclosureStatus" = 'confirmed'
    AND r."corporateApprovalRef" IS NOT NULL AND TRIM(r."corporateApprovalRef") <> ''
    AND r."paymentProviderName" IS NOT NULL AND TRIM(r."paymentProviderName") <> ''
    AND r."paymentProviderApprovalRef" IS NOT NULL AND TRIM(r."paymentProviderApprovalRef") <> ''
    AND r."fundSafeguardingRef" IS NOT NULL AND TRIM(r."fundSafeguardingRef") <> ''
    AND r."countryOpinionRef" IS NOT NULL AND TRIM(r."countryOpinionRef") <> ''
    AND r."reviewedBy" IS NOT NULL
    AND r."reviewedBy" <> r."preparedBy"
    AND r."reviewedAt" IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'private invitations require a cleared restricted offer');
END;
