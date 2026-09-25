CREATE TABLE "PrivateOfferInvitation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "offerId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "userId" TEXT,
  "tokenHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "maxInvestment" BIGINT,
  "invitedBy" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "acceptedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PrivateOfferInvitation_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "Offer" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PrivateOfferInvitation_status_check"
    CHECK ("status" IN ('pending', 'accepted', 'revoked', 'expired')),
  CONSTRAINT "PrivateOfferInvitation_email_normalized_check"
    CHECK ("email" = LOWER(TRIM("email"))),
  CONSTRAINT "PrivateOfferInvitation_expiry_check"
    CHECK (datetime("expiresAt") > datetime("createdAt")),
  CONSTRAINT "PrivateOfferInvitation_maximum_check"
    CHECK ("maxInvestment" IS NULL OR "maxInvestment" > 0)
);

CREATE UNIQUE INDEX "PrivateOfferInvitation_tokenHash_key"
  ON "PrivateOfferInvitation"("tokenHash");
CREATE INDEX "PrivateOfferInvitation_offerId_status_idx"
  ON "PrivateOfferInvitation"("offerId", "status");
CREATE INDEX "PrivateOfferInvitation_email_status_idx"
  ON "PrivateOfferInvitation"("email", "status");
CREATE INDEX "PrivateOfferInvitation_userId_status_idx"
  ON "PrivateOfferInvitation"("userId", "status");
CREATE UNIQUE INDEX "PrivateOfferInvitation_active_email_key"
  ON "PrivateOfferInvitation"("offerId", "email")
  WHERE "status" IN ('pending', 'accepted');

CREATE TRIGGER "PrivateOfferInvitation_private_circle_limit"
BEFORE INSERT ON "PrivateOfferInvitation"
WHEN NEW."status" = 'pending' AND (
  SELECT COUNT(*) FROM "PrivateOfferInvitation" i
  WHERE i."offerId" = NEW."offerId"
    AND (i."status" = 'accepted' OR (
      i."status" = 'pending' AND datetime(i."expiresAt") > datetime('now')
    ))
) >= 100
BEGIN
  SELECT RAISE(ABORT, 'private offer invitation limit reached');
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
    AND r."reviewedBy" IS NOT NULL
    AND r."reviewedBy" <> r."preparedBy"
    AND r."reviewedAt" IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'private invitations require a cleared restricted offer');
END;

CREATE TRIGGER "PrivateOfferInvitation_acceptance_identity_update"
BEFORE UPDATE OF "status" ON "PrivateOfferInvitation"
WHEN NEW."status" = 'accepted' AND (
  NEW."userId" IS NULL OR
  NEW."acceptedAt" IS NULL OR
  datetime(NEW."expiresAt") <= datetime('now')
)
BEGIN
  SELECT RAISE(ABORT, 'accepted private invitation requires an active identified investor');
END;
