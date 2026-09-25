DROP TRIGGER IF EXISTS "Offer_public_requires_market_visa_insert";
DROP TRIGGER IF EXISTS "Offer_public_requires_market_visa_update";

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
    AND r."countryOpinionRef" IS NOT NULL AND TRIM(r."countryOpinionRef") <> ''
    AND r."authorityReference" IS NOT NULL AND TRIM(r."authorityReference") <> ''
    AND r."reviewedBy" IS NOT NULL AND r."reviewedBy" <> r."preparedBy"
    AND r."reviewedAt" IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'public offer requires complete market authority evidence');
END;
