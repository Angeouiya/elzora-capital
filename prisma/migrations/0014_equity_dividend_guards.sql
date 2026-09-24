CREATE TRIGGER "EquityDividend_distinct_reviewers_insert"
BEFORE INSERT ON "EquityDividend"
WHEN NEW."approvedBy" IS NOT NULL AND NEW."approvedBy" = NEW."reviewedBy"
BEGIN
  SELECT RAISE(ABORT, 'equity dividend reviewer cannot approve the same declaration');
END;

CREATE TRIGGER "EquityDividend_paid_requires_approval_insert"
BEFORE INSERT ON "EquityDividend"
WHEN NEW."status" = 'paid' AND (
  NEW."reviewedBy" IS NULL OR NEW."approvedBy" IS NULL OR
  NEW."reviewedBy" = NEW."approvedBy" OR NEW."paymentRef" IS NULL OR
  NEW."paymentEventId" IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'equity dividend requires distinct approval and verified payment');
END;

CREATE TRIGGER "EquityDividend_verifying_requires_approval"
BEFORE UPDATE OF "status" ON "EquityDividend"
WHEN NEW."status" = 'verifying' AND (
  NEW."reviewedBy" IS NULL OR NEW."approvedBy" IS NULL OR
  NEW."reviewedBy" = NEW."approvedBy" OR NEW."paymentRef" IS NULL
)
BEGIN
  SELECT RAISE(ABORT, 'equity dividend payment requires distinct approval');
END;
