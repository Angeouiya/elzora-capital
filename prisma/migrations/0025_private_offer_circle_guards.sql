CREATE UNIQUE INDEX IF NOT EXISTS "PrivateOfferInvitation_active_email_key"
  ON "PrivateOfferInvitation"("offerId", "email")
  WHERE "status" IN ('pending', 'accepted');

DROP TRIGGER IF EXISTS "PrivateOfferInvitation_private_circle_limit";

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
