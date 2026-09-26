CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "investmentId" TEXT,
  "method" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XOF',
  "country" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "reasons" TEXT NOT NULL DEFAULT '[]',
  "policyVersion" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "providerRef" TEXT,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PaymentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PaymentAttempt_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PaymentAttempt_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PaymentAttempt_method_check" CHECK ("method" IN ('card', 'mobile_money', 'bank_transfer')),
  CONSTRAINT "PaymentAttempt_decision_check" CHECK ("decision" IN ('allow', 'review', 'block')),
  CONSTRAINT "PaymentAttempt_status_check" CHECK ("status" IN ('allowed', 'review', 'blocked', 'provider_pending', 'confirmed', 'failed', 'cancelled')),
  CONSTRAINT "PaymentAttempt_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "PaymentAttempt_currency_check" CHECK ("currency" = 'XOF')
);

CREATE INDEX "PaymentAttempt_user_method_createdAt_idx" ON "PaymentAttempt"("userId", "method", "createdAt");
CREATE INDEX "PaymentAttempt_user_createdAt_idx" ON "PaymentAttempt"("userId", "createdAt");
CREATE INDEX "PaymentAttempt_status_createdAt_idx" ON "PaymentAttempt"("status", "createdAt");
CREATE UNIQUE INDEX "PaymentAttempt_investmentId_key" ON "PaymentAttempt"("investmentId") WHERE "investmentId" IS NOT NULL;

CREATE TABLE "ComplianceCase" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "paymentAttemptId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "caseType" TEXT NOT NULL DEFAULT 'payment_review',
  "severity" TEXT NOT NULL,
  "riskScore" INTEGER NOT NULL,
  "reasons" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "preparedBy" TEXT,
  "reviewedBy" TEXT,
  "decidedBy" TEXT,
  "note" TEXT,
  "decisionReason" TEXT,
  "externalReportRef" TEXT,
  "reportedAt" DATETIME,
  "approvalExpiresAt" DATETIME,
  "consumedAt" DATETIME,
  "resolvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ComplianceCase_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ComplianceCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ComplianceCase_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ComplianceCase_preparedBy_fkey" FOREIGN KEY ("preparedBy") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ComplianceCase_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ComplianceCase_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ComplianceCase_status_check" CHECK ("status" IN ('open', 'reviewing', 'approved', 'consumed', 'rejected', 'reported')),
  CONSTRAINT "ComplianceCase_severity_check" CHECK ("severity" IN ('standard', 'high', 'critical'))
);

CREATE UNIQUE INDEX "ComplianceCase_paymentAttemptId_key" ON "ComplianceCase"("paymentAttemptId");
CREATE INDEX "ComplianceCase_status_createdAt_idx" ON "ComplianceCase"("status", "createdAt");
CREATE INDEX "ComplianceCase_user_offer_idx" ON "ComplianceCase"("userId", "offerId", "method", "amount");

-- Les seuils ci-dessous sont des limites internes NEXORA. Un prestataire peut être plus restrictif.
CREATE TRIGGER "PaymentAttempt_mobile_money_limits"
BEFORE INSERT ON "PaymentAttempt"
WHEN NEW."status" = 'allowed' AND NEW."method" = 'mobile_money'
BEGIN
  SELECT CASE WHEN NEW."amount" > 1000000 THEN RAISE(ABORT, 'payment per-operation limit exceeded') END;
  SELECT CASE WHEN (SELECT COALESCE(SUM("amount"), 0) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-24 hours')) + NEW."amount" > 2000000 THEN RAISE(ABORT, 'payment daily total exceeded') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-24 hours')) >= 5 THEN RAISE(ABORT, 'payment daily count exceeded') END;
  SELECT CASE WHEN (SELECT COALESCE(SUM("amount"), 0) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-30 days')) + NEW."amount" > 10000000 THEN RAISE(ABORT, 'payment monthly total exceeded') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-30 days')) >= 20 THEN RAISE(ABORT, 'payment monthly count exceeded') END;
END;

CREATE TRIGGER "PaymentAttempt_card_limits"
BEFORE INSERT ON "PaymentAttempt"
WHEN NEW."status" = 'allowed' AND NEW."method" = 'card'
BEGIN
  SELECT CASE WHEN NEW."amount" > 10000000 THEN RAISE(ABORT, 'payment per-operation limit exceeded') END;
  SELECT CASE WHEN (SELECT COALESCE(SUM("amount"), 0) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-24 hours')) + NEW."amount" > 15000000 THEN RAISE(ABORT, 'payment daily total exceeded') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-24 hours')) >= 5 THEN RAISE(ABORT, 'payment daily count exceeded') END;
  SELECT CASE WHEN (SELECT COALESCE(SUM("amount"), 0) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-30 days')) + NEW."amount" > 30000000 THEN RAISE(ABORT, 'payment monthly total exceeded') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-30 days')) >= 20 THEN RAISE(ABORT, 'payment monthly count exceeded') END;
END;

CREATE TRIGGER "PaymentAttempt_bank_transfer_limits"
BEFORE INSERT ON "PaymentAttempt"
WHEN NEW."status" = 'allowed' AND NEW."method" = 'bank_transfer'
BEGIN
  SELECT CASE WHEN NEW."amount" > 50000000 THEN RAISE(ABORT, 'payment per-operation limit exceeded') END;
  SELECT CASE WHEN (SELECT COALESCE(SUM("amount"), 0) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-24 hours')) + NEW."amount" > 75000000 THEN RAISE(ABORT, 'payment daily total exceeded') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-24 hours')) >= 3 THEN RAISE(ABORT, 'payment daily count exceeded') END;
  SELECT CASE WHEN (SELECT COALESCE(SUM("amount"), 0) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-30 days')) + NEW."amount" > 150000000 THEN RAISE(ABORT, 'payment monthly total exceeded') END;
  SELECT CASE WHEN (SELECT COUNT(*) FROM "PaymentAttempt" WHERE "userId" = NEW."userId" AND "method" = NEW."method" AND "status" IN ('allowed','provider_pending','confirmed') AND datetime("createdAt") >= datetime(NEW."createdAt", '-30 days')) >= 10 THEN RAISE(ABORT, 'payment monthly count exceeded') END;
END;

PRAGMA optimize;
