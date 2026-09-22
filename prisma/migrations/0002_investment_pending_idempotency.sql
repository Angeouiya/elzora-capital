-- An investor can have at most one unpaid subscription intent per offer.
-- This protects capacity accounting when two requests arrive concurrently.
CREATE UNIQUE INDEX IF NOT EXISTS "Investment_one_pending_per_investor_offer"
ON "Investment"("offerId", "investorId")
WHERE "status" = 'pending_payment';
