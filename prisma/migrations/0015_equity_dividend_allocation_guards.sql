CREATE TRIGGER "EquityDividend_approved_requires_review"
BEFORE UPDATE OF "status" ON "EquityDividend"
WHEN NEW."status" = 'approved' AND (
  NEW."reviewedBy" IS NULL OR NEW."approvedBy" IS NULL OR
  NEW."reviewedBy" = NEW."approvedBy"
)
BEGIN
  SELECT RAISE(ABORT, 'equity dividend approval requires a distinct legal review');
END;

CREATE TRIGGER "EquityDividendAllocation_available_requires_parent_insert"
BEFORE INSERT ON "EquityDividendAllocation"
WHEN NEW."status" = 'available' AND NOT EXISTS (
  SELECT 1 FROM "EquityDividend" d
  WHERE d."id" = NEW."dividendId" AND d."status" = 'paid'
)
BEGIN
  SELECT RAISE(ABORT, 'dividend allocation cannot be released before verified payment');
END;
